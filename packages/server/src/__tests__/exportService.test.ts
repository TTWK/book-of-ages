import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createEvent } from '../services/eventService';
import { createTimelineNode } from '../services/timelineService';
import { createMaterial } from '../services/materialService';
import { createTag, addTagToEvent } from '../services/tagService';
import { exportEventToMarkdown } from '../services/exportService';
import { run } from '../db';

describe('exportService', () => {
  beforeAll(async () => {
    await import('../db').then(({ initDatabase }) => initDatabase());
  });

  afterAll(async () => {
    await import('../db').then(({ closeDatabase }) => closeDatabase());
  });

  beforeEach(async () => {
    // 清理测试数据
    await run('DELETE FROM event_tags');
    await run('DELETE FROM materials');
    await run('DELETE FROM event_timeline_nodes');
    await run('DELETE FROM events');
    await run('DELETE FROM tags');
  });

  describe('exportEventToMarkdown', () => {
    it('should export a basic event to markdown', async () => {
      const event = await createEvent({
        title: '测试事件',
        summary: '测试摘要',
        content: '测试内容',
        status: 'confirmed',
        event_date: '2026-04-12',
        source_url: 'https://example.com',
      });

      const markdown = await exportEventToMarkdown(event.id);

      expect(markdown).toContain('# 测试事件');
      expect(markdown).toContain('## 基本信息');
      expect(markdown).toContain('测试摘要');
      expect(markdown).toContain('## 详细内容');
      expect(markdown).toContain('测试内容');
      expect(markdown).toContain('https://example.com');
      expect(markdown).toContain('2026-04-12');
    });

    it('should include timeline nodes in the export', async () => {
      const event = await createEvent({
        title: '有时间线的事件',
        summary: '摘要',
        content: '内容',
        status: 'confirmed',
      });

      await createTimelineNode(event.id, {
        title: '节点1',
        description: '节点1描述',
        event_date: '2026-04-10',
      });

      await createTimelineNode(event.id, {
        title: '节点2',
        description: '节点2描述',
        event_date: '2026-04-11',
      });

      const markdown = await exportEventToMarkdown(event.id);

      expect(markdown).toContain('## 时间线');
      expect(markdown).toContain('节点1');
      expect(markdown).toContain('节点1描述');
      expect(markdown).toContain('节点2');
      expect(markdown).toContain('节点2描述');
    });

    it('should include materials in the export', async () => {
      const event = await createEvent({
        title: '有材料的事件',
        summary: '摘要',
        content: '内容',
        status: 'confirmed',
      });

      await createMaterial({
        event_id: event.id,
        title: '材料1',
        content_text: '材料内容1',
        type: 'other',
        file_path: '/path/to/file1.txt',
      });

      await createMaterial({
        event_id: event.id,
        title: '材料2',
        content_text: '材料内容2',
        type: 'image',
        file_path: '/path/to/file2.png',
      });

      const markdown = await exportEventToMarkdown(event.id);

      expect(markdown).toContain('## 参考材料');
      expect(markdown).toContain('材料1');
      expect(markdown).toContain('材料内容1');
      expect(markdown).toContain('材料2');
    });

    it('should include tags in the export', async () => {
      const event = await createEvent({
        title: '有标签的事件',
        summary: '摘要',
        content: '内容',
        status: 'confirmed',
      });

      const tag1 = await createTag({ name: '标签1' });
      const tag2 = await createTag({ name: '标签2' });
      await addTagToEvent(event.id, tag1.id);
      await addTagToEvent(event.id, tag2.id);

      const markdown = await exportEventToMarkdown(event.id);

      expect(markdown).toContain('## 标签');
      expect(markdown).toContain('标签1');
      expect(markdown).toContain('标签2');
    });

    it('should include all sections when event has everything', async () => {
      const event = await createEvent({
        title: '完整事件',
        summary: '完整摘要',
        content: '完整内容',
        status: 'confirmed',
        event_date: '2026-04-12',
        source_url: 'https://example.com',
      });

      // 添加时间线
      await createTimelineNode(event.id, {
        title: '时间线节点',
        description: '描述',
        event_date: '2026-04-10',
      });

      // 添加材料
      await createMaterial({
        event_id: event.id,
        title: '材料',
        content_text: '材料内容',
        type: 'other',
        file_path: '/path/to/file.txt',
      });

      // 添加标签
      const tag = await createTag({ name: '测试标签' });
      await addTagToEvent(event.id, tag.id);

      const markdown = await exportEventToMarkdown(event.id);

      // 验证所有部分都存在
      expect(markdown).toContain('# 完整事件');
      expect(markdown).toContain('## 基本信息');
      expect(markdown).toContain('完整摘要');
      expect(markdown).toContain('## 详细内容');
      expect(markdown).toContain('## 时间线');
      expect(markdown).toContain('## 参考材料');
      expect(markdown).toContain('## 标签');
      expect(markdown).toContain('测试标签');
    });

    it('should throw error for non-existent event', async () => {
      await expect(exportEventToMarkdown('non-existent-id')).rejects.toThrow('事件不存在');
    });

    it('should handle event without optional fields', async () => {
      const event = await createEvent({
        title: '简单事件',
        status: 'draft',
      });

      const markdown = await exportEventToMarkdown(event.id);

      expect(markdown).toContain('# 简单事件');
      expect(markdown).toContain('## 基本信息');
      // 应该显示 N/A 或类似标记
      expect(markdown).toMatch(/创建时间|N\/A|不详/);
    });
  });
});
