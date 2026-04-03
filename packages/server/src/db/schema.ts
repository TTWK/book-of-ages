/**
 * 数据库 Schema 定义
 * 基于 docs/data-model.md 中的设计规范
 */

export const schema = `
-- 启用外键支持
PRAGMA foreign_keys = ON;

-- ==================== 核心表 ====================

-- 1. events（事件表）
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'archived', 'deleted')),
    event_date DATE,
    source_url TEXT,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. event_timeline_nodes（时间线节点表）
CREATE TABLE IF NOT EXISTS event_timeline_nodes (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    node_date DATETIME,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. materials（参考材料表）
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    timeline_node_id TEXT REFERENCES event_timeline_nodes(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK(type IN ('image', 'video', 'pdf', 'snapshot', 'other')),
    title TEXT,
    file_path TEXT NOT NULL,
    source_url TEXT,
    content_text TEXT,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. tags（标签表）
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id TEXT REFERENCES tags(id) ON DELETE SET NULL,
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. event_tags（事件标签关联表）
CREATE TABLE IF NOT EXISTS event_tags (
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, tag_id)
);

-- ==================== 系统表 ====================

-- 6. api_keys（API 密钥表）
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. operation_logs（简易审计日志）
CREATE TABLE IF NOT EXISTS operation_logs (
    id TEXT PRIMARY KEY,
    api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE')),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================== 全文搜索虚拟表 (FTS5) ====================

-- events 全文搜索
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
    title,
    summary,
    content,
    content='events'
);

-- materials 全文搜索
CREATE VIRTUAL TABLE IF NOT EXISTS materials_fts USING fts5(
    title,
    content_text,
    content='materials'
);

-- timeline 全文搜索
CREATE VIRTUAL TABLE IF NOT EXISTS timeline_fts USING fts5(
    title,
    description,
    content='event_timeline_nodes'
);

-- ==================== 触发器：同步 FTS 索引 ====================

-- Events FTS 触发器
CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
    INSERT INTO events_fts(rowid, title, summary, content)
    VALUES (new.rowid, new.title, new.summary, new.content);
END;

CREATE TRIGGER IF NOT EXISTS events_ad AFTER DELETE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, summary, content)
    VALUES('delete', old.rowid, old.title, old.summary, old.content);
END;

CREATE TRIGGER IF NOT EXISTS events_au AFTER UPDATE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, summary, content)
    VALUES('delete', old.rowid, old.title, old.summary, old.content);
    INSERT INTO events_fts(rowid, title, summary, content)
    VALUES (new.rowid, new.title, new.summary, new.content);
END;

-- Materials FTS 触发器
CREATE TRIGGER IF NOT EXISTS materials_ai AFTER INSERT ON materials BEGIN
    INSERT INTO materials_fts(rowid, title, content_text)
    VALUES (new.rowid, new.title, new.content_text);
END;

CREATE TRIGGER IF NOT EXISTS materials_ad AFTER DELETE ON materials BEGIN
    INSERT INTO materials_fts(materials_fts, rowid, title, content_text)
    VALUES('delete', old.rowid, old.title, old.content_text);
END;

CREATE TRIGGER IF NOT EXISTS materials_au AFTER UPDATE ON materials BEGIN
    INSERT INTO materials_fts(materials_fts, rowid, title, content_text)
    VALUES('delete', old.rowid, old.title, old.content_text);
    INSERT INTO materials_fts(rowid, title, content_text)
    VALUES (new.rowid, new.title, new.content_text);
END;

-- Timeline FTS 触发器
CREATE TRIGGER IF NOT EXISTS timeline_ai AFTER INSERT ON event_timeline_nodes BEGIN
    INSERT INTO timeline_fts(rowid, title, description)
    VALUES (new.rowid, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS timeline_ad AFTER DELETE ON event_timeline_nodes BEGIN
    INSERT INTO timeline_fts(timeline_fts, rowid, title, description)
    VALUES('delete', old.rowid, old.title, old.description);
END;

CREATE TRIGGER IF NOT EXISTS timeline_au AFTER UPDATE ON event_timeline_nodes BEGIN
    INSERT INTO timeline_fts(timeline_fts, rowid, title, description)
    VALUES('delete', old.rowid, old.title, old.description);
    INSERT INTO timeline_fts(rowid, title, description)
    VALUES (new.rowid, new.title, new.description);
END;

-- ==================== 索引 ====================

-- 常用查询索引
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_status_deleted ON events(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_timeline_event_id ON event_timeline_nodes(event_id);
CREATE INDEX IF NOT EXISTS idx_materials_event_id ON materials(event_id);
CREATE INDEX IF NOT EXISTS idx_materials_timeline_node_id ON materials(timeline_node_id);
CREATE INDEX IF NOT EXISTS idx_tags_parent_id ON tags(parent_id);
CREATE INDEX IF NOT EXISTS idx_event_tags_event_id ON event_tags(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tags_tag_id ON event_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_api_key_id ON operation_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_entity ON operation_logs(entity_type, entity_id);
`;
