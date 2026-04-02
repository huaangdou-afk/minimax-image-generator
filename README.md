# MiniMax AI 生成器

[![CI/CD](https://github.com/huaangdou-afk/minimax-image-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/huaangdou-afk/minimax-image-generator/actions/workflows/ci.yml)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/huaangdou-afk/minimax-image-generator)

集图片生成、语音合成、提示词画廊于一体的 AI 创作工具。**部署后用户可直接使用，无需输入任何 Key。**

## 功能

- 🖼️ **图片生成** — 基于 MiniMax image-01 模型，支持多种尺寸
- 🔊 **语音合成** — 基于 MiniMax speech-2.8-hd 模型，3种音色可选
- 📚 **提示词画廊** — 内置 1116 个精选提示词，支持分类筛选和搜索

## 分支策略

本项目采用简化版 Git Flow 工作流：

| 分支 | 用途 | 保护策略 |
|------|------|---------|
| `master` | 生产环境代码，只有通过 PR 合并 | 必须通过 CI，禁止直接推送 |
| `develop` | 开发基准分支，功能合并到这里 | PR 必须通过 CI |

### 开发流程

```
1. 从 develop 新建功能分支：git checkout -b feat/xxx develop
2. 在功能分支上开发、提交（pre-commit hook 会自动运行 ESLint + 测试）
3. 推送到远程：git push origin feat/xxx
4. 创建 Pull Request → 合并到 develop
5. GitHub Actions CI 会自动验证，测试通过后合并
6. 如需发布，从 develop 创建 PR 合并到 master，触发 Render 部署
```

### pre-commit hook

本地提交前会自动运行以下检查，失败则阻止提交：
- `npx eslint --ignore-path .gitignore .` — 代码风格检查
- `npm test` — 单元测试

> Windows 用户：确保使用 Git Bash 或 WSL，以支持 shell 脚本运行。

## 快速启动

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd minimax-ai-generator
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 API Key（部署者需设置，用户不需要）

```bash
cp .env.example .env
```

编辑 `.env`，填入你的 MiniMax API Key：

```
MINIMAX_API_KEY=your_api_key_here
```

> API Key 获取地址：[MiniMax 控制台](https://platform.minimaxi.com/console/api-keys)

### 4. 启动服务

```bash
npm start
```

打开浏览器访问 **http://localhost:3000**

---

## 项目结构

```
├── server.js          # Express 后端服务器（持有 API Key）
├── public/
│   ├── index.html     # 前端页面
│   ├── js/
│   │   ├── utils.js   # 工具函数（toast、escapeHtml、parseSize）
│   │   ├── api.js     # API 调用层（generateImage、synthesize、downloadUrl）
│   │   └── ui.js      # UI 逻辑模块（图片/语音/画廊交互）
│   └── prompts.json   # 提示词数据 (1116条)
│                          说明：可通过 parse_prompts.js 从 prompts/ 目录
│                          中的 markdown 源文件重新生成，变更需手动同步。
├── prompts/           # 原始提示词 markdown 文件
├── parse_prompts.js  # 提示词解析脚本
├── package.json
├── .env.example
└── .gitignore
```

## 架构说明

- **前端**：原生 HTML/CSS/JS（ES Modules），模块化架构
  - `utils.js` — 工具函数（toast 提示、HTML 转义、尺寸解析）
  - `api.js` — API 调用层（统一错误处理、类型化接口）
  - `ui.js` — UI 逻辑（所有 DOM 交互与事件绑定）
- **后端**：Node.js + Express，持有 MiniMax API Key 代理转发请求
- **用户无需任何配置**，API Key 由部署者在服务端设置

## 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `MINIMAX_API_KEY` | 是 | — | MiniMax API Key，从 [控制台](https://platform.minimaxi.com/console/api-keys) 获取 |
| `PORT` | 否 | `3000` | 服务器监听端口 |

> 配置方法：复制 `.env.example` 为 `.env`，填入你的 API Key 后启动服务。

## 使用指南

### 图片生成
1. 在提示词输入框输入中文或英文描述
2. 从右侧「快速提示词」选择预设模板（可选）
3. 调整尺寸（1:1 / 16:9 / 9:16 / 4:3 / 3:4）
4. 点击「✦ 开始生成图片」或按 `Ctrl + Enter`
5. 图片生成后点击「⬇ 下载」在新窗口打开，右键另存为

### 语音合成
1. 输入要转换的文本（最多 3000 字）
2. 选择音色（清澈少年 / 甜美女声 / 甜美少女）
3. 调整语速（0.5x ~ 2.0x）
4. 点击「✦ 开始合成语音」或按 `Ctrl + Enter`
5. 合成完成后可播放、下载或复制链接

### 提示词画廊
- 搜索关键词可实时筛选
- 点击分类标签按类别过滤
- 点击卡片查看完整提示词
- 使用「中文」或「英文」按钮一键填入图片生成区

> 所有生成记录保存在浏览器本地 localStorage，最多保留 30 条。

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/generate` | POST | 图片生成（代理） |
| `/api/tts` | POST | 语音合成（代理） |
| `/api/key-status` | GET | API Key 状态 |
| `/api/download-image` | GET | 图片下载代理（解决跨域） |

## 技术栈

- **前端**：原生 HTML/CSS/JavaScript
- **后端**：Node.js + Express
- **API**：MiniMax Platform API

---

## 部署到 Render（免费，无需信用卡）

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/huaangdou-afk/minimax-image-generator)

### 方案一：一键部署（推荐）

点击上方按钮，跳转到 Render 并自动填写配置，确认后点击 **"Create Resource"** 即可。

### 方案二：手动部署

1. 登录 [Render](https://render.com/)（可用 GitHub 账号）
2. 点击 **New +** → **Blueprint**（或 Web Service）
3. 连接你的 GitHub 仓库：`https://github.com/huaangdou-afk/minimax-image-generator`
4. 确认以下配置：

   | 配置项 | 值 |
   |--------|-----|
   | Name | `minimax-image-generator` |
   | Region | Singapore（就近选择）|
   | Branch | `master` |
   | Runtime | `Node` |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
   | Plan | `Free` |

5. 点击 **"Create Blueprint"**，Render 会自动读取 `render.yaml` 并完成部署

### 部署后配置 API Key（必须）

> API Key 由服务端持有，用户打开网站直接使用，无需任何配置。

1. 部署完成后，进入该 Web Service 页面
2. 左侧菜单点击 **Environment** → **Secrets**
3. 添加以下环境变量：

   | Key | Value |
   |-----|-------|
   | `MINIMAX_API_KEY` | 你的 MiniMax API Key |

   API Key 获取地址：[MiniMax 控制台](https://platform.minimaxi.com/console/api-keys)

4. 点击 **Save Changes**，Render 会自动重新部署

### 冷启动说明

Render 免费套餐在 15 分钟无活动后会进入休眠，下次访问时会有约 30 秒的冷启动延迟，这是正常现象。

---

## 生产部署检查清单

每次部署后，请按以下清单确认服务正常运行：

### 1. Health Check 验证

部署完成后，GitHub Actions 会自动通过 `curl` 请求 `/api/key-status` 验证服务可用性。

手动验证：

```bash
curl https://minimax-image-generator.onrender.com/api/key-status
# 期望响应: {"configured": true}
```

### 2. API Key 配置确认

确认 `MINIMAX_API_KEY` 环境变量已正确设置：

- 登录 [Render Dashboard](https://dashboard.render.com)
- 进入 Web Service → Environment → Secrets
- 确认 `MINIMAX_API_KEY` 存在且值正确（不要暴露到日志）

### 3. CI/CD Commit Status 检查

GitHub Actions 会在每次部署后更新 commit status：

- `CI (Lint + Test + Build)` — 必须通过（红色 = 有问题）
- `render/deploy` — 部署结果（绿色 = 成功，红色 = 失败）
- 查看失败的 Action 日志确认具体错误原因

### 4. 监控配置建议

**Render 内置监控**：
- Render Dashboard → Metrics — 查看 QPS、延迟、错误率
- 设置 Alert 阈值（Request Error Rate > 5% 时通知）

**关键指标**：
| 指标 | 正常范围 | 告警阈值 |
|------|---------|---------|
| HTTP 2xx 比例 | > 95% | < 90% |
| 平均响应时间 | < 3s | > 10s |
| 冷启动延迟 | < 60s | > 120s |

**日志查看**：
- Render Dashboard → Logs — 实时查看应用日志
- 关注 `[ERROR]` 和 `[WARN]` 关键字

### 5. 安全检查

- [ ] API Key 仅存储在 Render Secrets，未泄露到代码或日志
- [ ] `npm audit` 无高危漏洞（CI 会自动检查）
- [ ] Dependabot PR 及时处理（依赖保持最新）

### 6. prompts.json 维护

`public/prompts.json` 已纳入版本控制，由 `parse_prompts.js` 脚本生成。

如需更新提示词库：
```bash
# 编辑 prompts/ 目录中的 .md 文件
node parse_prompts.js          # 重新生成 public/prompts.json
git add public/prompts.json
git commit -m "chore: update prompts"
git push                       # 触发 CI/CD 重新部署
```
