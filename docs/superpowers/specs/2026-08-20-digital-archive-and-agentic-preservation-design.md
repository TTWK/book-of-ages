# 岁月史书 (Book of Ages) —— 私有数字方志与抗 404 证据档案馆设计规范

## 1. 项目定位与核心愿景 (Positioning & Vision)

### 1.1 产品使命 (Mission Statement)

「岁月史书」是面向数据仓鼠党、历史记录者与独立思考者的**私有化数字方志与防篡改证据档案馆**。

公有云与易变的现代互联网充斥着 404 页面、删帖、篡改与平台倒闭风险。「岁月史书」旨在帮助用户将亲历的时代大事件、行业风云、重要推文与争论证据**100% 冻结并永久封存在自己完全掌控的私有存储中**。即便在多年甚至数十年后，依然能够随时调出当年的第一手原版证据。

### 1.2 核心价值支柱 (Core Pillars)

1. **深度数字冻结 (Deep Digital Preservation)**：不仅抓取文字，更完整冻结原网页 DOM 静态快照、原图、截图与附件，对抗网络遗忘与内容篡改。
2. **AI Agent 原生写史与调阅 (Agent-Native Integration)**：提供标准 MCP (Model Context Protocol) Server 与 REST 接口，无缝对接 OpenClaw、Hermes、Claude、Cursor 等 AI Agent，实现“Agent 自动抓取编纂、人工确认修史、Agent 反向调阅取证”。
3. **零摩擦极速录入 (Frictionless Ingestion)**：覆盖浏览器剪藏插件 (Web Clipper)、移动端快捷指令/Webhook、历史书签与 Markdown 批量导入。
4. **轻量高性能检索 (Sub-millisecond Retrieval)**：以 SQLite FTS5 全文索引为核心，结合多维标签体系与时间跨度，提供毫秒级字词命中、高亮与脉络溯源，不消耗重度算力。
5. **终极耐久与离线自足 (Lifelong Durability)**：纯文件级数据库（SQLite WAL）与内容寻址素材库（CAS），支持一键打包生成不依赖后端的独立离线 HTML/Markdown 卷宗。

---

## 2. 总体系统架构 (System Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              多源采集与录入层                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ 浏览器一键剪藏插件 │  │ 移动端 Webhook   │  │ 历史书签/Markdown批量导入  │  │
│  │  (Web Clipper)   │  │ (iOS快捷指令/TG) │  │  (HTML Bookmark Importer) │  │
│  └────────┬─────────┘  └────────┬─────────┘  └─────────────┬─────────────┘  │
│           │                     │                          │                │
│           │                     │                          │                │
│  ┌────────▼─────────────────────▼──────────────────────────▼─────────────┐  │
│  │                  Agent 协同通道 (原生 MCP Server 协议)                  │  │
│  │       (OpenClaw / Hermes / Claude Desktop / Cursor / 自定义 Agent)     │  │
│  └──────────────────────────────┬────────────────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           岁月史书核心后端引擎                                │
│                                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌───────────────┐  │
│  │  网页快照与正文提取引擎 │  │   事件与时间线编排    │  │   标签与脉络  │  │
│  │  - SingleFile DOM 冻结  │  │   - Events CRUD       │  │   - 层次化分类│  │
│  │  - Readability Markdown │  │   - Multi-Node Timeline│  │   - 演进追溯  │  │
│  │  - 静态素材本地化(CAS)  │  │   - 状态流转 (审核流) │  │   - 统计聚合  │  │
│  └────────────┬────────────┘  └───────────┬───────────┘  └───────┬───────┘  │
│               │                           │                      │          │
│               └───────────────────────────┼──────────────────────┘          │
│                                           │                                 │
│                                           ▼                                 │
│                         ┌──────────────────────────────────┐                │
│                         │        SQLite FTS5 全文索引       │                │
│                         │   (标题 / 正文 / 节点 / 素材元数据)│                │
│                         └─────────────────┬────────────────┘                │
└───────────────────────────────────────────┼─────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            私有化持久存储层                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────┐  │
│  │  SQLite 数据库文件     │  │  本地多媒体 CAS 存储库 │  │ 离线导出卷宗  │  │
│  │  (data/book-of-ages.db)│  │  (data/uploads/sha256) │  │ (Markdown/ZIP)│  │
│  └────────────────────────┘  └────────────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 详细模块设计与技术规范

### 3.1 深度数字冻结与素材存储引擎 (Preservation & CAS)

1. **网页快照捕获 (Web Snapshotting)**：
   - 抓取目标 URL 时，生成自包含的单文件 HTML 快照（包含内嵌 CSS、SVG、Base64/本地化微图），确保 20 年后断网环境下双击即可精确复原当时的网页排版与文字。
   - 同步生成干净的 Readability Markdown 用于阅读、引用、修史编辑和 FTS5 索引。
2. **内容寻址存储 (Content-Addressable Storage, CAS)**：
   - 网页引用的外部图片与附件下载至本地 `data/uploads/` 目录。
   - 文件名采用内容的 SHA-256 哈希命名（如 `a3f5...9b.jpg`），天然去重，确保证据防篡改与完整性校验。

### 3.2 原生 MCP Server 与 Agent 协同协议 (Agentic Integration)

