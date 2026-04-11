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

// ==================== 参考材料 (Materials) ====================

export type MaterialType = 'image' | 'video' | 'pdf' | 'snapshot' | 'other';

export interface Material {
  id: string;
  event_id: string;
  timeline_node_id?: string;
  type: MaterialType;
  title?: string;
  file_path: string;
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
  source_url?: string;
  content_text?: string;
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
export type OperationEntityType = 'Event' | 'Material' | 'TimelineNode' | 'Tag' | 'APIKey';

export interface OperationLog {
  id: string;
  api_key_id?: string;
  action: OperationAction;
  entity_type: OperationEntityType;
  entity_id: string;
  created_at: string;
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
