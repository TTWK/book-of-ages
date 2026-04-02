/**
 * 时间线节点 API
 */

import apiClient from './client';
import type { TimelineNode, CreateTimelineNodeInput, UpdateTimelineNodeInput } from '@book-of-ages/shared';

/**
 * 获取事件的时间线节点列表
 */
export async function getTimelineNodes(eventId: string): Promise<TimelineNode[]> {
  return apiClient.get<TimelineNode[]>('/api/timeline', { event_id: eventId });
}

/**
 * 创建时间线节点
 */
export async function createTimelineNode(
  eventId: string,
  input: CreateTimelineNodeInput
): Promise<TimelineNode> {
  return apiClient.post<TimelineNode>('/api/timeline', { ...input, event_id: eventId });
}

/**
 * 更新时间线节点
 */
export async function updateTimelineNode(
  nodeId: string,
  input: UpdateTimelineNodeInput
): Promise<TimelineNode> {
  return apiClient.put<TimelineNode>(`/api/timeline/${nodeId}`, input);
}

/**
 * 删除时间线节点
 */
export async function deleteTimelineNode(nodeId: string): Promise<void> {
  return apiClient.delete<void>(`/api/timeline/${nodeId}`);
}
