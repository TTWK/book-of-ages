/**
 * 搜索服务
 * 使用 SQLite FTS5 全文搜索引擎
 */

import { all } from '../db';
import { getTagByName } from './tagService';
import type {
  Event,
  Material,
  TimelineNode,
  SearchType,
  Tag,
  StructuredQuery,
  StructuredSearchResult,
} from '@book-of-ages/shared';

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
  // 将关键词包裹为 FTS5 字符串字面量，避免 `-`、`AND`、`OR`、括号等
  // 被解释为查询语法（内部引号按 FTS5 规则转义为两个引号）
  const escapeFtsQuery = (query: string) => {
    return `"${query.replace(/"/g, '""')}"`;
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
      const params: (string | number)[] = [ftsQuery];

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
    } catch (_error) {
      // FTS5 查询失败时，回退到 LIKE 查询
      const searchPattern = `%${keyword}%`;
      let query = `
        SELECT * FROM events
        WHERE deleted_at IS NULL
          AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)
      `;
      const params: (string | number)[] = [searchPattern, searchPattern, searchPattern];

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
      const params: (string | number)[] = [ftsQuery];

      query += ' LIMIT ?';
      params.push(limit);

      results.materials = await all<Material>(query, params);
    } catch (_error) {
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
      const params: (string | number)[] = [ftsQuery];

      query += ' LIMIT ?';
      params.push(limit);

      results.timelineNodes = await all<TimelineNode>(query, params);
    } catch (_error) {
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

/**
 * 为一批事件批量附加标签（单次 IN 查询，避免 N+1）
 */
async function attachTagsToEvents(events: Event[]): Promise<void> {
  if (events.length === 0) return;
  const eventIds = events.map((e) => e.id);
  const placeholders = eventIds.map(() => '?').join(',');
  const tagRows = await all<Tag & { event_id: string }>(
    `
    SELECT et.event_id, t.id, t.name, t.parent_id, t.color, t.created_at, t.updated_at
    FROM tags t
    INNER JOIN event_tags et ON t.id = et.tag_id
    WHERE et.event_id IN (${placeholders})
    ORDER BY t.parent_id, t.name
  `,
    eventIds
  );
  const tagsByEvent = new Map<string, Tag[]>();
  for (const row of tagRows) {
    const { event_id, ...tag } = row;
    if (!tagsByEvent.has(event_id)) tagsByEvent.set(event_id, []);
    tagsByEvent.get(event_id)!.push(tag as Tag);
  }
  for (const event of events) {
    event.tags = tagsByEvent.get(event.id) || [];
  }
}

/**
 * 确定性结构化查询执行器（2026-09-13 设计）：
 * 只执行查询计划，不涉及任何 LLM；text 走 FTS5（引号转义）。
 * 语义：tags 为"任一匹配"且仅过滤事件面；status 沿用事件列表的回收站语义；
 * materials / timeline_nodes 面遵循 text + fields 过滤（无 text 时按最近优先）。
 */
export async function executeStructuredQuery(
  query: StructuredQuery
): Promise<StructuredSearchResult> {
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  const fields = new Set(query.fields ?? ['events', 'materials', 'timeline_nodes']);
  const result: StructuredSearchResult = {
    events: [],
    materials: [],
    timelineNodes: [],
  };

  // 解析标签名 → 标签 id（任一匹配）；指定的标签全部不存在时直接返回空结果
  let resolvedTagIds: string[] = [];
  const tagNames = (query.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (tagNames.length > 0) {
    for (const name of tagNames) {
      const tag = await getTagByName(name);
      if (tag) resolvedTagIds.push(tag.id);
    }
    if (resolvedTagIds.length === 0) {
      return result;
    }
  }

  // 全文检索一次，供 events / materials / timeline_nodes 三个面共用
  const searched = query.text
    ? await simpleSearch(query.text, {
        startDate: query.date_from,
        endDate: query.date_to,
        limit: limit * 4,
      })
    : null;

  // ---- 事件面 ----
  if (fields.has('events')) {
    if (searched) {
      let events = searched.events;
      // FTS 检索默认排除已删除；若显式指定非 deleted 状态则再过滤
      if (query.status && query.status !== 'deleted') {
        events = events.filter((e) => e.status === query.status);
      }
      if (resolvedTagIds.length > 0) {
        await attachTagsToEvents(events);
        events = events.filter((e) => (e.tags ?? []).some((t) => resolvedTagIds.includes(t.id)));
      }
      if (query.sort === 'date_asc' || query.sort === 'date_desc') {
        const dir = query.sort === 'date_asc' ? 1 : -1;
        events = [...events].sort((a, b) => {
          const da = a.event_date ?? '';
          const db = b.event_date ?? '';
          return da === db ? 0 : da < db ? -dir : dir;
        });
      }
      result.events = events.slice(0, limit);
    } else {
      const params: (string | number)[] = [];
      let where: string;
      if (query.status === 'deleted') {
        where = "e.status = 'deleted' AND e.deleted_at IS NOT NULL";
      } else {
        where = "e.deleted_at IS NULL AND e.status != 'deleted'";
        if (query.status) {
          where += ' AND e.status = ?';
          params.push(query.status);
        }
      }
      if (resolvedTagIds.length > 0) {
        const placeholders = resolvedTagIds.map(() => '?').join(',');
        where += ` AND EXISTS (SELECT 1 FROM event_tags et WHERE et.event_id = e.id AND et.tag_id IN (${placeholders}))`;
        params.push(...resolvedTagIds);
      }
      if (query.date_from) {
        where += ' AND e.event_date >= ?';
        params.push(query.date_from);
      }
      if (query.date_to) {
        where += ' AND e.event_date <= ?';
        params.push(query.date_to);
      }
      const orderBy =
        query.sort === 'date_asc'
          ? 'e.event_date ASC'
          : query.sort === 'date_desc'
            ? 'e.event_date DESC'
            : 'e.created_at DESC';
      const rows = await all<Event>(
        `
        SELECT e.* FROM events e
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ?
      `,
        [...params, limit]
      );
      await attachTagsToEvents(rows);
      result.events = rows;
    }
  }

  // ---- 材料面 ----
  if (fields.has('materials')) {
    if (searched) {
      result.materials = searched.materials.slice(0, limit);
    } else {
      result.materials = await all<Material>(
        `
        SELECT * FROM materials
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ?
      `,
        [limit]
      );
    }
  }

  // ---- 时间线节点面 ----
  if (fields.has('timeline_nodes')) {
    if (searched) {
      result.timelineNodes = searched.timelineNodes.slice(0, limit);
    } else {
      result.timelineNodes = await all<TimelineNode>(
        `
        SELECT * FROM event_timeline_nodes
        ORDER BY created_at DESC
        LIMIT ?
      `,
        [limit]
      );
    }
  }

  return result;
}
