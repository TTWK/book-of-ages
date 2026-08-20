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
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  title: string;
  summary?: string;
  content?: string;
  status?: EventStatus;
  event_date?: string;
  source_url?: string;
}

export interface UpdateEventInput {
  title?: string;
  summary?: string;
  content?: string;
  status?: EventStatus;
  event_date?: string;
  source_url?: string;
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

export interface APIKey {
  id: string;
  name: string;
  key_hash: string;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAPIKeyInput {
  name: string;
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
  | 'ImportTask';

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
  title: string;
  selectedText?: string;
  fullHtml?: string;
  tags?: string[];
  notes?: string;
  autoConfirm?: boolean;
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
