/**
 * 岁月史书 MCP (Model Context Protocol) 工具集定义与执行器
 */

import { createEvent, getEventById, listEvents } from '../services/eventService';
import { createTimelineNode } from '../services/timelineService';
import { createMaterial } from '../services/materialService';
import { captureSnapshot } from '../services/snapshotService';
import { simpleSearch } from '../services/searchService';
import { createTag, getTagByName, addTagToEvent } from '../services/tagService';
import type { EventStatus } from '@book-of-ages/shared';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'archive_url',
    description: '深度抓取指定网页，生成防篡改自包含快照，提炼 Markdown 正文并推入岁月史书档案馆',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '待归档抓取的网页 URL' },
        title: { type: 'string', description: '自定义事件标题（可选，默认从网页提取）' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '关联的标签名称列表（如 ["科技", "OpenAI"]）',
        },
        auto_confirm: {
          type: 'boolean',
          description: '是否直接正式收录（true 为 confirmed，false 为 draft 草稿）',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'create_event',
    description: '直接向岁月史书创建一条历史事件记录',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '历史事件标题' },
        summary: { type: 'string', description: '事件简明摘要' },
        content: { type: 'string', description: '事件详细正文（支持 Markdown 格式）' },
        event_date: { type: 'string', description: '事件发生日期（YYYY-MM-DD 格式）' },
        source_url: { type: 'string', description: '第一手来源链接或出处' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
        status: {
          type: 'string',
          enum: ['draft', 'confirmed', 'archived'],
          description: '收录状态（默认 confirmed）',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'append_timeline_node',
    description: '为已有历史事件追加一个时间线里程碑节点',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: '目标事件的 ID' },
        title: { type: 'string', description: '时间线节点标题' },
        description: { type: 'string', description: '节点详细描述或证据' },
        node_date: { type: 'string', description: '节点发生日期或时间' },
        sort_order: { type: 'number', description: '排序权重（默认自动递增）' },
      },
      required: ['event_id', 'title'],
    },
  },
  {
    name: 'search_archives',
    description: '通过 SQLite FTS5 全文引擎检索历史卷宗、正文与佐证素材',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词或词组' },
        start_date: { type: 'string', description: '起始日期过滤（YYYY-MM-DD）' },
        end_date: { type: 'string', description: '截止日期过滤（YYYY-MM-DD）' },
        limit: { type: 'number', description: '返回结果数量上限（默认 20）' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_event_detail',
    description: '获取指定事件的完整卷宗（含多媒体材料与时间线节点）',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: '事件 ID' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'list_recent_events',
    description: '列出最近收录或待审核的历史事件列表',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'confirmed', 'archived'],
          description: '状态过滤（默认 confirmed）',
        },
        limit: { type: 'number', description: '条数限制（默认 20）' },
      },
    },
  },
];

/**
 * 辅助函数：根据标签名获取或创建标签
 */
async function resolveTagIds(tagNames?: string[]): Promise<string[]> {
  if (!tagNames || tagNames.length === 0) return [];
  const tagIds: string[] = [];

  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    let tag = await getTagByName(trimmed);
    if (!tag) {
      tag = await createTag({ name: trimmed, color: '#0d9488' });
    }
    tagIds.push(tag.id);
  }

  return tagIds;
}

/**
 * 执行 MCP 工具调用
 */
