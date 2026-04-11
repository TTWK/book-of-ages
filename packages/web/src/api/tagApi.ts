/**
 * 标签 API
 */

import apiClient from './client';
import type { Tag, CreateTagInput, UpdateTagInput } from '@book-of-ages/shared';

/**
 * 获取标签列表
 */
export async function getTagList(): Promise<Tag[]> {
  return apiClient.get<Tag[]>('/api/tags');
}

/**
 * 获取单个标签
 */
export async function getTag(id: string): Promise<Tag> {
  return apiClient.get<Tag>(`/api/tags/${id}`);
}

/**
 * 获取标签的事件计数
 */
export async function getTagEventCount(tagId: string): Promise<number> {
  const response = await apiClient.getFullResponse<{ count: number }>(
    `/api/tags/${tagId}/events/count`
  );
  return response.data?.count || 0;
}

/**
 * 创建标签
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  return apiClient.post<Tag>('/api/tags', input);
}

/**
 * 更新标签
 */
export async function updateTag(id: string, input: UpdateTagInput): Promise<Tag> {
  return apiClient.put<Tag>(`/api/tags/${id}`, input);
}

/**
 * 删除标签
 */
export async function deleteTag(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/tags/${id}`);
}
