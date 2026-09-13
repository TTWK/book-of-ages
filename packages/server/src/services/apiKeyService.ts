/**
 * API Key 服务
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import type { APIKey, APIKeyScope, CreateAPIKeyInput, APIKeyWithPlain } from '@book-of-ages/shared';

export type { APIKeyScope as Scope };

const VALID_SCOPES: APIKeyScope[] = ['admin', 'write', 'read'];

/** 数据库原始行：scopes 为逗号分隔字符串 */
interface APIKeyRow {
  id: string;
  name: string;
  key_hash?: string;
  scopes: string;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 解析库中逗号分隔的 scopes 字段；
 * 空值/非法值兜底为 admin（存量行迁移安全网，正常路径不会触达）
 */
export function parseScopes(raw: string | null | undefined): APIKeyScope[] {
  if (!raw) return ['admin'];
  const scopes = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is APIKeyScope => VALID_SCOPES.includes(s as APIKeyScope));
  return scopes.length > 0 ? scopes : ['admin'];
}

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

function withParsedScopes<T extends APIKeyRow>(
  row: T
): Omit<T, 'scopes'> & { scopes: APIKeyScope[] } {
  const { scopes, ...rest } = row;
  return { ...rest, scopes: parseScopes(scopes) };
}

/**
 * 创建新的 API Key（默认 write scope，面向外部 Agent；人工浏览器钥匙显式选 admin）
 */
export async function createAPIKey(input: CreateAPIKeyInput): Promise<APIKeyWithPlain> {
  const id = uuidv4();
  const plainKey = generateAPIKey();
  const keyHash = hashAPIKey(plainKey);
  const now = new Date().toISOString();
  const requested = (input.scopes ?? ['write']).filter((s) => VALID_SCOPES.includes(s));
  const scopes = requested.length > 0 ? requested : (['write'] as APIKeyScope[]);

  await run(
    `
    INSERT INTO api_keys (id, name, key_hash, scopes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [id, input.name, keyHash, scopes.join(','), now, now]
  );

  return {
    id,
    name: input.name,
    key_hash: keyHash,
    scopes,
    created_at: now,
    updated_at: now,
    plain_key: plainKey,
  };
}

/**
 * 获取所有 API Key（不返回 hash）
 */
export async function listAPIKeys(): Promise<Omit<APIKey, 'key_hash'>[]> {
  const rows = await all<APIKeyRow>(`
    SELECT id, name, scopes, last_used, created_at, updated_at
    FROM api_keys
    ORDER BY created_at DESC
  `);
  return rows.map((row) => withParsedScopes(row));
}

/**
 * 获取 API Key 信息（scopes 保留原始逗号串；鉴权路径按需解析，避免每请求多次转换）
 */
export async function getAPIKeyById(id: string): Promise<APIKeyRow | null> {
  const result = await get<APIKeyRow>(
    `
    SELECT id, name, scopes, last_used, created_at, updated_at
    FROM api_keys
    WHERE id = ?
  `,
    [id]
  );
  return result || null;
}

/**
 * 验证 API Key
 * last_used 更新做了 60 秒节流，避免每次请求都写库
 */
export async function verifyAPIKey(
  key: string
): Promise<(Omit<APIKey, 'key_hash'> & { key_hash: string }) | null> {
  const keyHash = hashAPIKey(key);

  const apiKey = await get<APIKeyRow & { key_hash: string }>(
    `
    SELECT * FROM api_keys WHERE key_hash = ?
  `,
    [keyHash]
  );

  if (apiKey) {
    const now = Date.now();
    const lastUsed = apiKey.last_used ? Date.parse(apiKey.last_used) : 0;
    // 距上次记录超过 60 秒才写库，减少写放大
    if (now - lastUsed > 60_000) {
      const nowIso = new Date().toISOString();
      await run(
        `
      UPDATE api_keys SET last_used = ?, updated_at = ? WHERE id = ?
    `,
        [nowIso, nowIso, apiKey.id]
      );
    }
    return withParsedScopes(apiKey);
  }

  return null;
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
