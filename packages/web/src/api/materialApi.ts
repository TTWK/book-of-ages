/**
 * 材料管理 API
 */

import apiClient from './client';
import type { Material } from '@book-of-ages/shared';

export interface UploadMaterialData {
  event_id: string;
  timeline_node_id?: string;
  type: 'image' | 'video' | 'pdf' | 'snapshot' | 'other';
  title?: string;
  source_url?: string;
  file?: File;
}

/**
 * 获取事件的材料列表
 */
export async function getMaterials(
  eventId: string,
  timelineNodeId?: string
): Promise<Material[]> {
  const params: Record<string, string> = { event_id: eventId };
  if (timelineNodeId) {
    params.timeline_node_id = timelineNodeId;
  }
  return apiClient.get<Material[]>('/api/materials', params);
}

/**
 * 获取单个材料
 */
export async function getMaterial(id: string): Promise<Material> {
  return apiClient.get<Material>(`/api/materials/${id}`);
}

/**
 * 上传材料
 */
export async function uploadMaterial(data: UploadMaterialData): Promise<Material> {
  const formData = new FormData();
  formData.append('event_id', data.event_id);
  formData.append('type', data.type);
  
  if (data.timeline_node_id) {
    formData.append('timeline_node_id', data.timeline_node_id);
  }
  if (data.title) {
    formData.append('title', data.title);
  }
  if (data.source_url) {
    formData.append('source_url', data.source_url);
  }
  if (data.file) {
    formData.append('file', data.file);
  }

  return apiClient.post<Material>('/api/materials/upload', formData);
}

/**
 * 获取材料预览 URL
 */
export function getMaterialPreviewUrl(id: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/materials/${id}/preview`;
}

/**
 * 更新材料
 */
export async function updateMaterial(
  id: string,
  input: { title?: string; source_url?: string; content_text?: string }
): Promise<Material> {
  return apiClient.put<Material>(`/api/materials/${id}`, input);
}

/**
 * 删除材料
 */
export async function deleteMaterial(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/materials/${id}`);
}
