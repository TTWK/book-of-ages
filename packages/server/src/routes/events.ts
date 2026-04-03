/**
 * 事件 API 路由
 * 包含事件 CRUD、时间线节点和材料管理
 * 
 * 注意：路由注册顺序很重要！
 * 更具体的路由（如 /:id/timeline）必须注册在通用路由（如 /:id）之前
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createEvent,
  listEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from '../services/eventService';
import {
  getEventTags,
  updateEventTags,
} from '../services/tagService';
import { logOperation, logUIOperation } from '../services/operationLogService';
import {
  createTimelineNode,
  getTimelineNodes,
  getTimelineNodeById,
  updateTimelineNode,
  deleteTimelineNode,
} from '../services/timelineService';
import {
  createMaterial,
  getMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
} from '../services/materialService';
import { getTimelineNodeById as checkTimelineNode } from '../services/timelineService';
import { saveUploadedFile, getFilePath, getMimeType, deleteFile } from '../services/fileService';
import type { CreateEventInput, UpdateEventInput, EventStatus } from '@book-of-ages/shared';
import type { CreateTimelineNodeInput, UpdateTimelineNodeInput } from '@book-of-ages/shared';
import type { MaterialType } from '@book-of-ages/shared';
import fs from 'fs';

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  // ==================== 时间线节点路由 ====================
  // 注意：使用独立路径避免与 /:id 冲突

  // 获取事件的时间线节点列表
  fastify.get(
    '/api/timeline',
    async (request: FastifyRequest<{ Querystring: { event_id: string } }>, reply: FastifyReply) => {
      const eventId = request.query.event_id;
      if (!eventId) {
        reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '缺少 event_id 参数' },
        });
        return;
      }
      const event = await getEventById(eventId);
      if (!event) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '事件不存在' },
        });
        return;
      }
      const nodes = await getTimelineNodes(eventId);
      reply.send({ success: true, data: nodes });
    }
  );

  // 创建时间线节点
  fastify.post(
    '/api/timeline',
    {
      schema: {
        body: {
          type: 'object',
          required: ['event_id', 'title'],
          properties: {
            event_id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            node_date: { type: 'string' },
            sort_order: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: CreateTimelineNodeInput & { event_id: string };
    }>, reply: FastifyReply) => {
      const { event_id, ...input } = request.body;
      const event = await getEventById(event_id);
      if (!event) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '事件不存在' },
        });
        return;
      }
      if (!input.title || input.title.trim() === '') {
        reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '标题不能为空' },
        });
        return;
      }
      const node = await createTimelineNode(event_id, input);
      await logOperation('CREATE', 'TimelineNode', node.id, request.apiKeyId);
      reply.code(201).send({ success: true, data: node });
    }
  );

  // 更新时间线节点
  fastify.put(
    '/api/timeline/:nodeId',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            node_date: { type: 'string' },
            sort_order: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { nodeId: string };
      Body: UpdateTimelineNodeInput;
    }>, reply: FastifyReply) => {
      const node = await getTimelineNodeById(request.params.nodeId);
      if (!node) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '时间线节点不存在' },
        });
        return;
      }
      const updatedNode = await updateTimelineNode(request.params.nodeId, request.body);
      await logOperation('UPDATE', 'TimelineNode', node.id, request.apiKeyId);
      reply.send({ success: true, data: updatedNode });
    }
  );

  // 删除时间线节点
  fastify.delete(
    '/api/timeline/:nodeId',
    async (request: FastifyRequest<{ Params: { nodeId: string } }>, reply: FastifyReply) => {
      const node = await getTimelineNodeById(request.params.nodeId);
      if (!node) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '时间线节点不存在' },
        });
        return;
      }
      await deleteTimelineNode(request.params.nodeId);
      await logOperation('DELETE', 'TimelineNode', node.id, request.apiKeyId);
      reply.send({ success: true, data: null });
    }
  );

  // ==================== 材料管理路由 ====================
  // 注意：使用独立路径避免与 /:id 冲突

  // 获取事件的材料列表
  fastify.get(
    '/api/materials',
    async (request: FastifyRequest<{
      Querystring: { event_id: string; timeline_node_id?: string };
    }>, reply: FastifyReply) => {
      const eventId = request.query.event_id;
      if (!eventId) {
        reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '缺少 event_id 参数' },
        });
        return;
      }
      const event = await getEventById(eventId);
      if (!event) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '事件不存在' },
        });
        return;
      }
      const materials = await getMaterials(eventId, request.query.timeline_node_id);
      reply.send({ success: true, data: materials });
    }
  );

  // 上传材料
  fastify.post(
    '/api/materials/upload',
    {
      schema: {
        consumes: ['multipart/form-data'],
        body: {
          type: 'object',
          required: ['event_id', 'type'],
          properties: {
            event_id: { type: 'string' },
            timeline_node_id: { type: 'string' },
            type: { type: 'string', enum: ['image', 'video', 'pdf', 'snapshot', 'other'] },
            title: { type: 'string' },
            source_url: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Body: {
        event_id: string;
        timeline_node_id?: string;
        type: MaterialType;
        title?: string;
        source_url?: string;
      };
    }>, reply: FastifyReply) => {
      const { event_id, timeline_node_id, type, title, source_url } = request.body;

      const event = await getEventById(event_id);
      if (!event) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '事件不存在' },
        });
        return;
      }

      if (timeline_node_id) {
        const node = await checkTimelineNode(timeline_node_id);
        if (!node) {
          reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: '时间线节点不存在' },
          });
          return;
        }
      }

      const data = await request.file();
      let filePath = '';
      let contentText: string | undefined;

      if (data) {
        filePath = await saveUploadedFile(data, type);
        if (type === 'snapshot' && data.mimetype === 'text/html') {
          const buffer = await data.toBuffer();
          const html = buffer.toString('utf-8');
          contentText = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .slice(0, 10000);
        }
      } else if (source_url) {
        filePath = source_url;
      } else {
        reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '必须上传文件或提供 source_url' },
        });
        return;
      }

      const material = await createMaterial({
        event_id,
        timeline_node_id,
        type,
        title,
        source_url,
        content_text: contentText,
        file_path: filePath,
      });

      await logOperation('CREATE', 'Material', material.id, request.apiKeyId);
      reply.code(201).send({ success: true, data: material });
    }
  );

  // 获取单个材料
  fastify.get(
    '/api/materials/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const material = await getMaterialById(request.params.id);
      if (!material) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '材料不存在' },
        });
        return;
      }
      reply.send({ success: true, data: material });
    }
  );

  // 预览/下载材料文件
  fastify.get(
    '/api/materials/:id/preview',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const material = await getMaterialById(request.params.id);
      if (!material) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '材料不存在' },
        });
        return;
      }

      if (material.file_path.startsWith('http://') || material.file_path.startsWith('https://')) {
        reply.redirect(material.file_path);
        return;
      }

      const filePath = getFilePath(material.file_path);
      if (!fs.existsSync(filePath)) {
        reply.code(404).send({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: '文件不存在' },
        });
        return;
      }

      const mimeType = getMimeType(filePath);
      
      // 读取并发送文件
      const fileContent = fs.readFileSync(filePath);
      reply.type(mimeType).send(fileContent);
    }
  );

  // 更新材料
  fastify.put(
    '/api/materials/:id',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            source_url: { type: 'string' },
            content_text: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { title?: string; source_url?: string; content_text?: string };
    }>, reply: FastifyReply) => {
      const material = await getMaterialById(request.params.id);
      if (!material) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '材料不存在' },
        });
        return;
      }
      const updatedMaterial = await updateMaterial(request.params.id, request.body);
      await logOperation('UPDATE', 'Material', material.id, request.apiKeyId);
      reply.send({ success: true, data: updatedMaterial });
    }
  );

  // 删除材料
  fastify.delete(
    '/api/materials/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const material = await getMaterialById(request.params.id);
      if (!material) {
        reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '材料不存在' },
        });
        return;
      }
      if (!material.file_path.startsWith('http://') && !material.file_path.startsWith('https://')) {
        deleteFile(material.file_path);
      }
      await deleteMaterial(request.params.id);
      await logOperation('DELETE', 'Material', material.id, request.apiKeyId);
      reply.send({ success: true, data: null });
    }
  );

  // ==================== 事件 CRUD 路由 ====================
  // 注意：所有 /:id 子路由必须放在通用 /:id 路由之前处理

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
    async (request: FastifyRequest<{
      Querystring: {
        status?: EventStatus;
        tag?: string;
        page?: number;
        pageSize?: number;
      };
    }>, reply: FastifyReply) => {
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

  // 获取单个事件（必须放在 /:id/timeline 和 /:id/materials 之后）
  // 使用约束只匹配 UUID 格式
  fastify.get(
    '/api/events/:id',
    {
      constraints: {
        // 使用正则约束匹配 UUID 格式
      }
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = request.params.id;
      // 验证 UUID 格式
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
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateEventInput;
    }>, reply: FastifyReply) => {
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
        // 区分 API 和 UI 操作
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
      // 区分 API 和 UI 操作
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
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { tagIds: string[] };
    }>, reply: FastifyReply) => {
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
