/**
 * 增强版通知管理系统
 * 支持：浏览器通知 / PWA Push / Service Worker 后台推送
 * 支持：离线缓存 / visibilitychange / 后台同步
 */

import type { NotifyConfig } from "@/lib/indexeddb";

// ── 请求浏览器通知权限 ──────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  try {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  } catch {
    return false;
  }
}

// ── 发送浏览器本地通知 ──────────────────────
export function sendBrowserNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): void {
  if (!("Notification" in window)) return;
  if (Notification.permission === "denied") return;

  const notif = new Notification(title, {
    body,
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    tag: title,
    requireInteraction: false,
    data: {
      ...data,
      createdAt: Date.now(),
    },
  });

  notif.onclick = (e) => {
    e.preventDefault();
    window.focus();
    notif.close();
  };

  // 30s 后自动关闭
  setTimeout(() => notif.close(), 30000);
}

// ── 注册 PWA Service Worker ──────────────────
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    // 等待 SW 控制
    const reg = await navigator.serviceWorker.ready;

    // 如果已经有活跃的 SW，尝试重新注册
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing && existing.active) {
      return existing;
    }

    const newReg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // 监听 SW 状态变化
    if (newReg.installing) {
      newReg.installing.addEventListener('statechange', (e) => {
        const sw = (e.target as ServiceWorker);
        if (sw.state === 'activated') {
          console.log("[PWA] Service Worker 已激活");
          // SW 激活后注册 Periodic Sync
          if ('periodicSync' in newReg) {
            (newReg as any).periodicSync.register('sync-check-upgrades', {
              minInterval: 15 * 60 * 1000, // 15 分钟
            }).catch(() => {
              console.warn("[PWA] Periodic Sync 不可用");
            });
          }
        }
      });
    }

    return newReg;
  } catch (err) {
    console.warn("[通知系统] Service Worker 注册失败:", err);
    return null;
  }
}

// ── 订阅 PWA 推送 ──────────────────────────
export async function subscribePwaPush(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.pushManager) return null;

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(
        "BEl62iUYgUWxrfhEC3MufDtTOcCfJLuQXnYFFwfKGv9iCk6Sm1OUiOnXoE4tUVg66qlAyyo3jmENDiQqDDKbkac"
      ),
    });
    console.log("[PWA] 推送订阅成功");
    return sub;
  } catch (err) {
    console.warn("[通知系统] PWA 推送订阅失败:", err);
    return null;
  }
}

// ── 取消 PWA 推送 ──────────────────────────
export async function unsubscribePwaPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  try {
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    // ignore
  }
}

// ── 计算升级完成时间并安排通知 ──────────────
export async function scheduleCompletionNotifications(upgrades: Array<{
  item_name: string;
  item_level: number;
  finish_time: string;
  category: string;
}>): Promise<void> {
  // 浏览器通知
  for (const upg of upgrades) {
    const finishMs = new Date(upg.finish_time).getTime();
    const now = Date.now();
    const delay = finishMs - now;

    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        sendBrowserNotification(
          "🏰 升级完成！",
          `${upg.item_name} Lv${upg.item_level} 已升级完成！`
        );
      }, delay);
    }
  }
}

// ── 监听页面可见性变化 ────────────────────
export function listenVisibilityChange(callback: () => void): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      callback();
    }
  });
}

// ── 实用函数: Base64 → ArrayBuffer ───────
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

// ── 检测通知状态 ──────────────────────────
export interface NotifyStatus {
  browserNotifAvailable: boolean;
  browserNotifGranted: boolean;
  pwaPushAvailable: boolean;
  isInstalled: boolean;
  swRegistered: boolean;
}

export function detectNotifyStatus(): NotifyStatus {
  return {
    browserNotifAvailable: "Notification" in window,
    browserNotifGranted: "Notification" in window ? Notification.permission === "granted" : false,
    pwaPushAvailable: "serviceWorker" in navigator && "PushManager" in window,
    isInstalled: "standalone" in window.navigator || (window.matchMedia("(display-mode: standalone)").matches),
    swRegistered: "serviceWorker" in navigator,
  };
}
