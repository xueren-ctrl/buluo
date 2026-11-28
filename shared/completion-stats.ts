/**
 * 完成统计 — 升级完成记录的聚合
 * ============================================
 * 数据来源（两条写入路径，addHistory 内按
 * category:data_id:level:completed_at 去重）：
 *  1. 调度器 tick：升级完成通知触发时记一条（APP 打开期间完成）
 *  2. 重新解析：新旧快照 diff 出已完成项时记一条（APP 关闭期间完成）
 * 统计时再把当前升级列表里已过期（finish_time <= now）但还没来得及
 * 记入 history 的项合并进来，同样按键去重，避免重复计数。
 */

import { loadHistory, loadUpgrades, type HistoryRecord } from "./indexeddb";
import type { UpgradeItem } from "./types";

export interface CompletionStatsData {
  today: number; // 今天完成
  week: number; // 近 7 天完成
  month: number; // 本月完成
  total: number; // 累计完成
  recent: HistoryRecord[]; // 最近完成（最多 10 条，按完成时间倒序）
}

/** 完成项的去重键：分类 + SC ID（无则用名）+ 等级 + 完成时间 */
export function completionKey(
  category: string,
  dataId: number | null | undefined,
  itemName: string,
  level: number,
  completedAt: string
): string {
  return `${category}:${dataId ?? itemName}:${level}:${completedAt}`;
}

/** 从新旧快照里找出已完成项（旧有、新无、且已过完成时间） */
export function findCompletions(prev: UpgradeItem[], next: UpgradeItem[]): UpgradeItem[] {
  const nextKeys = new Set(next.map((u) => `${u.category}:${u.data_id ?? u.item_name}`));
  const now = Date.now();
  return prev.filter(
    (u) =>
      !nextKeys.has(`${u.category}:${u.data_id ?? u.item_name}`) &&
      new Date(u.finish_time).getTime() <= now
  );
}

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

export async function loadCompletionStats(): Promise<CompletionStatsData> {
  const [history, upgrades] = await Promise.all([loadHistory(500), loadUpgrades()]);

  const map = new Map<string, HistoryRecord>();
  for (const h of history) {
    map.set(
      completionKey(h.category, h.data_id ?? null, h.item_name, h.item_level, h.completed_at),
      h
    );
  }
  // 当前列表里已过期但尚未记入 history 的项（下次 tick / 重新解析会补记）
  const nowMs = Date.now();
  for (const u of upgrades) {
    if (new Date(u.finish_time).getTime() > nowMs) continue;
    const key = completionKey(u.category, u.data_id ?? null, u.item_name, u.item_level, u.finish_time);
    if (map.has(key)) continue;
    map.set(key, {
      id: `live-${key}`,
      item_name: u.item_name,
      category: u.category,
      item_level: u.item_level,
      completed_at: u.finish_time,
      data_id: u.data_id ?? null,
    });
  }

  const all = Array.from(map.values()).sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000; // 近 7 天（含今天）
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let today = 0;
  let week = 0;
  let month = 0;
  for (const h of all) {
    const t = new Date(h.completed_at).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= todayStart) today++;
    if (t >= weekStart) week++;
    if (t >= monthStart) month++;
  }

  return {
    today,
    week,
    month,
    total: all.length,
    recent: all.slice(0, 10),
  };
}
