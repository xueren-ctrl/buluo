/**
 * 分类筛选 chips — CoC 羊皮纸风格
 */
import { ITEM_CATEGORY_LABELS } from "@/lib/coc-assets";

export function CategoryFilter({
  categories,
  activeCategory,
  activeUpgrades,
  onSelect,
}: {
  categories: string[];
  activeCategory: string;
  activeUpgrades: { category: string }[];
  onSelect: (cat: string) => void;
}) {
  if (categories.length <= 1) return null;

  return (
    <div className="w-full flex flex-wrap gap-1.5 mb-3">
      <CategoryChip
        label="全部"
        active={activeCategory === "all"}
        onClick={() => onSelect("all")}
        count={activeUpgrades.length}
      />
      {categories.map((cat) => (
        <CategoryChip
          key={cat}
          label={ITEM_CATEGORY_LABELS[cat] || cat}
          active={activeCategory === cat}
          onClick={() => onSelect(cat)}
          count={activeUpgrades.filter((u) => u.category === cat).length}
        />
      ))}
    </div>
  );
}

function CategoryChip({ label, active, count, onClick }: {
  label: string; active: boolean; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={active ? "coc-btn text-xs py-1.5 px-3" : "coc-btn-secondary text-xs py-1.5 px-3"}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );
}

export default CategoryFilter;
