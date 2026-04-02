/**
 * API Key 鉴权中间件
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { verifyAPIKey } from '../services/apiKeyService';

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyId?: string;
    apiKey?: string;
  }
}

/**
 * 可选的 API Key 验证中间件
 * 如果请求头包含 X-API-Key，则验证它
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (apiKey) {
    const validatedKey = await verifyAPIKey(apiKey);
    if (validatedKey) {
      request.apiKeyId = validatedKey.id;
      request.apiKey = apiKey;
    }
  }
}

/**
 * 强制的 API Key 验证中间件
 * 请求头必须包含有效的 X-API-Key
 */
export async function requireAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    reply.code(401).send({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: '请求头中缺少 X-API-Key',
      },
    });
    return;
  }

  const validatedKey = await verifyAPIKey(apiKey);
  if (!validatedKey) {
    reply.code(401).send({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: '无效的 API Key',
      },
    });
    return;
  }

  request.apiKeyId = validatedKey.id;
  request.apiKey = apiKey;
}

/**
 * 注册全局鉴权插件
 */
export async function authPlugin(fastify: FastifyInstance): Promise<void> {
  // 添加装饰器用于检查是否已认证
  fastify.decorateRequest('apiKeyId', undefined);
  fastify.decorateRequest('apiKey', undefined);
}
