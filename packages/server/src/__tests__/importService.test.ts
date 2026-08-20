import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  extractUrlsFromContent,
  createImportTask,
  getImportTasks,
  getImportTaskDetail,
} from '../services/importService';
import { run } from '../db';

describe('importService', () => {
  beforeAll(async () => {
    await import('../db').then(({ initDatabase }) => initDatabase());
  });

  afterAll(async () => {
    await import('../db').then(({ closeDatabase }) => closeDatabase());
  });

  beforeEach(async () => {
    await run('DELETE FROM import_task_items');
    await run('DELETE FROM import_tasks');
    await run('DELETE FROM materials');
    await run('DELETE FROM events');
  });

  describe('extractUrlsFromContent', () => {
    it('should parse Netscape HTML bookmarks correctly', () => {
      const bookmarkHtml = `
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
        <TITLE>Bookmarks</TITLE>
        <H1>Bookmarks</H1>
        <DL><p>
            <DT><A HREF="https://openai.com/blog/planning-for-agi" ADD_DATE="1677284900">Planning for AGI and beyond</A>
            <DT><A HREF="https://news.ycombinator.com/item?id=38302000">Sam Altman fired from OpenAI</A>
        </DL><p>
      `;

      const result = extractUrlsFromContent('bookmarks', bookmarkHtml);
      expect(result.length).toBe(2);
      expect(result[0].url).toBe('https://openai.com/blog/planning-for-agi');
      expect(result[0].title).toBe('Planning for AGI and beyond');
      expect(result[1].url).toBe('https://news.ycombinator.com/item?id=38302000');
      expect(result[1].title).toBe('Sam Altman fired from OpenAI');
    });

    it('should parse raw URL list correctly', () => {
      const urlText = `
        https://example.com/first-article
        # 注释行应该被跳过
        https://example.com/second-article
        https://example.com/first-article
      `;

      const result = extractUrlsFromContent('urls', urlText);
      expect(result.length).toBe(2); // 去重后为2条
      expect(result[0].url).toBe('https://example.com/first-article');
      expect(result[1].url).toBe('https://example.com/second-article');
    });
  });

  describe('createImportTask & getImportTaskDetail', () => {
    it('should create an import task with items', async () => {
      const content = 'https://example.com/test-url-1\nhttps://example.com/test-url-2';
      const task = await createImportTask('urls', content);

      expect(task.id).toBeDefined();
      expect(task.total_count).toBe(2);
      expect(task.type).toBe('urls');

      const tasks = await getImportTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(task.id);

      const detail = await getImportTaskDetail(task.id);
      expect(detail).not.toBeNull();
      expect(detail!.task.id).toBe(task.id);
      expect(detail!.items.length).toBe(2);
      expect(detail!.items[0].source_url).toBe('https://example.com/test-url-1');
    });
  });
});
