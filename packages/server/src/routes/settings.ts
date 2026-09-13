/**
 * 系统设置 API 路由（API Key 管理、审计日志）
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createAPIKey, listAPIKeys, deleteAPIKey } from '../services/apiKeyService';
import { getOperationLogs } from '../services/operationLogService';
import { bootstrapAuthMiddleware } from '../middleware/auth';
import type { CreateAPIKeyInput } from '@book-of-ages/shared';

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  // 获取 API Key 列表
  fastify.get('/api/settings/keys', async (request: FastifyRequest, reply: FastifyReply) => {
    const keys = await listAPIKeys();

    reply.send({
      success: true,
      data: keys,
    });
  });

  // 创建新的 API Key
  // 鉴权策略：常规请求强制携带密钥；未配置 ADMIN_API_KEY 且系统中还没有
  // 任何密钥时，允许匿名创建第一把密钥（首次引导）
  fastify.post<{
    Body: CreateAPIKeyInput;
  }>(
    '/api/settings/keys',
    {
      preHandler: bootstrapAuthMiddleware,
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const { name } = request.body;

      if (!name || name.trim() === '') {
        reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'API Key 名称不能为空',
          },
        });
        return;
      }

      try {
        const apiKey = await createAPIKey({ name: name.trim() });

        reply.code(201).send({
          success: true,
          data: apiKey,
        });
      } catch (error) {
        // SQLite UNIQUE 约束冲突：名称重复
        if (
          error instanceof Error &&
          (error as NodeJS.ErrnoException).code?.startsWith('SQLITE_CONSTRAINT')
        ) {
          reply.code(409).send({
            success: false,
            error: { code: 'DUPLICATE_NAME', message: '同名 API Key 已存在' },
          });
          return;
        }
        throw error;
      }
    }
  );

  // 删除 API Key
  fastify.delete(
    '/api/settings/keys/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const success = await deleteAPIKey(request.params.id);

      if (!success) {
        reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'API Key 不存在',
          },
        });
        return;
      }

      reply.send({
        success: true,
        data: null,
      });
    }
  );

  // 获取操作审计日志
  fastify.get(
    '/api/audit/logs',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 100, maximum: 500 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const limit = Math.min(request.query.limit ?? 100, 500);

      const logs = await getOperationLogs(limit);

      reply.send({
        success: true,
        data: logs,
      });
    }
  );
}
