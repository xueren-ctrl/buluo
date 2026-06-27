/**
 * 升级项卡片 — 含进度条、倒计时、分类配色
 */
import type { UpgradeItem } from "@/types";
import { getUrgencyLevel } from "@/types";
import { getUpgradeDisplay } from "@/lib/coc-assets";
import {
  formatCompactRemaining,
  formatFinishTime,
  getRemainingSeconds,
  getCategoryBorder,
  getCategoryText,
} from "@/lib/utils";

export function UpgradeCard({ item }: { item: UpgradeItem }) {
  const remaining = getRemainingSeconds(item.finish_time);
  const done = remaining <= 0;
  const display = getUpgradeDisplay(item.category, item.data_id ?? null, item.item_level);
  const barPercent = item.timer_seconds && item.timer_seconds > 0
    ? Math.min(100, Math.max(2, ((item.timer_seconds - remaining) / item.timer_seconds) * 100))
    : 0;

  const cardBorder = getCategoryBorder(item.category);
  const cardColor = getCategoryText(item.category);

  const urgency = getUrgencyLevel(remaining);
  const urgentAnim = urgency === "urgent" && !done ? "animate-urgent" : "";

  return (
    <div className={`glass-card overflow-hidden ${cardBorder} ${urgentAnim} transition-all duration-300 hover:translate-y-[-1px]`}>
      <div className="flex items-center gap-2.5 p-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-dark-900/50 border ${cardBorder}`}>
          {display.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold text-sm ${cardColor}`}>{display.zh}</span>
            {item.notified && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">已通知</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-dark-500">
            <span>{done ? "✅ 已完成" : `预计 ${formatFinishTime(item.finish_time)}`}</span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className={`text-base font-bold tabular-nums ${done ? "text-green-400" : remaining <= 3600 ? "text-red-400" : remaining <= 7200 ? "text-amber-400" : "text-dark-200"}`}>
            {done ? "✅" : formatCompactRemaining(remaining)}
          </div>
        </div>
      </div>

      {!done && (
        <div className="progress-bar mx-3 mb-2">
          <div
            className={`progress-bar-fill h-full rounded-full bg-gradient-to-r ${
              urgency === "urgent" ? "from-red-600 to-red-400"
                : urgency === "soon" ? "from-amber-600 to-amber-400"
                : "from-brand-600 to-brand-400"
            }`}
            style={{ width: `${barPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default UpgradeCard;
