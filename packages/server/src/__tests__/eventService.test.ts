import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
  getEventById,
  batchCreateEvents,
} from '../services/eventService';
import { initDatabase, closeDatabase, run } from '../db';

describe('eventService', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // 清理测试数据
    await run('DELETE FROM event_tags');
    await run('DELETE FROM events');
  });

  describe('createEvent', () => {
    it('should create an event and return it', async () => {
      const event = await createEvent({
        title: '测试事件',
        summary: '测试摘要',
        content: '测试内容',
        status: 'draft',
      });

      expect(event.id).toBeDefined();
      expect(event.title).toBe('测试事件');
      expect(event.summary).toBe('测试摘要');
      expect(event.content).toBe('测试内容');
      expect(event.status).toBe('draft');
      expect(event.created_at).toBeDefined();
      expect(event.updated_at).toBeDefined();
    });

    it('should create event with default status draft', async () => {
      const event = await createEvent({
        title: '无状态事件',
      });

      expect(event.status).toBe('draft');
    });

    it('should create event with optional fields', async () => {
      const event = await createEvent({
        title: '完整事件',
        summary: '摘要',
        content: '内容',
        status: 'confirmed',
        event_date: '2026-01-01',
        source_url: 'https://example.com',
      });

      expect(event.title).toBe('完整事件');
      expect(event.event_date).toBe('2026-01-01');
      expect(event.source_url).toBe('https://example.com');
    });

    it('should generate UUID for event id', async () => {
      const event1 = await createEvent({ title: '事件1' });
      const event2 = await createEvent({ title: '事件2' });

      expect(event1.id).toBeDefined();
      expect(event2.id).toBeDefined();
      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('listEvents', () => {
    beforeEach(async () => {
      // 创建测试数据
      await createEvent({ title: '草稿事件1', status: 'draft' });
      await createEvent({ title: '草稿事件2', status: 'draft' });
      await createEvent({ title: '确认事件1', status: 'confirmed' });
      await createEvent({ title: '确认事件2', status: 'confirmed' });
    });

    it('should list all events by default', async () => {
      const { events, total } = await listEvents();

      expect(events.length).toBe(4);
      expect(total).toBe(4);
    });

    it('should filter events by status', async () => {
      const { events, total } = await listEvents({ status: 'draft' });

      expect(events.length).toBe(2);
      expect(total).toBe(2);
      expect(events.every((e) => e.status === 'draft')).toBe(true);
    });

    it('should support pagination', async () => {
      const { events, total } = await listEvents({ page: 1, pageSize: 2 });

      expect(events.length).toBe(2);
      expect(total).toBe(4);
    });

    it('should return correct page on second page', async () => {
      const page1 = await listEvents({ page: 1, pageSize: 2 });
      const page2 = await listEvents({ page: 2, pageSize: 2 });

      expect(page1.events.length).toBe(2);
      expect(page2.events.length).toBe(2);
      expect(page1.events[0].id).not.toBe(page2.events[0].id);
    });

    it('should return empty array for out of range page', async () => {
      const { events, total } = await listEvents({ page: 100, pageSize: 10 });

      expect(events.length).toBe(0);
      expect(total).toBe(4);
    });

    it('should order events by created_at DESC', async () => {
      const { events } = await listEvents();

      for (let i = 0; i < events.length - 1; i++) {
        expect(new Date(events[i].created_at).getTime()).toBeGreaterThanOrEqual(
          new Date(events[i + 1].created_at).getTime()
        );
      }
    });
  });

  describe('getEventById', () => {
    it('should return event by id', async () => {
      const event = await createEvent({ title: '查找事件' });
      const found = await getEventById(event.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(event.id);
      expect(found!.title).toBe('查找事件');
    });

    it('should return null for non-existent event', async () => {
      const found = await getEventById('non-existent-id');

      expect(found).toBeNull();
    });

    it('should return null for deleted event', async () => {
      const event = await createEvent({ title: '待删除事件' });
      await deleteEvent(event.id);

      const found = await getEventById(event.id);
      expect(found).toBeNull();
    });
  });

  describe('updateEvent', () => {
    it('should update event title', async () => {
      const event = await createEvent({ title: '原标题' });
      const updated = await updateEvent(event.id, { title: '新标题' });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('新标题');
    });

    it('should update multiple fields', async () => {
      const event = await createEvent({ title: '原事件' });
      const updated = await updateEvent(event.id, {
        title: '更新事件',
        summary: '新摘要',
        content: '新内容',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('更新事件');
      expect(updated!.summary).toBe('新摘要');
      expect(updated!.content).toBe('新内容');
    });

    it('should update status', async () => {
      const event = await createEvent({ title: '草稿事件', status: 'draft' });
      const updated = await updateEvent(event.id, { status: 'confirmed' });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('confirmed');
    });

    it('should update event_date and source_url', async () => {
      const event = await createEvent({ title: '事件' });
      const updated = await updateEvent(event.id, {
        event_date: '2026-04-12',
        source_url: 'https://example.com',
      });

      expect(updated).not.toBeNull();
      expect(updated!.event_date).toBe('2026-04-12');
      expect(updated!.source_url).toBe('https://example.com');
    });

    it('should return null for non-existent event', async () => {
      const updated = await updateEvent('non-existent-id', { title: '新标题' });

      expect(updated).toBeNull();
    });

    it('should not modify updated_at when no fields provided', async () => {
      const event = await createEvent({ title: '事件' });
      const beforeUpdate = await getEventById(event.id);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await updateEvent(event.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.updated_at).toBe(beforeUpdate!.updated_at);
    });

    it('should prevent agent from modifying confirmed event core fields', async () => {
      const event = await createEvent({
        title: '已确认事件',
        status: 'confirmed',
      });

      await expect(
        updateEvent(event.id, { title: '被篡改的标题' }, 'some-api-key-id')
      ).rejects.toThrow('PERMISSION_DENIED');
    });

    it('should prevent agent from modifying confirmed event summary', async () => {
      const event = await createEvent({
        title: '已确认事件',
        summary: '原摘要',
        status: 'confirmed',
      });

      await expect(
        updateEvent(event.id, { summary: '被篡改的摘要' }, 'some-api-key-id')
      ).rejects.toThrow('PERMISSION_DENIED');
    });

    it('should prevent agent from modifying confirmed event content', async () => {
      const event = await createEvent({
        title: '已确认事件',
        content: '原内容',
        status: 'confirmed',
      });

      await expect(
        updateEvent(event.id, { content: '被篡改的内容' }, 'some-api-key-id')
      ).rejects.toThrow('PERMISSION_DENIED');
    });

    it('should allow UI to modify confirmed event (no apiKeyId)', async () => {
      const event = await createEvent({
        title: '已确认事件',
        status: 'confirmed',
      });

      const updated = await updateEvent(event.id, { title: '新标题' }, undefined);

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('新标题');
    });

    it('should allow agent to modify non-core fields of confirmed event', async () => {
      const event = await createEvent({
        title: '已确认事件',
        status: 'confirmed',
      });

      // 假设 status 不是核心字段（实际上核心字段是 title, summary, content, event_date, source_url）
      // 这里测试更新 status 应该被允许
      const updated = await updateEvent(event.id, { status: 'draft' }, 'some-api-key-id');

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('draft');
    });

    it('should throw PERMISSION_DENIED with correct message', async () => {
      const event = await createEvent({
        title: '已确认事件',
        event_date: '2026-01-01',
        status: 'confirmed',
      });

      try {
        await updateEvent(event.id, { event_date: '2026-04-12' }, 'api-key-id');
        throw new Error('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('PERMISSION_DENIED');
        expect(error.message).toContain('已收录事件的核心字段不允许通过 API 修改');
      }
    });
  });

  describe('deleteEvent', () => {
    it('should soft delete an event', async () => {
      const event = await createEvent({ title: '待删除事件' });
      const deleted = await deleteEvent(event.id);

      expect(deleted).toBe(true);

      const fetched = await getEventById(event.id);
      expect(fetched).toBeNull();
    });

    it('should set deleted_at and status to deleted', async () => {
      const event = await createEvent({ title: '待删除事件', status: 'draft' });
      await deleteEvent(event.id);

      // 直接查询数据库验证
      const result = await import('../db');
      const dbEvent = await result.get<any>('SELECT * FROM events WHERE id = ?', [event.id]);

      expect(dbEvent).toBeDefined();
      expect(dbEvent.deleted_at).not.toBeNull();
      expect(dbEvent.status).toBe('deleted');
    });

    it('should return false for non-existent event', async () => {
      const deleted = await deleteEvent('non-existent-id');

      expect(deleted).toBe(false);
    });

    it('should return false for already deleted event', async () => {
      const event = await createEvent({ title: '事件' });
      await deleteEvent(event.id);

      const deletedAgain = await deleteEvent(event.id);
      expect(deletedAgain).toBe(false);
    });
  });

  describe('batchCreateEvents', () => {
    it('should create multiple events', async () => {
      const inputs = [
        { title: '批量事件1', status: 'draft' as const },
        { title: '批量事件2', status: 'confirmed' as const },
        { title: '批量事件3' },
      ];

      const events = await batchCreateEvents(inputs);

      expect(events.length).toBe(3);
      expect(events[0].title).toBe('批量事件1');
      expect(events[1].title).toBe('批量事件2');
      expect(events[2].title).toBe('批量事件3');
    });

    it('should return empty array for empty input', async () => {
      const events = await batchCreateEvents([]);

      expect(events).toEqual([]);
    });

    it('should create all events with correct status', async () => {
      const inputs = [
        { title: '事件1', status: 'draft' as const },
        { title: '事件2', status: 'confirmed' as const },
      ];

      const events = await batchCreateEvents(inputs);

      expect(events[0].status).toBe('draft');
      expect(events[1].status).toBe('confirmed');
    });
  });
});
