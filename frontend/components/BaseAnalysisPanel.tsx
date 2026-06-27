/**
 * 基地分析面板 — CoC 羊皮纸风格，无彩色进度条
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

export function BaseAnalysisPanel({ analysis }: { analysis: BaseAnalysis | null }) {
  if (!analysis) return null;

  return (
    <section className="coc-panel mb-4">
      <div className="coc-panel-header flex items-center justify-between">
        <span>基地分析</span>
        <span className="text-xs opacity-80">
          {STYLE_EMOJI[analysis.style] || ""} 风格识别
        </span>
      </div>
      <div className="coc-panel-body">
        {/* 风格描述 */}
        <div
          className="mb-3 p-2.5 rounded text-xs leading-relaxed"
          style={{
            background: "var(--bg-panel-alt)",
            border: "1px solid var(--border-dark)",
            color: "var(--text-sub)",
          }}
        >
          {analysis.styleDescription}
        </div>

        {/* 各分类进度（数字，无进度条）*/}
        <div className="space-y-1.5 mb-3">
          {analysis.categoryProgress.map((p) => (
            <div key={p.category} className="flex items-center justify-between text-xs">
              <span className="text-sub">{BUILD_CATEGORY_LABELS[p.category] || p.category}</span>
              <span className="text-muted">
                <span className="coc-countdown font-bold">{p.avgProgress}%</span>
                {" · "}
                {p.maxedCount}/{p.itemCount} 满级
              </span>
            </div>
          ))}
        </div>

        {/* 瓶颈提示 */}
        {analysis.bottleneck && (
          <div
            className="mb-2 p-2 rounded text-xs"
            style={{
              background: "var(--color-warning-bg)",
              border: "1px solid var(--color-warning)",
              color: "var(--color-warning)",
            }}
          >
            瓶颈：{BUILD_CATEGORY_LABELS[analysis.bottleneck]} 进度偏低，建议优先投入资源。
          </div>
        )}

        {/* 建议列表 */}
        {analysis.suggestions.length > 0 && (
          <div
            className="space-y-1.5 pt-2"
            style={{ borderTop: "1px solid var(--divider)" }}
          >
            {analysis.suggestions.map((s, i) => (
              <p key={i} className="text-xs text-sub flex items-start gap-1.5">
                <span className="text-gold flex-shrink-0">•</span>
                <span>{s}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default BaseAnalysisPanel;
