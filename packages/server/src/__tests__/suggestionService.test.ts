import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createEvent, getEventById } from '../services/eventService';
import {
  proposeSuggestion,
  listSuggestions,
  acceptSuggestion,
  dismissSuggestion,
} from '../services/suggestionService';
import { listTags, getEventTags } from '../services/tagService';
import { initDatabase, closeDatabase, run } from '../db';

describe('suggestionService（AI 建议收件箱）', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await run('DELETE FROM ai_suggestions');
    await run('DELETE FROM event_tags');
    await run('DELETE FROM tags');
    await run('DELETE FROM events');
  });

  describe('proposeSuggestion', () => {
    it('should create a pending suggestion', async () => {
      const event = await createEvent({ title: '目标事件' });

      const suggestion = await proposeSuggestion({
        type: 'tag',
        target_id: event.id,
        payload: { tag_names: ['历史', '科技'] },
        rationale: '正文多次提及',
      });

      expect(suggestion.status).toBe('pending');
      expect(suggestion.payload.tag_names).toEqual(['历史', '科技']);
      expect(suggestion.rationale).toBe('正文多次提及');
    });

    it('should dedupe pending suggestions of same target and type', async () => {
      const event = await createEvent({ title: '目标事件' });

      await proposeSuggestion({
        type: 'tag',
        target_id: event.id,
        payload: { tag_names: ['旧标签'] },
        rationale: '旧理由',
      });
      const overwritten = await proposeSuggestion({
        type: 'tag',
        target_id: event.id,
        payload: { tag_names: ['新标签'] },
        rationale: '新理由',
      });

      const pending = await listSuggestions('pending');
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(overwritten.id);
      expect(pending[0].payload.tag_names).toEqual(['新标签']);
      expect(pending[0].rationale).toBe('新理由');
    });

    it('should allow pending suggestions of different types for same target', async () => {
      const event = await createEvent({ title: '目标事件' });

      await proposeSuggestion({ type: 'tag', target_id: event.id, payload: { tag_names: ['a'] } });
      await proposeSuggestion({
        type: 'date',
        target_id: event.id,
        payload: { event_date: '2026-01-01' },
      });

      const pending = await listSuggestions('pending');
      expect(pending).toHaveLength(2);
    });

    it('should reject unknown type and missing target', async () => {
      const event = await createEvent({ title: '目标事件' });

      await expect(
        proposeSuggestion({ type: 'bogus' as never, target_id: event.id, payload: {} })
      ).rejects.toThrow('VALIDATION_ERROR');

      await expect(
        proposeSuggestion({ type: 'tag', target_id: 'no-such-event', payload: {} })
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('acceptSuggestion', () => {
    it('should apply tag suggestion by creating and binding tags', async () => {
      const event = await createEvent({ title: '目标事件' });
      const suggestion = await proposeSuggestion({
        type: 'tag',
        target_id: event.id,
        payload: { tag_names: ['新标签A'] },
      });

      const accepted = await acceptSuggestion(suggestion.id, { decidedByKey: 'admin' });

      expect(accepted!.status).toBe('accepted');
      expect(accepted!.decided_by_key).toBe('admin');
      const tags = await getEventTags(event.id);
      expect(tags.map((t) => t.name)).toContain('新标签A');
    });

    it('should apply summary suggestion even on confirmed event (human approved)', async () => {
      const event = await createEvent({ title: '已收录', status: 'confirmed', summary: '旧摘要' });
      const suggestion = await proposeSuggestion({
        type: 'summary',
        target_id: event.id,
        payload: { summary: '人工批准的新摘要' },
      });

      await acceptSuggestion(suggestion.id);

      const updated = await getEventById(event.id);
      expect(updated!.summary).toBe('人工批准的新摘要');
    });

    it('should mark both events with merge marker tag instead of auto-merging', async () => {
      const eventA = await createEvent({ title: '事件A' });
      const eventB = await createEvent({ title: '事件B' });
      const suggestion = await proposeSuggestion({
        type: 'merge',
        target_id: eventA.id,
        payload: { merge_into_event_id: eventB.id },
      });

      await acceptSuggestion(suggestion.id);

      const tagsA = await getEventTags(eventA.id);
      const tagsB = await getEventTags(eventB.id);
      expect(tagsA.map((t) => t.name)).toContain('疑似重复');
      expect(tagsB.map((t) => t.name)).toContain('疑似重复');
      // 两条事件仍然独立存在（不自动合并）
      const tags = await listTags();
      expect(tags.length).toBe(1);
    });

    it('should reject accepting twice', async () => {
      const event = await createEvent({ title: '目标事件' });
      const suggestion = await proposeSuggestion({
        type: 'date',
        target_id: event.id,
        payload: { event_date: '2026-03-15' },
      });

      await acceptSuggestion(suggestion.id);

      await expect(acceptSuggestion(suggestion.id)).rejects.toThrow('INVALID_STATE');
    });
  });

  describe('dismissSuggestion', () => {
    it('should mark suggestion dismissed without applying', async () => {
      const event = await createEvent({ title: '目标事件' });
      const suggestion = await proposeSuggestion({
        type: 'tag',
        target_id: event.id,
        payload: { tag_names: ['不该出现的标签'] },
      });

      const dismissed = await dismissSuggestion(suggestion.id);

      expect(dismissed!.status).toBe('dismissed');
      const tags = await getEventTags(event.id);
      expect(tags).toHaveLength(0);
    });
  });

  describe('updateEvent scope rules（配合收件箱的服务端行为）', () => {
    it('should let suggestion apply flow use admin scope implicitly', async () => {
      // acceptSuggestion 内部以 admin scopes 调用 updateEvent：confirmed 事件日期可由人工批准修改
      const event = await createEvent({
        title: '已收录',
        status: 'confirmed',
        event_date: '2026-01-01',
      });
      const suggestion = await proposeSuggestion({
        type: 'date',
        target_id: event.id,
        payload: { event_date: '2026-02-02' },
      });

      await acceptSuggestion(suggestion.id);

      const updated = await getEventById(event.id);
      expect(updated!.event_date).toBe('2026-02-02');
    });
  });
});
