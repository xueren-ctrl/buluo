/**
 * IndexedDB 本地存储层
 * ============================================
 * 替代 localStorage，离线持久化全部本地状态：
 *  - upgrades:    升级队列 + 已通知状态
 *  - userData:    用户 JSON、设备 ID（替代 WsPusher UID）、上次同步时间
 *  - history:     已完成历史
 *  - notifyConfig:通知开关
 *  - notifyState: 通知去重（已发层级），跨重传/重开不重复
 *  - settings:    调度器设置 + 最近提醒时间
 *  - village:     村庄快照
 *
 * v4 新增：
 *  - json_history: 最近 5 次 JSON 导入历史（时间轴展示）
 *  - accounts:    多账号支持（playerTag 索引）
 */

import { saveMonthlyCard, clearMonthlyCard } from "./monthly-card";
import type { MonthlyCardRecord } from "./monthly-card";

// ── 数据库常量 ──────────────────────────────
const DB_NAME = "CocUpgradeDB";
const DB_VERSION = 4;
const STORE_UPGRADES = "upgrades";
const STORE_USER_DATA = "userData";
const STORE_HISTORY = "history";
const STORE_NOTIFY_CONFIG = "notifyConfig";
const STORE_NOTIFY_STATE = "notifyState";
const STORE_SETTINGS = "settings";
const STORE_VILLAGE = "village";
const STORE_JSON_HISTORY = "json_history";
const STORE_ACCOUNTS = "accounts";

// ── 类型定义 ────────────────────────────────
export interface RawUpgradeRecord {
  id?: number;
  category: string;
  item_name: string;
  item_level: number;
  finish_time: string;
  timer_seconds: number | null;
  notified: boolean;
  data_id?: number | null;
}

export interface UserRecord {
  uid: string; // keyPath，固定 "default"
  client_id: string;
  player_tag: string | null;
  player_name: string | null;
  last_json_raw: string | null;
  last_upload_at: string | null;
  last_sync_at: string | null;
}

export interface HistoryRecord {
  id: string;
  item_name: string;
  category: string;
  item_level: number;
  completed_at: string;
  /** 完成项的 SC ID（可选，用于去重时区分同名同级的不同建筑） */
  data_id?: number | null;
}

export interface NotifyConfig {
  browserNotifEnabled: boolean;
}

export type NotifyTier = "pre_30m" | "pre_10m" | "complete" | "post_complete";

export interface NotifyStateRecord {
  key: string; // `${category}:${data_id}:${level}:${tier}`
  firedAt: number;
}

export interface SchedulerSettings {
  enablePre30m: boolean;
  enablePre10m: boolean;
  enableComplete: boolean;
  enablePostComplete: boolean;
  enableBatch: boolean;
  batchWindowMinutes: number;
  dndEnabled: boolean;
  dndStart: number; // 0-23
  dndEnd: number;   // 0-23
  last_notify_at: string | null;
  last_sync_at: string | null;
}

