/**
 * 空状态卡片 — CoC 简约风格
 */
export function EmptyState({ emoji, title, desc }: { emoji?: string; title: string; desc: string }) {
  return (
    <div className="coc-card p-8 text-center">
      {emoji && <p className="text-3xl mb-2">{emoji}</p>}
      <p className="text-main text-sm font-medium">{title}</p>
      <p className="text-muted text-xs mt-1">{desc}</p>
    </div>
  );
}

export default EmptyState;
