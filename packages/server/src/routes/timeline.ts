/**
 * 时间线节点 API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getEventById } from '../services/eventService';
import {
  createTimelineNode,
  getTimelineNodes,
  getTimelineNodeById,
  updateTimelineNode,
  deleteTimelineNode,
} from '../services/timelineService';
import { logOperation } from '../services/operationLogService';
import type { CreateTimelineNodeInput, UpdateTimelineNodeInput } from '@book-of-ages/shared';

export async function timelineRoutes(fastify: FastifyInstance): Promise<void> {
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
    async (
      request: FastifyRequest<{
        Body: CreateTimelineNodeInput & { event_id: string };
      }>,
      reply: FastifyReply
    ) => {
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
    async (
      request: FastifyRequest<{
        Params: { nodeId: string };
        Body: UpdateTimelineNodeInput;
      }>,
      reply: FastifyReply
    ) => {
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
}
