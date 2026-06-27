/**
 * 分类筛选 chips — 全部 + 各分类
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
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
        active
          ? "bg-brand-600 text-white"
          : "bg-dark-800/60 text-dark-300 border border-dark-700/50 hover:border-brand-500/40"
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );
}

export default CategoryFilter;
