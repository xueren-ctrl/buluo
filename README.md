# COC Upgrade Notifier

部落冲突升级完成通知 - 微信推送服务

## 功能

- 定时轮询 COC 官方 API 获取玩家数据
- 对比上一次快照，自动检测部队/英雄/法术/大本营等级变化
- 等级提升 = 升级完成，自动通过 WxPusher 推送到微信

## 系统架构

```
定时调度器 → COC API 客户端 → 状态对比引擎 → 消息构造器 → WxPusher → 微信通知
                                  ↕
                              状态快照(JSON)
```

## 快速开始

### 1. 前置要求

- Node.js >= 18（内置 fetch API）
- COC API Key（从 https://developer.clashofclans.com 获取）
- WxPusher 应用 Token（从 https://wxpusher.zjiecode.com/admin 获取）

### 2. 安装依赖

```bash
cd coc-upgrade-notifier
npm install
```

### 3. 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env 填入你的配置
```

必须配置的变量:

| 变量 | 说明 | 示例 |
|------|------|------|
| `COC_API_KEY` | COC API 密钥 | 从开发者网站获取，需绑定 IP |
| `COC_PLAYER_TAGS` | 玩家标签 | `#PQR8L20Y` 多个用逗号分隔 |
| `WXPUSHER_APP_TOKEN` | WxPusher 应用 Token | `AT_xxxx` |
| `WXPUSHER_UIDS` | 接收者 UID | `UID_xxxx` 多个用逗号分隔 |

### 4. 运行测试

```bash
npm test
```

### 5. 启动服务

```bash
npm start
```

服务启动后会:
1. 验证 COC API 连通性
2. 向微信发送一条"启动成功"通知
3. 立即执行一次轮询
4. 按配置间隔持续轮询

## 配置详情

### COC API Key 获取

1. 访问 https://developer.clashofclans.com
2. 注册/登录 Supercell 开发者账号
3. 创建新 API Key
4. **重要**: API Key 必须绑定你的服务器公网 IP
5. 可以创建多个 Key 绑定不同 IP

### WxPusher 配置

1. 访问 https://wxpusher.zjiecode.com/admin/
2. 微信扫码登录
3. 创建应用，获取 `appToken`
4. 获取你的 UID: 关注公众号「wxpusher」→「我的」→「我的UID」
5. 可选: 创建主题 Topic 用于群推送

### 轮询间隔设置

| 间隔 | 说明 | 推荐 |
|------|------|------|
| 5 分钟 | 响应快，但可能触发 API 限流 | 不推荐 |
| 15 分钟 | 平衡频率和及时性 | 推荐 |
| 30 分钟 | 较安全，适合低频关注 | 可选 |

## 工作原理

COC API 不直接提供"正在升级"状态，本系统通过**快照对比**推断升级完成:

```
第 1 次查询: Barbarian level = 4  (快照保存)
第 2 次查询: Barbarian level = 5  (检测到 4→5 = 升级完成!)
```

这意味着:
- 升级完成时间 ≈ 上次轮询到本次轮询之间
- 轮询间隔越短，通知越及时
- 首次运行不会误报（只保存快照，不检测升级）

## 文件结构

```
coc-upgrade-notifier/
├── src/
│   ├── index.js       # 主入口 - 启动轮询循环
│   ├── config.js      # 配置管理 - 读取 .env
│   ├── coc-client.js  # COC API 客户端
│   ├── detector.js    # 升级检测引擎（核心）
│   ├── snapshot.js    # 状态快照管理
│   ├── wxpusher.js    # WxPusher 推送模块
│   ├── logger.js      # 日志系统
│   └── test.js        # 单元测试
├── data/              # 快照+日志（自动生成，git忽略）
├── .env.example       # 配置模板
├── .gitignore
├── package.json
└── README.md
```

## 常见问题

### Q: 启动报 COC API 403 错误
A: API Key 需要绑定运行服务器的公网 IP。在开发者网站重新创建绑定正确 IP 的 Key。

### Q: WxPusher 收不到通知
A:
1. 确认 `appToken` 正确
2. 确认 `UID` 正确（关注公众号后获取）
3. 检查 WxPusher 管理后台的应用状态

### Q: COC API 429 限流
A: 增大 `POLL_INTERVAL_MINUTES`，推荐 15 分钟以上。你有几个玩家就对应几次 API 调用。

### Q: 升级了但没收到通知
A: 本系统检测的是**等级变化**，只有在两次轮询之间 level 增加了才会触发。首次启动保存快照但不检测。

## 长期运行建议

### 使用 PM2 守护进程（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start src/index.js --name coc-notifier

# 查看日志
pm2 logs coc-notifier

# 开机自启
pm2 startup
pm2 save
```

### 使用 systemd (Linux)

```ini
# /etc/systemd/system/coc-notifier.service
[Unit]
Description=COC Upgrade Notifier
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/coc-upgrade-notifier
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 使用 Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
COPY .env.example .env
CMD ["node", "src/index.js"]
```

```bash
# 构建并运行
docker build -t coc-notifier .
docker run -d --name coc-notifier --env-file .env coc-notifier
```

### 使用 GitHub Actions（无需自己的服务器）

如果你没有自己的服务器，也可以使用 GitHub Actions 定时运行检测。每次运行会检查一次并推送通知（不会持续轮询）。

#### 前置条件
1. 你的仓库必须是公开的或你有权限使用 GitHub Actions
2. 需要准备以下 Secrets（在仓库 Settings → Secrets and variables → Actions 中添加）：
   - `COC_API_KEY`：你的 Clash of Clans API Key
   - `COC_PLAYER_TAGS`：要监控的玩家 Tag，多个用逗号分隔（如 `#ABC123,#DEF456`）
   - `WXPUSHER_APP_TOKEN`：WxPusher 应用 Token
   - `WXPUSHER_UIDS`：接收通知的 UID，多个用逗号分隔
   - `WXPUSHER_TOPIC_IDS`：（可选）主题 ID，多个用逗号分隔
   - `GIST_TOKEN`：拥有 `gist` 权限的 GitHub Personal Access Token
   - `GIST_ID`：用于存储快照的 Gist ID（新建一个公开或私有的 Gist，获取其 ID）

#### 工作流文件
在仓库根目录创建 `.github/workflows/coc-check.yml`，内容如下：

```yaml
name: COC 升级检测

on:
  # 每 30 分钟执行一次（0 分 和 30 分）
  schedule:
    - cron: '0,30 * * * *'
  workflow_dispatch:  # 允许手动触发

jobs:
  check-upgrades:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装 Node.js

## 监控项目升级

本系统检测的升级类型:

| 类别 | 示例 | 检测方式 |
|------|------|----------|
| 大本营 | Town Hall 14→15 | townHallLevel 变化 |
| 大本营武器 | Weapon Lv4→5 | townHallWeaponLevel 变化 |
| 建筑大师大本营 | BH 9→10 | builderHallLevel 变化 |
| 部队 | Barbarian Lv5→6 | troops[].level 变化 |
| 英雄 | BK Lv30→31 | heroes[].level 变化 |
| 法术 | Lightning Lv5→6 | spells[].level 变化 |
| 英雄装备 | Eternal Tome Lv1→2 | heroEquipment[].level 变化 |

> 注意: COC API 不直接暴露建筑（防御/资源建筑）的等级，建筑的升级检测暂不可行。本系统仅监测 部队/英雄/法术/装备/大本营 五类升级。
