/**
 * 工人/实验室状态卡片 — CoC 羊皮纸风格
 */
import type { IdleTimes } from "@/types";
import { formatFinishTime } from "@/lib/utils";

export function BuilderLabStatus({ idleTimes }: { idleTimes: IdleTimes }) {
  return (
    <section className="w-full grid grid-cols-2 gap-2.5 mb-4">
      <div className="coc-card p-3 flex items-center gap-2.5">
        <span className="text-lg">🔨</span>
        <div className="min-w-0">
          <p className="text-[10px] text-muted">工人空闲</p>
          <p className="text-xs font-semibold text-main truncate">
            {idleTimes.builder_idle_at ? formatFinishTime(idleTimes.builder_idle_at) : "空闲"}
          </p>
        </div>
      </div>
      <div className="coc-card p-3 flex items-center gap-2.5">
        <span className="text-lg">🧪</span>
        <div className="min-w-0">
          <p className="text-[10px] text-muted">实验室空闲</p>
          <p className="text-xs font-semibold text-main truncate">
            {idleTimes.lab_idle_at ? formatFinishTime(idleTimes.lab_idle_at) : "空闲"}
          </p>
        </div>
      </div>
    </section>
  );
}

export default BuilderLabStatus;
