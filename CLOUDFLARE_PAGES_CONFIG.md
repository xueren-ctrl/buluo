# Cloudflare Pages 部署配置

## 最终部署方案

**唯一目标：Cloudflare Pages**

**不是 GitHub Pages！**

---

## 项目结构

```
buluo/
├── .github/          ← 已删除（不需要）
├── .gitignore
├── backend/          ← 独立部署，非必需
├── frontend/         ← 主体，部署到 Cloudflare Pages
│   ├── app/
│   ├── public/
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
├── CLOUDFLARE_PAGES_DEPLOY.md
└── README.md
```

---

## Cloudflare Pages 配置（关键）

在 Cloudflare Dashboard 创建 Pages 时，填写以下参数：

| 配置项 | 值 |
|--------|-----|
| **Platform** | Next.js |
| **Framework preset** | Next.js |
| **Build command** | `npm run build` |
| **Build output directory** | `out` |
| **Root directory** | `frontend` |
| **Production branch** | `main` |

> ⚠️ **重要**：Root directory 设为 `frontend`，Build output directory 设为 `out`，这样路径就是扁平的，不会出现嵌套。

---

## 环境变量（可选）

如果有后端 API，在 Cloudflare Pages 的环境变量中添加：

| 变量名 | 值 |
|--------|-----|
| `NEXT_PUBLIC_API_URL` | 你的后端地址 |

如果只用纯前端版本（本地 JSON 上传），可不填。

---

## 为什么不再用 GitHub Actions？

- GitHub Actions 是用于 CI/CD 的工具
- 本项目通过 GitHub 托管代码
- 通过 Cloudflare Pages 触发构建和部署
- 无需自己的 workflow 文件

---

## 验证部署

部署成功后，访问：

```
https://<your-project-name>.pages.dev
```

应该能看到应用首页，而不是 404。
