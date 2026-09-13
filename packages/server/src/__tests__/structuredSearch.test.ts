import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createEvent } from '../services/eventService';
import { createTag, addTagToEvent } from '../services/tagService';
import { executeStructuredQuery, simpleSearch } from '../services/searchService';
import { initDatabase, closeDatabase, run } from '../db';

describe('searchService（结构化查询执行器）', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await run('DELETE FROM event_tags');
    await run('DELETE FROM tags');
    await run('DELETE FROM events');
    await run('DELETE FROM materials');
    await run('DELETE FROM event_timeline_nodes');
  });

  it('should filter events by tag names (any match)', async () => {
    const tagA = await createTag({ name: '标签A' });
    const tagB = await createTag({ name: '标签B' });
    const eventA = await createEvent({ title: '有标签A的事件' });
    const eventB = await createEvent({ title: '有标签B的事件' });
    const eventC = await createEvent({ title: '无标签的事件' });
    await addTagToEvent(eventA.id, tagA.id);
    await addTagToEvent(eventB.id, tagB.id);

    const result = await executeStructuredQuery({ tags: ['标签A', '不存在标签'] });

    const ids = result.events.map((e) => e.id);
    expect(ids).toContain(eventA.id);
    expect(ids).not.toContain(eventB.id);
    expect(ids).not.toContain(eventC.id);
  });

  it('should return empty when none of the tags exist', async () => {
    await createEvent({ title: '普通事件' });

    const result = await executeStructuredQuery({ tags: ['绝不存在的标签'] });

    expect(result.events).toHaveLength(0);
  });

  it('should filter by status with recycle-bin semantics', async () => {
    const draft = await createEvent({ title: '草稿事件', status: 'draft' });
    const confirmed = await createEvent({ title: '已收录事件', status: 'confirmed' });

    const confirmedOnly = await executeStructuredQuery({ status: 'confirmed' });
    expect(confirmedOnly.events.map((e) => e.id)).toEqual([confirmed.id]);

    // 软删除后：默认结果排除，status=deleted 走回收站语义
    await executeStructuredQuery({ status: 'deleted' });
    const updated = await updateViaService(draft.id);
    expect(updated!.status).toBe('deleted');

    const recycle = await executeStructuredQuery({ status: 'deleted' });
    expect(recycle.events.map((e) => e.id)).toContain(draft.id);
    const all = await executeStructuredQuery({ status: 'confirmed' });
    expect(all.events.map((e) => e.id)).not.toContain(draft.id);
  });

  it('should filter by date range', async () => {
    await createEvent({ title: '三月事件', event_date: '2026-03-10' });
    await createEvent({ title: '五月事件', event_date: '2026-05-10' });

    const result = await executeStructuredQuery({ date_from: '2026-04-01', date_to: '2026-06-01' });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('五月事件');
  });

  it('should sort by event_date when requested', async () => {
    await createEvent({ title: '晚事件', event_date: '2026-06-01' });
    await createEvent({ title: '早事件', event_date: '2026-01-01' });

    const asc = await executeStructuredQuery({ sort: 'date_asc' });
    expect(asc.events.map((e) => e.title)).toEqual(['早事件', '晚事件']);

    const desc = await executeStructuredQuery({ sort: 'date_desc' });
    expect(desc.events.map((e) => e.title)).toEqual(['晚事件', '早事件']);
  });

  it('should combine full-text with status filter', async () => {
    await createEvent({ title: '量子计算突破', status: 'confirmed' });
    await createEvent({ title: '量子计算争议', status: 'draft' });

    // FTS5 unicode61 将连续中文按整段分词：检索词需与完整词组一致
    const result = await executeStructuredQuery({ text: '量子计算突破', status: 'confirmed' });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('量子计算突破');
  });

  it('should respect fields filter', async () => {
    await createEvent({ title: '只查事件' });

    const result = await executeStructuredQuery({ fields: ['events'] });

    expect(result.events).toHaveLength(1);
    expect(result.materials).toHaveLength(0);
    expect(result.timelineNodes).toHaveLength(0);
  });

  it('should keep simpleSearch behavior intact for keyword search', async () => {
    await createEvent({ title: '岁月史书专属词条', content: '正文部分' });

    const result = await simpleSearch('岁月史书专属词条');

    expect(result.events).toHaveLength(1);
  });
});

/** 辅助：模拟 write 钥匙软删除（走 service 而非直接 SQL） */
import { updateEvent } from '../services/eventService';
async function updateViaService(id: string) {
  return updateEvent(id, { status: 'deleted' }, { scopes: ['write'] });
}