为外部 Agent（OpenClaw、Hermes、Claude、Cursor 等）提供标准化的 Model Context Protocol 工具集：

| MCP 工具名称           | 功能说明                                         | 核心输入参数                                                           |
| :--------------------- | :----------------------------------------------- | :--------------------------------------------------------------------- |
| `archive_url`          | 深度抓取指定链接，生成快照并提取正文推入史书     | `url`, `tags?`, `notes?`, `auto_confirm?`                              |
| `create_event`         | 直接创建结构化历史事件                           | `title`, `summary?`, `content?`, `event_date?`, `tags?`, `source_url?` |
| `append_timeline_node` | 为已有事件添加细分时间节点与佐证                 | `event_id`, `title`, `node_date?`, `description?`                      |
| `upload_material`      | 为事件或节点上传附加证据素材                     | `event_id`, `timeline_node_id?`, `type`, `file_path/url`, `title?`     |
| `search_archives`      | 全文搜索历史档案（支持关键词、标签、日期区间）   | `query`, `tags?`, `start_date?`, `end_date?`, `limit?`                 |
| `get_event_detail`     | 获取某事件的完整卷宗（含所有时间节点与素材快照） | `event_id`                                                             |

### 3.3 全渠道极速录入 (Frictionless Ingestion)

1. **浏览器剪藏扩展 (Web Clipper Extension)**：
   - 采用 Chrome/Edge Manifest V3 标准。
   - 功能：一键整页剪藏、选中文本快速立案、右键区域截屏、快速打标签并直推后端 Inbox。
2. **历史数据与书签批量导入器 (Batch Importer)**：
   - 支持解析标准 Netscape Bookmark HTML 格式与 CSV/URL 列表。
   - 后台异步队列处理，限制并发为低负载模式，自动提取标题、元数据并创建草稿。

### 3.4 毫秒级全文检索与脉络追溯 (FTS5 Search & Taxonomy)

1. **SQLite FTS5 引擎深度调优**：
   - 使用 Unicode 分词器支持中英文字词精确检索。
   - 对 `events`, `materials`, `event_timeline_nodes` 建立倒排索引，支持加权排序与结果摘要高亮（Snippets）。
2. **标签与时序历史脉络**：
   - 标签树状层级（Parent-Child 结构）。
   - 标签事件聚合视图：按时间顺序列出特定标签下的所有历史节点，直观展现事件全貌演变。

### 3.5 离线卷宗与冷备份 (Cold Backup & Export)

1. **批量 Markdown / ZIP 打包**：支持选定事件或按标签全量导出为包含完整 YAML Frontmatter 的 Markdown 集合与本地媒体资源包。
2. **独立静态史书生成 (Static Site Generator)**：支持一键导出单机离线查看的纯静态 HTML 站点，彻底脱离 Node.js/数据库环境。

---

## 4. 数据库模式演进规范 (Database Schema Updates)

```sql
-- 1. 扩展 materials 表以支持高保真快照元数据
ALTER TABLE materials ADD COLUMN snapshot_html_path TEXT;
ALTER TABLE materials ADD COLUMN file_hash TEXT;
ALTER TABLE materials ADD COLUMN file_size INTEGER;

-- 2. 批量导入任务记录表 (用于追踪书签/大规模导入进度)
CREATE TABLE IF NOT EXISTS import_tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                -- 'bookmarks', 'urls', 'markdown_zip'
  total_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',     -- 'pending', 'processing', 'completed', 'failed'
  error_log TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. 导入任务明细表
CREATE TABLE IF NOT EXISTS import_task_items (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'pending',     -- 'pending', 'success', 'failed'
  event_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES import_tasks(id) ON DELETE CASCADE
);
```

---

## 5. 阶段实施演进路线 (Roadmap & Milestones)

### Phase 1: 高保真数字冻结底座与批量导入

- [ ] 网页深度快照与正文提取服务（支持 SingleFile / Readability 与素材本地化）
- [ ] 浏览器书签 (HTML) 与 URL 列表批量导入接口与后台低负载处理队列
- [ ] 前端 Inbox 与 Import 视图增强（批量导入进度监控与快照即时预览）

### Phase 2: Agent 原生协同与浏览器剪藏扩展

- [ ] 标准 MCP Server 实现 (`packages/mcp` 或独立模块)，提供完整读写史书工具箱
- [ ] Web Clipper 浏览器插件开发（支持一键抓取、选区剪藏与快照投递）
- [ ] 移动端快捷指令与通用 Webhook 接收端加固

### Phase 3: 史书脉络深度聚合与独立冷备份卷宗

- [ ] 多标签聚合脉络可视化与时间线对比
- [ ] 全站/按卷离线静态 HTML 卷宗与标准 Markdown/ZIP 归档包导出
- [ ] FTS5 中文分词与检索高亮体验优化

---

## 6. 自检评估与无歧义确认 (Spec Self-Review)

- **占位符检查**：无 TBD 或未决项，接口与表结构全部明确。
- **一致性检查**：前后端、MCP 接口与数据库定义完全自洽。
- **范围约束**：不依赖重度本地大模型或外部不可控云服务，坚持纯文件、纯本地、低消耗与极致耐久。
