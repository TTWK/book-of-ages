# AI 开发者规范 (AGENTS.md)

## 项目概述

**岁月史书 (Book of Ages)** - 个人事件记录与管理系统

- **定位**: AI 友好的 Headless CMS，作为"纯净数据底座"
- **核心流程**: 外部 Agent 推送草稿 → 人工审批收录 → 正式事件库
- **原则**: YAGNI (You Aren't Gonna Need It)，保持简单实用

## 技术栈

| 层级 | 技术                            |
| ---- | ------------------------------- |
| 前端 | Vue 3 + Vite + Naive UI + Pinia |
| 后端 | Fastify (TypeScript)            |
| 存储 | SQLite (sqlite3)                |
| 共享 | TypeScript 类型定义             |

## 项目结构

```
book-of-ages/
├── packages/
│   ├── web/                 # 前端 (Vue 3, Naive UI)
│   │   ├── src/
│   │   │   ├── api/         # API 客户端封装
│   │   │   ├── components/  # 通用组件
│   │   │   ├── views/       # 页面视图
│   │   │   ├── router/      # 路由配置
│   │   │   └── stores/      # Pinia 状态管理
│   ├── server/              # 后端 (Fastify, SQLite)
│   │   ├── src/
│   │   │   ├── db/          # 数据库连接和工具
│   │   │   ├── routes/      # API 路由
│   │   │   ├── services/    # 业务逻辑
│   │   │   └── middleware/  # 中间件
│   └── shared/              # 共享类型定义
├── data/                    # 数据目录 (SQLite 数据库)
└── docs/                    # 项目文档
```

## 开发规范

### 1. 代码风格

- **TypeScript**: 严格模式，所有函数参数和返回值必须标注类型
- **命名规范**:
  - 文件/目录：kebab-case (如 `eventService.ts`)
  - 类/组件：PascalCase (如 `EventView.vue`)
  - 函数/变量：camelCase (如 `createEvent`)
  - 常量：UPPER_SNAKE_CASE (如 `API_BASE_URL`)
- **异步处理**: 使用 async/await，避免 Promise 链

### 2. API 设计规范

- **响应格式**: 统一使用标准格式

  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

- **错误处理**: 包含错误码和消息

  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "标题不能为空"
    }
  }
  ```

- **鉴权**: 外部 Agent 调用需在请求头携带 `X-API-Key`

### 3. 数据库规范

- **表名**: 复数形式，小写，下划线分隔 (如 `event_tags`)
- **字段**:
  - `id`: TEXT (UUID)
  - `created_at`, `updated_at`: DATETIME (ISO 字符串)
  - `deleted_at`: DATETIME (软删除标记)
- **状态字段**: 使用 CHECK 约束限制枚举值

### 4. 前端规范

- **组件**: 使用 Composition API (`<script setup>`)
- **状态管理**: 使用 Pinia
- **HTTP 请求**: 统一使用 `src/api/client.ts` 封装的 apiClient
- **UI 组件库**: Naive UI，保持设计一致性

### 5. 提交规范

- **格式**: `<type>: <description>`
- **类型**:
  - `feat`: 新功能
  - `fix`: Bug 修复
  - `refactor`: 重构
  - `docs`: 文档更新
  - `chore`: 构建/工具配置

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 9

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动后端 (端口 3000)
npm run dev:server

# 启动前端 (端口 5173)
npm run dev:web
```

### 构建

```bash
npm run build
```

## 核心 API

### 事件管理

```bash
# 获取事件列表 (收件箱)
GET /api/events?status=draft

# 创建事件
POST /api/events
{
  "title": "事件标题",
  "summary": "摘要",
  "content": "详细内容",
  "status": "draft"
}

# 收录事件 (审批通过)
PUT /api/events/:id
{
  "status": "confirmed"
}
```

### API Key 管理

```bash
# 生成新的 API Key
POST /api/settings/keys
{
  "name": "Daily Crawler Agent"
}

# 使用 API Key 调用
curl -H "X-API-Key: boa_xxx" http://localhost:3000/api/events
```

## 当前阶段

**Phase 1: 核心中台与 API** ✅ 已完成

- [x] 数据库模型和初始化
- [x] 事件 CRUD API
- [x] 标签 CRUD API
- [x] API Key 鉴权
- [x] 操作日志
- [x] 前端基础框架

## 下一步开发

参考 [docs/roadmap.md](./docs/roadmap.md)

## 常见问题

### Q: 为什么选择 sqlite3 而不是 better-sqlite3？

A: better-sqlite3 需要编译原生模块，在 Windows 上需要 Visual Studio 构建工具，且 Node.js 24 没有预编译二进制文件。sqlite3 虽然性能稍差，但跨平台兼容性更好。

### Q: 如何添加新功能？

A:

1. 在 `packages/shared/src/index.ts` 添加类型定义
2. 在 `packages/server/src/services/` 实现业务逻辑
3. 在 `packages/server/src/routes/` 添加 API 路由
4. 在 `packages/web/src/api/` 添加前端 API 调用
5. 在 `packages/web/src/views/` 添加页面组件

### Q: 数据库 Schema 变更如何处理？

A: 修改 `packages/server/src/db/schema.ts`，系统会在启动时自动执行新 Schema（使用 CREATE TABLE IF NOT EXISTS，不会破坏现有数据）。

## 开发规范与 CI/CD

### 提交规范

所有 commit message 必须遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(scope): <description>
```

- `type`: feat, fix, docs, style, refactor, test, chore
- `scope`（可选）: 影响范围，如 server, web, db
- 提交时会自动检查格式，不符合将被拒绝

### 提交前自动检查

`git commit` 时会自动执行：

- **Prettier**：自动格式化暂存的文件
- **ESLint**：自动修复可修复的问题
- **Commitlint**：检查 commit message 格式

如有无法自动修复的错误，提交会被拒绝，需要手动修复后重试。

### 常用命令

```bash
npm run format        # 格式化所有代码
npm run format:check  # 检查格式化（不修改文件）
npm run lint          # 检查代码质量
npm run lint:fix      # 自动修复代码质量问题
npm run typecheck     # TypeScript 类型检查
npm run test          # 运行所有测试
```

### 分支规范

- 不要直接在 `main` 上提交代码
- 每个功能/修复开独立分支：`feat/xxx`, `fix/xxx`, `refactor/xxx`
- 完成后通过 Pull Request 合入 `main`
- PR 必须通过 CI 检查（lint + typecheck + test + build）

### AI 开发指令

当实现新功能或修复 Bug 时：

1. 先写测试（TDD）
2. 实现代码使测试通过
3. 运行 `npm run lint && npm run typecheck && npm run test && npm run build` 全部通过后再提交
4. 每个测试应覆盖：正常输入、边界情况、错误情况
