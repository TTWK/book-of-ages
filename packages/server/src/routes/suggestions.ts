/**
 * AI 建议收件箱路由
 *
 * 权限（2026-09-13 设计）：
 * - POST /api/suggestions（AI 提议）：write 及以上（onRoute 钩子默认挂载）
 * - GET /api/suggestions：read 及以上（默认）
 * - accept / dismiss：仅 admin（人工定夺）
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  proposeSuggestion,
  listSuggestions,
  acceptSuggestion,
  dismissSuggestion,
} from '../services/suggestionService';
import { logOperation } from '../services/operationLogService';
import { requireAdminScope } from '../middleware/auth';
import type {
  AISuggestionStatus,
  AISuggestionType,
  ProposeSuggestionInput,
} from '@book-of-ages/shared';

export async function suggestionRoutes(fastify: FastifyInstance): Promise<void> {
  // AI 提出建议
  fastify.post<{ Body: ProposeSuggestionInput }>(
    '/api/suggestions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['type', 'target_id'],
          properties: {
            type: { type: 'string', enum: ['tag', 'summary', 'date', 'merge'] },
            target_id: { type: 'string' },
            payload: { type: 'object' },
            rationale: { type: 'string', maxLength: 2000 },
            model: { type: 'string', maxLength: 200 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ProposeSuggestionInput }>, reply: FastifyReply) => {
      try {
        const suggestion = await proposeSuggestion(request.body, {
          createdByKey: request.auth?.keyId,
        });
        await logOperation('CREATE', 'AISuggestion', suggestion.id, request.auth?.keyId);
        reply.code(201).send({ success: true, data: suggestion });
      } catch (error) {
        const message = error instanceof Error ? error.message : '提议失败';
        if (message.startsWith('NOT_FOUND')) {
          reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message } });
        } else if (message.startsWith('VALIDATION_ERROR')) {
          reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message },
          });
        } else {
          reply.code(500).send({
            success: false,
            error: { code: 'SUGGESTION_FAILED', message: '提议失败' },
          });
        }
      }
    }
  );

  // 建议列表
  fastify.get<{ Querystring: { status?: AISuggestionStatus } }>(
    '/api/suggestions',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'accepted', 'dismissed'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { status?: AISuggestionStatus } }>,
      reply: FastifyReply
    ) => {
      const suggestions = await listSuggestions(request.query.status);
      reply.send({ success: true, data: suggestions });
    }
  );

  // 采纳建议（执行建议内容）
  fastify.post<{ Params: { id: string } }>(
    '/api/suggestions/:id/accept',
    { preHandler: requireAdminScope },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const suggestion = await acceptSuggestion(request.params.id, {
          decidedByKey: request.auth?.keyId,
        });
        if (!suggestion) {
          reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: '建议不存在' },
          });
          return;
        }
        await logOperation('UPDATE', 'AISuggestion', suggestion.id, request.auth?.keyId);
        reply.send({ success: true, data: suggestion });
      } catch (error) {
        const message = error instanceof Error ? error.message : '采纳失败';
        if (message.startsWith('INVALID_STATE')) {
          reply.code(409).send({ success: false, error: { code: 'INVALID_STATE', message } });
        } else if (
          message.startsWith('INVALID_PAYLOAD') ||
          message.startsWith('VALIDATION_ERROR')
        ) {
          reply.code(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message },
          });
        } else {
          reply.code(500).send({
            success: false,
            error: { code: 'APPLY_FAILED', message: '采纳建议失败' },
          });
        }
      }
    }
  );

  // 驳回建议（仅标记）
  fastify.post<{ Params: { id: string } }>(
    '/api/suggestions/:id/dismiss',
    { preHandler: requireAdminScope },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const suggestion = await dismissSuggestion(request.params.id, {
          decidedByKey: request.auth?.keyId,
        });
        if (!suggestion) {
          reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: '建议不存在' },
          });
          return;
        }
        await logOperation('UPDATE', 'AISuggestion', suggestion.id, request.auth?.keyId);
        reply.send({ success: true, data: suggestion });
      } catch (error) {
        const message = error instanceof Error ? error.message : '驳回失败';
        if (message.startsWith('INVALID_STATE')) {
          reply.code(409).send({ success: false, error: { code: 'INVALID_STATE', message } });
        } else {
          reply.code(500).send({
            success: false,
            error: { code: 'DISMISS_FAILED', message: '驳回建议失败' },
          });
        }
      }
    }
  );
}

// 供 MCP 工具与类型引用
export type { AISuggestionType };
