import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "部落冲突升级规划助手",
  description: "上传 CoC JSON，智能分析升级进度，自动生成升级路线，升级完成时本地通知提醒",
  manifest: "/manifest.json",
  applicationName: "CoC 升级助手",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CoC 规划助手",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icons/favicon-32.png"],
  },
  twitter: {
    card: "summary",
    title: "部落冲突升级规划助手",
    description: "上传 CoC JSON，智能分析升级进度，自动生成升级路线，升级完成时本地通知提醒",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// iOS 启动画面（主流机型尺寸）
const SPLASH_SCREENS = [
  { media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)", href: "/icons/apple-splash-1170-2532.png" },
  { media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)", href: "/icons/apple-splash-1290-2796.png" },
  { media: "(device-width: 360px) and (device-height: 640px) and (-webkit-device-pixel-ratio: 3)", href: "/icons/apple-splash-1080-1920.png" },
  { media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)", href: "/icons/apple-splash-2048-1536.png" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CoC 升级" />
        {/* iOS 启动画面 */}
        {SPLASH_SCREENS.map((s) => (
          <link
            key={s.href}
            rel="apple-touch-startup-image"
            media={s.media}
            href={s.href}
          />
        ))}
      </head>
      <body className="min-h-screen gradient-bg antialiased">
        {children}
      </body>
    </html>
  );
}
