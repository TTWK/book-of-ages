# API 设计

## 认证机制

- **Web UI 访问**：局域网环境默认信任，无强制用户登录。（多用户认证与登录支持已记录在远期规划中）。
- **外部 Agent 调用**：强制 API Key 认证（在请求头携带：`X-API-Key`）。系统将记录不同 API Key 的调用审计日志。

## 数据修改边界 (Agent 权限约束)

- 当事件状态为 `draft`（草稿/收件箱状态）时，Agent 可以自由更新该事件的所有字段。
- **核心约束**：一旦事件状态变更为 `confirmed`（已被用户正式收录），通过 API Key 访问的 Agent **将失去修改事件主标题 (`title`)、摘要 (`summary`) 和主体内容 (`content`) 的权限**。任何尝试修改已确认事件主体的 API 请求将被拒绝并返回 `403 Forbidden`。
- 对于已收录的事件，Agent 仅能通过调用 Timeline 和 Materials 相关的 API 来**追加**脉络和参考资料。

## 接口列表

### 1. 事件管理 (Events & Inbox)

```
GET    /api/events                    # 获取事件列表
       ?status=draft|confirmed        # 筛选状态
       ?tag=tagName                   # 筛选标签
       ?page=1&pageSize=20

POST   /api/events                    # 创建事件
       # (用户前端手动创建时携带 status='confirmed'，Agent 推送默认为 'draft')
       # (如果在 payload 的 tags 数组中传入了不存在的标签名，后端将自动创建新标签并关联)

GET    /api/events/:id                # 获取单个事件详情

PUT    /api/events/:id                # 更新事件
       # (注意：如果带着 X-API-Key 且事件是 confirmed，尝试修改 title/content 会报 403)

DELETE /api/events/:id                # 删除事件（软删除）
```

### 2. 时间线 (Timeline)

允许在事件内追加发展脉络。用户和 Agent 均可调用，用户在 UI 可自由修改，Agent 常用于补充新动态。

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
       -> 返回网页标题、Markdown 正文等信息，供前端展示在表单中由用户二次确认。
```

### 4. 参考材料 (Materials)

```
GET    /api/events/:id/materials      # 获取事件关联的所有材料
POST   /api/materials/upload          # 上传材料（支持 multipart 表单）
       - event_id: 事件 ID
       - timeline_node_id: 节点 ID（可选）
       - type: 材料类型
       - file: 文件本体
       - source_url: 来源链接（可选）

GET    /api/materials/:id             # 获取材料元数据
DELETE /api/materials/:id             # 删除材料
GET    /api/materials/:id/preview     # 预览/下载材料文件
```

### 5. 标签体系 (Tags)

```
GET    /api/tags                      # 获取标签列表
POST   /api/tags                      # 手动创建新标签
PUT    /api/tags/:id                  # 更新标签
DELETE /api/tags/:id                  # 删除标签
```

### 6. 全局搜索 (Search)

基于 SQLite FTS5，提供高性能文本检索。

```
GET    /api/search?q=keyword          # 全文搜索
       ?type=event|material|timeline  # 限定搜索范围
```

### 7. 系统配置与安全审计 (Settings & Security)

```
GET    /api/settings/keys             # 获取 API Key 列表
POST   /api/settings/keys             # 创建新的 API Key
DELETE /api/settings/keys/:id         # 吊销 API Key

GET    /api/audit/logs                # 查看操作审计日志
```

## 标准响应格式

为保证外部 Agent 的高容错处理，所有接口均采用标准 JSON 响应：

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应 (Error Handling)

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN_MODIFICATION",
    "message": "Event is already confirmed. Agents cannot modify the main content."
  }
}
```