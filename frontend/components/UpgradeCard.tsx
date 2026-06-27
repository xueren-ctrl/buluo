/**
 * 升级项卡片 — CoC 简约风格，无进度条，大字倒计时
 */
import type { UpgradeItem } from "@/types";
import { getUrgencyLevel } from "@/types";
import { getUpgradeDisplay } from "@/lib/coc-assets";
import {
  formatCompactRemaining,
  formatFinishTime,
  getRemainingSeconds,
} from "@/lib/utils";

export function UpgradeCard({ item }: { item: UpgradeItem }) {
  const remaining = getRemainingSeconds(item.finish_time);
  const done = remaining <= 0;
  const display = getUpgradeDisplay(item.category, item.data_id ?? null, item.item_level);

  const urgency = getUrgencyLevel(remaining);
  const isUrgent = urgency === "urgent" && !done;

  return (
    <div
      className={`coc-card p-2.5 ${done ? "coc-completed" : ""}`}
      style={isUrgent ? { borderColor: "var(--color-danger)" } : undefined}
    >
      <div className="flex items-center gap-2.5">
        {/* 图标 */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center text-lg"
          style={{
            background: "var(--bg-panel-alt)",
            border: "1px solid var(--border-light)",
          }}
        >
          {display.icon}
        </div>

        {/* 名称 + 完成时间 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="coc-item-name font-semibold text-sm text-main truncate">
              {display.zh}
            </span>
            {item.notified && (
              <span className="coc-tag coc-tag-done">已通知</span>
            )}
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            {done ? "已完成" : `预计 ${formatFinishTime(item.finish_time)}`}
          </div>
        </div>

        {/* 大字倒计时 */}
        <div className="flex-shrink-0 text-right">
          {done ? (
            <span className="coc-tag coc-tag-done">已完成</span>
          ) : (
            <span
              className={`coc-countdown coc-countdown-large ${
                isUrgent ? "coc-countdown-urgent" : ""
              }`}
            >
              {formatCompactRemaining(remaining)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpgradeCard;
