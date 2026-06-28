/**
 * 上传区域 — 简约风格，默认折叠，点击展开
 */
import { useState, useRef } from "react";
import toast from "react-hot-toast";

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
  const [expanded, setExpanded] = useState(false);
  const jsonRef = useRef<HTMLTextAreaElement>(null);

  // 从剪贴板快速导入
  // navigator.clipboard 在 Capacitor WebView (https scheme) 或浏览器 https 下可用
  // HTTP 或权限被拒时回退到展开 textarea 让用户手动 Ctrl+V
  const handlePasteFromClipboard = async () => {
    // 1. 优先尝试现代 Clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          onJsonChange(text);
          setExpanded(true);
          toast.success("已从剪贴板粘贴", { duration: 1500 });
          return;
        }
        // 剪贴板为空 — 展开让用户手动输入
        setExpanded(true);
        toast("剪贴板为空，请手动粘贴", { icon: "ℹ️" });
        return;
      } catch (e) {
        // 权限被拒 / 非 secure context — 继续走 fallback
        console.warn("clipboard.readText 失败，回退到 execCommand", e);
      }
    }
    // 2. 回退：document.execCommand("paste") 在大多数现代浏览器已被禁用，
    //    因此不再尝试自动粘贴，直接展开 textarea 让用户手动 Ctrl+V
    setExpanded(true);
    toast(
      "自动读取剪贴板被浏览器拒绝，请手动 Ctrl+V 粘贴到下方文本框",
      { icon: "ℹ️", duration: 4000 }
    );
    // 聚焦 textarea，方便用户立即 Ctrl+V
    setTimeout(() => jsonRef.current?.focus(), 50);
  };

  return (
    <section className="coc-panel mb-4">
      <div className="coc-panel-body">
        {!expanded ? (
          /* 默认：两个按钮 */
          <div className="flex gap-2">
            <button
              onClick={handlePasteFromClipboard}
              disabled={loading}
              className="coc-btn flex-1 text-sm py-2.5"
            >
              {loading ? "解析中..." : "粘贴 JSON"}
            </button>
            <button
              onClick={() => setExpanded(true)}
              disabled={loading}
              className="coc-btn-secondary text-sm py-2.5"
            >
              手动输入
            </button>
          </div>
        ) : (
          /* 展开后：文本框 + 操作按钮 */
          <div className="space-y-2.5">
            <textarea
              ref={jsonRef}
              value={jsonInput}
              onChange={(e) => onJsonChange(e.target.value)}
              placeholder={"粘贴游戏导出的 JSON …\n\n获取方法: 游戏内 设置 → 更多设置 → 数据导出 → 复制"}
              rows={6}
              className="coc-input w-full text-xs resize-y"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => onSubmit()}
                disabled={loading || !jsonInput.trim()}
                className="coc-btn flex-1 text-sm py-2.5"
              >
                {loading ? "解析中..." : "开始解析"}
              </button>
              <button
                onClick={() => { onJsonChange(""); setExpanded(false); }}
                disabled={loading}
                className="coc-btn-secondary text-sm py-2.5 px-4"
              >
                收起
              </button>
            </div>
          </div>
        )}

        {exportTimeLabel && (
          <p className="mt-2 text-[11px] text-muted">
            游戏导出时间: <span className="text-sub">{exportTimeLabel}</span>
          </p>
        )}
      </div>
    </section>
  );
}

export default UploadSection;
