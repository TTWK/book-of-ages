/**
 * 搜索 API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { simpleSearch, executeStructuredQuery } from '../services/searchService';
import { requireScope } from '../middleware/auth';
import type { SearchType, StructuredQuery } from '@book-of-ages/shared';

export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  // 全局搜索
  fastify.get(
    '/api/search',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string' },
            type: { type: 'string', enum: ['event', 'material', 'timeline'] },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            limit: { type: 'number', default: 50 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          q: string;
          type?: SearchType;
          startDate?: string;
          endDate?: string;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { q, type, startDate, endDate, limit = 50 } = request.query;

      if (!q || q.trim() === '') {
        reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '搜索关键词不能为空',
          },
        });
        return;
      }

      try {
        const results = await simpleSearch(q, {
          type,
          startDate,
          endDate,
          limit,
        });

        reply.send({
          success: true,
          data: results,
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: {
            code: 'SEARCH_ERROR',
            message: error instanceof Error ? error.message : '搜索失败',
          },
        });
      }
    }
  );

  // 结构化查询（确定性执行器）：自然语言经外部 Agent 翻译为查询计划后调用。
  // 只读端点（显式 read scope，允许 write/admin），POST 仅为承载结构化 body。
  fastify.post<{ Body: StructuredQuery }>(
    '/api/search/query',
    { preHandler: requireScope('read') },
    async (request: FastifyRequest<{ Body: StructuredQuery }>, reply: FastifyReply) => {
      const query = request.body ?? {};
      if (
        !query.text &&
        !query.tags?.length &&
        !query.status &&
        !query.date_from &&
        !query.date_to
      ) {
        reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '查询计划不能为空：至少提供 text / tags / status / 日期范围之一',
          },
        });
        return;
      }

      try {
        const results = await executeStructuredQuery(query);
        reply.send({ success: true, data: results });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: {
            code: 'SEARCH_ERROR',
            message: error instanceof Error ? error.message : '结构化查询失败',
          },
        });
      }
    }
  );
}
