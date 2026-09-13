/**
 * 会话令牌服务
 *
 * 为浏览器媒体加载（<img>/<iframe> 无法携带 X-API-Key 请求头）提供短时会话 cookie：
 * - 令牌为 HMAC-SHA256 签名的 JSON 载荷（keyId + 过期时间），无需会话表
 * - 签名密钥持久化在 app_meta 表，重启后已签发的会话仍然有效
 * - 验签只保证完整性与时效；钥匙状态与 scope 在每次请求时回查（吊销即时生效）
 */

import crypto from 'crypto';
import { get, run } from '../db';

const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

export const SESSION_COOKIE_NAME = 'boa_session';

let cachedSecret: string | null = null;

/**
 * 获取（必要时生成）会话签名密钥
 */
async function getSessionSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  const row = await get<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = 'session_secret'`
  );
  if (row) {
    cachedSecret = row.value;
    return cachedSecret;
  }

  // 并发首调可能各自生成：以 INSERT OR IGNORE 保证唯一，再回读胜出值
  const generated = crypto.randomBytes(32).toString('hex');
  await run(`INSERT OR IGNORE INTO app_meta (key, value) VALUES ('session_secret', ?)`, [
    generated,
  ]);
  const winner = await get<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = 'session_secret'`
  );
  cachedSecret = winner!.value;
  return cachedSecret;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export async function createSessionToken(keyId: string): Promise<string> {
  const secret = await getSessionSecret();
  const payload = Buffer.from(
    JSON.stringify({ k: keyId, exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export async function verifySessionToken(token: string): Promise<{ keyId: string } | null> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const secret = await getSessionSecret();

  const expected = sign(payload, secret);
  const bufA = Buffer.from(signature);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      k?: string;
      exp?: number;
    };
    if (!parsed.k || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return { keyId: parsed.k };
  } catch {
    return null;
  }
}
