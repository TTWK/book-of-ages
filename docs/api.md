# API 设计

## 认证

- 用户操作：暂无认证（局域网信任）
- AI 操作：API Key 认证（Header: `X-API-Key`）

## 接口列表

### 事件

```
GET    /api/events                    # 获取事件列表
       ?status=confirmed              # 筛选状态
       ?tag=tagId                     # 筛选标签
       ?importance=3                  # 筛选重要程度
       ?page=1&pageSize=20

POST   /api/events                    # 创建事件
GET    /api/events/:id                # 获取事件详情
PUT    /api/events/:id                # 更新事件
DELETE /api/events/:id                # 删除事件（软删除）

GET    /api/events/:id/versions       # 获取版本历史
POST   /api/events/:id/restore/:ver   # 恢复到指定版本
```

### 时间线

```
GET    /api/events/:id/timeline       # 获取事件时间线
POST   /api/events/:id/timeline       # 添加时间线节点
PUT    /api/timeline/:nodeId          # 更新节点
DELETE /api/timeline/:nodeId          # 删除节点
```

### 材料

```
GET    /api/events/:id/materials      # 获取事件材料
POST   /api/materials/upload          # 上传材料（multipart）
       - event_id: 事件 ID
       - timeline_node_id: 节点 ID（可选）
       - type: 材料类型
       - source_type: 来源类型
       - file: 文件
       - source_url: 来源链接（可选）

GET    /api/materials/:id             # 获取材料信息
DELETE /api/materials/:id             # 删除材料（软删除）
GET    /api/materials/:id/preview     # 预览材料
```

### 标签

```
GET    /api/tags                      # 获取标签列表（树形）
POST   /api/tags                      # 创建标签
PUT    /api/tags/:id                  # 更新标签
DELETE /api/tags/:id                  # 删除标签
```

### 关联

```
GET    /api/events/:id/relations      # 获取事件关联
POST   /api/events/:id/relations      # 创建关联
DELETE /api/relations/:id             # 删除关联
```

### 搜索

```
GET    /api/search?q=keyword          # 全文搜索
       ?type=event|material|timeline  # 搜索类型
       ?startDate=2026-01-01          # 时间范围
       ?endDate=2026-12-31
```

### 回收站

```
GET    /api/trash                     # 获取回收站内容
POST   /api/trash/:type/:id/restore   # 恢复
DELETE /api/trash/:type/:id           # 彻底删除
```

### 设置

```
GET    /api/settings                  # 获取设置
PUT    /api/settings                  # 更新设置

GET    /api/settings/keys             # 获取 API Key 列表
POST   /api/settings/keys             # 创建 API Key
DELETE /api/settings/keys/:id         # 删除 API Key
```

### AI 接口（需 API Key）

```
GET    /api/ai/history                # 获取操作历史
GET    /api/ai/stats                  # 获取用户偏好统计
POST   /api/ai/events                 # AI 创建事件
POST   /api/ai/materials              # AI 上传材料
POST   /api/ai/suggestions            # AI 建议（关联、标签等）
```

## 响应格式

### 成功

```json
{
  "success": true,
  "data": { ... }
}
```

### 分页

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

### 错误

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "标题不能为空"
  }
}
```