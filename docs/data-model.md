# 数据模型

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

## 核心表

### events（事件）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| title | TEXT | 标题，必填 |
| summary | TEXT | 摘要 |
| content | TEXT | 详细内容（Markdown） |
| importance | INTEGER | 重要程度 1-5 |
| status | TEXT | draft/confirmed/archived/deleted |
| event_date | DATE | 事件发生日期 |
| source_url | TEXT | 来源链接 |
| deleted_at | DATETIME | 软删除时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### event_timeline_nodes（时间线节点）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| event_id | TEXT | 关联事件 ID |
| title | TEXT | 节点标题，必填 |
| description | TEXT | 节点描述 |
| node_date | DATETIME | 节点时间 |
| sort_order | INTEGER | 排序 |

### materials（材料）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| event_id | TEXT | 关联事件 ID |
| timeline_node_id | TEXT | 关联节点 ID（可选） |
| type | TEXT | snapshot/image/video/pdf/audio/other |
| source_type | TEXT | official/social/blog/video/forum/other |
| title | TEXT | 材料标题 |
| file_path | TEXT | 存储路径 |
| source_url | TEXT | 来源链接 |
| content_text | TEXT | 提取的文本（用于搜索） |
| status | TEXT | active/deleted |
| deleted_at | DATETIME | 软删除时间 |

### tags（标签）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| name | TEXT | 标签名称 |
| parent_id | TEXT | 父标签 ID（支持层级） |
| color | TEXT | 颜色 |
| sort_order | INTEGER | 排序 |

### event_tags（事件标签关联）

| 字段 | 类型 | 说明 |
|------|------|------|
| event_id | TEXT | 事件 ID |
| tag_id | TEXT | 标签 ID |

### event_relations（事件关联）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| event_a | TEXT | 事件 A ID |
| event_b | TEXT | 事件 B ID |
| relation_type | TEXT | related/cause_effect/series/contrast |
| reason | TEXT | 关联原因 |
| confidence | REAL | 置信度（AI 生成） |
| source | TEXT | manual/ai |

### event_versions（版本历史）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| event_id | TEXT | 事件 ID |
| version_number | INTEGER | 版本号 |
| snapshot | TEXT | 完整快照（JSON） |
| created_at | DATETIME | 创建时间 |

### api_keys（API 密钥）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| name | TEXT | 密钥名称 |
| key_hash | TEXT | 密钥哈希 |
| permissions | TEXT | 权限（JSON） |
| last_used | DATETIME | 最后使用时间 |

### operation_logs（操作日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID，主键 |
| action | TEXT | 操作类型 |
| entity_type | TEXT | 实体类型 |
| entity_id | TEXT | 实体 ID |
| before_data | TEXT | 操作前数据（JSON） |
| after_data | TEXT | 操作后数据（JSON） |
| created_at | DATETIME | 创建时间 |

## 全文搜索

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