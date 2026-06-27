/**
 * 空状态卡片
 */
export function EmptyState({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="w-full glass-card p-8 text-center">
      <p className="text-3xl mb-2">{emoji}</p>
      <p className="text-dark-300 text-sm font-medium">{title}</p>
      <p className="text-dark-500 text-xs mt-1">{desc}</p>
    </div>
  );
}

export default EmptyState;
