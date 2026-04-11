import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
  getEventById,
} from '../services/eventService';
import { initDatabase, closeDatabase } from '../db';

describe('eventService', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('should create an event and return it', async () => {
    const event = await createEvent({
      title: '测试事件',
      summary: '测试摘要',
      content: '测试内容',
      status: 'draft',
    });

    expect(event.id).toBeDefined();
    expect(event.title).toBe('测试事件');
    expect(event.status).toBe('draft');
  });

  it('should list events with pagination', async () => {
    await createEvent({
      title: '列表测试事件',
      status: 'confirmed',
    });

    const { events, total } = await listEvents({ status: 'confirmed', page: 1, pageSize: 10 });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(total).toBeGreaterThanOrEqual(1);
    expect(events[0].title).toBe('列表测试事件');
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

  it('should soft delete an event', async () => {
    const event = await createEvent({
      title: '待删除事件',
      status: 'draft',
    });

    const deleted = await deleteEvent(event.id);
    expect(deleted).toBe(true);

    const fetched = await getEventById(event.id);
    expect(fetched).toBeNull();
  });
});
