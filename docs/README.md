# 开发者指南

## 项目结构

```
book-of-ages/
├── packages/
│   ├── web/            # 前端（Vue 3 + Naive UI）
│   │   ├── src/
│   │   │   ├── views/        # 页面视图（8 个）
│   │   │   ├── components/   # 通用组件
│   │   │   ├── api/          # API 客户端封装
│   │   │   ├── router/       # 路由配置
│   │   │   └── stores/       # Pinia 状态管理
│   │   └── vitest.config.ts
│   ├── server/         # 后端（Fastify + SQLite）
│   │   ├── src/
│   │   │   ├── routes/       # API 路由（5 个文件）
│   │   │   ├── services/     # 业务逻辑（9 个文件）
│   │   │   ├── db/           # 数据库连接 + Schema
│   │   │   └── middleware/   # 认证中间件
│   │   └── vitest.config.ts
│   └── shared/         # 前后端共享 TypeScript 类型
├── data/               # 运行时数据（SQLite + 上传文件）
└── docs/               # 项目文档
```

## 开发流程

### 启动

```bash
npm install

# 分别启动
npm run dev:server    # 后端 → :3000
npm run dev:web       # 前端 → :5173
```

### 代码质量

| 命令                | 作用                |
| ------------------- | ------------------- |
| `npm run format`    | Prettier 格式化     |
| `npm run lint`      | ESLint 检查         |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run test`      | 运行测试            |
| `npm run build`     | 构建                |

提交时会自动运行 format + lint + commitlint。

### 提交规范

```
<type>(scope): <描述>

# type: feat | fix | docs | style | refactor | test | chore
# scope（可选）: server | web | db
```

## 如何添加新功能

```
1. 在 packages/shared/src/index.ts 添加类型定义
2. 在 packages/server/src/services/ 实现业务逻辑
3. 在 packages/server/src/routes/ 添加 API 路由
4. 在 packages/web/src/api/ 添加前端 API 调用
5. 在 packages/web/src/views/ 添加页面组件
6. 为新功能编写测试（放在各包的 __tests__/ 目录）
```

每次提交前确保 `npm run lint && npm run test && npm run build` 通过。

## 数据库

- 使用 `sqlite3`（异步绑定）
- Schema 定义在 `packages/server/src/db/schema.ts`
- 启动时自动建表（`CREATE TABLE IF NOT EXISTS`），不破坏现有数据
- 数据库文件位置：`data/book-of-ages.db`

## 认证机制

- Agent 通过 `X-API-Key` 请求头调用受限 API
- Web 端为可选认证（`optionalAuthMiddleware`），方便本地开发
- API Key 在"设置"页面管理
- **已收录（confirmed）事件的核心字段**（title/summary/content/event_date/source_url）禁止 Agent 修改

## 测试

| 包     | 框架   | 测试文件位置                     |
| ------ | ------ | -------------------------------- |
| server | Vitest | `packages/server/src/__tests__/` |
| web    | Vitest | `packages/web/src/__tests__/`    |

## 部署

```bash
docker-compose up -d
```

前端通过 Nginx 提供服务，后端为 Fastify API 服务。所有数据在 `./data` 目录。

## CI/CD

推送或创建 PR 时，GitHub Actions 自动运行：

- 代码格式检查
- ESLint
- 类型检查（当前有已知问题，不阻断）
- 测试
- 构建（当前有已知问题，不阻断）

详见 [AGENTS.md](../AGENTS.md)。
