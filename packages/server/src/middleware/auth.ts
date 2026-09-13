/**
 * API Key 鉴权与授权中间件
 *
 * 策略（2026-09-13 AI 辅助体系设计）：
 * - 所有 /api 路由一律鉴权（含 GET 读接口），单机自用也不例外
 * - 凭证双轨：X-API-Key 请求头（所有请求）；会话 cookie（仅读请求，供 <img>/<iframe> 媒体加载）
 * - scope 分级：admin（人工钥匙，全权）> write（Agent 钥匙）> read（只读钥匙）
 *   写请求必须来自 header（cookie 跨站可伪造面，且读接口无副作用）——CSRF 防线
 * - onRoute 钩子统一挂载 scope 检查：GET → read，非 GET → write；显式 preHandler 的路由自管
 * - 环境变量 ADMIN_API_KEY 作为管理员引导钥匙（admin scope）
 * - 未配置 ADMIN_API_KEY 且库中无钥匙时，允许匿名创建第一把密钥（首次引导）
 */

import crypto from 'crypto';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import {
  verifyAPIKey,
  getAPIKeyById,
  listAPIKeys,
  parseScopes,
  Scope,
} from '../services/apiKeyService';
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
} from '../services/sessionService';

export type { Scope };

export interface RequestAuth {
  keyId: string;
  scopes: Scope[];
  /** 凭证来源：header 可写；cookie 仅可读 */
  source: 'header' | 'cookie';
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: RequestAuth;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * 校验密钥：优先匹配 ADMIN_API_KEY（管理员引导），再查库
 */
async function authenticate(apiKey: string): Promise<{ id: string; scopes: Scope[] } | null> {
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && safeEqual(apiKey, adminKey)) {
    return { id: 'admin', scopes: ['admin'] };
  }
  const validated = await verifyAPIKey(apiKey);
  return validated ? { id: validated.id, scopes: validated.scopes } : null;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

/**
 * 可选认证中间件（全局 preHandler，先于路由级 scope 检查执行）
 * 依次尝试 header 与会话 cookie，成功则标记 request.auth
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (apiKey) {
    const validatedKey = await authenticate(apiKey);
    if (validatedKey) {
      request.auth = {
        keyId: validatedKey.id,
        scopes: validatedKey.scopes,
        source: 'header',
      };
      return;
    }
  }

  const sessionToken = parseCookies(request.headers.cookie)[SESSION_COOKIE_NAME];
  if (sessionToken) {
    const payload = await verifySessionToken(sessionToken);
    if (payload) {
      // 回查钥匙状态与 scope：吊销钥匙 / 调整权限即时生效
      const key = await getAPIKeyById(payload.keyId);
      if (key) {
        request.auth = { keyId: key.id, scopes: parseScopes(key.scopes), source: 'cookie' };
      }
    }
  }
}

/**
 * 拒绝请求时排空未消费的请求体：
 * multipart 等延迟解析的请求若在不消费 payload 的情况下提前回复，
 * 未读数据会导致连接被重置，客户端看到的是连接错误而非 401。
 */
function rejectUnauthorized(
  request: FastifyRequest,
  reply: FastifyReply,
  code: 'MISSING_API_KEY' | 'INVALID_API_KEY',
  message: string
): void {
  request.raw.resume();
  reply.code(401).send({
    success: false,
    error: { code, message },
  });
}

function forbidden(reply: FastifyReply, message: string): void {
  reply.code(403).send({
    success: false,
    error: { code: 'FORBIDDEN', message },
  });
}

/**
 * scope 检查中间件工厂
 * - read：任意已认证请求（header 或 cookie）
 * - write / admin：必须来自 header（会话 cookie 只用于读路径）
 */
export function requireScope(min: Scope) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const auth = request.auth;
    if (!auth) {
      rejectUnauthorized(
        request,
        reply,
        'MISSING_API_KEY',
        '缺少有效的 API Key（X-API-Key 请求头，或先调用 /api/auth/session 建立会话）'
      );
      return;
    }

    const rank = Math.max(0, ...auth.scopes.map((s) => SCOPE_RANK[s] ?? 0));
    if (rank < SCOPE_RANK[min]) {
      forbidden(
        reply,
        `权限不足：该操作需要 ${min} 权限，当前钥匙（${auth.keyId}）为 ${auth.scopes.join(', ')}`
      );
      return;
    }

    if (rank > SCOPE_RANK.read && auth.source === 'cookie') {
      forbidden(reply, '会话 Cookie 仅用于读请求：写操作请通过 X-API-Key 请求头完成鉴权');
      return;
    }
  };
}

export const requireReadScope = requireScope('read');
export const requireWriteScope = requireScope('write');
export const requireAdminScope = requireScope('admin');

/**
 * 严格 header 鉴权（任意 scope）：用于换取会话 cookie 的端点
 */
export async function requireHeaderAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.auth && request.auth.source === 'header') {
    return;
  }
  rejectUnauthorized(request, reply, 'MISSING_API_KEY', '请通过 X-API-Key 请求头完成鉴权');
}

/**
 * 首次引导型鉴权（API Key 管理端点专用）：
 * - 已认证：必须为 admin scope 且来自 header
 * - 未认证：仅在未配置 ADMIN_API_KEY 且系统中没有任何密钥时放行（创建第一把密钥）
 */
export async function bootstrapAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.auth) {
    if (request.auth.source === 'cookie') {
      forbidden(reply, '管理 API Key 需要 admin 权限钥匙（X-API-Key 请求头）');
      return;
    }
    if (!request.auth.scopes.includes('admin')) {
      forbidden(reply, '管理 API Key 需要 admin 权限钥匙');
      return;
    }
    return;
  }

  if (!process.env.ADMIN_API_KEY) {
    const keys = await listAPIKeys();
    if (keys.length === 0) {
      return; // 首次引导：允许匿名创建第一把密钥
    }
  }

  rejectUnauthorized(
    request,
    reply,
    'MISSING_API_KEY',
    '请求头中缺少有效的 X-API-Key（可配置 ADMIN_API_KEY 环境变量完成引导）'
  );
}

const SCOPE_RANK: Record<Scope, number> = { read: 1, write: 2, admin: 3 };

/**
 * 为所有路由自动挂载 scope 检查：
 * - GET/HEAD/OPTIONS → read（header 或 cookie）
 * - 其余 → write（仅 header）
 * 已显式指定 preHandler 的路由（如首密钥引导、管理端点）不覆盖
 */
export function enforceAuthOnAllRoutes(fastify: FastifyInstance): void {
  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.preHandler) return;
    const methods = Array.isArray(routeOptions.method)
      ? routeOptions.method
      : [routeOptions.method];
    const isReadOnly = methods.every((m) => ['GET', 'HEAD', 'OPTIONS'].includes(m));
    routeOptions.preHandler = isReadOnly ? requireReadScope : requireWriteScope;
  });
}

/**
 * 注册全局鉴权插件
 */
export async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('auth', undefined);
}

/**
 * 建立 会话 cookie（POST /api/auth/session 的处理逻辑，路由文件见 routes/auth.ts）
 */
export async function issueSessionCookie(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = request.auth!;
  const token = await createSessionToken(auth.keyId);
  const secure = process.env.COOKIE_SECURE === 'true';
  reply.header(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 3600}${secure ? '; Secure' : ''}`
  );
  reply.send({ success: true, data: { keyId: auth.keyId, scopes: auth.scopes } });
}

/**
 * 清除会话 cookie
 */
export async function clearSessionCookie(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.header(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );
  reply.send({ success: true, data: null });
}
