/**
 * 分节标题 — 居中分隔线 + 标题 + 计数
 */
export function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="relative flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-gradient-to-r from-dark-600/50 to-transparent" />
      <span className="text-dark-400 text-xs uppercase tracking-widest">{title} ({count})</span>
      <div className="flex-1 h-px bg-gradient-to-l from-dark-600/50 to-transparent" />
    </div>
  );
}

export default SectionTitle;
