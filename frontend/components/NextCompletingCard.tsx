/**
 * 即将完成高亮卡片 — 倒计时最短的一项（CoC 简约风格）
 */
import type { UpgradeItem } from "@/types";
import { getUpgradeDisplay } from "@/lib/coc-assets";
import { formatCompactRemaining, getRemainingSeconds } from "@/lib/utils";

export function NextCompletingCard({ item }: { item: UpgradeItem }) {
  const remaining = getRemainingSeconds(item.finish_time);
  const done = remaining <= 0;
  const display = getUpgradeDisplay(item.category, item.data_id ?? null, item.item_level);

  return (
    <div
      className={`coc-card p-3 ${done ? "coc-completed" : ""}`}
      style={!done ? { borderColor: "var(--color-danger)" } : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded flex items-center justify-center text-xl flex-shrink-0"
          style={{
            background: "var(--bg-panel-alt)",
            border: "1px solid var(--border-gold)",
          }}
        >
          {display.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-main truncate">{display.zh}</p>
          <p className="text-xs text-muted">
            {done ? "已完成" : "即将完成"}
          </p>
        </div>
        {!done && (
          <div className="coc-countdown coc-countdown-large coc-countdown-urgent flex-shrink-0">
            {formatCompactRemaining(remaining)}
          </div>
        )}
        {done && <span className="coc-tag coc-tag-done">已完成</span>}
      </div>
    </div>
  );
}

export default NextCompletingCard;
