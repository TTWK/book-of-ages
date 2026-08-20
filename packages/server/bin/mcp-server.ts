#!/usr/bin/env node
/**
 * 岁月史书 MCP Stdio 服务端入口
 * 用于对接 Claude Desktop, Cursor, OpenClaw, Hermes 等基于 Stdio 的 Agent
 */

import readline from 'readline';
import { initDatabase } from '../src/db';
import { handleMcpJsonRpcMessage, JsonRpcRequest } from '../src/mcp/server';

async function startStdioMcp() {
  await initDatabase();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const message = JSON.parse(trimmed) as JsonRpcRequest;
      const response = await handleMcpJsonRpcMessage(message);
      if (response) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (_error) {
      const errResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      };
      process.stdout.write(JSON.stringify(errResponse) + '\n');
    }
  });
}

startStdioMcp().catch((err) => {
  console.error('Fatal MCP Server Error:', err);
  process.exit(1);
});
