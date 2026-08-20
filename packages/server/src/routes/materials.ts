/**
 * 材料 API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import { getEventById } from '../services/eventService';
import { getTimelineNodeById as checkTimelineNode } from '../services/timelineService';
import {
  createMaterial,
  getMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
} from '../services/materialService';
import { logOperation } from '../services/operationLogService';
import { saveUploadedFile, getFilePath, getMimeType, deleteFile } from '../services/fileService';
import type { MaterialType } from '@book-of-ages/shared';

export async function materialRoutes(fastify: FastifyInstance): Promise<void> {
  // 获取事件的材料列表
  fastify.get(
    '/api/materials',
    async (
      request: FastifyRequest<{
        Querystring: { event_id: string; timeline_node_id?: string };
      }>,
      reply: FastifyReply
    ) => {
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
    async (
      request: FastifyRequest<{
        Body: {
          event_id: string;
          timeline_node_id?: string;
          type: MaterialType;
          title?: string;
          source_url?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
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
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { title?: string; source_url?: string; content_text?: string };
      }>,
      reply: FastifyReply
    ) => {
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
}
