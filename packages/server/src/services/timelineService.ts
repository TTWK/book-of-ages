/**
 * 时间线节点服务
 */

import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import type {
  TimelineNode,
  CreateTimelineNodeInput,
  UpdateTimelineNodeInput,
} from '@book-of-ages/shared';

/**
 * 创建时间线节点
 */
export async function createTimelineNode(
  eventId: string,
  input: CreateTimelineNodeInput
): Promise<TimelineNode> {
  const id = uuidv4();
  const now = new Date().toISOString();

  await run(
    `
    INSERT INTO event_timeline_nodes (id, event_id, title, description, node_date, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      id,
      eventId,
      input.title,
      input.description || null,
      input.node_date || null,
      input.sort_order || 0,
      now,
      now,
    ]
  );

  const node = await getTimelineNodeById(id);
  if (!node) {
    throw new Error('Failed to create timeline node');
  }
  return node;
}

/**
 * 获取事件的所有时间线节点
 */
export async function getTimelineNodes(eventId: string): Promise<TimelineNode[]> {
  return all<TimelineNode>(
    `
    SELECT * FROM event_timeline_nodes
    WHERE event_id = ?
    ORDER BY sort_order ASC, node_date ASC
  `,
    [eventId]
  );
}

/**
 * 根据 ID 获取时间线节点
 */
export async function getTimelineNodeById(id: string): Promise<TimelineNode | null> {
  const result = await get<TimelineNode>(`SELECT * FROM event_timeline_nodes WHERE id = ?`, [id]);
  return result || null;
}

/**
 * 更新时间线节点
 */
export async function updateTimelineNode(
  id: string,
  input: UpdateTimelineNodeInput
): Promise<TimelineNode | null> {
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.node_date !== undefined) {
    updates.push('node_date = ?');
    values.push(input.node_date);
  }
  if (input.sort_order !== undefined) {
    updates.push('sort_order = ?');
    values.push(input.sort_order);
  }

  if (updates.length === 0) {
    return getTimelineNodeById(id);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await run(
    `
    UPDATE event_timeline_nodes SET ${updates.join(', ')} WHERE id = ?
  `,
    values
  );

  return getTimelineNodeById(id);
}

/**
 * 删除时间线节点
 */
export async function deleteTimelineNode(id: string): Promise<boolean> {
  const result = await run(`DELETE FROM event_timeline_nodes WHERE id = ?`, [id]);
  return result.changes > 0;
}
