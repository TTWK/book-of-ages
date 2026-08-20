/**
 * 工具与 MCP API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { parseURL } from '../services/urlParserService';
import { handleMcpJsonRpcMessage, JsonRpcRequest } from '../mcp/server';
import { executeMcpTool } from '../mcp/tools';
import type { ParseURLInput } from '@book-of-ages/shared';

export async function toolRoutes(fastify: FastifyInstance): Promise<void> {
  // URL 解析服务
  fastify.post(
    '/api/tools/parse-url',
    async (
      request: FastifyRequest<{
        Body: ParseURLInput;
      }>,
      reply: FastifyReply
    ) => {
      const { url } = request.body || {};

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

  // 深度快照归档服务 (Webhook / Clipper 快捷通道)
  fastify.post<{
    Body: {
      url: string;
      title?: string;
      tags?: string[];
      auto_confirm?: boolean;
    };
  }>('/api/tools/archive-url', async (request, reply) => {
    const { url, title, tags, auto_confirm } = request.body || {};

    if (!url || !url.trim()) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'URL 不能为空' },
      });
    }

    try {
      const result = await executeMcpTool('archive_url', {
        url,
        title,
        tags,
        auto_confirm,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'ARCHIVE_ERROR',
          message: error instanceof Error ? error.message : '抓取归档失败',
        },
      });
    }
  });

  // 标准 MCP (Model Context Protocol) JSON-RPC 2.0 端点
  fastify.post<{
    Body: JsonRpcRequest;
  }>('/api/mcp', async (request, reply) => {
    const rpcRequest = request.body;
    if (!rpcRequest || rpcRequest.jsonrpc !== '2.0' || !rpcRequest.method) {
      return reply.code(400).send({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid Request: must be valid JSON-RPC 2.0',
        },
      });
    }

    const response = await handleMcpJsonRpcMessage(rpcRequest);
    if (!response) {
      // Notification
      return reply.code(204).send();
    }

    return response;
  });
}
