/**
 * 事件核心 API 路由
 * 仅包含事件 CRUD、批量更新与事件标签关联
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createEvent,
  listEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  batchUpdateEvents,
} from '../services/eventService';
import { getEventTags, updateEventTags } from '../services/tagService';
import { logOperation, logUIOperation } from '../services/operationLogService';
import type { CreateEventInput, UpdateEventInput, EventStatus } from '@book-of-ages/shared';

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  // 获取事件列表
  fastify.get(
    '/api/events',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['draft', 'confirmed', 'archived', 'deleted'] },
            tag: { type: 'string' },
            page: { type: 'number', default: 1 },
            pageSize: { type: 'number', default: 20 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          status?: EventStatus;
          tag?: string;
          page?: number;
          pageSize?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { status, tag, page = 1, pageSize = 20 } = request.query;
      const result = await listEvents({ status, tagId: tag, page, pageSize });
      const totalPages = Math.ceil(result.total / pageSize);
      reply.send({
        success: true,
        data: {
          items: result.events,
          pagination: { page, pageSize, total: result.total, totalPages },
        },
      });
    }
  );

  // 创建事件
  fastify.post(
    '/api/events',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            summary: { type: 'string', maxLength: 1000 },
            content: { type: 'string', maxLength: 50000 },
            status: { type: 'string', enum: ['draft', 'confirmed', 'archived', 'deleted'] },
            event_date: { type: 'string' },
            source_url: { type: 'string', maxLength: 2000 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateEventInput }>, reply: FastifyReply) => {
      const input = request.body;
      if (!input.title || input.title.trim() === '') {
        reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '标题不能为空' },
        });
        return;
      }
      if (input.title.length > 200) {
        reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '标题不能超过 200 个字符' },
        });
        return;
      }
      const event = await createEvent(input);
      await logOperation('CREATE', 'Event', event.id, request.apiKeyId);
      reply.code(201).send({ success: true, data: event });
    }
  );

  // 批量更新事件
  fastify.put(
    '/api/events/batch',
    {
      schema: {
        body: {
          type: 'object',
          required: ['ids', 'updates'],
          properties: {
            ids: { type: 'array', items: { type: 'string' } },
            updates: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['draft', 'confirmed', 'archived', 'deleted'] },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { ids: string[]; updates: UpdateEventInput };
      }>,
      reply: FastifyReply
    ) => {
      const { ids, updates } = request.body;
      const result = await batchUpdateEvents(ids, updates, request.apiKeyId);

      // 记录批量操作日志
      for (const id of result.successIds) {
        if (request.apiKeyId) {
          await logOperation('UPDATE', 'Event', id, request.apiKeyId);
        } else {
          await logUIOperation('UPDATE', 'Event', id);
        }
      }

      reply.send({ success: true, data: result });
    }
  );

  // 获取单个事件
  fastify.get(
    '/api/events/:id',
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

      const event = await getEventById(id);
      if (!event) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '事件不存在' },
        });
        return;
      }
      reply.send({ success: true, data: event });
    }
  );

  // 更新事件
  fastify.put(
    '/api/events/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            content: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'confirmed', 'archived', 'deleted'] },
            event_date: { type: 'string' },
            source_url: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateEventInput;
      }>,
      reply: FastifyReply
    ) => {
      const event = await getEventById(request.params.id);
      if (!event) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '事件不存在' },
        });
        return;
      }
      try {
        const updatedEvent = await updateEvent(request.params.id, request.body, request.apiKeyId);
        if (!updatedEvent) {
          reply.code(500).send({
            success: false,
            error: { code: 'UPDATE_FAILED', message: '更新失败' },
          });
          return;
        }
        if (request.apiKeyId) {
          await logOperation('UPDATE', 'Event', event.id, request.apiKeyId);
        } else {
          await logUIOperation('UPDATE', 'Event', event.id);
        }
        reply.send({ success: true, data: updatedEvent });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('PERMISSION_DENIED')) {
          reply.code(403).send({
            success: false,
            error: { code: 'PERMISSION_DENIED', message: error.message },
          });
        } else {
          reply.code(500).send({
            success: false,
            error: { code: 'UPDATE_FAILED', message: '更新失败' },
          });
        }
      }
    }
  );

  // 删除事件
  fastify.delete(
    '/api/events/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const event = await getEventById(request.params.id);
      if (!event) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '事件不存在' },
        });
        return;
      }
      const success = await deleteEvent(request.params.id);
      if (!success) {
        reply.code(500).send({
          success: false,
          error: { code: 'DELETE_FAILED', message: '删除失败' },
        });
        return;
      }
      if (request.apiKeyId) {
        await logOperation('DELETE', 'Event', event.id, request.apiKeyId);
      } else {
        await logUIOperation('DELETE', 'Event', event.id);
      }
      reply.send({ success: true, data: null });
    }
  );

  // 获取事件的标签
  fastify.get(
    '/api/events/:id/tags',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const event = await getEventById(request.params.id);
      if (!event) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '事件不存在' },
        });
        return;
      }
      const tags = await getEventTags(request.params.id);
      reply.send({ success: true, data: tags });
    }
  );

  // 更新事件的标签
  fastify.put(
    '/api/events/:id/tags',
    {
      schema: {
        body: {
          type: 'object',
          required: ['tagIds'],
          properties: {
            tagIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { tagIds: string[] };
      }>,
      reply: FastifyReply
    ) => {
      const event = await getEventById(request.params.id);
      if (!event) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '事件不存在' },
        });
        return;
      }
      await updateEventTags(request.params.id, request.body.tagIds);
      reply.send({ success: true, data: null });
    }
  );
}
