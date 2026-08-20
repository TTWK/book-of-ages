import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { handleMcpJsonRpcMessage } from '../mcp/server';
import { executeMcpTool } from '../mcp/tools';
import { run } from '../db';

describe('MCP Server & Tools', () => {
  beforeAll(async () => {
    await import('../db').then(({ initDatabase }) => initDatabase());
  });

  afterAll(async () => {
    await import('../db').then(({ closeDatabase }) => closeDatabase());
  });

  beforeEach(async () => {
    await run('DELETE FROM event_tags');
    await run('DELETE FROM materials');
    await run('DELETE FROM events');
    await run('DELETE FROM tags');
  });

  describe('JSON-RPC Protocol', () => {
    it('should handle initialize request', async () => {
      const response = await handleMcpJsonRpcMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
      });

      expect(response).not.toBeNull();
      expect(response!.id).toBe(1);
      expect((response!.result as { serverInfo: { name: string } }).serverInfo.name).toBe(
        'book-of-ages-mcp'
      );
    });

    it('should handle tools/list request', async () => {
      const response = await handleMcpJsonRpcMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });

      expect(response).not.toBeNull();
      const result = response!.result as { tools: Array<{ name: string }> };
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.tools.some((t) => t.name === 'create_event')).toBe(true);
      expect(result.tools.some((t) => t.name === 'archive_url')).toBe(true);
      expect(result.tools.some((t) => t.name === 'search_archives')).toBe(true);
    });
  });

  describe('executeMcpTool', () => {
    it('should create event and tag via MCP', async () => {
      const result = (await executeMcpTool('create_event', {
        title: 'MCP 史料入库测试',
        summary: '由 AI 智能体自动整理的事件摘要',
        content: '# 正文内容\n\n这是详细的事件记录。',
        event_date: '2026-05-15',
        tags: ['AI探索', 'OpenClaw'],
      })) as { success: boolean; event: { id: string; title: string } };

      expect(result.success).toBe(true);
      expect(result.event.title).toBe('MCP 史料入库测试');

      // 验证可以通过搜索找回
      const searchResult = (await executeMcpTool('search_archives', {
        query: 'MCP',
      })) as { matched_events: Array<{ title: string }> };

      expect(searchResult.matched_events.length).toBeGreaterThan(0);
      expect(searchResult.matched_events[0].title).toBe('MCP 史料入库测试');
    });
  });
});
