/**
 * 会话 API
 *
 * 以 X-API-Key 请求头换取短时会话 cookie：材料预览（<img>）与快照渲染（<iframe>）
 * 无法携带自定义请求头，读接口在鉴权后额外接受会话 cookie。
 */

import apiClient from './client';
import type { APIKeyScope } from '@book-of-ages/shared';

export interface SessionInfo {
  keyId: string;
  scopes: APIKeyScope[];
}

/** 建立/续期会话（fire-and-forget 场景可忽略返回值） */
export async function startSession(): Promise<SessionInfo> {
  return apiClient.post<SessionInfo>('/api/auth/session');
}

/** 注销会话 */
export async function endSession(): Promise<void> {
  return apiClient.delete<void>('/api/auth/session');
}
