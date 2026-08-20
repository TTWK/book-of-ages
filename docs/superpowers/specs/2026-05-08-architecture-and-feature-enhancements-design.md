# 架构重构与功能增强设计规范 (Design Spec)

## 1. 概述与背景

《岁月史书 (Book of Ages)》是一个用于记录个人重要事件、梳理历史脉络、留存原始素材的系统，同时支持外部 AI Agent 推送与协作。

为提升系统的稳定性、可维护性、功能完整性与用户体验，本项目实施系统级重构与 Phase 5 功能闭环。

---

## 2. 目标与设计原则

1. **模块化与职责单一 (Modularity & SRP)**：拆分庞大的 `routes/events.ts`，将事件、时间线、材料、导出、分析分别独立为专职路由模块。
2. **功能闭环 (Feature Completeness)**：打通 Phase 5 规划中缺失的批量导出接口与前端入口、标签聚合分析接口与前端视图。
3. **数据一致性与类型安全 (Type Safety & Consistency)**：事件查询携带关联标签，消除前端 `any` 断言，统一 API 响应格式。
4. **健壮性与生命周期管理 (Robustness & Lifecycle)**：优化 SQLite 数据库连接与事务辅助函数，修复物理文件与软删除不同步问题。
5. **代码规范 (Clean Code)**：清理全部 ESLint 警告，保持测试覆盖率 100% 通过。

---

## 3. 架构设计与接口契约

### 3.1 后端路由拆分设计

- `packages/server/src/routes/events.ts`：仅负责事件核心 CRUD（`/api/events`、`/api/events/batch`、`/api/events/:id`、`/api/events/:id/tags`）。
- `packages/server/src/routes/timeline.ts`：负责时间线节点 CRUD（`/api/timeline`、`/api/timeline/:nodeId`）。
- `packages/server/src/routes/materials.ts`：负责材料上传、查询、更新、预览下载与删除（`/api/materials`、`/api/materials/upload`、`/api/materials/:id`、`/api/materials/:id/preview`）。
- `packages/server/src/routes/export.ts`：负责单事件 Markdown 导出（`/api/events/:id/export`）与批量事件导出（`/api/events/batch-export`）。
- `packages/server/src/routes/analytics.ts`：负责时间聚合分析（`/api/analytics/time-aggregation`）与标签聚合分析（`/api/analytics/tag-aggregation` 或 `/api/tags/:id/events`）。

### 3.2 数据结构与类型更新 (`@book-of-ages/shared`)

```typescript
// Event 扩展 tags 关联
export interface EventWithTags extends Event {
  tags?: Tag[];
}

// 批量导出输入与输出
export interface BatchExportInput {
  ids: string[];
  format?: 'markdown' | 'json';
}

export interface BatchExportResult {
  items: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

// 标签聚合分析结果
export interface TagAggregationResult {
  tag: Tag;
  events: Array<{
    id: string;
    title: string;
    summary?: string;
    event_date?: string;
    created_at: string;
  }>;
}
```

### 3.3 数据库层优化 (`packages/server/src/db/index.ts`)

- 改进 `run()` 函数，正确捕获 `this.lastID` 和 `this.changes`。
- 增强 `transaction()` 函数的异常捕获与 Promise 链式处理，防止未处理的异常挂起连接。

---

## 4. 前端交互与视图增强

1. **`EventsView.vue`**：
   - 在底部批量操作栏（`selectedIds.length > 0`）中加入「批量导出」按钮。
   - 点击后请求 `/api/events/batch-export`，支持将选中的事件一次性打包导出为包含各个 Markdown 的 zip 压缩包或合并文档下载。
2. **`TimelineView.vue`** & **`EventCard.vue`**：
   - 消费后端返回的 `tags` 列表，正常渲染事件标签，移除 `(event as any)`。
3. **`AnalyticsView.vue`**：
   - 增加「标签聚合脉络」标签页或板块，展示各个标签下的事件流转时间线与分布。
4. **代码规范与 Lint 治理**：
   - 修复前端所有 `any`、未使用的变量及 console 警告。

---

## 5. 验证标准

- `npm run typecheck`：通过，0 个错误。
- `npm run test`：全测试通过（包括既有 213 个单测与新增模块单测）。
- `npm run lint`：通过，0 个错误，0 个警告。
- `npm run build`：通过，前端产物与后端编译成功。
