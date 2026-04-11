/**
 * 系统设置 API 路由（API Key 管理、审计日志）
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createAPIKey, listAPIKeys, deleteAPIKey } from '../services/apiKeyService';
import { getOperationLogs } from '../services/operationLogService';
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
  fastify.post(
    '/api/settings/keys',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: CreateAPIKeyInput;
      }>,
      reply: FastifyReply
    ) => {
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

      const apiKey = await createAPIKey({ name });

      reply.code(201).send({
        success: true,
        data: apiKey,
      });
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
            limit: { type: 'number', default: 100 },
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
      const { limit = 100 } = request.query;

      const logs = await getOperationLogs(limit);

      reply.send({
        success: true,
        data: logs,
      });
    }
  );
}
