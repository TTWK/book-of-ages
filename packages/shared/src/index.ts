// ==================== 事件 (Events) ====================

export type EventStatus = 'draft' | 'confirmed' | 'archived' | 'deleted';

export interface Event {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  status: EventStatus;
  event_date?: string;
  source_url?: string;
  tags?: Tag[];
  /** 溯源：创建者标识（'web' / 'mcp' / api_key id） */
  created_by?: string;
  /** 溯源展示（服务端 JOIN api_keys 得出）：钥匙名 */
  created_by_name?: string;
  /** 溯源展示：创建者钥匙的 scope（原始逗号串） */
  created_by_scope?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  title: string;
  /** 传 null 与不传等价（写入 NULL） */
  summary?: string | null;
  /** 传 null 与不传等价（写入 NULL） */
  content?: string | null;
  status?: EventStatus;
  /** 传 null 与不传等价（写入 NULL） */
  event_date?: string | null;
  /** 传 null 与不传等价（写入 NULL） */
  source_url?: string | null;
}

export interface UpdateEventInput {
  title?: string;
  /** 传 null 表示清空该字段 */
  summary?: string | null;
  /** 传 null 表示清空该字段 */
  content?: string | null;
  status?: EventStatus;
  /** 传 null 表示清空该字段 */
  event_date?: string | null;
  /** 传 null 表示清空该字段 */
  source_url?: string | null;
}

// ==================== 时间线节点 (Timeline Nodes) ====================

