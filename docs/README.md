# 开发者指南 (Developer Guide)

> 本文档面向本项目的所有开发者（包括人类和 AI Agent），涵盖了项目的架构、开发流程和技术规范。

## 项目架构

本项目采用 Monorepo 结构，基于 npm workspaces 管理：

```
book-of-ages/
├── packages/
│   ├── web/                 # 前端 (Vue 3, Naive UI, TailwindCSS)
│   │   ├── src/
│   │   │   ├── api/         # API 客户端封装
│   │   │   ├── components/  # 通用 UI 组件
│   │   │   ├── views/       # 页面视图 (事件库、详情、搜索等)
│   │   │   ├── router/      # Vue Router 路由配置
│   │   │   └── stores/      # Pinia 状态管理
│   ├── server/              # 后端 (Fastify, TypeScript, SQLite)
│   │   ├── src/
│   │   │   ├── db/          # 数据库连接和 Schema 定义
│   │   │   ├── routes/      # Fastify API 路由
│   │   │   ├── services/    # 核心业务逻辑
│   │   │   └── middleware/  # 认证和中间件
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

- **命名**: 文件使用 `kebab-case`，组件使用 `PascalCase`，函数变量使用 `camelCase`。
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

- **API Key**: 外部 Agent 调用 API 需在 Header 中携带 `X-API-Key`。
- **不可篡改性**: 状态为 `confirmed` (已收录) 的事件，其核心字段 (标题/内容/日期/来源) 禁止 Agent 通过 API 修改。

## 持续集成 (CI/CD)

项目使用 GitHub Actions 进行持续集成。每次推送或创建 PR 时都会运行代码格式、Lint、类型检查、测试和构建。

## 文档归档 (Archive)

本项目使用专门的工具进行需求设计与实施。以下是历史记录：

- **标签管理优化**: [设计稿](./superpowers/specs/2026-05-07-enhanced-tag-management-design.md) | [实施计划](./superpowers/plans/2026-05-07-enhanced-tag-management.md)
- **全局光标隐藏**: [设计稿](./superpowers/specs/2026-05-07-global-caret-hide-design.md) | [实施计划](./superpowers/plans/2026-05-07-targeted-caret-hide.md)
- **页眉布局优化**: [设计稿](./superpowers/specs/2026-05-06-optimize-header-layout-design.md) | [基础设计](./superpowers/specs/2026-05-06-optimize-header-design.md)
- **CI/CD 标准**: [设计稿](./superpowers/specs/2026-04-11-dev-standards-cicd-design.md)
