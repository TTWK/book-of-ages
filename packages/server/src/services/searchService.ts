/**
 * 搜索服务
 */

import { all } from '../db';
import type { Event, Material, TimelineNode, SearchType } from '@book-of-ages/shared';

/**
 * 简单关键词搜索
 */
export async function simpleSearch(
  keyword: string,
  options?: {
    type?: SearchType;
    limit?: number;
  }
): Promise<{
  events: Event[];
  materials: Material[];
  timelineNodes: TimelineNode[];
}> {
  const limit = options?.limit || 50;
  const searchPattern = `%${keyword}%`;

  const results = {
    events: [] as Event[],
    materials: [] as Material[],
    timelineNodes: [] as TimelineNode[],
  };

  // 搜索事件
  if (!options?.type || options.type === 'event') {
    results.events = await all<Event>(`
      SELECT * FROM events
      WHERE deleted_at IS NULL
        AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)
      ORDER BY created_at DESC
      LIMIT ?
    `, [searchPattern, searchPattern, searchPattern, limit]);
  }

  // 搜索材料
  if (!options?.type || options.type === 'material') {
    results.materials = await all<Material>(`
      SELECT * FROM materials
      WHERE deleted_at IS NULL
        AND (title LIKE ? OR content_text LIKE ?)
      LIMIT ?
    `, [searchPattern, searchPattern, limit]);
  }

  // 搜索时间线节点
  if (!options?.type || options.type === 'timeline') {
    results.timelineNodes = await all<TimelineNode>(`
      SELECT * FROM event_timeline_nodes
      WHERE title LIKE ? OR description LIKE ?
      LIMIT ?
    `, [searchPattern, searchPattern, limit]);
  }

  return results;
}
