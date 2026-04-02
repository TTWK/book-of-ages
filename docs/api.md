# API 设计

## 认证机制

- **Web UI 访问**：局域网环境默认信任，无强制用户登录。
- **外部 Agent 调用**：强制 API Key 认证（在请求头携带：`X-API-Key`）。系统将记录不同 API Key 的调用审计日志。

## 接口列表

### 1. 事件管理 (Events & Inbox)

核心机制：外部 Agent 推送 `draft` 状态的事件，用户在收件箱中审批更新为 `confirmed`。

```
GET    /api/events                    # 获取事件列表
       ?status=draft|confirmed        # 筛选状态（如 status=draft 获取收件箱内容）
       ?tag=tagId                     # 筛选标签
       ?page=1&pageSize=20

POST   /api/events                    # 创建事件（Agent 推送通常在此设定 status='draft'）
GET    /api/events/:id                # 获取单个事件详情
PUT    /api/events/:id                # 更新事件（如：一键审批收录 status='confirmed'）
DELETE /api/events/:id                # 删除事件（软删除）
```

### 2. 时间线 (Timeline)

允许在收录事件后追加发展脉络。

```
GET    /api/events/:id/timeline       # 获取事件的时间线节点
POST   /api/events/:id/timeline       # 为事件添加新的时间线节点
PUT    /api/timeline/:nodeId          # 更新时间线节点
DELETE /api/timeline/:nodeId          # 删除时间线节点
```

### 3. 辅助工具 (Tools - 剪藏提效)

```
POST   /api/tools/parse-url           # URL 解析服务
       - url: "https://..."
       -> 返回网页标题、Markdown 正文、快照截图信息
```

### 4. 参考材料 (Materials)

```
GET    /api/events/:id/materials      # 获取事件关联的所有材料
POST   /api/materials/upload          # 上传材料（支持 multipart 表单）
       - event_id: 事件 ID
       - timeline_node_id: 节点 ID（可选）
       - type: 材料类型 (image/pdf/html_snapshot 等)
       - file: 文件本体
       - source_url: 来源链接（可选）

GET    /api/materials/:id             # 获取材料元数据
DELETE /api/materials/:id             # 删除材料（软删除）
GET    /api/materials/:id/preview     # 预览/下载材料文件
```

### 5. 标签体系 (Tags)

主要用于事件聚类与合集。

```
GET    /api/tags                      # 获取标签列表（支持树形层级）
POST   /api/tags                      # 创建新标签
PUT    /api/tags/:id                  # 更新标签
DELETE /api/tags/:id                  # 删除标签
```

### 6. 全局搜索 (Search)

基于 SQLite FTS5，提供高性能文本检索。

```
GET    /api/search?q=keyword          # 全文搜索
       ?type=event|material|timeline  # 限定搜索范围
       ?startDate=2026-01-01          # 时间范围
       ?endDate=2026-12-31
```

### 7. 系统配置与安全审计 (Settings & Security)

```
GET    /api/settings/keys             # 获取 API Key 列表
POST   /api/settings/keys             # 创建新的 API Key（分配给不同的 Agent）
DELETE /api/settings/keys/:id         # 吊销 API Key

GET    /api/audit/logs                # 查看操作审计日志（供排查异常 Agent 行为）
```

## 标准响应格式

为保证外部 Agent 的高容错处理，所有接口均采用以下标准的返回格式：

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 列表与分页响应

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 错误响应 (Error Handling)

需包含明确的业务错误码 `code`，便于外部脚本重试纠错。

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "标题不能为空"
  }
}
```