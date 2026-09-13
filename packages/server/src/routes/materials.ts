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
import {
  saveUploadedFile,
  getFilePath,
  getMimeType,
  deleteFile,
  validateUploadExtension,
} from '../services/fileService';
import type { MaterialType } from '@book-of-ages/shared';

/** 从 multipart 字段中取字符串值（兼容字符串与字段对象两种形态） */
function fieldValue(fields: Record<string, unknown> | undefined, name: string): string | undefined {
  const raw = fields?.[name];
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)) {
    const v = (raw as Record<string, unknown>).value;
    return v === undefined || v === null ? undefined : String(v);
  }
  return String(raw);
}

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
  // 注意：multipart 请求的 body 不经过 JSON schema 校验，
  // 必须通过 request.file() 消费文件并从 data.fields 读取表单字段
  fastify.post('/api/materials/upload', async (request, reply) => {
    if (!request.isMultipart()) {
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请使用 multipart/form-data 上传' },
      });
      return;
    }

    const data = await request.file();
    if (!data) {
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '缺少文件或表单字段' },
      });
      return;
    }

    const fields = data.fields as Record<string, unknown> | undefined;
    const event_id = fieldValue(fields, 'event_id');
    const timeline_node_id = fieldValue(fields, 'timeline_node_id');
    const type = fieldValue(fields, 'type') as MaterialType | undefined;
    const title = fieldValue(fields, 'title');
    const source_url = fieldValue(fields, 'source_url');

    const validTypes: MaterialType[] = ['image', 'video', 'pdf', 'snapshot', 'other'];
    if (!event_id || !type || !validTypes.includes(type)) {
      reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '缺少 event_id 或合法的 type 参数' },
      });
      return;
    }

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

    let filePath = '';
    let contentText: string | undefined;

    if (data.filename) {
      // 有文件：按材料类型校验扩展名白名单
      const extError = validateUploadExtension(data.filename, type);
      if (extError) {
        reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: extError },
        });
        return;
      }

      const buffer = await data.toBuffer();
      filePath = await saveUploadedFile(buffer, data.filename, type);

      if (type === 'snapshot' && data.mimetype === 'text/html') {
        contentText = buffer
          .toString('utf-8')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .slice(0, 10000);
      }
    } else if (source_url) {
      // 无文件：记录为外部链接
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
  });

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

      // 安全响应头：禁止 MIME 嗅探；HTML 内容一律禁用脚本执行（冻结证据）
      reply.header('X-Content-Type-Options', 'nosniff');
      if (mimeType === 'text/html') {
        reply.header('Content-Security-Policy', 'sandbox');
      }

      // 流式发送文件，避免大文件阻塞事件循环
      const stream = fs.createReadStream(filePath);
      return reply.type(mimeType).send(stream);
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
