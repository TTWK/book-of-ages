/**
 * 分析 API
 */

import apiClient from './client';
import type { TimeAggregationResult, TagAggregationResult } from '@book-of-ages/shared';

export type TimeAggregationData = TimeAggregationResult;

/**
 * 获取时间聚合数据
 */
export async function getTimeAggregation(
  granularity: 'week' | 'month' | 'year' = 'month'
): Promise<TimeAggregationResult[]> {
  return apiClient.get<TimeAggregationResult[]>('/api/analytics/time-aggregation', { granularity });
}

/**
 * 获取指定标签的事件聚合详情
 */
export async function getTagAggregation(tagId: string): Promise<TagAggregationResult> {
  return apiClient.get<TagAggregationResult>(`/api/analytics/tag-aggregation/${tagId}`);
}
