/**
 * 系统设置 API
 */

import apiClient from './client';
import type { APIKey, APIKeyWithPlain, OperationLog } from '@book-of-ages/shared';

/**
 * 获取 API Key 列表
 */
export async function getAPIKeys(): Promise<Omit<APIKey, 'key_hash'>[]> {
  return apiClient.get<Omit<APIKey, 'key_hash'>[]>('/api/settings/keys');
}

/**
 * 创建 API Key
 */
export async function createAPIKey(name: string): Promise<APIKeyWithPlain> {
  return apiClient.post<APIKeyWithPlain>('/api/settings/keys', { name });
}

/**
 * 删除 API Key
 */
export async function deleteAPIKey(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/settings/keys/${id}`);
}

/**
 * 获取操作日志
 */
export async function getOperationLogs(limit?: number): Promise<OperationLog[]> {
  return apiClient.get<OperationLog[]>('/api/audit/logs', { limit });
}
