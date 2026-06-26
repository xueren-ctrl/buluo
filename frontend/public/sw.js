/**
 * 增强版 Service Worker
 * 支持 Cloudflare Pages + Next.js static export
 * 包含：离线缓存、后台通知、Push API、Navigation fallback
 */

const CACHE_NAME = 'coc-upgrade-assistant-v3';
const DATA_CACHE_NAME = 'coc-data-cache-v3';

// 静态资源（离线优先缓存）
const STATIC_ASSETS = [
  '/',
  '/panel/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/loading.html',
];

// ========== Install ==========
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

// ========== Activate ==========
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== DATA_CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ========== Fetch ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Navigation requests → NetworkFirst, fallback to cached page
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // 2. API requests → NetworkFirst, fallback to cache
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(DATA_CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3. Static assets → CacheFirst
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // 尝试 fallback 到首页（SPA 模式）
        if (request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});

// ========== Network First with Fallback ==========
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    // 仅缓存 200 响应
    if (response.status === 200) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch {
    // 离线 → 尝试匹配页面缓存
    const cached = await caches.match(request);
    if (cached) return cached;
    // 再尝试首页 fallback
    return caches.match('/');
  }
}

// ========== Push Notifications ==========
self.addEventListener('push', (event) => {
  let data = { title: '🏰 CoC 升级助手', body: '有新的升级完成通知！' };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    // Plain text push
    data.body = event.data?.text() || data.body;
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      createdAt: Date.now(),
      upgradeItem: data.upgradeItem || null,
    },
    actions: [
      { action: 'view', title: '查看升级' },
      { action: 'dismiss', title: '忽略' },
    ],
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ========== Notification Click ==========
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      self.clients.openWindow(url)
    );
  }
});

// ========== Background Sync ==========
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-check-upgrades') {
    event.waitUntil(checkUpgradeCompletion());
  }
});

async function checkUpgradeCompletion() {
  try {
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      await client.postMessage({ type: 'BACKGROUND_SYNC_CHECK' });
    }
  } catch (e) {
    // Silent fail
  }
}
