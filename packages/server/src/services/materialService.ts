/**
 * 材料服务
 */

import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import type { Material, CreateMaterialInput } from '@book-of-ages/shared';

/**
 * 创建材料记录
 */
export async function createMaterial(
  input: CreateMaterialInput & { file_path: string }
): Promise<Material> {
  const id = uuidv4();
  const now = new Date().toISOString();

  await run(
    `
    INSERT INTO materials (id, event_id, timeline_node_id, type, title, file_path, source_url, content_text, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      id,
      input.event_id,
      input.timeline_node_id || null,
      input.type,
      input.title || null,
      input.file_path,
      input.source_url || null,
      input.content_text || null,
      now,
      now,
    ]
  );

  const material = await getMaterialById(id);
  if (!material) {
    throw new Error('Failed to create material');
  }
  return material;
}

/**
 * 获取事件的所有材料
 */
export async function getMaterials(eventId: string, timelineNodeId?: string): Promise<Material[]> {
  if (timelineNodeId) {
    return all<Material>(
      `
      SELECT * FROM materials
      WHERE event_id = ? AND timeline_node_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `,
      [eventId, timelineNodeId]
    );
  }

  return all<Material>(
    `
    SELECT * FROM materials
    WHERE event_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC
  `,
    [eventId]
  );
}

/**
 * 根据 ID 获取材料
 */
export async function getMaterialById(id: string): Promise<Material | null> {
  const result = await get<Material>(
    `SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return result || null;
}

/**
 * 更新材料
 */
export async function updateMaterial(
  id: string,
  input: Partial<CreateMaterialInput>
): Promise<Material | null> {
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title || null);
  }
  if (input.source_url !== undefined) {
    updates.push('source_url = ?');
    values.push(input.source_url || null);
  }
  if (input.content_text !== undefined) {
    updates.push('content_text = ?');
    values.push(input.content_text || null);
  }

  if (updates.length === 0) {
    return getMaterialById(id);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await run(
    `
    UPDATE materials SET ${updates.join(', ')} WHERE id = ?
  `,
    values
  );

  return getMaterialById(id);
}

/**
 * 删除材料（软删除）
 */
export async function deleteMaterial(id: string): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await run(
    `
    UPDATE materials SET deleted_at = ?, updated_at = ? WHERE id = ?
  `,
    [now, now, id]
  );
  return result.changes > 0;
}