export const DEFAULT_SETTINGS: SchedulerSettings = {
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

// v3 新增：村庄快照存储
export interface VillageRecord {
  key: string; // 固定 "latest"
  snapshot: import("./types").VillageSnapshot;
  capturedAt: string;
}

// ── DB 句柄 ─────────────────────────────────
let _db: IDBDatabase | null = null;

function open(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const oldVersion = (e as IDBVersionChangeEvent).oldVersion;

      if (!db.objectStoreNames.contains(STORE_UPGRADES)) {
        const store = db.createObjectStore(STORE_UPGRADES, { keyPath: "id", autoIncrement: true });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("finished", "finish_time", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_USER_DATA)) {
        db.createObjectStore(STORE_USER_DATA, { keyPath: "uid" });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const store = db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
        store.createIndex("completed_at", "completed_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_NOTIFY_CONFIG)) {
        db.createObjectStore(STORE_NOTIFY_CONFIG, { keyPath: "key" });
      }
      // v2 新增
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_NOTIFY_STATE)) {
          db.createObjectStore(STORE_NOTIFY_STATE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
        }
      }
      // v3 新增：村庄快照存储
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORE_VILLAGE)) {
          db.createObjectStore(STORE_VILLAGE, { keyPath: "key" });
        }
      }
      // v4 新增：JSON 历史 + 多账号
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains(STORE_JSON_HISTORY)) {
          const store = db.createObjectStore(STORE_JSON_HISTORY, { keyPath: "id", autoIncrement: true });
          store.createIndex("imported_at", "imported_at", { unique: false });
          store.createIndex("player_tag", "player_tag", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
          const store = db.createObjectStore(STORE_ACCOUNTS, { keyPath: "player_tag" });
          store.createIndex("active", "active", { unique: false });
          store.createIndex("last_import_time", "last_import_time", { unique: false });
        }
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db!);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── 通用 CRUD ──────────────────────────────
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function put<T extends Record<string, unknown>>(
  storeName: string,
  data: T
): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function get<T>(
  storeName: string,
  key: string | number
): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function clear(storeName: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function del(storeName: string, key: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// 按数字 ID 删除（autoIncrement 主键的 store）
async function delById(storeName: string, id: number): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── 升级项 CRUD ─────────────────────────────
export async function saveUpgrades(upgrades: RawUpgradeRecord[]): Promise<void> {
  await clear(STORE_UPGRADES);
  for (const u of upgrades) {
    const { id, ...record } = u;
    await put(STORE_UPGRADES, record as unknown as Record<string, unknown>);
  }
}

export async function loadUpgrades(): Promise<RawUpgradeRecord[]> {
  return await getAll<RawUpgradeRecord>(STORE_UPGRADES);
}

// ── 用户数据 CRUD ───────────────────────────
export async function saveUserData(data: Omit<UserRecord, "uid">): Promise<void> {
  await put(STORE_USER_DATA, { ...data, uid: "default" } as unknown as Record<string, unknown>);
}

export async function loadUserData(): Promise<UserRecord | undefined> {
  return await get<UserRecord>(STORE_USER_DATA, "default");
}

// ── 历史记录 CRUD ───────────────────────────
// v1.2.11 起正式启用：完成项写入（调度器 tick + 重新解析 diff），
// 与 loadCompletionStats 合并统计。同一项（分类+SC ID/名+等级+完成时间）
// 只记一次——调度器与重新解析两条写入路径可能先后命中同一项。
export function historyKey(entry: Omit<HistoryRecord, "id">): string {
  return `${entry.category}:${entry.data_id ?? entry.item_name}:${entry.item_level}:${entry.completed_at}`;
}

export async function addHistory(entry: Omit<HistoryRecord, "id">): Promise<void> {
  const all = await getAll<HistoryRecord>(STORE_HISTORY);
  if (all.some((h) => historyKey(h) === historyKey(entry))) return;
  const id = `${entry.category}-${entry.completed_at}-${Date.now()}`;
  await put(STORE_HISTORY, { ...entry, id } as unknown as Record<string, unknown>);
}

export async function loadHistory(limit = 50): Promise<HistoryRecord[]> {
  const all = await getAll<HistoryRecord>(STORE_HISTORY);
  return all
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    .slice(0, limit);
}

// ── 通知配置 CRUD ───────────────────────────
export async function saveNotifyConfig(cfg: NotifyConfig): Promise<void> {
  await put(STORE_NOTIFY_CONFIG, { key: "notifyConfig", ...cfg } as unknown as Record<string, unknown>);
}

export async function loadNotifyConfig(): Promise<NotifyConfig> {
  const existing = await get<NotifyConfig & { key: string }>(STORE_NOTIFY_CONFIG, "notifyConfig");
  if (existing) return { browserNotifEnabled: existing.browserNotifEnabled };
  const fallback: NotifyConfig = { browserNotifEnabled: false };
  await put(STORE_NOTIFY_CONFIG, { key: "notifyConfig", ...fallback } as unknown as Record<string, unknown>);
  return fallback;
}

// ── 通知去重状态 CRUD ───────────────────────
export function notifyStateKey(
  category: string,
  dataId: number | null,
  level: number,
  tier: NotifyTier
): string {
  return `${category}:${dataId ?? "x"}:${level}:${tier}`;
}

export async function isTierNotified(key: string): Promise<boolean> {
  const rec = await get<NotifyStateRecord>(STORE_NOTIFY_STATE, key);
  return !!rec;
}

export async function markTierNotified(key: string): Promise<void> {
  await put(STORE_NOTIFY_STATE, { key, firedAt: Date.now() } as unknown as Record<string, unknown>);
}

export async function clearNotifyState(): Promise<void> {
  await clear(STORE_NOTIFY_STATE);
}

export async function loadNotifyState(): Promise<NotifyStateRecord[]> {
  return await getAll<NotifyStateRecord>(STORE_NOTIFY_STATE);
}

export async function deleteNotifyState(key: string): Promise<void> {
  await del(STORE_NOTIFY_STATE, key);
}

// ── 调度器设置 CRUD ─────────────────────────
export async function saveSettings(settings: SchedulerSettings): Promise<void> {
  await put(STORE_SETTINGS, { key: "settings", ...settings } as unknown as Record<string, unknown>);
}

export async function loadSettings(): Promise<SchedulerSettings> {
  const existing = await get<SchedulerSettings & { key: string }>(STORE_SETTINGS, "settings");
  if (existing) {
    // 合并默认值，防止旧数据缺字段
    return { ...DEFAULT_SETTINGS, ...existing };
  }
  await saveSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

// ── 村庄快照 CRUD（v3 新增）─────────────────
export async function saveVillage(snapshot: import("./types").VillageSnapshot): Promise<void> {
  const record: VillageRecord = {
    key: "latest",
    snapshot,
    capturedAt: snapshot.capturedAt,
  };
  await put(STORE_VILLAGE, record as unknown as Record<string, unknown>);
}

export async function loadVillage(): Promise<VillageRecord | undefined> {
  return await get<VillageRecord>(STORE_VILLAGE, "latest");
}

export async function clearVillage(): Promise<void> {
  await clear(STORE_VILLAGE);
}

// ── v4 新增：JSON 历史记录 CRUD ───────────
// 保存最近 5 次导入历史（旧的自动淘汰）
export interface JsonHistoryRecord {
  id?: number;                  // autoIncrement
  imported_at: string;          // ISO 时间
  player_tag: string;
  player_name: string;
  town_hall_level: number;
  json_raw: string;
  active_upgrades: number;
  base_score?: number | null;
  base_grade?: string | null;
}

export async function addJsonHistory(entry: Omit<JsonHistoryRecord, "id">): Promise<void> {
  await put(STORE_JSON_HISTORY, entry as unknown as Record<string, unknown>);
  // 自动淘汰：只保留最近 5 条
  const all = await getAll<JsonHistoryRecord>(STORE_JSON_HISTORY);
  if (all.length <= 5) return;
  // 按时间降序排序，删除超出 5 条之后的旧记录
  const sorted = all.sort(
    (a, b) => new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime()
  );
  const stale = sorted.slice(5); // 超出 5 条的
  for (const item of stale) {
    if (item.id != null) {
      await delById(STORE_JSON_HISTORY, item.id);
    }
  }
}

export async function loadJsonHistory(): Promise<JsonHistoryRecord[]> {
  const all = await getAll<JsonHistoryRecord>(STORE_JSON_HISTORY);
  return all.sort(
    (a, b) => new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime()
  );
}

export async function deleteJsonHistory(id: number): Promise<void> {
  await delById(STORE_JSON_HISTORY, id);
}

export async function clearJsonHistory(): Promise<void> {
  await clear(STORE_JSON_HISTORY);
}

// ── v4 新增：多账号 CRUD ────────────────
// player_tag 作为主键；空 tag 用 fallback key "anon"
export interface AccountRecord {
  player_tag: string;            // 主键
  player_name: string;
  town_hall_level: number;
  last_import_time: string;      // ISO
  village_data: import("./types").VillageSnapshot | null;
  upgrades: import("./types").UpgradeItem[];
  base_score: number | null;
  base_grade: string | null;
  active: boolean;                // 是否为当前激活账号
  json_raw: string | null;         // 该账号最近一次 JSON 原文
}

export const ANON_TAG = "anon";

function accountKey(playerTag: string): string {
  const t = (playerTag || "").trim();
  return t.length > 0 ? t : ANON_TAG;
}

export async function upsertAccount(account: Omit<AccountRecord, "active"> & { active?: boolean }): Promise<void> {
  const key = accountKey(account.player_tag);
  // 切换账号前先把其他账号 active 置为 false
  if (account.active) {
    const all = await getAll<AccountRecord>(STORE_ACCOUNTS);
    for (const a of all) {
      if (a.active && a.player_tag !== key) {
        await put(STORE_ACCOUNTS, { ...a, active: false } as unknown as Record<string, unknown>);
      }
    }
  }
  await put(STORE_ACCOUNTS, {
    ...account,
    player_tag: key,
    active: account.active ?? false,
  } as unknown as Record<string, unknown>);
}

export async function setActiveAccount(playerTag: string): Promise<void> {
  const key = accountKey(playerTag);
  const all = await getAll<AccountRecord>(STORE_ACCOUNTS);
  for (const a of all) {
    await put(STORE_ACCOUNTS, {
      ...a,
      active: a.player_tag === key,
    } as unknown as Record<string, unknown>);
  }
}

export async function getActiveAccount(): Promise<AccountRecord | undefined> {
  const all = await getAll<AccountRecord>(STORE_ACCOUNTS);
  return all.find((a) => a.active) || all[0];
}

export async function loadAllAccounts(): Promise<AccountRecord[]> {
  const all = await getAll<AccountRecord>(STORE_ACCOUNTS);
  return all.sort(
    (a, b) => new Date(b.last_import_time).getTime() - new Date(a.last_import_time).getTime()
  );
}

export async function getAccount(playerTag: string): Promise<AccountRecord | undefined> {
  return await get<AccountRecord>(STORE_ACCOUNTS, accountKey(playerTag));
}

export async function deleteAccount(playerTag: string): Promise<void> {
  await del(STORE_ACCOUNTS, accountKey(playerTag));
}

export async function clearAccounts(): Promise<void> {
  await clear(STORE_ACCOUNTS);
}

// ── 一次性恢复全部状态（Part 8 自动恢复）──
export interface RestoredState {
  upgrades: RawUpgradeRecord[];
  userData: UserRecord | undefined;
  settings: SchedulerSettings;
  notifyConfig: NotifyConfig;
  village?: VillageRecord;
  /** v1.2.11 起：完成记录参与恢复与备份（之前恒为空，见旧注释） */
  history: HistoryRecord[];
}

export async function loadAll(): Promise<RestoredState> {
  const [upgrades, userData, settings, notifyConfig, village, history] = await Promise.all([
    loadUpgrades(),
    loadUserData(),
    loadSettings(),
    loadNotifyConfig(),
    loadVillage(),
    loadHistory(500),
  ]);
  return { upgrades, userData, settings, notifyConfig, village, history };
}

// ── 重置全部数据 ────────────────────────────
export async function resetAll(): Promise<void> {
  const stores = [
    STORE_UPGRADES, STORE_USER_DATA, STORE_HISTORY,
    STORE_NOTIFY_CONFIG, STORE_NOTIFY_STATE, STORE_SETTINGS,
    STORE_VILLAGE, STORE_JSON_HISTORY, STORE_ACCOUNTS,
  ];
  await Promise.all(stores.map((s) => clear(s)));
  // 注意：不要把 _db 置空——连接本身没坏，清空 store 不需要重开连接；
  // 置空只会让下一次 open() 白白再建一条连接。
}

// ── 备份恢复（单事务 + 前置全量校验） ──────
// 备份文件格式（设置页导出的 coc-backup-*.json）：
//   _meta: { app: "coc-upgrade-reminder", version, schema, exported_at }
//   state: loadAll() 的形状（upgrades / userData / settings / notifyConfig / village）
//   json_history / accounts / notify_state: 各 store 的全部记录
//   monthly_card: 月卡记录 | null（字段缺失 = 旧版备份，不含月卡）
// 恢复流程：先完整校验全部字段形状（validateBackup），全部通过后在一个跨 store
// 的 readwrite 事务里清空并写回——事务内任一 request 失败都会整体回滚，
// 数据不会处于半清空状态。月卡存在 localStorage，不进 IDB 事务，
// 由 restoreFullBackup 在事务成功提交后再落盘。

export const BACKUP_APP_ID = "coc-upgrade-reminder";
export const BACKUP_SCHEMA_VERSION = 1;

/** 校验失败时抛出的错误；调用方可用它区分“文件无效（未做任何修改）”和“恢复中途失败”。 */
export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidDateString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && !Number.isNaN(new Date(v).getTime());
}

function isValidTier(tier: string): tier is NotifyTier {
  return tier === "pre_30m" || tier === "pre_10m" || tier === "complete" || tier === "post_complete";
}

export interface MonthlyCardRestore {
  /** 备份里是否带 monthly_card 字段（缺失 = 旧版备份） */
  present: boolean;
  /** 校验通过的月卡记录；present 且为 null 表示备份里是 null → 应清除当前月卡 */
  record: MonthlyCardRecord | null;
  /** present 但内容非法 → 清除并提示 */
  invalid: boolean;
}

export interface ParsedBackup {
  state: {
    upgrades: Array<Omit<RawUpgradeRecord, "id">>;
    userData?: Omit<UserRecord, "uid">;
    settings: SchedulerSettings;
    notifyConfig: NotifyConfig;
    village?: VillageRecord;
  };
  /** 完成记录（v1.2.11 起随 state 备份；旧版备份缺失时为空数组） */
  history: HistoryRecord[];
  jsonHistory: Array<Omit<JsonHistoryRecord, "id">>;
  accounts: AccountRecord[];
  notifyState: NotifyStateRecord[];
  monthlyCard: MonthlyCardRestore;
  warnings: string[];
}

export interface RestoreCounts {
  upgrades: number;
  history: number;
  jsonHistory: number;
  accounts: number;
  notifyState: number;
}

export interface RestoreResult {
  counts: RestoreCounts;
  /** restored = 已写入备份里的月卡；cleared = 备份里无月卡/月卡无效，已清除当前月卡；kept = 旧版备份不含月卡字段，保留当前月卡 */
  monthlyCard: "restored" | "cleared" | "kept";
  warnings: string[];
}

function parseBackupText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new BackupValidationError("备份文件不是有效的 JSON");
  }
}

