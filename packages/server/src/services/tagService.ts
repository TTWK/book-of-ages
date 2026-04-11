/**
 * 标签服务
 */

import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import type { Tag, CreateTagInput, UpdateTagInput } from '@book-of-ages/shared';

/**
 * 创建标签
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  const id = uuidv4();
  const now = new Date().toISOString();

  await run(
    `
    INSERT INTO tags (id, name, parent_id, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [id, input.name, input.parent_id || null, input.color || null, now, now]
  );

  const tag = await getTagById(id);
  if (!tag) {
    throw new Error('Failed to create tag');
  }
  return tag;
}

/**
 * 获取所有标签（支持树形层级）
 */
export async function listTags(): Promise<Tag[]> {
  return all<Tag>(`SELECT * FROM tags ORDER BY parent_id, name`);
}

/**
 * 根据 ID 获取标签
 */
export async function getTagById(id: string): Promise<Tag | null> {
  const result = await get<Tag>(`SELECT * FROM tags WHERE id = ?`, [id]);
  return result || null;
}

/**
 * 更新标签
 */
export async function updateTag(id: string, input: UpdateTagInput): Promise<Tag | null> {
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.parent_id !== undefined) {
    updates.push('parent_id = ?');
    values.push(input.parent_id);
  }
  if (input.color !== undefined) {
    updates.push('color = ?');
    values.push(input.color);
  }

  if (updates.length === 0) {
    return getTagById(id);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await run(
    `
    UPDATE tags SET ${updates.join(', ')} WHERE id = ?
  `,
    values
  );

  return getTagById(id);
}

/**
 * 删除标签
 */
export async function deleteTag(id: string): Promise<boolean> {
  const result = await run(`DELETE FROM tags WHERE id = ?`, [id]);
  return result.changes > 0;
}

/**
 * 获取标签下的事件数量
 */
export async function getTagEventCount(tagId: string): Promise<number> {
  const result = await get<{ count: number }>(
    `
    SELECT COUNT(*) as count FROM event_tags WHERE tag_id = ?
  `,
    [tagId]
  );
  return result?.count || 0;
}

/**
 * 为事件添加标签
 */
export async function addTagToEvent(eventId: string, tagId: string): Promise<void> {
  await run(
    `
    INSERT OR IGNORE INTO event_tags (event_id, tag_id)
    VALUES (?, ?)
  `,
    [eventId, tagId]
  );
}

/**
 * 移除事件的标签
 */
export async function removeTagFromEvent(eventId: string, tagId: string): Promise<void> {
  await run(
    `
    DELETE FROM event_tags WHERE event_id = ? AND tag_id = ?
  `,
    [eventId, tagId]
  );
}

/**
 * 获取事件的所有标签
 */
export async function getEventTags(eventId: string): Promise<Tag[]> {
  return all<Tag>(
    `
    SELECT t.* FROM tags t
    INNER JOIN event_tags et ON t.id = et.tag_id
    WHERE et.event_id = ?
  `,
    [eventId]
  );
}

/**
 * 更新事件的标签
 */
export async function updateEventTags(eventId: string, tagIds: string[]): Promise<void> {
  const queries = [
    { sql: 'DELETE FROM event_tags WHERE event_id = ?', params: [eventId] },
    ...tagIds.map((tagId) => ({
      sql: 'INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)',
      params: [eventId, tagId],
    })),
  ];

  await import('../db').then((db) => db.transaction(queries));
}
