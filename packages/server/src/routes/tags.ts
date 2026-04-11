/**
 * 标签 API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createTag,
  listTags,
  getTagById,
  updateTag,
  deleteTag,
  getTagEventCount,
} from '../services/tagService';
import { logOperation } from '../services/operationLogService';
import type { CreateTagInput, UpdateTagInput } from '@book-of-ages/shared';

export async function tagRoutes(fastify: FastifyInstance): Promise<void> {
  // 获取标签列表
  fastify.get('/api/tags', async (request: FastifyRequest, reply: FastifyReply) => {
    const tags = await listTags();

    // 为每个标签添加事件数量
    const tagsWithCount = await Promise.all(
      tags.map(async (tag) => ({
        ...tag,
        eventCount: await getTagEventCount(tag.id),
      }))
    );

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

      const tag = await createTag(input);

      // 记录操作日志
      await logOperation('CREATE', 'Tag', tag.id, request.apiKeyId);

      reply.code(201).send({
        success: true,
        data: tag,
      });
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
            parent_id: { type: 'string' },
            color: { type: 'string' },
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

      const updatedTag = await updateTag(request.params.id, request.body);

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
      await logOperation('UPDATE', 'Tag', tag.id, request.apiKeyId);

      reply.send({
        success: true,
        data: updatedTag,
      });
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
      await logOperation('DELETE', 'Tag', tag.id, request.apiKeyId);

      reply.send({
        success: true,
        data: null,
      });
    }
  );
}
