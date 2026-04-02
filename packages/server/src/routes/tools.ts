/**
 * 工具 API 路由（URL 解析等）
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { parseURL } from '../services/urlParserService';
import type { ParseURLInput } from '@book-of-ages/shared';

export async function toolRoutes(fastify: FastifyInstance): Promise<void> {
  // URL 解析服务
  fastify.post(
    '/api/tools/parse-url',
    {
      schema: {
        body: {
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: ParseURLInput;
    }>, reply: FastifyReply) => {
      const { url } = request.body;

      if (!url || url.trim() === '') {
        reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'URL 不能为空',
          },
        });
        return;
      }

      try {
        const result = await parseURL({ url });

        reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: error instanceof Error ? error.message : '解析失败',
          },
        });
      }
    }
  );
}
