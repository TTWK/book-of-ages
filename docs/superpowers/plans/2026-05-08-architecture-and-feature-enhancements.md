# 架构重构与功能增强实施计划 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构解耦后端路由模块，补齐 Phase 5 批量导出与标签聚合分析功能，修复数据关联与生命周期问题，清除全量 Lint 警告并确保端到端测试与构建完全通过。

**Architecture:**

- 后端将单体臃肿的 `routes/events.ts` 拆分为 `events`、`timeline`、`materials`、`export`、`analytics` 等专职路由。
- 增强 `db/index.ts` 的事务与 `lastInsertRowid`，`listEvents` 增加标签关联聚合支持。
- 前后端共享类型更新，完善批量导出及标签聚合分析接口，并在前端视图中打通交互。
- 清理前端 ESLint 警告，确保类型安全。

**Tech Stack:** Fastify v5, TypeScript, SQLite (fts5), Vue 3, Vite, Naive UI, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-08-architecture-and-feature-enhancements-design.md`

## Global Constraints

- Node >= 20, npm workspaces.
- 必须保持既有全部 213 个测试通过并扩充新测试。
- 必须满足 Conventional Commits 规范。
- 提交前必须通过 `typecheck`, `test`, `lint`, `build`。

---

### Task 1: 扩展共享类型契约 (`@book-of-ages/shared`)

**Files:**

- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 扩展 EventWithTags, BatchExportInput, BatchExportResult, TagAggregationResult 类型定义**
- [ ] **Step 2: 验证编译与构建**
- [ ] **Step 3: 提交代码**

---

### Task 2: 优化数据库层与服务层 (`packages/server/src/db` & `services`)

**Files:**

- Modify: `packages/server/src/db/index.ts`
- Modify: `packages/server/src/services/eventService.ts`
- Modify: `packages/server/src/services/tagService.ts`
- Modify: `packages/server/src/services/analyticsService.ts`
- Modify: `packages/server/src/services/batchExportService.ts`
- Test: `packages/server/src/__tests__/*`

- [ ] **Step 1: 优化 `db/index.ts` 中的 `run` 和 `transaction` 函数**
- [ ] **Step 2: 增强 `eventService.ts` 的 `listEvents`，支持返回关联 tags**
- [ ] **Step 3: 运行后端单元测试验证改动**
- [ ] **Step 4: 提交代码**

---

### Task 3: 拆解并新增后端路由 (`packages/server/src/routes`)

**Files:**

- Modify: `packages/server/src/routes/events.ts`
- Create: `packages/server/src/routes/timeline.ts`
- Create: `packages/server/src/routes/materials.ts`
- Create: `packages/server/src/routes/export.ts`
- Create: `packages/server/src/routes/analytics.ts`
- Modify: `packages/server/src/routes/tags.ts`
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: 创建 `timeline.ts`, `materials.ts`, `export.ts`, `analytics.ts` 路由模块**
- [ ] **Step 2: 简化 `events.ts`，仅保留核心事件 CRUD 和标签关联**
- [ ] **Step 3: 在 `export.ts` 中注册 `POST /api/events/batch-export` 与 `GET /api/events/:id/export`**
- [ ] **Step 4: 在 `analytics.ts` 和 `tags.ts` 中注册聚合分析路由**
- [ ] **Step 5: 在 `server/src/index.ts` 中统一注册所有路由**
- [ ] **Step 6: 编写路由集成测试或服务测试，确保全部测试通过**
- [ ] **Step 7: 提交代码**

---

### Task 4: 前端 API 封装与视图功能闭环 (`packages/web`)

**Files:**

- Modify: `packages/web/src/api/eventApi.ts`
- Modify: `packages/web/src/api/analyticsApi.ts`
- Modify: `packages/web/src/api/tagApi.ts`
- Modify: `packages/web/src/views/EventsView.vue`
- Modify: `packages/web/src/views/TimelineView.vue`
- Modify: `packages/web/src/views/AnalyticsView.vue`
- Modify: `packages/web/src/components/EventCard.vue`

- [ ] **Step 1: 在 `eventApi.ts` 中添加 `batchExportEvents` API**
- [ ] **Step 2: 在 `analyticsApi.ts` 中添加 `getTagAggregation` API**
- [ ] **Step 3: 在 `EventsView.vue` 批量操作栏中增加「批量导出」按钮并实现 Markdown 文件/合并导出下载**
- [ ] **Step 4: 在 `TimelineView.vue` 和 `EventCard.vue` 中绑定并展示 tags，消除 `(event as any)`**
- [ ] **Step 5: 在 `AnalyticsView.vue` 中增加标签维度聚合分析**
- [ ] **Step 6: 提交代码**

---

### Task 5: 全量 Lint 治理、类型检查与全栈验证

**Files:**

- Modify: `packages/server/src/**/*.ts`
- Modify: `packages/web/src/**/*.{ts,vue}`

- [ ] **Step 1: 清理所有 server 端 Lint warnings (unused-vars, any, console)**
- [ ] **Step 2: 清理所有 web 端 Lint warnings (unused-vars, any, console)**
- [ ] **Step 3: 执行 `npm run lint` 验证 0 errors, 0 warnings**
- [ ] **Step 4: 执行 `npm run typecheck` 验证 0 errors**
- [ ] **Step 5: 执行 `npm run test` 验证全部测试通过**
- [ ] **Step 6: 执行 `npm run build` 验证构建通过**
- [ ] **Step 7: 提交代码**
