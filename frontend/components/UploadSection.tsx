/**
 * 上传区域 — CoC 羊皮纸风格面板
 */
import { useState, useRef } from "react";

export function UploadSection({
  jsonInput,
  onJsonChange,
  onSubmit,
  loading,
  exportTimeLabel,
}: {
  jsonInput: string;
  onJsonChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  exportTimeLabel?: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const jsonRef = useRef<HTMLTextAreaElement>(null);

  return (
    <section className={`coc-panel mb-4 ${collapsed ? "mb-1.5" : ""}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="coc-panel-header w-full flex items-center justify-between"
      >
        <span>上传数据</span>
        <span className={`text-xs transition-transform duration-200 ${collapsed ? "rotate-[-90deg]" : ""}`}>▼</span>
      </button>

      <div className={`collapsible-content ${collapsed ? "collapsed" : "expanded"}`}>
        <div className="coc-panel-body">
          <div className="mb-3">
            <label className="block text-xs text-sub mb-1">
              CoC JSON 数据 <span className="text-danger">*</span>
            </label>
            <textarea
              ref={jsonRef}
              value={jsonInput}
              onChange={(e) => onJsonChange(e.target.value)}
              placeholder={"粘贴游戏导出的 JSON …\n\n获取方法: 游戏内 设置 → 更多设置 → 数据导出 → 复制"}
              rows={8}
              className="coc-input w-full text-xs resize-y"
            />
          </div>

          {exportTimeLabel && (
            <div
              className="mb-3 px-3 py-2 rounded text-xs flex items-center gap-2"
              style={{
                background: "var(--color-success-bg)",
                border: "1px solid var(--color-success)",
                color: "var(--color-success)",
              }}
            >
              <span>📅</span>
              <span>游戏导出时间: <strong>{exportTimeLabel}</strong></span>
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={loading}
            className="coc-btn w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                解析中...
              </>
            ) : "开始解析"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default UploadSection;
