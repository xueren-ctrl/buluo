/**
 * 基地分析面板 — 展示基地风格、各分类进度、瓶颈、建议
 */
import type { BaseAnalysis } from "@/lib/base-analyzer";
import { BUILD_CATEGORY_LABELS } from "@/lib/base-analyzer";

const STYLE_EMOJI: Record<string, string> = {
  rusher: "🚀",
  offense_heavy: "⚔️",
  defense_heavy: "🛡️",
  balanced: "⚖️",
  maxer: "🏆",
};

const CATEGORY_EMOJI: Record<string, string> = {
  offense: "⚔️",
  defense: "🛡️",
  resource: "💰",
  utility: "🔧",
};

export function BaseAnalysisPanel({ analysis }: { analysis: BaseAnalysis | null }) {
  if (!analysis) return null;

  return (
    <section className="w-full glass-card p-4 mb-4 border-amber-500/20">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-amber-300">🏗️ 基地分析</span>
        <span className="text-xs text-dark-400">
          {STYLE_EMOJI[analysis.style] || "📊"} 风格识别
        </span>
      </div>

      {/* 风格描述 */}
      <div className="mb-3 p-2.5 rounded-lg bg-dark-900/40 border border-dark-700/50">
        <p className="text-xs text-dark-300 leading-relaxed">{analysis.styleDescription}</p>
      </div>

      {/* 各分类进度条 */}
      <div className="space-y-2 mb-3">
        {analysis.categoryProgress.map((p) => (
          <div key={p.category}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-dark-300">
                {CATEGORY_EMOJI[p.category] || "📊"} {BUILD_CATEGORY_LABELS[p.category] || p.category}
              </span>
              <span className="text-dark-400">
                {p.avgProgress}% · {p.maxedCount}/{p.itemCount} 满级
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill h-full rounded-full ${
                  p.avgProgress >= 80 ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                    : p.avgProgress >= 50 ? "bg-gradient-to-r from-amber-600 to-amber-400"
                    : "bg-gradient-to-r from-red-600 to-red-400"
                }`}
                style={{ width: `${Math.max(2, p.avgProgress)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 瓶颈提示 */}
      {analysis.bottleneck && (
        <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          ⚠️ 瓶颈：{BUILD_CATEGORY_LABELS[analysis.bottleneck]} 进度偏低，建议优先投入资源。
        </div>
      )}

      {/* 建议列表 */}
      {analysis.suggestions.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-dark-700/50">
          {analysis.suggestions.map((s, i) => (
            <p key={i} className="text-xs text-dark-400 flex items-start gap-1.5">
              <span className="text-amber-500 flex-shrink-0">•</span>
              <span>{s}</span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

export default BaseAnalysisPanel;
