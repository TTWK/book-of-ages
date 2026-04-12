import { getEventById } from './eventService';
import { getTimelineNodes } from './timelineService';
import { getMaterials } from './materialService';
import { getEventTags } from './tagService';

/**
 * 将事件及其关联数据导出为 Markdown 格式
 * @param eventId 事件 ID
 * @returns Markdown 格式的叙事文档
 */
export async function exportEventToMarkdown(eventId: string): Promise<string> {
  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('事件不存在');
  }

  const sections: string[] = [];

  // 标题
  sections.push(`# ${event.title}`);
  sections.push('');

  // 基本信息
  sections.push('## 基本信息');
  sections.push('');

  if (event.summary) {
    sections.push(`**摘要**: ${event.summary}`);
    sections.push('');
  }

  if (event.event_date) {
    sections.push(`**日期**: ${event.event_date}`);
    sections.push('');
  }

  if (event.source_url) {
    sections.push(`**来源**: ${event.source_url}`);
    sections.push('');
  }

  sections.push(`**状态**: ${event.status}`);
  sections.push('');
  sections.push(`**创建时间**: ${event.created_at}`);
  sections.push('');
  sections.push(`**更新时间**: ${event.updated_at}`);
  sections.push('');

  // 详细内容
  if (event.content) {
    sections.push('## 详细内容');
    sections.push('');
    sections.push(event.content);
    sections.push('');
  }

  // 时间线节点
  const timelineNodes = await getTimelineNodes(eventId);
  if (timelineNodes.length > 0) {
    sections.push('## 时间线');
    sections.push('');

    for (const node of timelineNodes) {
      sections.push(`### ${node.title}`);
      sections.push('');

      if (node.node_date) {
        sections.push(`**日期**: ${node.node_date}`);
        sections.push('');
      }

      if (node.description) {
        sections.push(node.description);
        sections.push('');
      }
    }
  }

  // 参考材料
  const materials = await getMaterials(eventId);
  if (materials.length > 0) {
    sections.push('## 参考材料');
    sections.push('');

    for (const material of materials) {
      sections.push(`### ${material.title || '未命名材料'}`);
      sections.push('');

      if (material.type) {
        sections.push(`**类型**: ${material.type}`);
        sections.push('');
      }

      if (material.content_text) {
        sections.push(material.content_text);
        sections.push('');
      }

      if (material.source_url) {
        sections.push(`**来源**: ${material.source_url}`);
        sections.push('');
      }
    }
  }

  // 标签
  const tags = await getEventTags(eventId);
  if (tags.length > 0) {
    sections.push('## 标签');
    sections.push('');
    sections.push(tags.map((tag) => `\`${tag.name}\``).join(' '));
    sections.push('');
  }

  return sections.join('\n');
}
