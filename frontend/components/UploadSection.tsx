/**
 * 上传区域 — 简约风格，默认折叠，点击展开
 */
import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { Clipboard } from "@capacitor/clipboard";

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
  // 原生 APK：使用 @capacitor/clipboard（无需 HTTPS/权限弹窗）
  // Web/PWA：使用 navigator.clipboard API（需 HTTPS + 权限）
  // 兜底：展开 textarea 让用户手动 Ctrl+V
  const handlePasteFromClipboard = async () => {
    // 1. 原生 APK：Capacitor Clipboard 插件
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Clipboard.read();
        const text = result.value || "";
        if (text.trim()) {
          onJsonChange(text);
          setExpanded(true);
          toast.success("已从剪贴板粘贴", { duration: 1500 });
          return;
        }
        setExpanded(true);
        toast("剪贴板为空，请手动粘贴", { icon: "ℹ️" });
        return;
      } catch (e) {
        console.warn("Capacitor Clipboard.read 失败，回退到 Web API", e);
      }
    }

    // 2. Web/PWA：navigator.clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          onJsonChange(text);
          setExpanded(true);
          toast.success("已从剪贴板粘贴", { duration: 1500 });
          return;
        }
        setExpanded(true);
        toast("剪贴板为空，请手动粘贴", { icon: "ℹ️" });
        return;
      } catch (e) {
        console.warn("clipboard.readText 失败，回退到手动输入", e);
      }
    }

    // 3. 兜底：展开 textarea 让用户手动 Ctrl+V
    setExpanded(true);
    toast(
      "请手动 Ctrl+V 粘贴到下方文本框",
      { icon: "ℹ️", duration: 4000 }
    );
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
