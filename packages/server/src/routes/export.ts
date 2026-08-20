/**
 * 导出 API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { exportEventToMarkdown } from '../services/exportService';
import { exportEventsToMarkdown } from '../services/batchExportService';
import type { BatchExportInput } from '@book-of-ages/shared';

export async function exportRoutes(fastify: FastifyInstance): Promise<void> {
  // 导出单个事件为 Markdown
  fastify.get(
    '/api/events/:id/export',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = request.params.id;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '路由不存在' },
        });
        return;
      }

      try {
        const markdown = await exportEventToMarkdown(id);
        reply.type('text/markdown; charset=utf-8').send(markdown);
      } catch (error) {
        if (error instanceof Error && error.message === '事件不存在') {
          reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: '事件不存在' },
          });
        } else {
          reply.code(500).send({
            success: false,
            error: { code: 'EXPORT_FAILED', message: '导出失败' },
          });
        }
      }
    }
  );

  // 批量导出事件为 Markdown 列表
  fastify.post(
    '/api/events/batch-export',
    {
      schema: {
        body: {
          type: 'object',
          required: ['ids'],
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: BatchExportInput;
      }>,
      reply: FastifyReply
    ) => {
      const { ids } = request.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '必须提供有效的事件 ID 数组' },
        });
        return;
      }

      try {
        const results = await exportEventsToMarkdown(ids);
        reply.send({
          success: true,
          data: {
            items: results,
          },
        });
      } catch (_error) {
        reply.code(500).send({
          success: false,
          error: { code: 'BATCH_EXPORT_FAILED', message: '批量导出失败' },
        });
      }
    }
  );
}
