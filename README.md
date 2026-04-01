# MiniMax AI 生成器

集图片生成、语音合成、提示词画廊于一体的 AI 创作工具。

## 功能

- 🖼️ **图片生成** — 基于 MiniMax image-01 模型，支持多种尺寸
- 🔊 **语音合成** — 基于 MiniMax speech-2.8-hd 模型，3种音色可选
- 📚 **提示词画廊** — 内置 1116 个精选提示词，支持分类筛选和搜索

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

### 3. 配置 API Key

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
├── server.js          # Express 后端服务器
├── public/
│   ├── index.html    # 前端页面
│   └── prompts.json   # 提示词数据 (1116条)
├── prompts/           # 原始提示词 markdown 文件
├── parse_prompts.js  # 提示词解析脚本
├── package.json
├── .env.example
└── .gitignore
```

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/generate` | POST | 图片生成 |
| `/api/tts` | POST | 语音合成 |
| `/api/key-status` | GET | API Key 状态 |

## 技术栈

- **前端**：原生 HTML/CSS/JavaScript
- **后端**：Node.js + Express
- **API**：MiniMax Platform API
