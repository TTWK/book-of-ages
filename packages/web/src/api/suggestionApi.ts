/**
 * AI 建议收件箱 API
 */

import apiClient from './client';
import type {
  AISuggestion,
  AISuggestionStatus,
  ProposeSuggestionInput,
} from '@book-of-ages/shared';

/**
 * 获取建议列表
 */
export async function getSuggestions(status?: AISuggestionStatus): Promise<AISuggestion[]> {
  return apiClient.get<AISuggestion[]>('/api/suggestions', status ? { status } : undefined);
}

/**
 * 采纳建议（服务端执行建议内容）
 */
export async function acceptSuggestion(id: string): Promise<AISuggestion> {
  return apiClient.post<AISuggestion>(`/api/suggestions/${id}/accept`);
}

/**
 * 驳回建议（仅标记）
 */
export async function dismissSuggestion(id: string): Promise<AISuggestion> {
  return apiClient.post<AISuggestion>(`/api/suggestions/${id}/dismiss`);
}

export type { ProposeSuggestionInput };
