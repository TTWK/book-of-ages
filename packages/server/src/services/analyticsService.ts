import { all } from '../db';

export interface TimeAggregationResult {
  period: string;
  count: number;
}

/**
 * 按时间聚合事件
 * @param granularity 聚合粒度：'week' | 'month' | 'year'
 * @returns 按时间排序的聚合结果
 */
export async function getTimeAggregation(
  granularity: 'week' | 'month' | 'year'
): Promise<TimeAggregationResult[]> {
  let sql: string;

  switch (granularity) {
    case 'week':
      // SQLite 使用 strftime 获取周
      sql = `
        SELECT 
          strftime('%Y-%W', COALESCE(event_date, created_at)) as period,
          COUNT(*) as count
        FROM events
        WHERE deleted_at IS NULL AND status != 'deleted'
        GROUP BY period
        ORDER BY period ASC
      `;
      break;
    case 'month':
      sql = `
        SELECT 
          strftime('%Y-%m', COALESCE(event_date, created_at)) as period,
          COUNT(*) as count
        FROM events
        WHERE deleted_at IS NULL AND status != 'deleted'
        GROUP BY period
        ORDER BY period ASC
      `;
      break;
    case 'year':
      sql = `
        SELECT 
          strftime('%Y', COALESCE(event_date, created_at)) as period,
          COUNT(*) as count
        FROM events
        WHERE deleted_at IS NULL AND status != 'deleted'
        GROUP BY period
        ORDER BY period ASC
      `;
      break;
    default:
      throw new Error(`不支持的聚合粒度: ${granularity}`);
  }

  const results = await all<{ period: string; count: number }>(sql, []);
  return results.map((r) => ({
    period: r.period,
    count: Number(r.count),
  }));
}
