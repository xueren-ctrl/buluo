/**
 * 排期时间线 — 所有进行中升级按完成时间排成时间线
 * ============================================
 * 按完成日期分组（今天 / 明天 / M月d日），组内按完成时间排序；
 * 每行一条进度条：已走过的部分按导出时的剩余时间（timer_seconds）
 * 与当前剩余时间折算，剩下的长度一眼看出谁先完成。
 */
"use client";

import { useMemo } from "react";
import type { UpgradeItem } from "@/types";
import { getUpgradeDisplay } from "@/lib/coc-assets";
import {
  formatRemaining,
  formatFinishTime,
  getRemainingSeconds,
  getProgressBarPercent,
} from "@/lib/utils";
import { SectionTitle } from "./SectionTitle";

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(d, now)) return "今天";
  if (sameDay(d, tomorrow)) return "明天";
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", weekday: "short" });
}

export function ScheduleTimeline({ items }: { items: UpgradeItem[] }) {
  const groups = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(a.finish_time).getTime() - new Date(b.finish_time).getTime()
    );
    const map = new Map<string, UpgradeItem[]>();
    for (const u of sorted) {
      const label = dayLabel(u.finish_time);
      const arr = map.get(label) ?? [];
      arr.push(u);
      map.set(label, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  if (items.length === 0) return null;

  return (
    <section className="w-full mb-4">
      <SectionTitle title="排期时间线" count={items.length} />
      <div className="space-y-3">
        {groups.map(([label, list]) => (
          <div key={label}>
            <p className="text-[11px] font-semibold text-muted mb-1.5 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
              {label}
              <span className="font-normal">· {list.length} 项</span>
            </p>
            <div className="space-y-1.5">
              {list.map((u) => {
                const display = getUpgradeDisplay(u.category, u.data_id ?? null, u.item_level);
                const remaining = getRemainingSeconds(u.finish_time);
                const pct = getProgressBarPercent(u.finish_time, u.timer_seconds);
                return (
                  <div
                    key={`${u.category}-${u.data_id ?? u.item_name}-${u.item_level}`}
                    className="coc-card p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="coc-icon-tile flex-shrink-0 w-9 h-9 flex items-center justify-center text-base">
                        {display.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="coc-item-name font-semibold text-sm text-main truncate">
                          {display.zh}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">
                          预计 {formatFinishTime(u.finish_time)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="coc-countdown text-sm font-semibold text-main">
                          剩 {formatRemaining(remaining)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-gold)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ScheduleTimeline;
