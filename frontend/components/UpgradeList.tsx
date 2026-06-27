/**
 * 升级进行中列表 — 含空状态
 */
import type { UpgradeItem } from "@/types";
import { UpgradeCard } from "./UpgradeCard";
import { SectionTitle } from "./SectionTitle";
import { EmptyState } from "./EmptyState";

export function UpgradeList({ items }: { items: UpgradeItem[] }) {
  return (
    <>
      <SectionTitle title="📊 升级进行中" count={items.length} />
      {items.length === 0 ? (
        <EmptyState emoji="🎉" title="当前没有升级项目" desc="所有工人和实验室都在空闲" />
      ) : (
        <div className="space-y-2">
          {items.map((upg) => (
            <UpgradeCard
              key={`${upg.category}-${upg.data_id ?? upg.item_name}-${upg.item_level}`}
              item={upg}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default UpgradeList;
