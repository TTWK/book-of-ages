/**
 * AI 建议收件箱服务
 *
 * 设计原则（2026-09-13）：AI 只提议、不落库生效。
 * - propose：write 钥匙（Agent）可无限提出建议，同 target 同 type 的 pending 建议去重覆盖
 * - accept：admin 钥匙（人工）触发，服务端以确定性代码执行建议内容并留审计
 * - dismiss：admin 钥匙仅做标记
 */

import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import { getTagByName, createTag, addTagToEvent } from './tagService';
import { updateEvent } from './eventService';
import type {
  AISuggestion,
  AISuggestionStatus,
  AISuggestionType,
  AISuggestionPayload,
  ProposeSuggestionInput,
} from '@book-of-ages/shared';

const SUGGESTION_TYPES: AISuggestionType[] = ['tag', 'summary', 'date', 'merge'];

/** merge 建议 accept 时为两条事件互挂的系统标签（人工在 UI 上完成最终合并后可移除） */
const MERGE_MARKER_TAG = '疑似重复';

interface AISuggestionRow extends Omit<AISuggestion, 'payload'> {
  payload: string;
}

function toSuggestion(row: AISuggestionRow): AISuggestion {
  let payload: AISuggestionPayload = {};
  try {
    payload = JSON.parse(row.payload) as AISuggestionPayload;
  } catch {
    payload = {};
  }
  return { ...row, payload };
}

/**
 * 提出建议：同 target 同 type 的 pending 建议自动去重（覆盖 payload 与 rationale）
 */
export async function proposeSuggestion(
  input: ProposeSuggestionInput,
  opts?: { createdByKey?: string }
): Promise<AISuggestion> {
  if (!SUGGESTION_TYPES.includes(input.type)) {
    throw new Error(`VALIDATION_ERROR: 未知建议类型 ${input.type}`);
  }
  if (!input.target_id) {
    throw new Error('VALIDATION_ERROR: 缺少目标事件');
  }

  const target = await get(`SELECT id FROM events WHERE id = ? AND deleted_at IS NULL`, [
    input.target_id,
  ]);
  if (!target) {
    throw new Error(`NOT_FOUND: 目标事件 ${input.target_id} 不存在`);
  }

  const payloadJson = JSON.stringify(input.payload ?? {});

  const existing = await get<AISuggestionRow>(
    `
    SELECT * FROM ai_suggestions
    WHERE target_id = ? AND type = ? AND status = 'pending'
  `,
    [input.target_id, input.type]
  );

  const now = new Date().toISOString();

  if (existing) {
    await run(
      `
      UPDATE ai_suggestions
      SET payload = ?, rationale = ?, model = ?, created_by_key = ?, created_at = ?
      WHERE id = ?
    `,
      [
        payloadJson,
        input.rationale ?? null,
        input.model ?? null,
        opts?.createdByKey ?? null,
        now,
        existing.id,
      ]
    );
    const updated = await get<AISuggestionRow>(`SELECT * FROM ai_suggestions WHERE id = ?`, [
      existing.id,
    ]);
    return toSuggestion(updated!);
  }

  const id = uuidv4();
  await run(
    `
    INSERT INTO ai_suggestions (id, type, target_id, payload, rationale, model, status, created_by_key, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `,
    [
      id,
      input.type,
      input.target_id,
      payloadJson,
      input.rationale ?? null,
      input.model ?? null,
      opts?.createdByKey ?? null,
      now,
    ]
  );

  const created = await get<AISuggestionRow>(`SELECT * FROM ai_suggestions WHERE id = ?`, [id]);
  return toSuggestion(created!);
}

/**
 * 建议列表（可按状态过滤）
 */
export async function listSuggestions(status?: AISuggestionStatus): Promise<AISuggestion[]> {
  const rows = status
    ? await all<AISuggestionRow>(
        `SELECT * FROM ai_suggestions WHERE status = ? ORDER BY created_at DESC LIMIT 200`,
        [status]
      )
    : await all<AISuggestionRow>(`SELECT * FROM ai_suggestions ORDER BY created_at DESC LIMIT 200`);
  return rows.map(toSuggestion);
}

