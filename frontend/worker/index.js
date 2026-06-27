/**
 * 自定义 Service Worker 逻辑（由 next-pwa 自动 importScripts 进 sw.js）
 * ============================================
 * 仅处理：
 *  1. periodicsync 事件 —— 页面关闭时浏览器周期性唤醒 SW，
 *     读 IndexedDB 升级队列，补发 complete / post_complete 通知。
 *  2. notificationclick —— 点击通知聚焦/打开 App。
 *
 * 不处理 pre_30m / pre_10m：periodicsync 最小 12h 一次，提前提醒无意义，
 * 那两层由页面打开时的 upgrade-scheduler.ts 驱动。
 *
 * 与 lib/indexeddb.ts 保持一致的 schema/key 格式，但这里用纯 JS 重新实现，
 * 避免在 worker 里引入 TS 路径别名。
 */

// ── 常量（须与 lib/indexeddb.ts 一致）──────────
const DB_NAME = "CocUpgradeDB";
const DB_VERSION = 3;
const STORE_UPGRADES = "upgrades";
const STORE_SETTINGS = "settings";
const STORE_NOTIFY_STATE = "notifyState";
const STORE_VILLAGE = "village"; // v3 新增，SW 不使用但需兼容升级

const DEFAULT_SETTINGS = {
  enablePre30m: true,
  enablePre10m: true,
  enableComplete: true,
  enablePostComplete: false,
  enableBatch: true,
  batchWindowMinutes: 30,
  dndEnabled: true,
  dndStart: 22,
  dndEnd: 8,
  last_notify_at: null,
  last_sync_at: null,
};

const POST_COMPLETE_OFFSET_MS = 10 * 60 * 1000;

const CATEGORY_LABELS = {
  buildings: "建筑",
  spells: "法术",
  heroes: "英雄",
  pets: "宠物",
  equipment: "装备",
  helpers: "助力",
  units: "兵种",
  buildings2: "建设者基地建筑",
  heroes2: "建设者基地英雄",
  units2: "建设者基地兵种",
  siege_machines: "攻城训练营",
  traps: "陷阱",
  traps2: "建设者基地陷阱",
};

