/**
 * 4 格统计卡片 — 大本/进行中/已完成/上次提醒
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
      <div className="stat-card">
        <div className="text-lg mb-1">🏠</div>
        <p className="text-sm font-bold text-amber-400">
          {playerInfo?.town_hall_level ? `Lv${playerInfo.town_hall_level}` : "—"}
        </p>
        <p className="text-xs text-dark-500">大本等级</p>
      </div>
      <div className="stat-card">
        <div className="text-lg mb-1">⏳</div>
        <p className="text-sm font-bold text-brand-400">{activeCount}</p>
        <p className="text-xs text-dark-500">进行中</p>
      </div>
      <div className="stat-card">
        <div className="text-lg mb-1">✅</div>
        <p className="text-sm font-bold text-green-400">{completedCount}</p>
        <p className="text-xs text-dark-500">已完成</p>
      </div>
      <div className="stat-card">
        <div className="text-lg mb-1">🔔</div>
        <p className="text-[11px] font-semibold text-dark-300 leading-tight">
          {settings?.last_notify_at ? formatRelativeTime(settings.last_notify_at) : "未提醒"}
        </p>
        <p className="text-xs text-dark-500">上次提醒</p>
      </div>
    </section>
  );
}

export default StatsCards;
