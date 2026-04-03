/**
 * 搜索 API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { simpleSearch } from '../services/searchService';
import type { SearchType } from '@book-of-ages/shared';

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
    async (request: FastifyRequest<{
      Querystring: {
        q: string;
        type?: SearchType;
        startDate?: string;
        endDate?: string;
        limit?: number;
      };
    }>, reply: FastifyReply) => {
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
}