// ── IndexedDB 极简封装 ─────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion;
      if (!db.objectStoreNames.contains(STORE_UPGRADES)) {
        db.createObjectStore(STORE_UPGRADES, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_NOTIFY_STATE)) {
        db.createObjectStore(STORE_NOTIFY_STATE, { keyPath: "key" });
      }
      // v3 新增：村庄快照存储（SW 不使用，但需兼容版本升级）
      if (oldVersion < 3 && !db.objectStoreNames.contains(STORE_VILLAGE)) {
        db.createObjectStore(STORE_VILLAGE, { keyPath: "key" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

function dbAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(db, store, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── 通知去重 key（须与 lib/indexeddb.ts notifyStateKey 一致）──
function notifyStateKey(category, dataId, level, tier) {
  return `${category}:${dataId == null ? "x" : dataId}:${level}:${tier}`;
}

function isInDND(settings, now) {
  if (!settings.dndEnabled) return false;
  const h = now.getHours();
  const s = settings.dndStart;
  const e = settings.dndEnd;
  if (s > e) return h >= s || h < e;
  return h >= s && h < e;
}

function upgradeName(u) {
  return `${u.item_name} Lv${u.item_level}`;
}

// ── 周期性后台同步核心 ─────────────────────────
async function runPeriodicCheck() {
  let db;
  try {
    db = await openDB();
  } catch {
    return;
  }

  let settings;
  try {
    const rec = await dbGet(db, STORE_SETTINGS, "settings");
    settings = { ...DEFAULT_SETTINGS, ...(rec || {}) };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }

  if (!settings.enableComplete && !settings.enablePostComplete) return;

  let upgrades = [];
  try {
    upgrades = await dbAll(db, STORE_UPGRADES);
  } catch {
    return;
  }
  if (!upgrades.length) return;

  const now = new Date();
  const nowMs = now.getTime();
  const inDND = isInDND(settings, now);

  // 收集 complete 批量
  const completeDue = [];
  const postDue = [];
  let firedAny = false;

  for (const u of upgrades) {
    const finishMs = new Date(u.finish_time).getTime();
    if (Number.isNaN(finishMs)) continue;

    // complete 层
    if (settings.enableComplete && nowMs >= finishMs) {
      const key = notifyStateKey(u.category, u.data_id, u.item_level, "complete");
      const rec = await dbGet(db, STORE_NOTIFY_STATE, key);
      if (!rec) {
        if (inDND) continue; // DND 内延迟，不标记
        completeDue.push({ u, key });
      }
    }

    // post_complete 层
    if (settings.enablePostComplete && nowMs >= finishMs + POST_COMPLETE_OFFSET_MS) {
      const key = notifyStateKey(u.category, u.data_id, u.item_level, "post_complete");
      const rec = await dbGet(db, STORE_NOTIFY_STATE, key);
      if (!rec) {
        if (inDND) continue;
        postDue.push({ u, key });
      }
    }
  }

  // 发 complete（批量或单项）
  if (completeDue.length > 0) {
    if (settings.enableBatch && completeDue.length > 1) {
      const names = completeDue.map((d) => upgradeName(d.u));
      const title = `🏰 ${completeDue.length} 项升级完成！`;
      const body =
        names.slice(0, 5).join("、") +
        (names.length > 5 ? ` 等 ${names.length} 项` : "") +
        " 已完成，快上线验收！";
      await showNotif(title, body, { tag: "batch-complete", batch: completeDue.length });
    } else {
      for (const d of completeDue) {
        const cat = CATEGORY_LABELS[d.u.category] || d.u.category;
        await showNotif("🏰 升级完成！", `${cat} · ${upgradeName(d.u)} 已升级完成，快上线验收！`, {
          tag: `complete:${d.key}`,
        });
      }
    }
    for (const d of completeDue) {
      await dbPut(db, STORE_NOTIFY_STATE, { key: d.key, firedAt: Date.now() });
    }
    firedAny = true;
  }

  // 发 post_complete
  for (const d of postDue) {
    const cat = CATEGORY_LABELS[d.u.category] || d.u.category;
    await showNotif("🏰 升级已完成", `${cat} · ${upgradeName(d.u)} 已升级完成，快上线验收！`, {
      tag: `post:${d.key}`,
    });
    await dbPut(db, STORE_NOTIFY_STATE, { key: d.key, firedAt: Date.now() });
    firedAny = true;
  }

  if (firedAny) {
    settings.last_notify_at = new Date().toISOString();
    await dbPut(db, STORE_SETTINGS, { key: "settings", ...settings });
  }
}

function showNotif(title, body, data) {
  return self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data && data.tag ? data.tag : title,
    requireInteraction: false,
    data: { ...(data || {}), createdAt: Date.now() },
  });
}

// ── 事件监听 ─────────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 清除所有旧缓存，确保新版本部署后旧缓存策略失效
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          // 保留 workbox-google-analytics 等系统缓存，清除其余
          if (key.startsWith("workbox-")) return;
          return caches.delete(key);
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "periodic-sync") {
    event.waitUntil(runPeriodicCheck());
  }
});

// 兜底：某些浏览器在后台也会触发 sync（非 periodic）
self.addEventListener("sync", (event) => {
  if (event.tag === "periodic-sync" || event.tag === "sync") {
    event.waitUntil(runPeriodicCheck());
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client) {
          try {
            await client.focus();
            return;
          } catch {
            // ignore
          }
        }
      }
      if (self.clients.openWindow) {
        try {
          await self.clients.openWindow("/");
        } catch {
          // ignore
        }
      }
    })()
  );
});

// 页面通过 postMessage 触发立即检查或跳过等待
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "RUN_PERIODIC_CHECK") {
    event.waitUntil(runPeriodicCheck());
  }
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
