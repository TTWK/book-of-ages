/**
 * 分析 API
 */

import apiClient from './client';

export interface TimeAggregationData {
  period: string;
  count: number;
}

/**
 * 获取时间聚合数据
 */
export async function getTimeAggregation(
  granularity: 'week' | 'month' | 'year' = 'month'
): Promise<TimeAggregationData[]> {
  return apiClient.get<TimeAggregationData[]>('/api/analytics/time-aggregation', { granularity });
}