/** 校验并归一化备份对象。只做纯校验/归一化，不写任何数据；失败时抛 BackupValidationError。 */
export function validateBackup(data: unknown): ParsedBackup {
  if (!isPlainObject(data)) {
    throw new BackupValidationError("备份文件不是有效的 JSON 对象");
  }

  // ── _meta：来源与版本 ──
  const meta = data._meta;
  if (!isPlainObject(meta)) {
    throw new BackupValidationError("备份文件缺少标识（_meta），无法确认来源");
  }
  if (meta.app !== BACKUP_APP_ID) {
    throw new BackupValidationError("不是本应用的备份文件");
  }
  if (meta.schema !== undefined) {
    if (typeof meta.schema !== "number" || meta.schema > BACKUP_SCHEMA_VERSION) {
      throw new BackupValidationError("此备份来自更新版本，可能不兼容");
    }
  }

  // ── state ──
  const rawState = data.state;
  if (!isPlainObject(rawState)) {
    throw new BackupValidationError("备份文件缺少 state");
  }

  // upgrades：必填数组，逐项校验形状（白名单归一化，不透传多余字段）
  if (!Array.isArray(rawState.upgrades)) {
    throw new BackupValidationError("备份中 upgrades 缺失或不是数组");
  }
  const upgrades: Array<Omit<RawUpgradeRecord, "id">> = rawState.upgrades.map((u, i) => {
    if (!isPlainObject(u)) {
      throw new BackupValidationError(`upgrades[${i}] 不是对象`);
    }
    if (typeof u.category !== "string" || !u.category) {
      throw new BackupValidationError(`upgrades[${i}].category 非法`);
    }
    if (typeof u.item_name !== "string" || !u.item_name) {
      throw new BackupValidationError(`upgrades[${i}].item_name 非法`);
    }
    if (typeof u.item_level !== "number" || !Number.isFinite(u.item_level)) {
      throw new BackupValidationError(`upgrades[${i}].item_level 非法`);
    }
    if (!isValidDateString(u.finish_time)) {
      throw new BackupValidationError(`upgrades[${i}].finish_time 非法`);
    }
    if (u.timer_seconds !== undefined && u.timer_seconds !== null && typeof u.timer_seconds !== "number") {
      throw new BackupValidationError(`upgrades[${i}].timer_seconds 非法`);
    }
    if (u.notified !== undefined && typeof u.notified !== "boolean") {
      throw new BackupValidationError(`upgrades[${i}].notified 非法`);
    }
    if (u.data_id !== undefined && u.data_id !== null && typeof u.data_id !== "number") {
      throw new BackupValidationError(`upgrades[${i}].data_id 非法`);
    }
    return {
      category: u.category,
      item_name: u.item_name,
      item_level: u.item_level,
      finish_time: u.finish_time as string,
      timer_seconds: typeof u.timer_seconds === "number" ? u.timer_seconds : null,
      notified: typeof u.notified === "boolean" ? u.notified : false,
      data_id: typeof u.data_id === "number" ? u.data_id : null,
    };
  });

  // userData：可选；若存在则 client_id 必须为 string
  let userData: Omit<UserRecord, "uid"> | undefined;
  if (rawState.userData !== undefined && rawState.userData !== null) {
    const u = rawState.userData;
    if (!isPlainObject(u)) {
      throw new BackupValidationError("state.userData 不是对象");
    }
    if (typeof u.client_id !== "string") {
      throw new BackupValidationError("state.userData.client_id 非法");
    }
    const optStr = (v: unknown, name: string): string | null => {
      if (v === undefined || v === null) return null;
      if (typeof v !== "string") throw new BackupValidationError(`state.userData.${name} 非法`);
      return v;
    };
    userData = {
      client_id: u.client_id,
      player_tag: optStr(u.player_tag, "player_tag"),
      player_name: optStr(u.player_name, "player_name"),
      last_json_raw: optStr(u.last_json_raw, "last_json_raw"),
      last_upload_at: optStr(u.last_upload_at, "last_upload_at"),
      last_sync_at: optStr(u.last_sync_at, "last_sync_at"),
    };
  }

  // settings：可选（缺失用默认值）；若存在必须是普通对象，已知字段校验类型；
  // 这里故意不透传 s.key（store 主键），恢复时由写入方固定写 "settings"
  const SETTINGS_BOOL_KEYS = ["enablePre30m", "enablePre10m", "enableComplete", "enablePostComplete", "enableBatch", "dndEnabled"] as const;
  const SETTINGS_NUM_KEYS = ["batchWindowMinutes", "dndStart", "dndEnd"] as const;
  const SETTINGS_STR_KEYS = ["last_notify_at", "last_sync_at"] as const;
  let settings: SchedulerSettings = { ...DEFAULT_SETTINGS };
  if (rawState.settings !== undefined && rawState.settings !== null) {
    const s = rawState.settings;
    if (!isPlainObject(s)) {
      throw new BackupValidationError("state.settings 不是对象");
    }
    const picked: Partial<SchedulerSettings> = {};
    for (const k of SETTINGS_BOOL_KEYS) {
      if (s[k] !== undefined && typeof s[k] !== "boolean") {
        throw new BackupValidationError(`state.settings.${k} 非法`);
      }
      if (typeof s[k] === "boolean") picked[k] = s[k];
    }
    for (const k of SETTINGS_NUM_KEYS) {
      if (s[k] !== undefined && (typeof s[k] !== "number" || !Number.isFinite(s[k]))) {
        throw new BackupValidationError(`state.settings.${k} 非法`);
      }
      if (typeof s[k] === "number") picked[k] = s[k];
    }
    for (const k of SETTINGS_STR_KEYS) {
      if (s[k] !== undefined && s[k] !== null && typeof s[k] !== "string") {
        throw new BackupValidationError(`state.settings.${k} 非法`);
      }
      if (s[k] !== undefined) picked[k] = s[k] as string | null;
    }
    settings = { ...DEFAULT_SETTINGS, ...picked };
  }

  // notifyConfig：可选（缺失用默认值）
  let notifyConfig: NotifyConfig = { browserNotifEnabled: false };
  if (rawState.notifyConfig !== undefined && rawState.notifyConfig !== null) {
    const n = rawState.notifyConfig;
    if (!isPlainObject(n)) {
      throw new BackupValidationError("state.notifyConfig 不是对象");
    }
    if (n.browserNotifEnabled !== undefined && typeof n.browserNotifEnabled !== "boolean") {
      throw new BackupValidationError("state.notifyConfig.browserNotifEnabled 非法");
    }
    notifyConfig = { browserNotifEnabled: n.browserNotifEnabled === true };
  }

  // village：可选；若存在则 snapshot.items 必须是数组（否则首页 analyzeBase 会崩）
  let village: VillageRecord | undefined;
  if (rawState.village !== undefined && rawState.village !== null) {
    const v = rawState.village;
    if (!isPlainObject(v) || !isPlainObject(v.snapshot)) {
      throw new BackupValidationError("state.village.snapshot 缺失或不是对象");
    }
    const snap = v.snapshot as Record<string, unknown>;
    if (!isValidDateString(snap.capturedAt)) {
      throw new BackupValidationError("state.village.snapshot.capturedAt 非法");
    }
    if (!Array.isArray(snap.items) || snap.items.some((it) => !isPlainObject(it))) {
      throw new BackupValidationError("state.village.snapshot.items 非法");
    }
    village = {
      key: "latest",
      snapshot: snap as unknown as VillageRecord["snapshot"],
      capturedAt: snap.capturedAt as string,
    };
  }

  // ── history：完成记录（v1.2.11 起随 state 备份；旧版备份缺失 = 空）──
  const history: HistoryRecord[] = [];
  const rawHistory = rawState.history;
  if (rawHistory !== undefined && rawHistory !== null) {
    if (!Array.isArray(rawHistory)) {
      throw new BackupValidationError("state.history 不是数组");
    }
    rawHistory.forEach((h, i) => {
      if (!isPlainObject(h)) {
        throw new BackupValidationError(`state.history[${i}] 不是对象`);
      }
      if (typeof h.item_name !== "string" || !h.item_name) {
        throw new BackupValidationError(`state.history[${i}].item_name 非法`);
      }
      if (typeof h.category !== "string" || !h.category) {
        throw new BackupValidationError(`state.history[${i}].category 非法`);
      }
      if (typeof h.item_level !== "number" || !Number.isFinite(h.item_level)) {
        throw new BackupValidationError(`state.history[${i}].item_level 非法`);
      }
      if (!isValidDateString(h.completed_at)) {
        throw new BackupValidationError(`state.history[${i}].completed_at 非法`);
      }
      if (h.data_id !== undefined && h.data_id !== null && typeof h.data_id !== "number") {
        throw new BackupValidationError(`state.history[${i}].data_id 非法`);
      }
      history.push({
        id: typeof h.id === "string" && h.id ? h.id : `${h.category}-${h.completed_at}-${Date.now()}-${i}`,
        item_name: h.item_name as string,
        category: h.category as string,
        item_level: h.item_level as number,
        completed_at: h.completed_at as string,
        data_id: typeof h.data_id === "number" ? h.data_id : null,
      });
    });
  }

  // ── json_history ──
  const warnings: string[] = [];
  const jsonHistory: Array<Omit<JsonHistoryRecord, "id">> = [];
  if (data.json_history !== undefined && data.json_history !== null) {
    if (!Array.isArray(data.json_history)) {
      throw new BackupValidationError("json_history 不是数组");
    }
    if (data.json_history.length > 5) {
      warnings.push(`备份中有 ${data.json_history.length} 条 JSON 历史，超过上限 5 条，将全部恢复`);
    }
    data.json_history.forEach((h, i) => {
      if (!isPlainObject(h)) {
        throw new BackupValidationError(`json_history[${i}] 不是对象`);
      }
      if (!isValidDateString(h.imported_at)) {
        throw new BackupValidationError(`json_history[${i}].imported_at 非法`);
      }
      if (typeof h.player_tag !== "string") {
        throw new BackupValidationError(`json_history[${i}].player_tag 非法`);
      }
      if (typeof h.json_raw !== "string") {
        throw new BackupValidationError(`json_history[${i}].json_raw 非法`);
      }
      if (h.player_name !== undefined && typeof h.player_name !== "string") {
        throw new BackupValidationError(`json_history[${i}].player_name 非法`);
      }
      if (h.town_hall_level !== undefined && typeof h.town_hall_level !== "number") {
        throw new BackupValidationError(`json_history[${i}].town_hall_level 非法`);
      }
      if (h.active_upgrades !== undefined && typeof h.active_upgrades !== "number") {
        throw new BackupValidationError(`json_history[${i}].active_upgrades 非法`);
      }
      if (h.base_score !== undefined && h.base_score !== null && typeof h.base_score !== "number") {
        throw new BackupValidationError(`json_history[${i}].base_score 非法`);
      }
      if (h.base_grade !== undefined && h.base_grade !== null && typeof h.base_grade !== "string") {
        throw new BackupValidationError(`json_history[${i}].base_grade 非法`);
      }
      jsonHistory.push({
        imported_at: h.imported_at as string,
        player_tag: h.player_tag as string,
        player_name: typeof h.player_name === "string" ? h.player_name : "",
        town_hall_level: typeof h.town_hall_level === "number" ? h.town_hall_level : 0,
        json_raw: h.json_raw as string,
        active_upgrades: typeof h.active_upgrades === "number" ? h.active_upgrades : 0,
        base_score: typeof h.base_score === "number" ? h.base_score : null,
        base_grade: typeof h.base_grade === "string" ? h.base_grade : null,
      });
    });
  }

  // ── accounts ──
  const accounts: AccountRecord[] = [];
  if (data.accounts !== undefined && data.accounts !== null) {
    if (!Array.isArray(data.accounts)) {
      throw new BackupValidationError("accounts 不是数组");
    }
    data.accounts.forEach((a, i) => {
      if (!isPlainObject(a)) {
        throw new BackupValidationError(`accounts[${i}] 不是对象`);
      }
      if (typeof a.player_tag !== "string") {
        throw new BackupValidationError(`accounts[${i}].player_tag 非法`);
      }
      if (a.last_import_time !== undefined && !isValidDateString(a.last_import_time)) {
        throw new BackupValidationError(`accounts[${i}].last_import_time 非法`);
      }
      if (a.player_name !== undefined && typeof a.player_name !== "string") {
        throw new BackupValidationError(`accounts[${i}].player_name 非法`);
      }
      if (a.town_hall_level !== undefined && typeof a.town_hall_level !== "number") {
        throw new BackupValidationError(`accounts[${i}].town_hall_level 非法`);
      }
      if (a.village_data !== undefined && a.village_data !== null && !isPlainObject(a.village_data)) {
        throw new BackupValidationError(`accounts[${i}].village_data 非法`);
      }
      if (a.upgrades !== undefined && !Array.isArray(a.upgrades)) {
        throw new BackupValidationError(`accounts[${i}].upgrades 非法`);
      }
      if (a.base_score !== undefined && a.base_score !== null && typeof a.base_score !== "number") {
        throw new BackupValidationError(`accounts[${i}].base_score 非法`);
      }
      if (a.base_grade !== undefined && a.base_grade !== null && typeof a.base_grade !== "string") {
        throw new BackupValidationError(`accounts[${i}].base_grade 非法`);
      }
      if (a.active !== undefined && typeof a.active !== "boolean") {
        throw new BackupValidationError(`accounts[${i}].active 非法`);
      }
      if (a.json_raw !== undefined && a.json_raw !== null && typeof a.json_raw !== "string") {
        throw new BackupValidationError(`accounts[${i}].json_raw 非法`);
      }
      accounts.push({
        player_tag: (a.player_tag as string).trim() || ANON_TAG,
        player_name: typeof a.player_name === "string" ? a.player_name : "",
        town_hall_level: typeof a.town_hall_level === "number" ? a.town_hall_level : 0,
        last_import_time: isValidDateString(a.last_import_time)
          ? (a.last_import_time as string)
          : new Date().toISOString(),
        village_data: (a.village_data as AccountRecord["village_data"]) ?? null,
        upgrades: Array.isArray(a.upgrades) ? (a.upgrades as AccountRecord["upgrades"]) : [],
        base_score: typeof a.base_score === "number" ? a.base_score : null,
        base_grade: typeof a.base_grade === "string" ? a.base_grade : null,
        active: a.active === true,
        json_raw: typeof a.json_raw === "string" ? a.json_raw : null,
      });
    });
    // 主键去重：归一化后 player_tag 重复会互相覆盖，直接拒绝
    const seen = new Set<string>();
    for (const a of accounts) {
      if (seen.has(a.player_tag)) {
        throw new BackupValidationError(`accounts 中 player_tag "${a.player_tag}" 重复`);
      }
      seen.add(a.player_tag);
    }
    // 只保留最后一个 active=true（与 upsertAccount 逐条写入的语义一致）
    let lastActive = -1;
    accounts.forEach((a, i) => {
      if (a.active) lastActive = i;
    });
    accounts.forEach((a, i) => {
      a.active = i === lastActive;
    });
  }

  // ── notify_state ──
  // 去重记录损坏时跳过并提示即可：坏 key 只影响“某条通知可能重复发”，
  // 不像 upgrades 那样会弄坏数据库，所以不因此拒绝整个备份。
  const notifyState: NotifyStateRecord[] = [];
  if (data.notify_state !== undefined && data.notify_state !== null) {
    if (!Array.isArray(data.notify_state)) {
      throw new BackupValidationError("notify_state 不是数组");
    }
    let skipped = 0;
    data.notify_state.forEach((n) => {
      if (!isPlainObject(n) || typeof n.key !== "string" || !n.key) {
        skipped++;
        return;
      }
      if (typeof n.firedAt !== "number" || !Number.isFinite(n.firedAt)) {
        skipped++;
        return;
      }
      const parts = (n.key as string).split(":");
      if (
        parts.length !== 4 ||
        !parts[0] ||
        (parts[1] !== "x" && Number.isNaN(Number(parts[1]))) ||
        Number.isNaN(Number(parts[2])) ||
        !isValidTier(parts[3])
      ) {
        skipped++;
        return;
      }
      notifyState.push({ key: n.key as string, firedAt: n.firedAt as number });
    });
    if (skipped > 0) {
      warnings.push(`已跳过 ${skipped} 条格式异常的通知去重记录`);
    }
  }

  // ── monthly_card ──
  // 字段存在 → 覆盖语义：合法则写入，null/非法则清除；
  // 字段缺失（旧版备份）→ 不动 localStorage，调用方据此提示用户。
  let monthlyCard: MonthlyCardRestore = { present: false, record: null, invalid: false };
  if ("monthly_card" in data) {
    const mc = data.monthly_card;
    if (mc === null || mc === undefined) {
      monthlyCard = { present: true, record: null, invalid: false };
    } else if (!isPlainObject(mc)) {
      monthlyCard = { present: true, record: null, invalid: true };
    } else {
      const a = new Date(mc.activatedAt as string).getTime();
      const e = new Date(mc.expiredAt as string).getTime();
      if (
        typeof mc.activatedAt === "string" &&
        typeof mc.expiredAt === "string" &&
        !Number.isNaN(a) &&
        !Number.isNaN(e) &&
        e > a
      ) {
        // 只写三个白名单字段，不透传备份里的其它脏字段
        monthlyCard = {
          present: true,
          record: {
            activatedAt: mc.activatedAt as string,
            expiredAt: mc.expiredAt as string,
            ...(typeof mc.note === "string" ? { note: mc.note as string } : {}),
          },
          invalid: false,
        };
      } else {
        monthlyCard = { present: true, record: null, invalid: true };
      }
    }
    if (monthlyCard.invalid) {
      warnings.push("备份中的月卡数据无效，已清除当前月卡");
    }
  }

  return {
    state: {
      upgrades,
      ...(userData ? { userData } : {}),
      settings,
      notifyConfig,
      ...(village ? { village } : {}),
    },
    history,
    jsonHistory,
    accounts,
    notifyState,
    monthlyCard,
    warnings,
  };
}

