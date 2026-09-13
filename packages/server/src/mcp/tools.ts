/**
 * 岁月史书 MCP (Model Context Protocol) 工具集定义与执行器
 */

import { createEvent, getEventById, listEvents } from '../services/eventService';
import { createTimelineNode } from '../services/timelineService';
import { createMaterial } from '../services/materialService';
import { captureSnapshot } from '../services/snapshotService';
import { simpleSearch, executeStructuredQuery } from '../services/searchService';
import { createTag, getTagByName, addTagToEvent } from '../services/tagService';
import { proposeSuggestion } from '../services/suggestionService';
import type { EventStatus, AISuggestionType, AISuggestionPayload } from '@book-of-ages/shared';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolContext {
  /**
   * 是否允许直接收录（confirmed）。
   * MCP 通道（stdio / JSON-RPC）面向 AI，按 write scope 语义恒落草稿；
   * 仅 HTTP admin 钥匙（人工通道，如剪藏端）传入 true 后 auto_confirm 才生效。
   */
  allowConfirm?: boolean;
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'archive_url',
    description:
      '深度抓取指定网页，生成防篡改自包含快照，提炼 Markdown 正文并推入岁月史书档案馆。结果统一进入草稿箱（draft），由人工审核收录',
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
        raw_html: {
          type: 'string',
          description: '可选：剪藏端本地 DOM 快照 HTML，传入后不再远程抓取',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'create_event',
    description:
      '直接向岁月史书创建一条历史事件记录。AI 创建的事件统一进入草稿箱（draft），confirmed 收录状态由人工在 Web 端确认',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '历史事件标题' },
        summary: { type: 'string', description: '事件简明摘要' },
        content: { type: 'string', description: '事件详细正文（支持 Markdown 格式）' },
        event_date: { type: 'string', description: '事件发生日期（YYYY-MM-DD 格式）' },
        source_url: { type: 'string', description: '第一手来源链接或出处' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
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
    description:
      '通过 SQLite FTS5 全文引擎检索历史卷宗、正文与佐证素材，支持标签/状态/日期的结构化过滤',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词或词组' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '可选：标签名过滤（任一匹配，仅作用于事件结果）',
        },
        status: {
          type: 'string',
          enum: ['draft', 'confirmed', 'archived'],
          description: '可选：事件状态过滤',
        },
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
  {
    name: 'propose_suggestion',
    description:
      '向岁月史书提交一条改进建议（打标签/改摘要/推断日期/疑似重复）。建议不会直接生效，将进入收件箱由人工审核',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['tag', 'summary', 'date', 'merge'],
          description:
            '建议类型：tag=补充标签；summary=润色摘要；date=推断事件日期；merge=疑似重复',
        },
        target_id: { type: 'string', description: '目标事件 ID' },
        payload: {
          type: 'object',
          description:
            '建议内容：tag 传 {tag_names: string[]}；summary 传 {summary: string}；date 传 {event_date: "YYYY-MM-DD"}；merge 传 {merge_into_event_id}',
        },
        rationale: { type: 'string', description: '给出该建议的理由，便于人工判断' },
      },
      required: ['type', 'target_id', 'payload'],
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
  args: Record<string, unknown>,
  ctx?: McpToolContext
): Promise<unknown> {
  switch (toolName) {
    case 'archive_url': {
      const url = String(args.url);
      const customTitle = args.title ? String(args.title) : undefined;
      const tags = Array.isArray(args.tags) ? (args.tags as string[]) : [];
      // write 语义恒落草稿；仅人工通道（admin 钥匙）的 auto_confirm 可直接收录
      const autoConfirm = Boolean(args.auto_confirm) && ctx?.allowConfirm === true;
      // 剪藏端本地 DOM 快照：保存登录态下用户所见页面（服务端直接抓取是无 cookie 版本）
      const rawHtml = args.raw_html ? String(args.raw_html) : undefined;

      const snapshot = await captureSnapshot(url, { title: customTitle, rawHtml });
      const event = await createEvent(
        {
          title: snapshot.title,
          summary: snapshot.excerpt,
          content: snapshot.markdownContent,
          source_url: url,
          status: autoConfirm ? 'confirmed' : 'draft',
        },
        { createdBy: 'mcp' }
      );

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
      // AI 创建一律落草稿（设计决策 D1）：confirmed 由人工在 Web 端设置
      const status: EventStatus = 'draft';
      const tags = Array.isArray(args.tags) ? (args.tags as string[]) : [];

      const event = await createEvent(
        {
          title,
          summary,
          content,
          event_date,
          source_url,
          status,
        },
        { createdBy: 'mcp' }
      );

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
      const tags = Array.isArray(args.tags) ? (args.tags as string[]) : undefined;
      const status = args.status ? (String(args.status) as EventStatus) : undefined;
      const limit = typeof args.limit === 'number' ? args.limit : 20;

      // 有结构化过滤条件时走确定性结构化执行器，否则保持原有全文检索路径
      const results =
        (tags && tags.length > 0) || status
          ? await executeStructuredQuery({
              text: query,
              tags,
              status,
              date_from: startDate,
              date_to: endDate,
              limit,
            })
          : await simpleSearch(query, {
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

    case 'propose_suggestion': {
      const type = String(args.type) as AISuggestionType;
      const target_id = String(args.target_id);
      const payload = (args.payload ?? {}) as AISuggestionPayload;
      const rationale = args.rationale ? String(args.rationale) : undefined;

      try {
        const suggestion = await proposeSuggestion({ type, target_id, payload, rationale });
        return {
          success: true,
          message: '建议已提交，等待人工审核（不会直接生效）',
          suggestion: {
            id: suggestion.id,
            type: suggestion.type,
            target_id: suggestion.target_id,
            status: suggestion.status,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : '提议失败';
        if (message.startsWith('NOT_FOUND')) {
          throw new Error(`目标事件不存在：${target_id}`);
        }
        if (message.startsWith('VALIDATION_ERROR')) {
          throw new Error(message.replace('VALIDATION_ERROR: ', ''));
        }
        throw error;
      }
    }

    default:
      throw new Error(`未知 MCP 工具: ${toolName}`);
  }
}
