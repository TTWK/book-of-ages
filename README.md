# 岁月史书 (Book of Ages)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

> 一个专注于“热点与时事记录”的个人知识管理系统与纯净数据底座。

岁月史书 (Book of Ages) 是一个为 AI 时代打造的高内聚 Headless CMS 与个人知识展示终端。它不仅提供极简的 UI 供用户进行个人的事件记录与脉络梳理，还提供标准、高容错的 RESTful API，完美对接外部自动化 Agent（如定时资讯爬虫），实现信息的无缝推送与高效聚合。

## ✨ 核心特性

- **🚀 核心事件库**：沉浸式的事件列表与详情呈现，支持手动录入、快捷剪藏，并提供一站式的编辑与收录体验。
- **📥 高效收件箱 (Inbox)**：外部 Agent 批量推送信息至收件箱（草稿态），用户只需一键浏览、确认收录，告别繁琐的信息搬运。
- **🔌 友好的 API 底座**：提供支持 API Key 鉴权的标准 RESTful 接口，轻松对接各类外部爬虫和 AI 工作流，并且有着严格的权限边界保护核心数据。
- **✂️ 一键剪藏提效**：内置智能 URL 解析服务，自动提取网页正文并转换为 Markdown，支持用户二次确认修改，免除手动复制排版烦恼。
- **⏱️ 深度脉络管理**：不仅记录单一事件，还支持为主事件追加“时间线 (Timeline)”和“参考材料 (Materials)”，深度还原事件的完整发展过程。
- **🏷️ 灵活的标签生态**：支持层级标签管理，并能在编辑事件时输入即自动创建新标签，快速实现信息的无感聚类。
- **🔍 极速全文检索**：基于 SQLite FTS5 构建，提供毫秒级的全局事件与材料搜索。

## 🛠 技术栈选型

- **前端 (Web)**: Vue 3 + Vite + Naive UI + TailwindCSS
- **后端 (Server)**: Fastify (TypeScript) 
- **数据持久化**: SQLite + 纯文件系统 (无外部服务依赖，极其适合 NAS 部署)
- **全文检索引擎**: SQLite FTS5

## 📦 项目结构

```text
book-of-ages/
├── packages/
│   ├── web/                 # 前端 UI 项目 (Vue 3)
│   ├── server/              # 后端服务项目 (Fastify)
│   └── shared/              # 前后端共享类型与接口定义
├── data/                    # 运行时数据目录 (SQLite 文件及上传的附件)
├── docs/                    # 项目设计与开发文档
└── docker-compose.yml       # Docker 部署编排文件
```

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- npm >= 9

### 本地开发指南

1. **安装全局依赖**
   ```bash
   npm install
   ```

2. **启动本地服务**
   ```bash
   # 启动后端服务 (运行在 3000 端口)
   npm run dev:server

   # 启动前端页面 (运行在 5173 端口)
   npm run dev:web
   ```
   启动完成后，浏览器访问 `http://localhost:5173` 即可进入系统。

### 🐳 Docker 一键部署 (推荐)

项目原生支持 Docker 容器化，极其适合部署在个人的服务器或 NAS 设备上。

```bash
# 启动所有服务
docker-compose up -d

# 停止服务
docker-compose down
```
部署成功后，前端入口为 `http://localhost`，后端 API 地址为 `http://localhost:3000`。所有产生的数据将安全地持久化在当前目录的 `./data` 文件夹中。

## 📚 开发者文档

- [系统架构与核心设计 (Spec)](./docs/superpowers/specs/2026-04-02-book-of-ages-design.md)
- [数据库模型](./docs/data-model.md)
- [API 接口规范](./docs/api.md)
- [开发演进路线图](./docs/roadmap.md)
- [AI 开发者接入指南 (AGENTS.md)](./AGENTS.md)

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。