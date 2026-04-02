# 数据模型

系统设计遵循 YAGNI（You Aren't Gonna Need It）原则，砍掉了复杂的版本历史和重度图谱关系，专注于提供坚固的“收件箱”记录模式。

## 实体关系图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Event     │──1:N──│  Timeline   │       │    Tag      │
│   事件      │       │   Node      │       │   标签      │
└─────────────┘       └─────────────┘       └─────────────┘
       │                                          │
       │1:N                                       │M:N
       │                                          │
       ▼                                          ▼
┌─────────────┐                          ┌─────────────┐
│  Material   │                          │ EventTag    │
│   材料      │                          │ 事件标签关联│
└─────────────┘                          └─────────────┘
```

## 核心表结构

### 1. events（事件表）
系统的核心内容单元，支持“草稿（收件箱）- 确认”流转。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| title | TEXT | 标题，必填 |
| summary | TEXT | 摘要，Agent 生成或人工编写 |
| content | TEXT | 详细内容（Markdown 格式） |
| status | TEXT | **draft (草稿/收件箱)** / confirmed (已确认收录) / archived / deleted |
| event_date | DATE | 事件发生日期 |
| source_url | TEXT | 主要来源链接 |
| deleted_at | DATETIME | 软删除时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 2. event_timeline_nodes（时间线节点表）
用于记录某个大事件下的发展脉络。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| event_id | TEXT | 关联的事件 ID |
| title | TEXT | 节点标题，必填 |
| description | TEXT | 节点详情描述（Markdown） |
| node_date | DATETIME | 节点发生时间 |
| sort_order | INTEGER | 排序权重 |

### 3. materials（参考材料表）
多媒体与文档存档。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| event_id | TEXT | 关联的事件 ID |
| timeline_node_id | TEXT | 关联的具体节点 ID（可选） |
| type | TEXT | image/video/pdf/snapshot/other |
| title | TEXT | 材料标题 |
| file_path | TEXT | 物理文件存储路径 |
| source_url | TEXT | 原始来源链接 |
| content_text | TEXT | 解析后提取的纯文本（用于 FTS 全文搜索） |
| deleted_at | DATETIME | 软删除时间 |
| created_at | DATETIME | 创建时间 |

### 4. tags（标签表）
用于对事件进行轻量级聚类与合集划分。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| name | TEXT | 标签名称 |
| parent_id | TEXT | 父标签 ID（支持构建简单的树形层级） |
| color | TEXT | UI 显示颜色 |

### 5. event_tags（事件标签关联表）

| 字段 | 类型 | 说明 |
|------|------|------|
| event_id | TEXT | 事件 ID |
| tag_id | TEXT | 标签 ID |

### 6. api_keys（API 密钥表）
用于对外部 Agent 的请求进行身份验证。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| name | TEXT | 密钥名称（如："Daily Crawler Agent"） |
| key_hash | TEXT | 密钥 Hash 值（安全存储） |
| last_used | DATETIME | 最后一次调用时间 |
| created_at | DATETIME | 创建时间 |

### 7. operation_logs（简易审计日志）
轻量级的操作防灾记录，用于追溯异常 Agent 行为，不保存详细的 Diff 数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| api_key_id | TEXT | 调用的 API Key ID（如果为 null 则是用户在 UI 上的操作） |
| action | TEXT | 动作类型（CREATE/UPDATE/DELETE） |
| entity_type | TEXT | 被操作实体（Event/Material 等） |
| entity_id | TEXT | 实体 ID |
| created_at | DATETIME | 发生时间 |

## 虚拟表 (全文搜索)

使用 SQLite FTS5 提供极速检索。

```sql
CREATE VIRTUAL TABLE events_fts USING fts5(
    title, summary, content,
    content='events'
);

CREATE VIRTUAL TABLE materials_fts USING fts5(
    title, content_text,
    content='materials'
);

CREATE VIRTUAL TABLE timeline_fts USING fts5(
    title, description,
    content='event_timeline_nodes'
);
```