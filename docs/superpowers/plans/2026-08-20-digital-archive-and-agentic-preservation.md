# 岁月史书 (Book of Ages) 证据档案馆与 Agent 协同系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将「岁月史书」全面升级为抗 404 证据档案馆与 Agent 协同系统：包含高保真网页快照引擎、SHA-256 CAS 素材库、标准 MCP Server、浏览器剪藏扩展、书签批量导入与离线卷宗预览。

**Architecture:**

- 后端扩展：基于 Fastify v5 提供 SingleFile 离线快照生成、Readability 正文提炼、低负载书签批量导入队列与标准 MCP Server 协议端点。
- 存储层：SQLite 数据库 schema 迁移（快照元数据、导入任务表），本地素材库迁移为 SHA-256 内容寻址存储（CAS）。
- 前端与扩展：在 Web 端引入导入任务管理与原生快照预览，构建 Chrome/Edge Manifest V3 浏览器一键剪藏扩展。

**Tech Stack:** TypeScript, Fastify v5, SQLite (FTS5 + WAL), Vue 3, Naive UI, TailwindCSS, `@modelcontextprotocol/sdk`, Turndown, Readability, Vite.

**Spec:** [docs/superpowers/specs/2026-08-20-digital-archive-and-agentic-preservation-design.md](file:///D:/workspace/FROM_GITHUB/book-of-ages/docs/superpowers/specs/2026-08-20-digital-archive-and-agentic-preservation-design.md)

## Global Constraints

- 无重度外部服务依赖，纯本地私有化部署友好。
- SQLite FTS5 全文索引作为主力搜索，保持毫秒级响应与超低内存占用。
- 全工程遵循严格 TypeScript 强类型定义与 ESLint 规范 (0 error 0 warning)。

---

### Task 1: 共享类型与数据契约扩展 (`packages/shared`)

**Files:**

- Modify: `packages/shared/src/index.ts`
- Test: `npm run build -w @book-of-ages/shared`

**Interfaces:**

- Produces: `SnapshotMetadata`, `ImportTask`, `ImportTaskItem`, `ImportTaskStatus`, `ImportType`, `CreateImportTaskInput`, `MCPToolDefinition`, `WebClipperPayload`

- [ ] **Step 1: 在 `packages/shared/src/index.ts` 中添加快照、导入任务与 MCP 接口定义**

```typescript
export interface SnapshotResult {
  htmlContent: string;
  markdownContent: string;
  title: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  faviconUrl?: string;
  savedAssets: { originalUrl: string; localPath: string; hash: string }[];
}

export type ImportType = 'bookmarks' | 'urls' | 'markdown_zip';
export type ImportTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ImportItemStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface ImportTask {
  id: string;
  type: ImportType;
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  status: ImportTaskStatus;
  error_log?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportTaskItem {
  id: string;
  task_id: string;
  source_url: string;
  title?: string;
  status: ImportItemStatus;
  event_id?: string;
  error_message?: string;
  created_at: string;
}

export interface WebClipperPayload {
  url: string;
  title: string;
  selectedText?: string;
  fullHtml?: string;
  tags?: string[];
  notes?: string;
  autoConfirm?: boolean;
}
```

- [ ] **Step 2: 构建 shared package 并验证**
      Run: `npm run build -w @book-of-ages/shared`
      Expected: Build success with 0 errors.

---

### Task 2: 数据库迁移与高保真快照/CAS 存储引擎 (`packages/server`)

**Files:**

- Modify: `packages/server/src/db/index.ts`
- Create: `packages/server/src/services/snapshotService.ts`
- Test: `packages/server/src/__tests__/snapshotService.test.ts`

**Interfaces:**

- Produces: `captureSnapshot(url: string, options?: SnapshotOptions): Promise<SnapshotResult>`
- Produces: `saveCasFile(content: Buffer | string, extension: string): Promise<{ path: string; hash: string; size: number }>`

- [ ] **Step 1: 更新数据库 Schema 支持快照与批量导入表**
      在 `packages/server/src/db/index.ts` 中增加 `import_tasks` 与 `import_task_items` 表，并扩充 `materials` 表。

- [ ] **Step 2: 编写 `snapshotService` 单元测试**
      测试 HTML 自包含提取、图片资源哈希化保存、Readability 正文与 Markdown 生成。

- [ ] **Step 3: 实现 `snapshotService.ts`**
      实现基于 Readability + Turndown + CAS 本地附件存储的轻量级高保真离线快照生成器。

- [ ] **Step 4: 运行测试验证**
      Run: `npm run test -w @book-of-ages/server`
      Expected: All tests pass.

---

### Task 3: 批量导入引擎与管理路由 (`packages/server`)

**Files:**

- Create: `packages/server/src/services/importService.ts`
- Create: `packages/server/src/routes/imports.ts`
- Modify: `packages/server/src/index.ts`
- Test: `packages/server/src/__tests__/importService.test.ts`

**Interfaces:**

- Produces: `createImportTask(type: ImportType, sourceContent: string): Promise<ImportTask>`
- Produces: `getImportTasks(): Promise<ImportTask[]>`
- Produces: `getImportTaskDetail(id: string): Promise<{ task: ImportTask; items: ImportTaskItem[] }>`
- Routes: `POST /api/imports`, `GET /api/imports`, `GET /api/imports/:id`

- [ ] **Step 1: 编写 `importService` 测试**
      测试 Netscape Bookmark HTML 解析、URL 逐条提取与任务状态跟踪。

- [ ] **Step 2: 实现 `importService.ts` 与低负载后台执行队列**
- [ ] **Step 3: 创建 `packages/server/src/routes/imports.ts` 并在 `index.ts` 注册**
- [ ] **Step 4: 运行服务端测试套件验证**

---

### Task 4: 原生 MCP (Model Context Protocol) Server 实现 (`packages/server/src/mcp`)

**Files:**

- Create: `packages/server/src/mcp/tools.ts`
- Create: `packages/server/src/mcp/server.ts`
- Modify: `packages/server/src/routes/tools.ts`
- Create: `packages/server/bin/mcp-server.ts`
- Test: `packages/server/src/__tests__/mcpTools.test.ts`

**Interfaces:**

- Produces: Stdio MCP Server binary (`npm run mcp`)
- Produces: HTTP SSE / POST JSON-RPC endpoint (`/api/mcp/sse`, `/api/mcp/messages`)
- Tools: `archive_url`, `create_event`, `append_timeline_node`, `upload_material`, `search_archives`, `get_event_detail`

- [ ] **Step 1: 编写 MCP 工具集测试**
- [ ] **Step 2: 实现 MCP Tools 处理器并映射至 `eventService` / `snapshotService` / `searchService`**
- [ ] **Step 3: 实现 Stdio & HTTP 传输层**
- [ ] **Step 4: 运行测试并验证 MCP 协议兼容性**

---

### Task 5: 浏览器剪藏插件 Web Clipper (`packages/clipper`)

**Files:**

- Create: `packages/clipper/manifest.json`
- Create: `packages/clipper/src/popup.html`
- Create: `packages/clipper/src/popup.ts`
- Create: `packages/clipper/src/content.ts`
- Create: `packages/clipper/src/background.ts`
- Create: `packages/clipper/vite.config.ts`
- Create: `packages/clipper/package.json`

**Interfaces:**

- Produces: Manifest V3 Extension build artifact in `packages/clipper/dist`
- Feature: 1-Click Page Freeze, Selection Clip, Tagging, Server URL & API Key configuration

- [ ] **Step 1: 初始化 `packages/clipper` 模块与 Manifest V3 配置**
- [ ] **Step 2: 实现 Content Script 提取 DOM 结构与选区内容**
- [ ] **Step 3: 实现 Popup 交互界面与 Background 发送管道**
- [ ] **Step 4: 构建并验证扩展打包输出**

---

### Task 6: 前端归档管理、快照预览与批量导入视图 (`packages/web`)

**Files:**

- Create: `packages/web/src/api/importApi.ts`
- Create: `packages/web/src/views/ImportView.vue`
- Create: `packages/web/src/components/SnapshotModal.vue`
- Modify: `packages/web/src/router/index.ts`
- Modify: `packages/web/src/components/MainLayout.vue`
- Modify: `packages/web/src/views/EventDetailView.vue`

**Interfaces:**

- Features:
  - 导入任务监控视图与书签上传面板
  - 事件详情页中高保真网页快照（HTML Snapshot）的原生即时预览与源码切换
  - 离线归档状态与 CAS 哈希指标展示

- [ ] **Step 1: 封装前端 `importApi.ts`**
- [ ] **Step 2: 创建 `SnapshotModal.vue` 预览组件并在 `EventDetailView.vue` 中集成**
- [ ] **Step 3: 创建 `ImportView.vue` 并在路由和侧边栏注册**
- [ ] **Step 4: 运行前端类型检查与构建验证**

---

### Task 7: 全链路集成验证、ESLint 清理与最终交付

**Files:**

- All packages
- Execute: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`

- [ ] **Step 1: 运行全工程 ESLint 检查并修复可能出现的类型与代码规范问题**
- [ ] **Step 2: 运行全量 TypeScript 编译检查 (`npm run typecheck`)**
- [ ] **Step 3: 运行全量单元测试与集成测试 (`npm run test`)**
- [ ] **Step 4: 运行全量生产打包 (`npm run build`)**
- [ ] **Step 5: 提交所有代码并输出完成报告**