async function getSuggestion(id: string): Promise<AISuggestion | null> {
  const row = await get<AISuggestionRow>(`SELECT * FROM ai_suggestions WHERE id = ?`, [id]);
  return row ? toSuggestion(row) : null;
}

async function applyTagSuggestion(targetId: string, payload: AISuggestionPayload): Promise<void> {
  const names = (payload.tag_names ?? []).map((n) => String(n).trim()).filter(Boolean);
  if (names.length === 0) {
    throw new Error('INVALID_PAYLOAD: tag 建议缺少 tag_names');
  }
  for (const name of names) {
    let tag = await getTagByName(name);
    if (!tag) {
      tag = await createTag({ name, color: '#0d9488' });
    }
    await addTagToEvent(targetId, tag.id);
  }
}

async function applyMergeSuggestion(targetId: string, payload: AISuggestionPayload): Promise<void> {
  const mergeInto = payload.merge_into_event_id;
  if (!mergeInto) {
    throw new Error('INVALID_PAYLOAD: merge 建议缺少 merge_into_event_id');
  }
  const other = await get(`SELECT id FROM events WHERE id = ? AND deleted_at IS NULL`, [mergeInto]);
  if (!other) {
    throw new Error(`NOT_FOUND: 合并目标事件 ${mergeInto} 不存在`);
  }

  // 一期不自动合并：为两条事件互挂"疑似重复"系统标记，人工在 UI 上完成合并后可移除
  let marker = await getTagByName(MERGE_MARKER_TAG);
  if (!marker) {
    marker = await createTag({ name: MERGE_MARKER_TAG, color: '#f43f5e' });
  }
  await addTagToEvent(targetId, marker.id);
  await addTagToEvent(mergeInto, marker.id);
}

/**
 * 采纳建议（admin 钥匙触发；执行内容记入操作日志由路由层完成）
 */
export async function acceptSuggestion(
  id: string,
  opts?: { decidedByKey?: string }
): Promise<AISuggestion | null> {
  const suggestion = await getSuggestion(id);
  if (!suggestion) {
    return null;
  }
  if (suggestion.status !== 'pending') {
    throw new Error('INVALID_STATE: 该建议已处理');
  }

  switch (suggestion.type) {
    case 'tag':
      await applyTagSuggestion(suggestion.target_id, suggestion.payload);
      break;
    case 'summary': {
      const summary = suggestion.payload.summary;
      if (typeof summary !== 'string' || summary === '') {
        throw new Error('INVALID_PAYLOAD: summary 建议缺少摘要文本');
      }
      // 人工已批准：以 admin 身份执行（可修改 confirmed 事件的摘要）
      await updateEvent(suggestion.target_id, { summary }, { scopes: ['admin'] });
      break;
    }
    case 'date': {
      const eventDate = suggestion.payload.event_date;
      if (typeof eventDate !== 'string' || eventDate === '') {
        throw new Error('INVALID_PAYLOAD: date 建议缺少事件日期');
      }
      await updateEvent(suggestion.target_id, { event_date: eventDate }, { scopes: ['admin'] });
      break;
    }
    case 'merge':
      await applyMergeSuggestion(suggestion.target_id, suggestion.payload);
      break;
  }

  await run(
    `
    UPDATE ai_suggestions SET status = 'accepted', decided_at = ?, decided_by_key = ?
    WHERE id = ?
  `,
    [new Date().toISOString(), opts?.decidedByKey ?? null, id]
  );

  return getSuggestion(id);
}

/**
 * 驳回建议（admin 钥匙触发，仅标记不执行）
 */
export async function dismissSuggestion(
  id: string,
  opts?: { decidedByKey?: string }
): Promise<AISuggestion | null> {
  const suggestion = await getSuggestion(id);
  if (!suggestion) {
    return null;
  }
  if (suggestion.status !== 'pending') {
    throw new Error('INVALID_STATE: 该建议已处理');
  }

  await run(
    `
    UPDATE ai_suggestions SET status = 'dismissed', decided_at = ?, decided_by_key = ?
    WHERE id = ?
  `,
    [new Date().toISOString(), opts?.decidedByKey ?? null, id]
  );

  return getSuggestion(id);
}
