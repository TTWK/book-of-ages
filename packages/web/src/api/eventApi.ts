/**
 * 事件 API
 */

import apiClient from './client';
import type {
  Event,
  CreateEventInput,
  UpdateEventInput,
  EventStatus,
  Tag,
} from '@book-of-ages/shared';

export interface EventListParams {
  status?: EventStatus;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface EventListResponse {
  items: Event[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 获取事件列表
 */
export async function getEventList(params?: EventListParams): Promise<EventListResponse> {
  const response = await apiClient.getFullResponse<{
    items: Event[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>('/api/events', params);

  return {
    items: response.data?.items || [],
    pagination: response.data?.pagination || {
      page: params?.page || 1,
      pageSize: params?.pageSize || 20,
      total: 0,
      totalPages: 0,
    },
  };
}

/**
 * 获取单个事件
 */
export async function getEvent(id: string): Promise<Event> {
  return apiClient.get<Event>(`/api/events/${id}`);
}

/**
 * 创建事件
 */
export async function createEvent(input: CreateEventInput): Promise<Event> {
  return apiClient.post<Event>('/api/events', input);
}

/**
 * 更新事件
 */
export async function updateEvent(id: string, input: UpdateEventInput): Promise<Event> {
  return apiClient.put<Event>(`/api/events/${id}`, input);
}

/**
 * 删除事件
 */
export async function deleteEvent(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/events/${id}`);
}

/**
 * 获取事件的标签
 */
export async function getEventTags(id: string): Promise<Tag[]> {
  return apiClient.get<Tag[]>(`/api/events/${id}/tags`);
}

/**
 * 更新事件的标签
 */
export async function updateEventTags(id: string, tagIds: string[]): Promise<void> {
  return apiClient.put<void>(`/api/events/${id}/tags`, { tagIds });
}
