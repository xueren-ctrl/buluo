/**
 * 即将完成高亮卡片 — 倒计时最短的一项
 */
import type { UpgradeItem } from "@/types";
import { getUpgradeDisplay } from "@/lib/coc-assets";
import { formatCompactRemaining, getRemainingSeconds } from "@/lib/utils";

export function NextCompletingCard({ item }: { item: UpgradeItem }) {
  const remaining = getRemainingSeconds(item.finish_time);
  const done = remaining <= 0;
  const display = getUpgradeDisplay(item.category, item.data_id ?? null, item.item_level);

  return (
    <div className={`glass-card overflow-hidden p-3 border-red-500/40 bg-gradient-to-r ${done ? "from-green-500/10 to-transparent" : "from-red-500/15 to-transparent"} animate-urgent`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-dark-900/60 border border-red-500/30`}>
          {display.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{display.zh}</p>
          <p className="text-xs text-dark-400">
            {done ? "✅ 已完成!" : `剩余 ${formatCompactRemaining(remaining)}`}
          </p>
        </div>
        {!done && <div className={`text-base font-bold ${remaining <= 1800 ? "text-red-400" : "text-amber-400"}`}>
          {formatCompactRemaining(remaining)}
        </div>}
      </div>
    </div>
  );
}

export default NextCompletingCard;
