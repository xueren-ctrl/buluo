const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  runtimeCaching: [
    // Cache First: 静态资源（图标、图片、字体）—— 长缓存
    {
      urlPattern: /^https?.*\/icons\//,
      handler: "CacheFirst",
      options: {
        cacheName: "icons-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /^https?.*\.(png|jpg|jpeg|gif|svg|webp|ico)/,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /^https?.*\.woff2?$/,
      handler: "CacheFirst",
      options: {
        cacheName: "font-cache",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },

    // Stale While Revalidate: Next.js 静态资源（JS/CSS/chunks）
    // 先返回缓存（秒开），同时后台更新；下次访问自动是最新版本
    // 用户无需手动刷新，新版本部署后自动生效
    {
      urlPattern: /^https?.*\/_next\//,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-assets-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7天
        },
      },
    },

    // Network First: 页面导航请求 —— 优先网络，确保 HTML 最新
    {
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache",
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 12, // 12小时
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  output: "export",
  images: {
    unoptimized: true,
  },
};

module.exports = withPWA(nextConfig);
