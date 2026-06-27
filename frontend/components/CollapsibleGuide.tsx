/**
 * 使用说明 — 可折叠面板
 */
import { useState } from "react";

export function CollapsibleGuide() {
  const [open, setOpen] = useState(false);
  return (
    <section className="w-full glass-card p-4 mb-4 border-brand-500/20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-brand-300"
      >
        <span>📖 使用说明</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      <div className={`collapsible-content mt-3 ${open ? "expanded" : "collapsed"}`}>
        <div className="text-xs text-dark-400 space-y-2">
          <p><strong className="text-dark-200">① 导出数据</strong> → 游戏内 设置 → 更多设置 → 数据导出 → 复制</p>
          <p><strong className="text-dark-200">② 粘贴 JSON</strong> → 点击上方输入框 → 点「开始解析」</p>
          <p><strong className="text-dark-200">③ 开启通知</strong> → 在「通知设置」里允许浏览器通知</p>
          <p><strong className="text-dark-200">④ 自动提醒</strong> → 调度器会在升级完成前/后自动通知</p>
          <p><strong className="text-dark-200">⑤ 安装应用</strong> → 浏览器出现安装按钮时添加到主屏幕</p>
          <p><strong className="text-dark-200">⑥ 离线使用</strong> → 安装后无网络也能查看升级状态</p>
        </div>
      </div>
    </section>
  );
}

export default CollapsibleGuide;
