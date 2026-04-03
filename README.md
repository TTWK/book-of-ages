# 岁月史书 (Book of Ages)

个人事件记录与管理系统，作为“纯净数据底座”，提供高可用 API 供外部 AI Agent 操作，并在内部 UI 提供极简高效的“收件箱审批与收录”体验。

## 核心定位

系统自身**不包含任何大语言模型（LLM）的直接调用与主动分析逻辑**。它是一个高内聚的 Headless CMS（无头内容管理系统）与个人 UI 展示端的结合体。
外部爬虫或 Agent 负责信息的搜集、总结和提炼，通过 API 推送到本系统的“收件箱 (Inbox)”中，用户通过 Web UI 进行快速的浏览和一键收录（审批）。

## 核心功能

- **收件箱审批流**：外部 Agent 批量推送（草稿状态），人工一键浏览、确认收录或归档。
- **纯净数据底座**：对外提供标准、高容错的 RESTful API，并支持多组 API Key 鉴权。
- **一键剪藏提效**：内置 URL 解析服务，自动提取网页正文并转换为 Markdown，免除手动复制排版烦恼。
- **事件与脉络管理**：创建、编辑事件，并支持时间线节点追加，记录事件发展过程。
- **材料存储**：支持保存网页快照、截图和文件。
- **层级标签**：利用灵活的标签系统进行事件聚类和检索。
- **全文搜索**：基于 SQLite FTS5 的高速事件与材料搜索。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Naive UI |
| 后端 | Fastify (TypeScript) |
| 存储 | SQLite + 文件系统 |
| 搜索 | SQLite FTS5 |

## 项目结构

```
book-of-ages/
├── packages/
│   ├── web/                 # 前端 (Vue 3, Naive UI)
│   ├── server/              # 后端 (Fastify, SQLite)
│   └── shared/              # 共享类型定义
├── data/                    # 数据目录 (SQLite 数据库文件和媒体文件)
├── docs/                    # 项目文档
├── AGENTS.md                # AI 开发者开发规范指南
└── README.md                # 本文档
```

## 核心文档

- [核心设计规范 (Spec)](./docs/superpowers/specs/2026-04-02-book-of-ages-design.md)
- [数据模型](./docs/data-model.md)
- [API 设计](./docs/api.md)
- [开发计划](./docs/roadmap.md)
- [AI 开发者规范 (AGENTS.md)](./AGENTS.md)

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 9

### 本地开发

#### 1. 安装依赖

```bash
npm install
```

#### 2. 启动开发服务器

```bash
# 启动后端服务 (端口 3000)
npm run dev:server

# 启动前端开发服务器 (端口 5173)
npm run dev:web
```

访问 http://localhost:5173 即可使用系统。

#### 3. 构建生产版本

```bash
# 构建所有包
npm run build
```

### Docker 部署

#### 使用 Docker Compose (推荐)

```bash
# 一键启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

启动后访问：
- 前端：http://localhost
- 后端 API：http://localhost:3000

数据将持久化保存在 `./data` 目录。

#### 单独构建镜像

```bash
# 构建后端镜像
docker build -t book-of-ages-server .

# 构建前端镜像
docker build -f Dockerfile.web -t book-of-ages-web .
```

### 数据备份

```bash
# 备份数据库和媒体文件
tar -czf book-of-ages-backup.tar.gz ./data

# 恢复备份
tar -xzf book-of-ages-backup.tar.gz
```

## 许可证

MIT