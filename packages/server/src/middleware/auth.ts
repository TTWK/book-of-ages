/**
 * API Key 鉴权中间件
 *
 * 策略：
 * - 全局 preHandler 做"可选认证"：携带合法 X-API-Key 的请求会被标记（用于审计与权限判断）
 * - 写操作（非 GET/HEAD/OPTIONS）由 onRoute 钩子自动挂载 requireAuthMiddleware 强制鉴权
 * - 环境变量 ADMIN_API_KEY 可作为管理员密钥引导（可管理 API Key 本身）
 * - 若未配置 ADMIN_API_KEY 且库中还没有任何密钥，允许匿名创建第一把密钥（首次引导）
 */

import crypto from 'crypto';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { verifyAPIKey, listAPIKeys } from '../services/apiKeyService';

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyId?: string;
    apiKey?: string;
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
async function authenticate(apiKey: string): Promise<{ id: string } | null> {
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && safeEqual(apiKey, adminKey)) {
    return { id: 'admin' };
  }
  const validated = await verifyAPIKey(apiKey);
  return validated ? { id: validated.id } : null;
}

/**
 * 可选的 API Key 验证中间件
 * 如果请求头包含 X-API-Key，则验证它
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (apiKey) {
    const validatedKey = await authenticate(apiKey);
    if (validatedKey) {
      request.apiKeyId = validatedKey.id;
      request.apiKey = apiKey;
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

/**
 * 强制的 API Key 验证中间件
 * 请求头必须包含有效的 X-API-Key
 */
export async function requireAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // 全局 optionalAuthMiddleware 已先执行并标记了合法密钥，避免重复查库
  if (request.apiKeyId) {
    return;
  }

  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    rejectUnauthorized(request, reply, 'MISSING_API_KEY', '请求头中缺少 X-API-Key');
    return;
  }

  const validatedKey = await authenticate(apiKey);
  if (!validatedKey) {
    rejectUnauthorized(request, reply, 'INVALID_API_KEY', '无效的 API Key');
    return;
  }

  request.apiKeyId = validatedKey.id;
  request.apiKey = apiKey;
}

/**
 * 首次引导型鉴权：已配置合法密钥则放行；
 * 未配置 ADMIN_API_KEY 且系统中还没有任何密钥时，允许匿名调用（用于创建第一把密钥）。
 */
export async function bootstrapAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.apiKeyId) {
    return;
  }

  const apiKey = request.headers['x-api-key'] as string | undefined;
  if (apiKey) {
    const validatedKey = await authenticate(apiKey);
    if (validatedKey) {
      request.apiKeyId = validatedKey.id;
      request.apiKey = apiKey;
      return;
    }
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

/**
 * 为非只读路由自动挂载强制鉴权
 */
export function enforceAuthOnMutations(fastify: FastifyInstance): void {
  fastify.addHook('onRoute', (routeOptions) => {
    const methods = Array.isArray(routeOptions.method)
      ? routeOptions.method
      : [routeOptions.method];
    const isReadOnly = methods.every((m) => ['GET', 'HEAD', 'OPTIONS'].includes(m));
    if (isReadOnly) return;
    // 已显式指定 preHandler 的路由（如首密钥引导）不覆盖
    if (!routeOptions.preHandler) {
      routeOptions.preHandler = requireAuthMiddleware;
    }
  });
}

/**
 * 注册全局鉴权插件
 */
export async function authPlugin(fastify: FastifyInstance): Promise<void> {
  // 添加装饰器用于检查是否已认证
  fastify.decorateRequest('apiKeyId', undefined);
  fastify.decorateRequest('apiKey', undefined);
}
