/**
 * API Key 服务
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import type { APIKey, CreateAPIKeyInput, APIKeyWithPlain } from '@book-of-ages/shared';

/**
 * 生成 API Key
 */
function generateAPIKey(): string {
  return `boa_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Hash API Key
 */
function hashAPIKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * 创建新的 API Key
 */
export async function createAPIKey(input: CreateAPIKeyInput): Promise<APIKeyWithPlain> {
  const id = uuidv4();
  const plainKey = generateAPIKey();
  const keyHash = hashAPIKey(plainKey);
  const now = new Date().toISOString();

  await run(`
    INSERT INTO api_keys (id, name, key_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `, [id, input.name, keyHash, now, now]);

  return {
    id,
    name: input.name,
    key_hash: keyHash,
    created_at: now,
    updated_at: now,
    plain_key: plainKey,
  };
}

/**
 * 获取所有 API Key（不返回 hash）
 */
export async function listAPIKeys(): Promise<Omit<APIKey, 'key_hash'>[]> {
  return all<Omit<APIKey, 'key_hash'>>(`
    SELECT id, name, last_used, created_at, updated_at
    FROM api_keys
    ORDER BY created_at DESC
  `);
}

/**
 * 获取 API Key 信息
 */
export async function getAPIKeyById(id: string): Promise<Omit<APIKey, 'key_hash'> | null> {
  const result = await get<Omit<APIKey, 'key_hash'>>(`
    SELECT id, name, last_used, created_at, updated_at
    FROM api_keys
    WHERE id = ?
  `, [id]);
  return result || null;
}

/**
 * 验证 API Key
 */
export async function verifyAPIKey(key: string): Promise<APIKey | null> {
  const keyHash = hashAPIKey(key);
  
  const apiKey = await get<APIKey>(`
    SELECT * FROM api_keys WHERE key_hash = ?
  `, [keyHash]);
  
  if (apiKey) {
    // 更新最后使用时间
    await run(`
      UPDATE api_keys SET last_used = ?, updated_at = ? WHERE id = ?
    `, [new Date().toISOString(), new Date().toISOString(), apiKey.id]);
  }

  return apiKey || null;
}

/**
 * 删除/吊销 API Key
 */
export async function deleteAPIKey(id: string): Promise<boolean> {
  const result = await run(`DELETE FROM api_keys WHERE id = ?`, [id]);
  return result.changes > 0;
}

/**
 * 从请求中获取 API Key ID（用于日志记录）
 */
export async function getAPIKeyIdFromKey(key: string): Promise<string | null> {
  const apiKey = await verifyAPIKey(key);
  return apiKey ? apiKey.id : null;
}
