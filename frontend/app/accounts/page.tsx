/**
 * 多账号对比总览
 * ============================================
 * 并排看每个账号的大本、进行中数量、下一个完成时间、
 * 工人空闲时间、基地评分。点卡片切换到该账号回首页。
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { TopNav } from "@/components/TopNav";
import { EmptyState } from "@/components/EmptyState";
import {
  loadAllAccounts,
  setActiveAccount,
  deleteAccount,
  type AccountRecord,
} from "@/lib/indexeddb";
import { formatRemaining, formatFinishTime, getRemainingSeconds } from "@/lib/utils";

function nextFinish(upgrades: AccountRecord["upgrades"]): string | null {
  const active = upgrades.filter((u) => getRemainingSeconds(u.finish_time) > 0);
  if (active.length === 0) return null;
  return active
    .map((u) => u.finish_time)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
}

function builderIdleAt(upgrades: AccountRecord["upgrades"]): string | null {
  const active = upgrades.filter(
    (u) => u.category === "buildings" && getRemainingSeconds(u.finish_time) > 0
  );
  if (active.length === 0) return null;
  return active
    .map((u) => u.finish_time)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await loadAllAccounts());
    } catch (e) {
      toast.error("加载账号失败", { className: "toast-error" });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSwitch = useCallback(
    async (account: AccountRecord) => {
      try {
        await setActiveAccount(account.player_tag);
        toast.success(`已切换到 ${account.player_name || "默认账号"}`, {
          className: "toast-success",
        });
        window.dispatchEvent(new CustomEvent("coc-account-switched"));
        router.push("/");
      } catch (e) {
        toast.error("切换账号失败", { className: "toast-error" });
        console.error(e);
      }
    },
    [router]
  );

  const handleDelete = useCallback(
    async (account: AccountRecord, e: React.MouseEvent) => {
      e.stopPropagation();
      if (
        !confirm(
          `确定要删除账号「${account.player_name || account.player_tag}」吗？\n该账号的所有升级记录、村庄快照、设置都会被清除。`
        )
      ) {
        return;
      }
      try {
        await deleteAccount(account.player_tag);
        toast.success("账号已删除", { className: "toast-success" });
        refresh();
      } catch (err) {
        toast.error("删除失败", { className: "toast-error" });
        console.error(err);
      }
    },
    [refresh]
  );

  return (
    <div className="min-h-screen">
      <TopNav title="多账号对比" />
      <main className="max-w-2xl mx-auto px-3 py-4">
        {loading && <p className="text-center text-muted text-sm py-8">加载中…</p>}
        {!loading && accounts.length === 0 && (
          <EmptyState title="还没有账号记录" desc="上传第一个 JSON 后会自动创建账号" />
        )}
        <div className="space-y-2.5">
          {accounts.map((a) => {
            const ups = a.upgrades ?? [];
            const active = ups.filter((u) => getRemainingSeconds(u.finish_time) > 0);
            const done = ups.length - active.length;
            const next = nextFinish(ups);
            const builderIdle = builderIdleAt(ups);
            return (
              <div
                key={a.player_tag}
                onClick={() => handleSwitch(a)}
                className={`coc-card p-3.5 cursor-pointer transition-all hover:border-[var(--border-gold)] ${
                  a.active ? "border-[var(--color-gold)]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-main truncate">
                        {a.player_name || "(无名玩家)"}
                      </span>
                      {a.active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)] font-semibold flex-shrink-0">
                          当前
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {a.player_tag}
                      {a.player_tag !== "anon" ? " · " : ""}
                      <span className="text-gold">大本 Lv{a.town_hall_level}</span>
                      {a.base_score != null && (
                        <span>
                          {" · "}基地 {a.base_score} 分{a.base_grade ? ` (${a.base_grade})` : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(a, e)}
                    className="text-danger text-xs px-2 py-1 hover:bg-[var(--color-danger-bg)] rounded transition-colors flex-shrink-0"
                    aria-label="删除账号"
                  >
                    🗑
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center rounded-lg bg-[var(--bg-input)] py-2">
                    <p className="text-base font-bold text-main coc-countdown">{active.length}</p>
                    <p className="text-[10px] text-muted mt-0.5">进行中{done > 0 ? ` · 已完成 ${done}` : ""}</p>
                  </div>
                  <div className="text-center rounded-lg bg-[var(--bg-input)] py-2 px-1">
                    <p className="text-xs font-bold text-main coc-countdown truncate">
                      {next ? `剩 ${formatRemaining(getRemainingSeconds(next))}` : "无"}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {next ? `下一个完成 · ${formatFinishTime(next)}` : "下一个完成"}
                    </p>
                  </div>
                  <div className="text-center rounded-lg bg-[var(--bg-input)] py-2 px-1">
                    <p className="text-xs font-bold text-main coc-countdown truncate">
                      {builderIdle ? formatFinishTime(builderIdle) : "空闲"}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">工人空闲</p>
                  </div>
                </div>

                <p className="text-[10px] text-muted mt-2">
                  最近导入：{new Date(a.last_import_time).toLocaleString("zh-CN")}
                </p>
              </div>
            );
          })}
        </div>
        {accounts.length > 0 && (
          <p className="text-[11px] text-muted mt-4 text-center">点卡片切换账号，回到首页查看该账号的升级</p>
        )}
      </main>
    </div>
  );
}
