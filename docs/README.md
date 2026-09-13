# 开发者指南 (Developer Guide)

> 本文档面向本项目的所有开发者（包括人类和 AI Agent），涵盖了项目的架构、开发流程和技术规范。

## 项目架构

本项目采用 Monorepo 结构，基于 npm workspaces 管理：

```
book-of-ages/
├── packages/
│   ├── web/                 # 前端 (Vue 3, Naive UI, TailwindCSS)
│   │   ├── src/
│   │   │   ├── api/         # API 客户端封装（同源 baseURL，开发经 vite 代理）
│   │   │   ├── components/  # 通用 UI 组件
│   │   │   ├── composables/ # 组合式函数（undo/快捷键/确认框等）
│   │   │   ├── views/       # 页面视图 (事件库、收件箱、详情、搜索等)
│   │   │   ├── router/      # Vue Router 路由配置
│   │   │   ├── stores/      # Pinia 状态管理
│   │   │   └── utils/       # 日期/标签等公共工具
│   ├── server/              # 后端 (Fastify, TypeScript, SQLite)
│   │   ├── src/
│   │   │   ├── db/          # 数据库连接和 Schema 定义
│   │   │   ├── routes/      # Fastify API 路由
│   │   │   ├── services/    # 核心业务逻辑（含 SSRF 防护 urlGuard）
│   │   │   ├── middleware/  # 认证和中间件
│   │   │   ├── mcp/         # MCP 工具定义与 JSON-RPC 处理
│   │   │   └── bin/         # stdio MCP 独立入口 (npm run start:mcp)
│   ├── clipper/             # 浏览器剪藏插件 (Chrome MV3)
│   └── shared/              # 前后端共享的 TypeScript 类型定义
├── data/                    # 运行时数据目录 (SQLite 数据库、上传的附件)
└── docs/                    # 项目文档和设计规范
```

## 技术栈

| 层级     | 技术                                                           |
| -------- | -------------------------------------------------------------- |
| **前端** | Vue 3 (Composition API), Vite, Naive UI, Pinia, TailwindCSS v4 |
| **后端** | Fastify, TypeScript, sqlite3 (异步绑定)                        |
| **存储** | SQLite (单文件数据库，无外部依赖)                              |
| **测试** | Vitest                                                         |

## 开发流程

### 1. 环境准备

- **Node.js**: >= 20
- **npm**: >= 9

### 2. 启动项目

```bash
npm install

# 启动后端 (默认端口 3000)
npm run dev:server

# 启动前端 (默认端口 5173)
npm run dev:web
```

### 3. 添加新功能指南

1.  在 `packages/shared/src/index.ts` 中定义或更新数据结构。
2.  在 `packages/server/src/services/` 实现后端业务逻辑。
3.  在 `packages/server/src/routes/` 注册 API 路由。
4.  在 `packages/web/src/api/` 封装对应的接口调用函数。
5.  在 `packages/web/src/views/` 或 `components/` 实现前端展示。
6.  **重要**: 为新功能编写测试，确保覆盖核心逻辑。

## 开发规范

### 1. 代码风格

- **命名**: 组件文件使用 `PascalCase`，模块/服务文件使用 `camelCase`，函数变量使用 `camelCase`。
- **TypeScript**: 严格模式，必须显式标注函数参数和返回值的类型。
- **异步**: 优先使用 `async/await`。

### 2. 提交规范 (Conventional Commits)

每次提交必须遵循以下格式：`<type>(scope): <description>`

- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `refactor`: 重构
- `chore`: 构建/配置

项目配置了 `husky` 和 `commitlint`，不符合规范的提交将被拦截。

### 3. 测试与质量

在提交前，请确保通过以下检查：

```bash
npm run lint          # 代码检查
npm run typecheck     # 类型检查
npm run test          # 运行测试
npm run build         # 验证构建
```

## 认证与安全

- **API Key 强制鉴权**: 所有写操作（POST/PUT/DELETE，含上传与归档）要求请求头携带 `X-API-Key`；只读接口保持开放。
  - 密钥在 Web「设置」页管理；浏览器本站密钥在「设置 → 本站访问密钥」保存（仅存于本浏览器 localStorage）。
  - 环境变量 `ADMIN_API_KEY` 作为管理员引导密钥（审计日志中以内置 `admin` 身份记录）。
  - 首次引导：未配置 `ADMIN_API_KEY` 且系统中还没有任何密钥时，允许匿名创建第一把密钥。
- **SSRF 防护**: 所有服务端对外抓取（网页快照、URL 解析、批量导入）统一经 `services/urlGuard.ts`：
  仅允许 http/https 常规端口、拒绝私网/环回/链路本地地址（含云元数据）、重定向逐跳复检、响应体限长。
- **快照安全**: 归档的 HTML 经 `/api/materials/:id/preview` 提供时强制 `CSP sandbox` 与 `nosniff`，脚本一律禁用。
- **不可篡改性**: 状态为 `confirmed` (已收录) 的事件，其核心字段 (标题/内容/日期/来源) 禁止 Agent 通过 API 修改。

## 部署 (Docker)

```bash
export ADMIN_API_KEY=your-admin-key   # 可选的管理员引导密钥
docker compose up -d --build
```

- 前端容器（nginx）将 `/api` 反代至后端容器；前端构建默认使用同源相对路径（`VITE_API_BASE_URL` 留空）。
- 分离部署时通过 `VITE_API_BASE_URL` build-arg 指向后端完整地址。
- 数据目录统一由 `DATA_DIR` 环境变量控制（默认 `<cwd>/data`）。

## 持续集成 (CI/CD)

项目使用 GitHub Actions 进行持续集成。每次推送或创建 PR 时都会在 Node 20/22 双版本上运行代码格式、Lint、类型检查、测试和构建；另含 docker build 冒烟任务，防止镜像产物在部署时才暴露问题。

## 文档归档 (Archive)

本项目使用专门的工具进行需求设计与实施。以下是历史记录：

- **标签管理优化**: [设计稿](./superpowers/specs/2026-05-07-enhanced-tag-management-design.md) | [实施计划](./superpowers/plans/2026-05-07-enhanced-tag-management.md)
- **全局光标隐藏**: [设计稿](./superpowers/specs/2026-05-07-global-caret-hide-design.md) | [实施计划](./superpowers/plans/2026-05-07-targeted-caret-hide.md)
- **页眉布局优化**: [设计稿](./superpowers/specs/2026-05-06-optimize-header-layout-design.md) | [基础设计](./superpowers/specs/2026-05-06-optimize-header-design.md)
- **CI/CD 标准**: [设计稿](./superpowers/specs/2026-04-11-dev-standards-cicd-design.md)
- **全面代码审查（2026-09-13）**: [审查报告](./reviews/2026-09-13-comprehensive-code-review.md)