export interface TimelineNode {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  node_date?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTimelineNodeInput {
  title: string;
  description?: string;
  node_date?: string;
  sort_order?: number;
}

export interface UpdateTimelineNodeInput {
  title?: string;
  description?: string;
  node_date?: string;
  sort_order?: number;
}

// ==================== 参考材料与证据快照 (Materials & Snapshots) ====================

export type MaterialType = 'image' | 'video' | 'pdf' | 'snapshot' | 'other';

export interface Material {
  id: string;
  event_id: string;
  timeline_node_id?: string;
  type: MaterialType;
  title?: string;
  file_path: string;
  snapshot_html_path?: string;
  file_hash?: string;
  file_size?: number;
  source_url?: string;
  content_text?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialInput {
  event_id: string;
  timeline_node_id?: string;
  type: MaterialType;
  title?: string;
  file_path?: string;
  snapshot_html_path?: string;
  file_hash?: string;
  file_size?: number;
  source_url?: string;
  content_text?: string;
}

export interface SnapshotAsset {
  originalUrl: string;
  localPath: string;
  hash: string;
  size: number;
}

export interface SnapshotResult {
  title: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  url: string;
  htmlSnapshotPath: string;
  markdownContent: string;
  savedAssets: SnapshotAsset[];
}

// ==================== 标签 (Tags) ====================

export interface Tag {
  id: string;
  name: string;
  parent_id?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagInput {
  name: string;
  parent_id?: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  parent_id?: string;
  color?: string;
}

// ==================== API 密钥 (API Keys) ====================

/**
 * 钥匙权限分级（2026-09-13 AI 辅助体系设计）：
 * - admin：人工钥匙（浏览器"本站访问密钥"），全权，含 confirmed 核心字段修改与状态流转
 * - write：Agent 钥匙，可增删改（创建强制 draft，confirmed 锁定，不可状态流转）
 * - read：只读钥匙
 */
export type APIKeyScope = 'admin' | 'write' | 'read';

export interface APIKey {
  id: string;
  name: string;
  key_hash: string;
  scopes: APIKeyScope[];
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAPIKeyInput {
  name: string;
  /** 默认 ['write']（面向 Agent）；人工浏览器钥匙选 ['admin'] */
  scopes?: APIKeyScope[];
}

export interface APIKeyWithPlain extends APIKey {
  plain_key: string;
}

// ==================== 操作日志 (Operation Logs) ====================

export type OperationAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type OperationEntityType =
  | 'Event'
  | 'Material'
  | 'TimelineNode'
  | 'Tag'
  | 'APIKey'
  | 'ImportTask'
  | 'AISuggestion';

export interface OperationLog {
  id: string;
  api_key_id?: string;
  action: OperationAction;
  entity_type: OperationEntityType;
  entity_id: string;
  created_at: string;
}

// ==================== 批量导入任务 (Batch Import Tasks) ====================

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

export interface CreateImportTaskInput {
  type: ImportType;
  content: string; // HTML string or URL list string
}

// ==================== 剪藏插件载荷 (Web Clipper Payload) ====================

export interface WebClipperPayload {
  url: string;
  title?: string;
  selectedText?: string;
  /** 剪藏端本地 DOM 快照，用于保存登录态下用户所见页面（服务端抓取是无 cookie 版本） */
  raw_html?: string;
  tags?: string[];
  notes?: string;
  auto_confirm?: boolean;
}

// ==================== 通用 API 响应 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== 搜索参数 ====================

export type SearchType = 'event' | 'material' | 'timeline';

export interface SearchParams {
  q: string;
  type?: SearchType;
  startDate?: string;
  endDate?: string;
}

// ==================== URL 解析工具 ====================

export interface ParsedURLResult {
  title: string;
  content: string;
  url: string;
}

export interface ParseURLInput {
  url: string;
}

// ==================== 导出与分析 (Export & Analytics) ====================

export interface BatchExportInput {
  ids: string[];
}

export interface ExportedEventItem {
  id: string;
  title: string;
  content: string;
}

export interface BatchExportResult {
  items: ExportedEventItem[];
}

export interface TimeAggregationResult {
  period: string;
  count: number;
}

export interface TagAggregationEvent {
  id: string;
  title: string;
  summary?: string;
  event_date?: string;
  created_at: string;
}

export interface TagAggregationResult {
  tag: Tag;
  events: TagAggregationEvent[];
}

// ==================== AI 建议 (AI Suggestions) ====================

/**
 * AI 建议收件箱：AI 只提议、不落库生效；accept 由人工（admin 钥匙）触发，
 * 服务端以确定性代码执行建议内容。
 */
export type AISuggestionType = 'tag' | 'summary' | 'date' | 'merge';
export type AISuggestionStatus = 'pending' | 'accepted' | 'dismissed';

export interface AISuggestionPayload {
  /** type=tag：建议追加的标签名 */
  tag_names?: string[];
  /** type=summary：建议的摘要文本 */
  summary?: string;
  /** type=date：建议的事件日期（YYYY-MM-DD） */
  event_date?: string;
  /** type=merge：疑似重复的目标事件 id */
  merge_into_event_id?: string;
}

export interface AISuggestion {
  id: string;
  type: AISuggestionType;
  target_id: string;
  payload: AISuggestionPayload;
  rationale?: string;
  model?: string;
  status: AISuggestionStatus;
  created_by_key?: string;
  created_at: string;
  decided_at?: string;
  decided_by_key?: string;
}

export interface ProposeSuggestionInput {
  type: AISuggestionType;
  target_id: string;
  payload: AISuggestionPayload;
  rationale?: string;
  model?: string;
}

// ==================== 结构化查询 (Structured Query) ====================

/**
 * 确定性结构化查询：由自然语言经 AI（外部 Agent 或可选服务端桥）翻译而来，
 * 服务端只执行查询计划，绝不接受 LLM 产出的 SQL。
 * 语义说明：tags 为"任一匹配"；status 采用与事件列表相同的回收站语义。
 */
export interface StructuredQuery {
  /** 全文检索词组（服务端做 FTS 引号转义） */
  text?: string;
  /** 标签名过滤（任一匹配） */
  tags?: string[];
  date_from?: string;
  date_to?: string;
  status?: EventStatus;
  /** 返回哪些结果面，默认全部 */
  fields?: ('events' | 'materials' | 'timeline_nodes')[];
  sort?: 'relevance' | 'date_desc' | 'date_asc';
  limit?: number;
}

export interface StructuredSearchResult {
  events: Event[];
  materials: Material[];
  timelineNodes: TimelineNode[];
}
