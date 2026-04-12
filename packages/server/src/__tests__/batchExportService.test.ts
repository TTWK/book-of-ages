import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createEvent } from '../services/eventService';
import { exportEventsToMarkdown } from '../services/batchExportService';
import { run } from '../db';

describe('batchExportService', () => {
  beforeAll(async () => {
    await import('../db').then(({ initDatabase }) => initDatabase());
  });

  afterAll(async () => {
    await import('../db').then(({ closeDatabase }) => closeDatabase());
  });

  beforeEach(async () => {
    await run('DELETE FROM event_tags');
    await run('DELETE FROM events');
  });

  describe('exportEventsToMarkdown', () => {
    it('should export multiple events', async () => {
      const event1 = await createEvent({
        title: '事件1',
        summary: '摘要1',
        content: '内容1',
        status: 'confirmed',
      });
      const event2 = await createEvent({
        title: '事件2',
        summary: '摘要2',
        content: '内容2',
        status: 'confirmed',
      });

      const result = await exportEventsToMarkdown([event1.id, event2.id]);

      expect(result.length).toBe(2);
      expect(result[0].title).toBe('事件1');
      expect(result[0].content).toContain('# 事件1');
      expect(result[1].title).toBe('事件2');
      expect(result[1].content).toContain('# 事件2');
    });

    it('should return empty array for empty input', async () => {
      const result = await exportEventsToMarkdown([]);
      expect(result).toEqual([]);
    });

    it('should skip non-existent events', async () => {
      const event = await createEvent({
        title: '有效事件',
        status: 'confirmed',
      });

      const result = await exportEventsToMarkdown([event.id, 'non-existent-id']);

      expect(result.length).toBe(1);
      expect(result[0].title).toBe('有效事件');
    });
  });
});
