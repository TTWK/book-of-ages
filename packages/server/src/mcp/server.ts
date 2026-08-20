/**
 * 岁月史书 MCP (Model Context Protocol) 核心协议处理器
 * 遵循 JSON-RPC 2.0 标准
 */

import { MCP_TOOLS, executeMcpTool } from './tools';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export async function handleMcpJsonRpcMessage(
  request: JsonRpcRequest
): Promise<JsonRpcResponse | null> {
  const id = request.id ?? null;

  try {
    switch (request.method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'book-of-ages-mcp',
              version: '1.0.0',
            },
            capabilities: {
              tools: {},
            },
          },
        };
      }

      case 'notifications/initialized': {
        // 通知类消息，无需响应
        return null;
      }

      case 'ping': {
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS,
          },
        };
      }

      case 'tools/call': {
        const { name, arguments: toolArgs } = (request.params || {}) as {
          name?: string;
          arguments?: Record<string, unknown>;
        };

        if (!name) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: 'Invalid params: tool name is required',
            },
          };
        }

        const toolResult = await executeMcpTool(name, toolArgs || {});
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text:
                  typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2),
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: errorMsg,
      },
    };
  }
}
