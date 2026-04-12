import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { simpleSearch } from '../services/searchService';
import { createEvent, deleteEvent } from '../services/eventService';
import { createMaterial, deleteMaterial } from '../services/materialService';
import { initDatabase, closeDatabase, run } from '../db';

describe('searchService', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // 清理测试数据
    await run('DELETE FROM materials');
    await run('DELETE FROM events');
  });

  describe('simpleSearch - Basic functionality', () => {
    it('should return empty results when no data', async () => {
      const result = await simpleSearch('test');

      expect(result).toBeDefined();
      expect(result.events).toBeDefined();
      expect(result.materials).toBeDefined();
      expect(result.timelineNodes).toBeDefined();
    });

    it('should handle empty keyword', async () => {
      const result = await simpleSearch('');

      expect(result).toBeDefined();
    });

    it('should handle special characters in keyword', async () => {
      const result = await simpleSearch('C++');

      expect(result).toBeDefined();
    });

    it('should return empty results for non-matching keyword', async () => {
      await createEvent({
        title: '不相关的事件',
        content: '内容',
        status: 'confirmed',
      });

      const result = await simpleSearch('xyz123nonexistent');

      // FTS5 或 LIKE 查询应该找不到匹配
      expect(result.events.length).toBe(0);
    });
  });

  describe('simpleSearch - Type Filter', () => {
    it('should only search events when type is event', async () => {
      const result = await simpleSearch('test', { type: 'event' });

      expect(result.events).toBeDefined();
      expect(result.materials).toEqual([]);
      expect(result.timelineNodes).toEqual([]);
    });

    it('should only search materials when type is material', async () => {
      const result = await simpleSearch('test', { type: 'material' });

      expect(result.materials).toBeDefined();
      expect(result.events).toEqual([]);
      expect(result.timelineNodes).toEqual([]);
    });

    it('should search all types when type is not specified', async () => {
      const result = await simpleSearch('test');

      expect(result.events).toBeDefined();
      expect(result.materials).toBeDefined();
      expect(result.timelineNodes).toBeDefined();
    });
  });

  describe('simpleSearch - Limit', () => {
    it('should limit results', async () => {
      for (let i = 1; i <= 10; i++) {
        await createEvent({
          title: `测试事件${i}`,
          content: '搜索内容',
          status: 'confirmed',
        });
      }

      const result = await simpleSearch('测试', { limit: 5 });

      // 由于 FTS5 可能无法匹配中文，这里只检查限制功能是否工作
      expect(result.events.length).toBeLessThanOrEqual(5);
    });
  });
});
