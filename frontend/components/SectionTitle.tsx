/**
 * 分节标题 — CoC 羊皮纸风格分隔线
 */
export function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="coc-divider py-3">
      {title} ({count})
    </div>
  );
}

export default SectionTitle;
