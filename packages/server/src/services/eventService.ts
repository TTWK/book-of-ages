/**
 * 事件服务
 */

import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import type { 
  Event, 
  CreateEventInput, 
  UpdateEventInput,
  EventStatus 
} from '@book-of-ages/shared';

/**
 * 创建事件
 */
export async function createEvent(input: CreateEventInput): Promise<Event> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = input.status || 'draft';

  await run(`
    INSERT INTO events (id, title, summary, content, status, event_date, source_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.title,
    input.summary || null,
    input.content || null,
    status,
    input.event_date || null,
    input.source_url || null,
    now,
    now,
  ]);

  const event = await getEventById(id);
  if (!event) {
    throw new Error('Failed to create event');
  }
  return event;
}

/**
 * 获取事件列表
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

  let whereClause = 'WHERE e.deleted_at IS NULL';
  const params: (string | number)[] = [];

  if (options?.status) {
    whereClause += ' AND e.status = ?';
    params.push(options.status);
  }

  if (options?.tagId) {
    whereClause += ' AND EXISTS (SELECT 1 FROM event_tags et WHERE et.event_id = e.id AND et.tag_id = ?)';
    params.push(options.tagId);
  }

  // 获取总数
  const countResult = await get<{ count: number }>(`
    SELECT COUNT(*) as count FROM events e ${whereClause}
  `, params);
  const total = countResult?.count || 0;

  // 获取数据
  const events = await all<Event>(`
    SELECT e.* FROM events e 
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, pageSize, offset]);

  return { events, total };
}

/**
 * 根据 ID 获取事件
 */
export async function getEventById(id: string): Promise<Event | null> {
  const result = await get<Event>(`
    SELECT * FROM events WHERE id = ? AND deleted_at IS NULL
  `, [id]);
  return result || null;
}

/**
 * 更新事件
 */
export async function updateEvent(id: string, input: UpdateEventInput): Promise<Event | null> {
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
    values.push(input.summary);
  }
  if (input.content !== undefined) {
    updates.push('content = ?');
    values.push(input.content);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }
  if (input.event_date !== undefined) {
    updates.push('event_date = ?');
    values.push(input.event_date);
  }
  if (input.source_url !== undefined) {
    updates.push('source_url = ?');
    values.push(input.source_url);
  }

  if (updates.length === 0) {
    return getEventById(id);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await run(`
    UPDATE events SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL
  `, values);

  return getEventById(id);
}

/**
 * 删除事件（软删除）
 */
export async function deleteEvent(id: string): Promise<boolean> {
  const now = new Date().toISOString();

  const result = await run(`
    UPDATE events 
    SET deleted_at = ?, status = 'deleted', updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `, [now, now, id]);

  return result.changes > 0;
}

/**
 * 批量创建事件（用于 Agent 推送）
 */
export async function batchCreateEvents(inputs: CreateEventInput[]): Promise<Event[]> {
  const events: Event[] = [];
  for (const input of inputs) {
    const event = await createEvent(input);
    events.push(event);
  }
  return events;
}
