import { exportEventToMarkdown } from './exportService';
import { getEventById } from './eventService';

export interface ExportedEvent {
  id: string;
  title: string;
  content: string;
}

/**
 * 批量导出事件为 Markdown
 * @param eventIds 事件 ID 列表
 * @returns 导出的事件数组
 */
export async function exportEventsToMarkdown(eventIds: string[]): Promise<ExportedEvent[]> {
  const results: ExportedEvent[] = [];

  for (const id of eventIds) {
    try {
      const event = await getEventById(id);
      if (!event) {
        continue;
      }

      const content = await exportEventToMarkdown(id);
      results.push({
        id,
        title: event.title,
        content,
      });
    } catch (error) {
      // 跳过导出失败的事件
      console.warn(`Failed to export event ${id}:`, error);
    }
  }

  return results;
}
