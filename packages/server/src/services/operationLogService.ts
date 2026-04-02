/**
 * 操作日志服务
 */

import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import type { OperationLog, OperationAction, OperationEntityType } from '@book-of-ages/shared';

/**
 * 记录操作日志
 */
export async function logOperation(
  action: OperationAction,
  entity_type: OperationEntityType,
  entity_id: string,
  api_key_id?: string
): Promise<OperationLog> {
  const id = uuidv4();
  const now = new Date().toISOString();

  await run(`
    INSERT INTO operation_logs (id, api_key_id, action, entity_type, entity_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, api_key_id || null, action, entity_type, entity_id, now]);

  return {
    id,
    api_key_id: api_key_id || undefined,
    action,
    entity_type,
    entity_id,
    created_at: now,
  };
}

/**
 * 获取操作日志列表
 */
export async function getOperationLogs(limit: number = 100): Promise<OperationLog[]> {
  return all<OperationLog>(`
    SELECT * FROM operation_logs
    ORDER BY created_at DESC
    LIMIT ?
  `, [limit]);
}

/**
 * 获取实体的操作历史
 */
export async function getEntityOperationLogs(
  entity_type: OperationEntityType,
  entity_id: string
): Promise<OperationLog[]> {
  return all<OperationLog>(`
    SELECT * FROM operation_logs
    WHERE entity_type = ? AND entity_id = ?
    ORDER BY created_at DESC
  `, [entity_type, entity_id]);
}
