/**
 * 通知管理系统（纯前端）
 * ============================================
 * 仅保留浏览器本地通知 + Service Worker 注册 + 周期性后台同步。
 *
 * 设计取舍：
 *  - 无推送服务器，所以删除 VAPID / Push API 订阅（留着会误导用户）。
 *  - 通知触发由 upgrade-scheduler.ts 在页面打开时驱动；
 *    页面关闭时通过 Periodic Background Sync API（best-effort）唤醒 SW，
 *    SW 再读 IndexedDB 里的 upgrades/notifyState 决定是否补发。
 *  - Periodic Sync 仅 Chrome/Edge 支持，且需要安装 PWA。Safari/iOS 不支持，
 *    这种场景下用户重开页面时由 catchUp 兜底。
 */

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// ── 请求浏览器通知权限 ──────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  try {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  } catch {
    return false;
  }
}

// ── 发送浏览器本地通知 ──────────────────────
export function sendBrowserNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): void {
  if (!("Notification" in window)) return;
  if (Notification.permission === "denied") return;

  // 优先通过 SW 显示（已安装时 SW 的 showNotification 可在页面后台也工作）
  const showViaSW = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: data?.tag ? String(data.tag) : title,
          requireInteraction: false,
          data: { ...data, createdAt: Date.now() },
        });
        return;
      }
    } catch {
      // 回退到普通 Notification
    }
    fallbackNotification(title, body, data);
  };

  if (Notification.permission === "granted") {
    showViaSW();
  }
}

function fallbackNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const notif = new Notification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data?.tag ? String(data.tag) : title,
    requireInteraction: false,
    data: { ...data, createdAt: Date.now() },
  });
  notif.onclick = (e) => {
    e.preventDefault();
    window.focus();
    notif.close();
  };
  setTimeout(() => notif.close(), 30_000);
}

// ── 注册 PWA Service Worker ──────────────────
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    // 监听更新提示
    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "activated" && navigator.serviceWorker.controller) {
          // 新 SW 已激活，可提示用户刷新（这里静默，避免打扰）
        }
      });
    });
    return reg;
  } catch {
    console.warn("[通知系统] Service Worker 注册失败");
    return null;
  }
}

// ── 周期性后台同步（best-effort）──────────────
//  仅 Chromium 系 + 已安装 PWA 支持；其他平台静默跳过。
//  注册后浏览器会按自身策略（最少 12 小时一次）触发 periodicsync 事件，
//  SW 在事件中读 IndexedDB 的升级队列并发通知。
export async function registerPeriodicSync(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    // TS 没有 PeriodicSyncManager 类型，做能力探测
    const anyReg = reg as ServiceWorkerRegistration & {
      periodicSync?: { register(tag: string, opts?: { minInterval: number }): Promise<void> };
    };
    if (!anyReg.periodicSync) return false;
    await anyReg.periodicSync.register("periodic-sync", {
      // 12 小时最小间隔（实际由浏览器决定）
      minInterval: 12 * 60 * 60 * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

// ── 检测 Periodic Sync 状态 ──────────────────
export async function isPeriodicSyncRegistered(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const anyReg = reg as ServiceWorkerRegistration & {
      periodicSync?: { getTags(): Promise<string[]> };
    };
    if (!anyReg.periodicSync) return false;
    const tags = await anyReg.periodicSync.getTags();
    return tags.includes("periodic-sync");
  } catch {
    return false;
  }
}

// ── 检测通知状态 ──────────────────────────
export interface NotifyStatus {
  browserNotifAvailable: boolean;
  browserNotifGranted: boolean;
  swRegistered: boolean;
  periodicSyncSupported: boolean;
  isInstalled: boolean;
}

export function detectNotifyStatus(reg?: ServiceWorkerRegistration | null): NotifyStatus {
  const periodicSyncSupported =
    "serviceWorker" in navigator &&
    "periodicSync" in (reg ?? ({} as ServiceWorkerRegistration));
  return {
    browserNotifAvailable: "Notification" in window,
    browserNotifGranted: "Notification" in window ? Notification.permission === "granted" : false,
    swRegistered: !!reg,
    periodicSyncSupported,
    isInstalled: isStandalone(),
  };
}

// ── 是否以独立 App 模式运行（已安装到桌面）──
export function isStandalone(): boolean {
  if ("standalone" in navigator && (navigator as unknown as { standalone?: boolean }).standalone) {
    return true;
  }
  return window.matchMedia("(display-mode: standalone)").matches;
}
