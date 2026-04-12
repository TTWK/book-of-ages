import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createEvent } from '../services/eventService';
import { createTag, addTagToEvent, getTagEventDetails } from '../services/tagService';
import { run } from '../db';

describe('tagService - tag aggregation', () => {
  beforeAll(async () => {
    await import('../db').then(({ initDatabase }) => initDatabase());
  });

  afterAll(async () => {
    await import('../db').then(({ closeDatabase }) => closeDatabase());
  });

  beforeEach(async () => {
    await run('DELETE FROM event_tags');
    await run('DELETE FROM events');
    await run('DELETE FROM tags');
  });

  describe('getTagEventDetails', () => {
    it('should return events for a tag', async () => {
      const tag = await createTag({ name: '测试标签' });

      const event1 = await createEvent({
        title: '事件1',
        status: 'confirmed',
        event_date: '2026-01-15',
      });
      const event2 = await createEvent({
        title: '事件2',
        status: 'confirmed',
        event_date: '2026-02-20',
      });
      await createEvent({
        title: '事件3',
        status: 'confirmed',
        event_date: '2026-03-10',
      });

      await addTagToEvent(event1.id, tag.id);
      await addTagToEvent(event2.id, tag.id);

      const result = await getTagEventDetails(tag.id);

      expect(result.tag).toBeDefined();
      expect(result.tag.id).toBe(tag.id);
      expect(result.events.length).toBe(2);
      expect(result.events[0].title).toBe('事件1');
      expect(result.events[1].title).toBe('事件2');
    });

    it('should order events chronologically', async () => {
      const tag = await createTag({ name: '时间标签' });

      const event3 = await createEvent({
        title: '三月事件',
        status: 'confirmed',
        event_date: '2026-03-15',
      });
      const event1 = await createEvent({
        title: '一月事件',
        status: 'confirmed',
        event_date: '2026-01-10',
      });
      const event2 = await createEvent({
        title: '二月事件',
        status: 'confirmed',
        event_date: '2026-02-20',
      });

      await addTagToEvent(event3.id, tag.id);
      await addTagToEvent(event1.id, tag.id);
      await addTagToEvent(event2.id, tag.id);

      const result = await getTagEventDetails(tag.id);

      expect(result.events.length).toBe(3);
      expect(result.events[0].title).toBe('一月事件');
      expect(result.events[1].title).toBe('二月事件');
      expect(result.events[2].title).toBe('三月事件');
    });

    it('should return empty events for tag with no events', async () => {
      const tag = await createTag({ name: '空标签' });

      const result = await getTagEventDetails(tag.id);

      expect(result.tag).toBeDefined();
      expect(result.tag.id).toBe(tag.id);
      expect(result.events).toEqual([]);
    });

    it('should exclude deleted events', async () => {
      const tag = await createTag({ name: '测试标签' });

      const activeEvent = await createEvent({
        title: '活跃事件',
        status: 'confirmed',
      });
      const deletedEvent = await createEvent({
        title: '已删除事件',
        status: 'draft',
      });

      await addTagToEvent(activeEvent.id, tag.id);
      await addTagToEvent(deletedEvent.id, tag.id);
      await import('../services/eventService').then(({ deleteEvent }) =>
        deleteEvent(deletedEvent.id)
      );

      const result = await getTagEventDetails(tag.id);

      expect(result.events.length).toBe(1);
      expect(result.events[0].title).toBe('活跃事件');
    });
  });
});
