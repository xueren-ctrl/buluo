/**
 * 工人/实验室状态卡片
 */
import type { IdleTimes } from "@/types";
import { formatFinishTime } from "@/lib/utils";

export function BuilderLabStatus({ idleTimes }: { idleTimes: IdleTimes }) {
  return (
    <section className="w-full grid grid-cols-2 gap-2.5 mb-4">
      <div className="glass-card p-3 border-dark-700/50 flex items-center gap-2.5">
        <span className="text-lg">🔨</span>
        <div className="min-w-0">
          <p className="text-[10px] text-dark-500">工人空闲</p>
          <p className="text-xs font-semibold text-dark-200 truncate">
            {idleTimes.builder_idle_at ? formatFinishTime(idleTimes.builder_idle_at) : "空闲 ✅"}
          </p>
        </div>
      </div>
      <div className="glass-card p-3 border-dark-700/50 flex items-center gap-2.5">
        <span className="text-lg">🧪</span>
        <div className="min-w-0">
          <p className="text-[10px] text-dark-500">实验室空闲</p>
          <p className="text-xs font-semibold text-dark-200 truncate">
            {idleTimes.lab_idle_at ? formatFinishTime(idleTimes.lab_idle_at) : "空闲 ✅"}
          </p>
        </div>
      </div>
    </section>
  );
}

export default BuilderLabStatus;
