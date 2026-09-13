/**
 * 标签 API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createTag,
  getTagById,
  updateTag,
  deleteTag,
  getTagEventCount,
  getTagEventDetails,
} from '../services/tagService';
import { all } from '../db';
import { logOperation } from '../services/operationLogService';
import type { CreateTagInput, UpdateTagInput, Tag } from '@book-of-ages/shared';

/** 带事件计数的标签（相关子查询一次取回，避免 N+1） */
async function listTagsWithCount(): Promise<Array<Tag & { eventCount: number }>> {
  return all<Tag & { eventCount: number }>(`
    SELECT t.*, (
      SELECT COUNT(*) FROM event_tags et WHERE et.tag_id = t.id
    ) as eventCount
    FROM tags t
    ORDER BY t.parent_id, t.name
  `);
}

export async function tagRoutes(fastify: FastifyInstance): Promise<void> {
  // 获取标签列表
  fastify.get('/api/tags', async (request: FastifyRequest, reply: FastifyReply) => {
    const tagsWithCount = await listTagsWithCount();

    reply.send({
      success: true,
      data: tagsWithCount,
    });
  });

  // 创建标签
  fastify.post(
    '/api/tags',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            parent_id: { type: 'string' },
            color: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: CreateTagInput;
      }>,
      reply: FastifyReply
    ) => {
      const input = request.body;

      // 验证名称
      if (!input.name || input.name.trim() === '') {
        reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '标签名称不能为空',
          },
        });
        return;
      }

      try {
        const tag = await createTag({ ...input, name: input.name.trim() });

        // 记录操作日志
        await logOperation('CREATE', 'Tag', tag.id, request.auth?.keyId);

        reply.code(201).send({
          success: true,
          data: tag,
        });
      } catch (error) {
        // SQLite UNIQUE 约束冲突：同名标签已存在
        if (
          error instanceof Error &&
          (error as NodeJS.ErrnoException).code?.startsWith('SQLITE_CONSTRAINT')
        ) {
          reply.code(409).send({
            success: false,
            error: { code: 'DUPLICATE_NAME', message: '同名标签已存在' },
          });
          return;
        }
        throw error;
      }
    }
  );

  // 获取单个标签
  fastify.get(
    '/api/tags/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tag = await getTagById(request.params.id);

      if (!tag) {
        reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '标签不存在',
          },
        });
        return;
      }

      reply.send({
        success: true,
        data: {
          ...tag,
          eventCount: await getTagEventCount(tag.id),
        },
      });
    }
  );

  // 更新标签
  fastify.put(
    '/api/tags/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            parent_id: { type: ['string', 'null'] },
            color: { type: ['string', 'null'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateTagInput;
      }>,
      reply: FastifyReply
    ) => {
      const tag = await getTagById(request.params.id);

      if (!tag) {
        reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '标签不存在',
          },
        });
        return;
      }

      let updatedTag: Awaited<ReturnType<typeof updateTag>>;
      try {
        updatedTag = await updateTag(request.params.id, request.body);
      } catch (error) {
        if (error instanceof Error && error.message === 'TAG_CYCLE') {
          reply.code(400).send({
            success: false,
            error: { code: 'TAG_CYCLE', message: '不能选择自己或自己的后代作为父标签' },
          });
          return;
        }
        throw error;
      }

      if (!updatedTag) {
        reply.code(500).send({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: '更新失败',
          },
        });
        return;
      }

      // 记录操作日志
      await logOperation('UPDATE', 'Tag', tag.id, request.auth?.keyId);

      reply.send({
        success: true,
        data: updatedTag,
      });
    }
  );

  // 获取标签下的事件聚合详情
  fastify.get(
    '/api/tags/:id/events',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const details = await getTagEventDetails(request.params.id);
        reply.send({
          success: true,
          data: details,
        });
      } catch (error) {
        if (error instanceof Error && error.message === '标签不存在') {
          reply.code(404).send({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: '标签不存在',
            },
          });
        } else {
          reply.code(500).send({
            success: false,
            error: {
              code: 'FETCH_FAILED',
              message: '获取标签事件详情失败',
            },
          });
        }
      }
    }
  );

  // 删除标签
  fastify.delete(
    '/api/tags/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tag = await getTagById(request.params.id);

      if (!tag) {
        reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '标签不存在',
          },
        });
        return;
      }

      const success = await deleteTag(request.params.id);

      if (!success) {
        reply.code(500).send({
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: '删除失败',
          },
        });
        return;
      }

      // 记录操作日志
      await logOperation('DELETE', 'Tag', tag.id, request.auth?.keyId);

      reply.send({
        success: true,
        data: null,
      });
    }
  );
}
