/**
 * 完成统计 — 今日 / 近 7 天 / 本月 / 累计完成数
 * ============================================
 * 数据来自完成记录（调度器 tick + 重新解析 diff 写入，
 * 见 shared/completion-stats.ts），含当前列表里已过期但
 * 尚未记入的项；同一项只计一次。
 */
import type { CompletionStatsData } from "@/lib/completion-stats";
import { SectionTitle } from "./SectionTitle";

export function CompletionStats({ stats }: { stats: CompletionStatsData | null }) {
  if (!stats) return null;
  const cells = [
    { label: "今日完成", value: stats.today },
    { label: "近 7 天", value: stats.week },
    { label: "本月完成", value: stats.month },
    { label: "累计完成", value: stats.total },
  ];
  return (
    <section className="w-full mb-4">
      <SectionTitle title="完成统计" count={stats.total} />
      <div className="grid grid-cols-4 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="coc-card p-3 text-center">
            <p className="text-lg font-bold text-main coc-countdown">{c.value}</p>
            <p className="text-[10px] text-muted mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      {stats.total === 0 && (
        <p className="text-[11px] text-muted mt-2 text-center">
          升级完成时会自动记入统计，重新上传 JSON 也会补记之前完成的项
        </p>
      )}
    </section>
  );
}

export default CompletionStats;
