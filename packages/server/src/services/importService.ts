/**
 * 批量导入服务
 * 支持解析标准浏览器书签 HTML、URL 列表与 Markdown 归档包
 * 并在后台以低功耗低负载队列异步抓取快照并存入草稿箱 (Inbox)
 */

import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../db';
import { createEvent } from './eventService';
import { createMaterial } from './materialService';
import { captureSnapshot } from './snapshotService';
import type { ImportType, ImportTask, ImportTaskItem } from '@book-of-ages/shared';

/**
 * 从不同格式文本中提取 URL 列表
 */
export function extractUrlsFromContent(
  type: ImportType,
  content: string
): { url: string; title?: string }[] {
  const items: { url: string; title?: string }[] = [];

  if (type === 'bookmarks') {
    // 解析标准 Netscape Bookmark HTML
    const regex = /<A\s+(?:[^>]*?\s+)?HREF=["']([^"']+)["'][^>]*>(.*?)<\/A>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const url = match[1]?.trim();
      const rawTitle = match[2]?.replace(/<[^>]+>/g, '').trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        items.push({
          url,
          title: rawTitle || undefined,
        });
      }
    }
  } else {
    // 纯文本按行切分或 JSON
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        items.push({
          url: urlMatch[0],
          title: undefined,
        });
      }
    }
  }

  // 针对相同 URL 进行去重
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

/**
 * 创建批量导入任务
 */
export async function createImportTask(type: ImportType, content: string): Promise<ImportTask> {
  const extracted = extractUrlsFromContent(type, content);
  const taskId = uuidv4();
  const now = new Date().toISOString();

  const totalCount = extracted.length;

  await run(
    `
    INSERT INTO import_tasks (id, type, total_count, processed_count, success_count, failed_count, status, created_at, updated_at)
    VALUES (?, ?, ?, 0, 0, 0, ?, ?, ?)
  `,
    [taskId, type, totalCount, totalCount === 0 ? 'completed' : 'pending', now, now]
  );

  // 批量插入明细项
  for (const item of extracted) {
    const itemId = uuidv4();
    await run(
      `
      INSERT INTO import_task_items (id, task_id, source_url, title, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `,
      [itemId, taskId, item.url, item.title || null, now]
    );
  }

  const createdTask = (await get<ImportTask>('SELECT * FROM import_tasks WHERE id = ?', [taskId]))!;

  // 触发后台异步处理
  if (totalCount > 0) {
    // 异步执行不阻塞请求
    setTimeout(() => {
      processImportTask(taskId).catch((err) => {
        console.error(`Import task ${taskId} failed:`, err);
      });
    }, 50);
  }

  return createdTask;
}

/**
 * 获取导入任务列表
 */
export async function getImportTasks(limit: number = 50): Promise<ImportTask[]> {
  return all<ImportTask>(
    `
    SELECT * FROM import_tasks
    ORDER BY created_at DESC
    LIMIT ?
  `,
    [limit]
  );
}

/**
 * 获取导入任务详情及明细
 */
export async function getImportTaskDetail(
  taskId: string
): Promise<{ task: ImportTask; items: ImportTaskItem[] } | null> {
  const task = await get<ImportTask>('SELECT * FROM import_tasks WHERE id = ?', [taskId]);

  if (!task) return null;

  const items = await all<ImportTaskItem>(
    `
    SELECT * FROM import_task_items
    WHERE task_id = ?
    ORDER BY created_at ASC
  `,
    [taskId]
  );

  return { task, items };
}

/**
 * 后台低负载处理导入任务
 */
export async function processImportTask(taskId: string): Promise<void> {
  await run('UPDATE import_tasks SET status = ?, updated_at = ? WHERE id = ?', [
    'processing',
    new Date().toISOString(),
    taskId,
  ]);

  const items = await all<ImportTaskItem>(
    'SELECT * FROM import_task_items WHERE task_id = ? AND status = ?',
    [taskId, 'pending']
  );

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await run('UPDATE import_task_items SET status = ? WHERE id = ?', ['processing', item.id]);

    try {
      // 1. 抓取快照并提炼正文
      const snapshot = await captureSnapshot(item.source_url, {
        title: item.title,
      });

      // 2. 创建草稿事件 (Inbox)
      const event = await createEvent({
        title: snapshot.title || item.title || item.source_url,
        summary: snapshot.excerpt || undefined,
        content: snapshot.markdownContent,
        source_url: item.source_url,
        status: 'draft',
      });

      // 3. 关联证据快照素材
      await createMaterial({
        event_id: event.id,
        type: 'snapshot',
        title: `快照原件 - ${snapshot.title}`,
        file_path: snapshot.htmlSnapshotPath,
        snapshot_html_path: snapshot.htmlSnapshotPath,
        file_hash: snapshot.savedAssets[0]?.hash,
        file_size: snapshot.savedAssets[0]?.size,
        source_url: item.source_url,
        content_text: snapshot.markdownContent,
      });

      await run('UPDATE import_task_items SET status = ?, event_id = ? WHERE id = ?', [
        'success',
        event.id,
        item.id,
      ]);
      successCount++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '抓取或创建失败';
      await run('UPDATE import_task_items SET status = ?, error_message = ? WHERE id = ?', [
        'failed',
        errMsg,
        item.id,
      ]);
      failedCount++;
    }

    // 更新任务主进度
    await run(
      `
      UPDATE import_tasks
      SET processed_count = ?, success_count = ?, failed_count = ?, updated_at = ?
      WHERE id = ?
    `,
      [i + 1, successCount, failedCount, new Date().toISOString(), taskId]
    );

    // 适度休眠 200ms，保持极低功耗与低并发负载
    await new Promise((r) => setTimeout(r, 200));
  }

  const finalStatus = failedCount === items.length && items.length > 0 ? 'failed' : 'completed';
  await run('UPDATE import_tasks SET status = ?, updated_at = ? WHERE id = ?', [
    finalStatus,
    new Date().toISOString(),
    taskId,
  ]);
}
