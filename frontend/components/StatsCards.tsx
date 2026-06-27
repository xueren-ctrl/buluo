/**
 * 4 格统计卡片 — CoC 羊皮纸风格
 */
import type { PlayerInfo } from "@/types";
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

export function StatsCards({
  playerInfo,
  activeCount,
  completedCount,
  settings,
}: {
  playerInfo: PlayerInfo | null;
  activeCount: number;
  completedCount: number;
  settings: SchedulerSettings | null;
}) {
  return (
    <section className="w-full grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
      <div className="coc-card p-3">
        <div className="text-lg mb-1">🏠</div>
        <p className="text-sm font-bold text-main coc-countdown">
          {playerInfo?.town_hall_level ? `Lv${playerInfo.town_hall_level}` : "—"}
        </p>
        <p className="text-xs text-muted">大本等级</p>
      </div>
      <div className="coc-card p-3">
        <div className="text-lg mb-1">⏳</div>
        <p className="text-sm font-bold text-main coc-countdown">{activeCount}</p>
        <p className="text-xs text-muted">进行中</p>
      </div>
      <div className="coc-card p-3">
        <div className="text-lg mb-1">✅</div>
        <p className="text-sm font-bold text-success coc-countdown">{completedCount}</p>
        <p className="text-xs text-muted">已完成</p>
      </div>
      <div className="coc-card p-3">
        <div className="text-lg mb-1">🔔</div>
        <p className="text-[11px] font-semibold text-sub leading-tight">
          {settings?.last_notify_at ? formatRelativeTime(settings.last_notify_at) : "未提醒"}
        </p>
        <p className="text-xs text-muted">上次提醒</p>
      </div>
    </section>
  );
}

export default StatsCards;
