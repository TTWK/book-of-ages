/**
 * 搜索 API
 */

import apiClient from './client';
import type { SearchType } from '@book-of-ages/shared';

export interface SearchParams {
  q: string;
  type?: SearchType;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface SearchResults {
  events: Array<{
    id: string;
    title: string;
    summary?: string;
    status: string;
    created_at: string;
  }>;
  materials: Array<{
    id: string;
    title?: string;
    type: string;
    created_at: string;
  }>;
  timelineNodes: Array<{
    id: string;
    title: string;
    description?: string;
    node_date?: string;
  }>;
}

/**
 * 搜索
 */
export async function search(params: SearchParams): Promise<SearchResults> {
  return apiClient.get<SearchResults>('/api/search', params);
}
