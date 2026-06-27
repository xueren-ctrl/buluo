/**
 * 最近完成列表 — CoC 羊皮纸风格
 */
import type { UpgradeItem } from "@/types";
import { getUpgradeDisplay } from "@/lib/coc-assets";
import { formatFinishTime } from "@/lib/utils";
import { SectionTitle } from "./SectionTitle";

function CompletedCard({ item }: { item: UpgradeItem }) {
  const display = getUpgradeDisplay(item.category, item.data_id ?? null, item.item_level);
  return (
    <div className="coc-card p-2.5 coc-completed flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base opacity-60">{display.icon}</span>
        <span className="coc-item-name font-medium text-sm text-main truncate">
          {display.zh}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-muted">{formatFinishTime(item.finish_time)}</span>
        <span className="coc-tag coc-tag-done">已完成</span>
      </div>
    </div>
  );
}

export function CompletedList({ items, max = 10 }: { items: UpgradeItem[]; max?: number }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, max);
  return (
    <section className="w-full mt-5 mb-4">
      <SectionTitle title="最近完成" count={Math.min(items.length, max)} />
      <div className="space-y-1.5">
        {shown.map((upg) => (
          <CompletedCard
            key={`done-${upg.category}-${upg.data_id ?? upg.item_name}-${upg.item_level}`}
            item={upg}
          />
        ))}
      </div>
    </section>
  );
}

export default CompletedList;
