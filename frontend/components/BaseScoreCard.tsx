/**
 * 基地评分卡 — CoC 羊皮纸风格，无彩色进度条
 */
import type { BaseScore } from "@/lib/base-scorer";
import { GRADE_LABELS, GRADE_COLORS } from "@/lib/base-scorer";

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-sub">{label}</span>
      <span className="coc-countdown font-bold">{score}</span>
    </div>
  );
}

export function BaseScoreCard({ score }: { score: BaseScore | null }) {
  if (!score) return null;

  return (
    <section className="coc-panel mb-4">
      <div className="coc-panel-header flex items-center justify-between">
        <span>基地评分</span>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-black ${GRADE_COLORS[score.grade]}`} style={{ color: "var(--color-gold-light)" }}>
            {score.grade}
          </span>
          <span className="text-xs opacity-80">{GRADE_LABELS[score.grade]}</span>
        </div>
      </div>
      <div className="coc-panel-body">
        {/* 总分大数字 */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-black coc-countdown">{score.total}</span>
          <span className="text-sm text-muted">/ 100</span>
        </div>

        {/* 四维评分 */}
        <div className="space-y-1 mb-3">
          <ScoreRow label="进攻分" score={score.offenseScore} />
          <ScoreRow label="防御分" score={score.defenseScore} />
          <ScoreRow label="资源分" score={score.resourceScore} />
          <ScoreRow label="功能分" score={score.utilityScore} />
        </div>

        {/* 工人利用率 */}
        <div
          className="pt-2 flex items-center justify-between text-xs"
          style={{ borderTop: "1px solid var(--divider)" }}
        >
          <span className="text-sub">工人利用率</span>
          <span className={`coc-countdown font-bold ${score.builderEfficiency >= 80 ? "text-success" : score.builderEfficiency >= 50 ? "text-warning" : "text-danger"}`}>
            {score.builderEfficiency}%
          </span>
        </div>
      </div>
    </section>
  );
}

export default BaseScoreCard;
