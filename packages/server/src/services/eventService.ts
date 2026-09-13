/**
 * 事件服务
 */

import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import { getEventTags } from './tagService';
import type {
  Event,
  Tag,
  CreateEventInput,
  UpdateEventInput,
  EventStatus,
  APIKeyScope,
} from '@book-of-ages/shared';

/**
 * 归一化事件日期：统一为 YYYY-MM-DD（避免完整 ISO 时间戳与日期串混排）
 */
function normalizeEventDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const trimmed = String(date).trim();
  if (!trimmed) return null;
  // 截取日期部分（兼容 "YYYY-MM-DDTHH:mm:ss.sssZ" 等完整 ISO 格式）
  return trimmed.slice(0, 10);
}

/**
 * 创建事件
 * @param opts.createdBy 溯源标识：api_key id / 'web' / 'mcp'
 */
export async function createEvent(
  input: CreateEventInput,
  opts?: { createdBy?: string }
): Promise<Event> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = input.status || 'draft';

  await run(
    `
    INSERT INTO events (id, title, summary, content, status, event_date, source_url, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      id,
      input.title,
      input.summary || null,
      input.content || null,
      status,
      normalizeEventDate(input.event_date),
      input.source_url || null,
      opts?.createdBy ?? null,
      now,
      now,
    ]
  );

  const event = await getEventById(id);
  if (!event) {
    throw new Error('Failed to create event');
  }
  return event;
}

/**
 * 获取事件列表
 * @param status 传 'deleted' 时返回回收站（已软删除事件）；其余情况默认排除已删除
 */
export async function listEvents(options?: {
  status?: EventStatus;
  tagId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ events: Event[]; total: number }> {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let whereClause: string;
  const params: (string | number)[] = [];

  if (options?.status === 'deleted') {
    // 回收站：仅返回已软删除的事件
    whereClause = 'WHERE e.status = ? AND e.deleted_at IS NOT NULL';
    params.push('deleted');
  } else {
    whereClause = 'WHERE e.deleted_at IS NULL AND e.status != ?';
    params.push('deleted');
    if (options?.status) {
      whereClause += ' AND e.status = ?';
      params.push(options.status);
    }
  }

  if (options?.tagId) {
    whereClause +=
      ' AND EXISTS (SELECT 1 FROM event_tags et WHERE et.event_id = e.id AND et.tag_id = ?)';
    params.push(options.tagId);
  }

  // 获取总数
  const countResult = await get<{ count: number }>(
    `
    SELECT COUNT(*) as count FROM events e ${whereClause}
  `,
    params
  );
  const total = countResult?.count || 0;

  // 获取数据
  const events = await all<Event>(
    `
    SELECT e.* FROM events e 
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `,
    [...params, pageSize, offset]
  );

  if (events.length > 0) {
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
      if (!tagsByEvent.has(event_id)) {
        tagsByEvent.set(event_id, []);
      }
      tagsByEvent.get(event_id)!.push(tag as Tag);
    }
    for (const event of events) {
      event.tags = tagsByEvent.get(event.id) || [];
    }
  }

  return { events, total };
}

/**
 * 根据 ID 获取事件（JOIN api_keys 带出溯源展示信息）
 */
export async function getEventById(id: string): Promise<Event | null> {
  const result = await get<Event & { created_by_scope?: string; created_by_name?: string }>(
    `
    SELECT e.*, k.name AS created_by_name, k.scopes AS created_by_scope
    FROM events e
    LEFT JOIN api_keys k ON k.id = e.created_by
    WHERE e.id = ? AND e.deleted_at IS NULL
  `,
    [id]
  );
  if (!result) {
    return null;
  }
  const tags = await getEventTags(id);
  result.tags = tags;
  return result;
}

/**
 * 更新事件
 * 约定：字段传 null 表示清空（写入 NULL），undefined 表示不修改
 *
 * scope 规则（2026-09-13 设计）：
 * - 非 admin（write Agent）：
 *   - confirmed 事件核心字段锁定（原不可篡改规则）
 *   - 状态只允许软删除（status='deleted'）；draft→confirmed→archived 等流转仅 admin
 * - admin（人工钥匙）：全权
 */
export async function updateEvent(
  id: string,
  input: UpdateEventInput,
  opts?: { scopes?: APIKeyScope[] }
): Promise<Event | null> {
  const existingEvent = await getEventById(id);
  if (!existingEvent) {
    return null;
  }

  const isAdmin = !!opts?.scopes?.includes('admin');

  // 已收录事件的核心字段仅 admin（人工）可修改
  if (existingEvent.status === 'confirmed' && !isAdmin) {
    const restrictedFields = ['title', 'summary', 'content', 'event_date', 'source_url'];
    const hasRestrictedUpdate = restrictedFields.some(
      (field) => input[field as keyof UpdateEventInput] !== undefined
    );

    if (hasRestrictedUpdate) {
      throw new Error('PERMISSION_DENIED: 已收录事件的核心字段不允许通过 API 修改');
    }
  }

  // 状态流转仅 admin；write 钥匙只允许软删除（恢复走 restore 端点）
  if (!isAdmin && input.status !== undefined && input.status !== 'deleted') {
    throw new Error('PERMISSION_DENIED: 状态流转（收录/归档/恢复）仅允许 admin 权限钥匙执行');
  }

  const now = new Date().toISOString();

  // 构建动态更新语句
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.summary !== undefined) {
    updates.push('summary = ?');
    values.push(input.summary === null ? null : input.summary);
  }
  if (input.content !== undefined) {
    updates.push('content = ?');
    values.push(input.content === null ? null : input.content);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
    // 软删除语义同步：置为 deleted 时同时写入 deleted_at；
    // 从 deleted 恢复为其他状态时清除 deleted_at
    if (input.status === 'deleted') {
      updates.push('deleted_at = ?');
      values.push(now);
    } else if (existingEvent.status === 'deleted') {
      updates.push('deleted_at = ?');
      values.push(null);
    }
  }
  if (input.event_date !== undefined) {
    updates.push('event_date = ?');
    values.push(input.event_date === null ? null : normalizeEventDate(input.event_date));
  }
  if (input.source_url !== undefined) {
    updates.push('source_url = ?');
    values.push(input.source_url === null ? null : input.source_url);
  }

  if (updates.length === 0) {
    return getEventById(id);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await run(
    `
    UPDATE events SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL
  `,
    values
  );

  // 回读时不过滤 deleted_at：软删除（status='deleted'）本身是本函数支持的合法更新结果
  const updatedRow = await get<Event>(`SELECT * FROM events WHERE id = ?`, [id]);
  if (updatedRow) {
    updatedRow.tags = await getEventTags(id);
  }
  return updatedRow || null;
}

/**
 * 恢复回收站中的事件（清除 deleted_at，状态回到草稿）
 */
export async function restoreEvent(id: string): Promise<Event | null> {
  const now = new Date().toISOString();

  const result = await run(
    `
    UPDATE events
    SET deleted_at = NULL, status = 'draft', updated_at = ?
    WHERE id = ? AND deleted_at IS NOT NULL
  `,
    [now, id]
  );

  if (result.changes === 0) {
    return null;
  }

  const event = await get<Event>(`SELECT * FROM events WHERE id = ?`, [id]);
  if (event) {
    event.tags = await getEventTags(id);
  }
  return event || null;
}

/**
 * 删除事件（软删除）
 */
export async function deleteEvent(id: string): Promise<boolean> {
  const now = new Date().toISOString();

  const result = await run(
    `
    UPDATE events 
    SET deleted_at = ?, status = 'deleted', updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `,
    [now, now, id]
  );

  return result.changes > 0;
}

/**
 * 批量创建事件（用于 Agent 推送与导入）
 * 使用事务保证原子性
 */
export async function batchCreateEvents(
  inputs: CreateEventInput[],
  opts?: { createdBy?: string }
): Promise<Event[]> {
  const now = new Date().toISOString();
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const ids: string[] = [];

  for (const input of inputs) {
    const id = uuidv4();
    const status = input.status || 'draft';
    ids.push(id);
    queries.push({
      sql: `
        INSERT INTO events (id, title, summary, content, status, event_date, source_url, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        id,
        input.title,
        input.summary || null,
        input.content || null,
        status,
        normalizeEventDate(input.event_date),
        input.source_url || null,
        opts?.createdBy ?? null,
        now,
        now,
      ],
    });
  }

  const { transaction } = await import('../db');
  await transaction(queries);

  // 一次 IN 查询取回全部结果（避免逐条 N+1）
  const placeholders = ids.map(() => '?').join(',');
  const rows = await all<Event>(`SELECT * FROM events WHERE id IN (${placeholders})`, ids);
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  const events: Event[] = [];
  for (const id of ids) {
    const row = rowsById.get(id);
    if (row) {
      row.tags = await getEventTags(id);
      events.push(row);
    }
  }

  return events;
}

/**
 * 批量更新事件
 */
export async function batchUpdateEvents(
  ids: string[],
  input: UpdateEventInput,
  opts?: { scopes?: APIKeyScope[] }
): Promise<{ successIds: string[]; failedIds: string[] }> {
  const successIds: string[] = [];
  const failedIds: string[] = [];

  for (const id of ids) {
    try {
      const updated = await updateEvent(id, input, opts);
      if (updated) {
        successIds.push(id);
      } else {
        failedIds.push(id);
      }
    } catch (_error) {
      failedIds.push(id);
    }
  }

  return { successIds, failedIds };
}