const RESTORE_STORES = [
  STORE_UPGRADES,
  STORE_USER_DATA,
  STORE_HISTORY,
  STORE_NOTIFY_CONFIG,
  STORE_NOTIFY_STATE,
  STORE_SETTINGS,
  STORE_VILLAGE,
  STORE_JSON_HISTORY,
  STORE_ACCOUNTS,
];

/**
 * 单事务恢复：先 clear 全部 9 个 store 再写回已校验的数据。
 * 事务是原子的——任一 request 失败都会整体回滚，不会留下半清空的数据库。
 * 注意：await 的只能是进行中的 IDB request（可保持事务存活），
 * 中间不能 await 其它异步操作，否则事务会自动提交。
 */
async function restoreInOneTx(b: ParsedBackup): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RESTORE_STORES, "readwrite");
    const settled = new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error ?? new Error("恢复事务失败"));
      tx.onabort = () => rej(tx.error ?? new Error("恢复事务已中止"));
    });
    // settled 若被拒绝但无人 await（request 先报错时），避免未处理 rejection 告警
    settled.catch(() => {});
    const track = <T>(req: IDBRequest<T>): Promise<T> =>
      new Promise<T>((res, rej) => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    void (async () => {
      try {
        for (const s of RESTORE_STORES) tx.objectStore(s).clear();
        for (const u of b.state.upgrades) {
          await track(tx.objectStore(STORE_UPGRADES).put(u));
        }
        if (b.state.userData) {
          await track(tx.objectStore(STORE_USER_DATA).put({ ...b.state.userData, uid: "default" }));
        }
        await track(tx.objectStore(STORE_SETTINGS).put({ key: "settings", ...b.state.settings }));
        await track(
          tx.objectStore(STORE_NOTIFY_CONFIG).put({ key: "notifyConfig", ...b.state.notifyConfig })
        );
        if (b.state.village) {
          await track(tx.objectStore(STORE_VILLAGE).put(b.state.village));
        }
        for (const n of b.notifyState) {
          await track(tx.objectStore(STORE_NOTIFY_STATE).put(n));
        }
        for (const h of b.history) {
          await track(tx.objectStore(STORE_HISTORY).put(h));
        }
        // 直接 put，不走 addJsonHistory 的 5 条淘汰逻辑（恢复不应静默丢数据）
        for (const h of b.jsonHistory) {
          await track(tx.objectStore(STORE_JSON_HISTORY).put(h));
        }
        for (const a of b.accounts) {
          await track(tx.objectStore(STORE_ACCOUNTS).put(a));
        }
        await settled;
        resolve();
      } catch (e) {
        try {
          tx.abort();
        } catch {
          /* 事务已中止则忽略 */
        }
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    })();
  });
}