export async function executeMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'archive_url': {
      const url = String(args.url);
      const customTitle = args.title ? String(args.title) : undefined;
      const tags = Array.isArray(args.tags) ? (args.tags as string[]) : [];
      const autoConfirm = Boolean(args.auto_confirm);

      const snapshot = await captureSnapshot(url, { title: customTitle });
      const event = await createEvent({
        title: snapshot.title,
        summary: snapshot.excerpt,
        content: snapshot.markdownContent,
        source_url: url,
        status: autoConfirm ? 'confirmed' : 'draft',
      });

      // 绑定证据快照素材
      await createMaterial({
        event_id: event.id,
        type: 'snapshot',
        title: `快照原件 - ${snapshot.title}`,
        file_path: snapshot.htmlSnapshotPath,
        snapshot_html_path: snapshot.htmlSnapshotPath,
        file_hash: snapshot.savedAssets[0]?.hash,
        file_size: snapshot.savedAssets[0]?.size,
        source_url: url,
        content_text: snapshot.markdownContent,
      });

      // 绑定标签
      if (tags.length > 0) {
        const tagIds = await resolveTagIds(tags);
        for (const tagId of tagIds) {
          await addTagToEvent(event.id, tagId);
        }
      }

      return {
        success: true,
        message: `成功归档并${autoConfirm ? '收录' : '推入草稿箱'}`,
        event: {
          id: event.id,
          title: event.title,
          status: event.status,
          snapshot_path: snapshot.htmlSnapshotPath,
        },
      };
    }

    case 'create_event': {
      const title = String(args.title);
      const summary = args.summary ? String(args.summary) : undefined;
      const content = args.content ? String(args.content) : undefined;
      const event_date = args.event_date ? String(args.event_date) : undefined;
      const source_url = args.source_url ? String(args.source_url) : undefined;
      const status = (args.status as EventStatus) || 'confirmed';
      const tags = Array.isArray(args.tags) ? (args.tags as string[]) : [];

      const event = await createEvent({
        title,
        summary,
        content,
        event_date,
        source_url,
        status,
      });

      if (tags.length > 0) {
        const tagIds = await resolveTagIds(tags);
        for (const tagId of tagIds) {
          await addTagToEvent(event.id, tagId);
        }
      }

      return {
        success: true,
        message: '已成功载入史册',
        event,
      };
    }

    case 'append_timeline_node': {
      const event_id = String(args.event_id);
      const title = String(args.title);
      const description = args.description ? String(args.description) : undefined;
      const node_date = args.node_date ? String(args.node_date) : undefined;
      const sort_order = typeof args.sort_order === 'number' ? args.sort_order : undefined;

      const node = await createTimelineNode(event_id, {
        title,
        description,
        node_date,
        sort_order,
      });

      return {
        success: true,
        message: '时间线节点追加成功',
        node,
      };
    }

    case 'search_archives': {
      const query = String(args.query);
      const startDate = args.start_date ? String(args.start_date) : undefined;
      const endDate = args.end_date ? String(args.end_date) : undefined;
      const limit = typeof args.limit === 'number' ? args.limit : 20;

      const results = await simpleSearch(query, {
        startDate,
        endDate,
        limit,
      });

      return {
        query,
        matched_events: results.events.map((e) => ({
          id: e.id,
          title: e.title,
          summary: e.summary,
          event_date: e.event_date,
          tags: e.tags?.map((t) => t.name),
        })),
        matched_materials: results.materials.map((m) => ({
          id: m.id,
          event_id: m.event_id,
          title: m.title,
          type: m.type,
        })),
        matched_timeline_nodes: results.timelineNodes.map((t) => ({
          id: t.id,
          event_id: t.event_id,
          title: t.title,
          description: t.description,
        })),
      };
    }

    case 'get_event_detail': {
      const event_id = String(args.event_id);
      const event = await getEventById(event_id);
      if (!event) {
        throw new Error(`未找到 ID 为 ${event_id} 的历史事件`);
      }
      return event;
    }

    case 'list_recent_events': {
      const status = (args.status as EventStatus) || 'confirmed';
      const limit = typeof args.limit === 'number' ? args.limit : 20;

      const result = await listEvents({
        status,
        page: 1,
        pageSize: limit,
      });

      return {
        total: result.total,
        events: result.events.map((e) => ({
          id: e.id,
          title: e.title,
          summary: e.summary,
          event_date: e.event_date,
          status: e.status,
          tags: e.tags?.map((t) => t.name),
        })),
      };
    }

    default:
      throw new Error(`未知 MCP 工具: ${toolName}`);
  }
}
