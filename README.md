# 部落冲突升级助手 PWA ⚔️

上传 CoC 导出的 JSON 数据，自动追踪升级进度，到期推送通知。

## 功能

- 📋 JSON 上传自动解析（建筑/法术/英雄/宠物/装备）
- ⏳ 实时显示升级进度 & 剩余时间
- 🔨 工人空闲时间 & 🧪 实验室空闲时间计算
- 🔔 升级完成时浏览器通知提醒
- 📲 可安装到手机桌面的 PWA 应用
- 💾 所有数据存储在本地（IndexedDB）
- 📴 支持离线浏览
- 🌐 中国大陆可访问

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 14 + TypeScript + TailwindCSS + App Router |
| 部署 | Cloudflare Pages |
| PWA | 手动 Service Worker + manifest.json + IndexedDB |
| 数据存储 | 用户设备本地 |
| 通知 | Browser Notification API + Service Worker |

## 快速开始

### 本地开发

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000

### 生产部署

访问 [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → 连接 GitHub 仓库 `xueren-ctrl/buluo`

## 安装到手机

### Android (Chrome)
1. 打开网站
2. 点击菜单栏 → 添加到主屏幕

### iOS (Safari)
1. 打开网站
2. 点击分享按钮 → 添加到主屏幕

## 部署配置

详见 [CLOUDFLARE_PAGES_DEPLOY.md](CLOUDFLARE_PAGES_DEPLOY.md)
