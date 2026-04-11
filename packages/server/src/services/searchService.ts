/**
 * 搜索服务
 * 使用 SQLite FTS5 全文搜索引擎
 */

import { all } from '../db';
import type { Event, Material, TimelineNode, SearchType } from '@book-of-ages/shared';

/**
 * FTS5 全文搜索
 */
export async function simpleSearch(
  keyword: string,
  options?: {
    type?: SearchType;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<{
  events: Event[];
  materials: Material[];
  timelineNodes: TimelineNode[];
}> {
  const limit = options?.limit || 50;
  const results = {
    events: [] as Event[],
    materials: [] as Material[],
    timelineNodes: [] as TimelineNode[],
  };

  // FTS5 查询语法处理
  // 对于中文，直接使用 keyword 进行匹配，FTS5 会使用 Unicode 分词
  // 需要转义特殊字符
  const escapeFtsQuery = (query: string) => {
    // 转义 FTS5 特殊字符
    return query.replace(/["\\]/g, '\\$&');
  };

  const ftsQuery = escapeFtsQuery(keyword);

  // 搜索事件（使用 FTS5）
  if (!options?.type || options.type === 'event') {
    try {
      let query = `
        SELECT e.* FROM events e
        INNER JOIN events_fts fts ON e.rowid = fts.rowid
        WHERE e.deleted_at IS NULL
          AND events_fts MATCH ?
      `;
      const params: any[] = [ftsQuery];

      // 日期范围过滤
      if (options?.startDate) {
        query += ' AND e.event_date >= ?';
        params.push(options.startDate);
      }
      if (options?.endDate) {
        query += ' AND e.event_date <= ?';
        params.push(options.endDate);
      }

      query += ' ORDER BY e.created_at DESC LIMIT ?';
      params.push(limit);

      results.events = await all<Event>(query, params);
    } catch (error) {
      // FTS5 查询失败时，回退到 LIKE 查询
      const searchPattern = `%${keyword}%`;
      let query = `
        SELECT * FROM events
        WHERE deleted_at IS NULL
          AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)
      `;
      const params: any[] = [searchPattern, searchPattern, searchPattern];

      if (options?.startDate) {
        query += ' AND event_date >= ?';
        params.push(options.startDate);
      }
      if (options?.endDate) {
        query += ' AND event_date <= ?';
        params.push(options.endDate);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      results.events = await all<Event>(query, params);
    }
  }

  // 搜索材料（使用 FTS5）
  if (!options?.type || options.type === 'material') {
    try {
      let query = `
        SELECT m.* FROM materials m
        INNER JOIN materials_fts fts ON m.rowid = fts.rowid
        WHERE m.deleted_at IS NULL
          AND materials_fts MATCH ?
      `;
      const params: any[] = [ftsQuery];

      query += ' LIMIT ?';
      params.push(limit);

      results.materials = await all<Material>(query, params);
    } catch (error) {
      // FTS5 查询失败时，回退到 LIKE 查询
      const searchPattern = `%${keyword}%`;
      results.materials = await all<Material>(
        `
        SELECT * FROM materials
        WHERE deleted_at IS NULL
          AND (title LIKE ? OR content_text LIKE ?)
        LIMIT ?
      `,
        [searchPattern, searchPattern, limit]
      );
    }
  }

  // 搜索时间线节点（使用 FTS5）
  if (!options?.type || options.type === 'timeline') {
    try {
      let query = `
        SELECT t.* FROM event_timeline_nodes t
        INNER JOIN timeline_fts fts ON t.rowid = fts.rowid
        WHERE timeline_fts MATCH ?
      `;
      const params: any[] = [ftsQuery];

      query += ' LIMIT ?';
      params.push(limit);

      results.timelineNodes = await all<TimelineNode>(query, params);
    } catch (error) {
      // FTS5 查询失败时，回退到 LIKE 查询
      const searchPattern = `%${keyword}%`;
      results.timelineNodes = await all<TimelineNode>(
        `
        SELECT * FROM event_timeline_nodes
        WHERE title LIKE ? OR description LIKE ?
        LIMIT ?
      `,
        [searchPattern, searchPattern, limit]
      );
    }
  }

  return results;
}
