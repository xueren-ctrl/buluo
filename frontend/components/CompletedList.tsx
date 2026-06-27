/**
 * 最近完成列表
 */
import type { UpgradeItem } from "@/types";
import { getUpgradeDisplay } from "@/lib/coc-assets";
import { formatFinishTime, getCategoryText } from "@/lib/utils";
import { SectionTitle } from "./SectionTitle";

function CompletedCard({ item }: { item: UpgradeItem }) {
  const display = getUpgradeDisplay(item.category, item.data_id ?? null, item.item_level);
  return (
    <div className={`glass-card p-2.5 border-green-500/20 bg-gradient-to-r from-green-500/6 to-transparent flex items-center justify-between`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base text-green-500/50">{display.icon}</span>
        <span className={`font-medium text-sm truncate ${getCategoryText(item.category)}`}>
          {display.zh}
        </span>
      </div>
      <span className="text-[10px] text-dark-500 flex-shrink-0 ml-2">
        {formatFinishTime(item.finish_time)}
      </span>
    </div>
  );
}

export function CompletedList({ items, max = 10 }: { items: UpgradeItem[]; max?: number }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, max);
  return (
    <section className="w-full mt-5 mb-4">
      <SectionTitle title="✅ 最近完成" count={Math.min(items.length, max)} />
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
