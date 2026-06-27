/**
 * 基地评分卡 — 总分 + 评级 + 四维进度条 + 工人利用率
 */
import type { BaseScore } from "@/lib/base-scorer";
import { GRADE_LABELS, GRADE_COLORS } from "@/lib/base-scorer";

function ScoreRow({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-dark-300">{label}</span>
        <span className={color}>{score}</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-bar-fill h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>
    </div>
  );
}

export function BaseScoreCard({ score }: { score: BaseScore | null }) {
  if (!score) return null;

  return (
    <section className="w-full glass-card p-4 mb-4 border-emerald-500/20">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-emerald-300">📊 基地评分</span>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-black ${GRADE_COLORS[score.grade]}`}>
            {score.grade}
          </span>
          <span className="text-xs text-dark-400">{GRADE_LABELS[score.grade]}</span>
        </div>
      </div>

      {/* 总分大数字 */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-black text-white tabular-nums">{score.total}</span>
        <span className="text-sm text-dark-500">/ 100</span>
      </div>

      {/* 四维评分 */}
      <div className="space-y-2 mb-3">
        <ScoreRow label="⚔️ 进攻分" score={score.offenseScore} color="text-red-400" />
        <ScoreRow label="🛡️ 防御分" score={score.defenseScore} color="text-cyan-400" />
        <ScoreRow label="💰 资源分" score={score.resourceScore} color="text-amber-400" />
        <ScoreRow label="🔧 功能分" score={score.utilityScore} color="text-violet-400" />
      </div>

      {/* 工人利用率 */}
      <div className="pt-2 border-t border-dark-700/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-dark-400">🔨 工人利用率</span>
          <span className={score.builderEfficiency >= 80 ? "text-emerald-400" : score.builderEfficiency >= 50 ? "text-amber-400" : "text-red-400"}>
            {score.builderEfficiency}%
          </span>
        </div>
        <div className="progress-bar mt-1">
          <div
            className={`progress-bar-fill h-full rounded-full ${
              score.builderEfficiency >= 80 ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                : score.builderEfficiency >= 50 ? "bg-gradient-to-r from-amber-600 to-amber-400"
                : "bg-gradient-to-r from-red-600 to-red-400"
            }`}
            style={{ width: `${Math.max(2, score.builderEfficiency)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

export default BaseScoreCard;