function countParsed(b: ParsedBackup): RestoreCounts {
  return {
    upgrades: b.state.upgrades.length,
    history: b.history.length,
    jsonHistory: b.jsonHistory.length,
    accounts: b.accounts.length,
    notifyState: b.notifyState.length,
  };
}

/**
 * 仅恢复 IndexedDB 部分（接受已解析的备份对象；传字符串时先 JSON.parse）。
 * 先完整校验再写库；校验失败不碰任何数据。
 */
export async function restoreBackup(data: unknown): Promise<{ counts: RestoreCounts; warnings: string[] }> {
  const parsed = validateBackup(typeof data === "string" ? parseBackupText(data) : data);
  await restoreInOneTx(parsed);
  return { counts: countParsed(parsed), warnings: parsed.warnings };
}

/**
 * 完整恢复：IndexedDB（单事务）+ 月卡（localStorage）。
 * 月卡语义：备份里带 monthly_card 字段 → 覆盖（合法则写入，null/非法则清除）；
 * 字段缺失（旧版备份）→ 保留当前月卡。月卡在 IDB 事务成功提交后才落盘，
 * 事务失败时月卡保持原值。
 */
export async function restoreFullBackup(data: unknown): Promise<RestoreResult> {
  const parsed = validateBackup(typeof data === "string" ? parseBackupText(data) : data);
  await restoreInOneTx(parsed);
  let monthlyCard: RestoreResult["monthlyCard"];
  if (!parsed.monthlyCard.present) {
    monthlyCard = "kept";
  } else if (parsed.monthlyCard.record) {
    saveMonthlyCard(parsed.monthlyCard.record);
    monthlyCard = "restored";
  } else {
    clearMonthlyCard();
    monthlyCard = "cleared";
  }
  return { counts: countParsed(parsed), monthlyCard, warnings: parsed.warnings };
}
