/**
 * 批量导入 API
 */

import apiClient from './client';
import type { ImportTask, ImportTaskItem, CreateImportTaskInput } from '@book-of-ages/shared';

/**
 * 获取导入任务列表
 */
export async function getImportTaskList(): Promise<ImportTask[]> {
  return apiClient.get<ImportTask[]>('/api/imports');
}

/**
 * 获取导入任务详情
 */
export async function getImportTaskDetail(
  id: string
): Promise<{ task: ImportTask; items: ImportTaskItem[] }> {
  return apiClient.get<{ task: ImportTask; items: ImportTaskItem[] }>(`/api/imports/${id}`);
}

/**
 * 文本/URL 创建导入任务
 */
export async function createImportTask(input: CreateImportTaskInput): Promise<ImportTask> {
  return apiClient.post<ImportTask>('/api/imports', input);
}

/**
 * 文件上传创建导入任务 (支持 bookmarks.html 或 URL 列表)
 */
export async function uploadImportFile(file: File): Promise<ImportTask> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<ImportTask>('/api/imports', formData);
}
