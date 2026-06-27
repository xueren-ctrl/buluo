/**
 * 通知设置面板 — CoC 羊皮纸风格
 */
import { useState } from "react";
import type { NotifyStatus } from "@/lib/notification-system";
import type { SchedulerSettings } from "@/lib/indexeddb";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  return `${Math.floor(hr / 24)}天前`;
}

export function NotifySettingsPanel({
  status,
  settings,
  onUpdateSettings,
  onEnableNotify,
  onClearNotifyState,
}: {
  status: NotifyStatus;
  settings: SchedulerSettings | null;
  onUpdateSettings: (patch: Partial<SchedulerSettings>) => Promise<void>;
  onEnableNotify: () => void;
  onClearNotifyState: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  if (!settings) return null;

  return (
    <section className="coc-panel mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="coc-panel-header w-full flex items-center justify-between"
      >
        <span>通知设置</span>
        <span className={`text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      <div className={`collapsible-content ${open ? "expanded" : "collapsed"}`}>
        <div className="coc-panel-body space-y-3">
          {/* 浏览器通知权限 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-sub">
                浏览器通知
                {!status.browserNotifAvailable && <span className="text-danger ml-1">(不支持)</span>}
                {status.browserNotifAvailable && !status.browserNotifGranted && <span className="text-warning ml-1">(未授权)</span>}
                {status.browserNotifGranted && <span className="text-success ml-1">✓</span>}
              </span>
              <button
                onClick={onEnableNotify}
                disabled={!status.browserNotifAvailable}
                className={
                  status.browserNotifGranted
                    ? "coc-btn-secondary text-xs py-1 px-3 text-success"
                    : status.browserNotifAvailable
                      ? "coc-btn text-xs py-1 px-3"
                      : "coc-btn-secondary text-xs py-1 px-3 opacity-50 cursor-not-allowed"
                }
              >
                {status.browserNotifGranted ? "已开启" : "申请权限"}
              </button>
            </div>
            {status.unsupportedReason && (
              <div className="text-[11px] text-warning leading-relaxed pl-1">
                <p>⚠️ {status.unsupportedReason}</p>
                {status.hint && <p className="text-muted mt-0.5">{status.hint}</p>}
              </div>
            )}
            {status.isInstalled && (
              <div className="text-[11px] text-success pl-1">
                ✓ 已以 PWA 模式启动，可获得最佳通知体验
              </div>
            )}
          </div>

          {/* 后台同步状态 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-sub">
                后台同步（页面关闭时提醒）
                {!status.periodicSyncSupported && <span className="text-warning ml-1">(不支持)</span>}
                {status.periodicSyncSupported && <span className="text-success ml-1">✓</span>}
              </span>
            </div>
            {!status.periodicSyncSupported && (
              <div className="text-[11px] text-muted leading-relaxed pl-1">
                仅 Chrome / Edge 浏览器 + 安装 PWA 后支持。其他浏览器请保持页面打开，或重开页面时自动补发漏掉的通知。
              </div>
            )}
          </div>

          {/* 提醒层级 */}
          <div
            className="space-y-2 pt-2"
            style={{ borderTop: "1px solid var(--divider)" }}
          >
            <p className="text-xs text-muted font-semibold">提醒时机</p>
            <ToggleRow
              label="提前 30 分钟"
              checked={settings.enablePre30m}
              onChange={(v) => onUpdateSettings({ enablePre30m: v })}
            />
            <ToggleRow
              label="提前 10 分钟"
              checked={settings.enablePre10m}
              onChange={(v) => onUpdateSettings({ enablePre10m: v })}
            />
            <ToggleRow
              label="完成时"
              checked={settings.enableComplete}
              onChange={(v) => onUpdateSettings({ enableComplete: v })}
            />
            <ToggleRow
              label="完成后 10 分钟（再次）"
              checked={settings.enablePostComplete}
              onChange={(v) => onUpdateSettings({ enablePostComplete: v })}
            />
            <ToggleRow
              label="批量合并（同一时刻多项完成合并为一条）"
              checked={settings.enableBatch}
              onChange={(v) => onUpdateSettings({ enableBatch: v })}
            />
          </div>

          {/* 夜间免打扰 */}
          <div
            className="space-y-2 pt-2"
            style={{ borderTop: "1px solid var(--divider)" }}
          >
            <ToggleRow
              label="夜间免打扰（DND）"
              checked={settings.dndEnabled}
              onChange={(v) => onUpdateSettings({ dndEnabled: v })}
            />
            {settings.dndEnabled && (
              <div className="flex items-center gap-2 text-xs text-sub pl-1">
                <span>免扰时段</span>
                <select
                  value={settings.dndStart}
                  onChange={(e) => onUpdateSettings({ dndStart: Number(e.target.value) })}
                  className="coc-input text-xs py-1 px-2"
                >
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>)}
                </select>
                <span>至</span>
                <select
                  value={settings.dndEnd}
                  onChange={(e) => onUpdateSettings({ dndEnd: Number(e.target.value) })}
                  className="coc-input text-xs py-1 px-2"
                >
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>)}
                </select>
              </div>
            )}
          </div>

          {/* 上次提醒时间 + 重置去重 */}
          <div
            className="flex items-center justify-between text-xs pt-2"
            style={{ borderTop: "1px solid var(--divider)" }}
          >
            <span className="text-muted">
              上次提醒: {settings.last_notify_at ? formatRelativeTime(settings.last_notify_at) : "—"}
            </span>
            <button
              onClick={onClearNotifyState}
              className="coc-btn-secondary text-xs py-1 px-3"
            >
              重置去重
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-xs text-sub cursor-pointer">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`coc-toggle ${checked ? "on" : ""}`}
      >
        <span className="coc-toggle-knob" />
      </button>
    </label>
  );
}

export default NotifySettingsPanel;
