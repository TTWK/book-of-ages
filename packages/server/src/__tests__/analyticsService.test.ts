import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createEvent } from '../services/eventService';
import { getTimeAggregation } from '../services/analyticsService';
import { run } from '../db';

describe('analyticsService', () => {
  beforeAll(async () => {
    await import('../db').then(({ initDatabase }) => initDatabase());
  });

  afterAll(async () => {
    await import('../db').then(({ closeDatabase }) => closeDatabase());
  });

  beforeEach(async () => {
    await run('DELETE FROM event_tags');
    await run('DELETE FROM events');
  });

  describe('getTimeAggregation', () => {
    it('should aggregate events by month', async () => {
      // 创建不同月份的事件
      await createEvent({
        title: '事件1',
        status: 'confirmed',
        event_date: '2026-01-15',
      });
      await createEvent({
        title: '事件2',
        status: 'confirmed',
        event_date: '2026-01-20',
      });
      await createEvent({
        title: '事件3',
        status: 'confirmed',
        event_date: '2026-02-10',
      });
      await createEvent({
        title: '事件4',
        status: 'confirmed',
        event_date: '2026-03-05',
      });

      const result = await getTimeAggregation('month');

      expect(result.length).toBeGreaterThan(0);
      // 验证 2026-01 有 2 个事件
      const january = result.find((r) => r.period === '2026-01');
      expect(january).toBeDefined();
      expect(january?.count).toBe(2);
    });

    it('should aggregate events by week', async () => {
      await createEvent({
        title: '事件1',
        status: 'confirmed',
        event_date: '2026-04-06',
      });
      await createEvent({
        title: '事件2',
        status: 'confirmed',
        event_date: '2026-04-07',
      });
      await createEvent({
        title: '事件3',
        status: 'confirmed',
        event_date: '2026-04-13',
      });

      const result = await getTimeAggregation('week');

      expect(result.length).toBeGreaterThan(0);
      // 验证周的格式应该是 YYYY-WW
      const aprilWeek1 = result.find((r) => r.period === '2026-14');
      expect(aprilWeek1).toBeDefined();
      expect(aprilWeek1?.count).toBe(2);
    });

    it('should aggregate events by year', async () => {
      await createEvent({
        title: '事件1',
        status: 'confirmed',
        event_date: '2025-01-15',
      });
      await createEvent({
        title: '事件2',
        status: 'confirmed',
        event_date: '2025-06-20',
      });
      await createEvent({
        title: '事件3',
        status: 'confirmed',
        event_date: '2026-03-10',
      });

      const result = await getTimeAggregation('year');

      expect(result.length).toBe(2);
      const year2025 = result.find((r) => r.period === '2025');
      expect(year2025).toBeDefined();
      expect(year2025?.count).toBe(2);
      const year2026 = result.find((r) => r.period === '2026');
      expect(year2026).toBeDefined();
      expect(year2026?.count).toBe(1);
    });

    it('should use created_at when event_date is not available', async () => {
      await createEvent({
        title: '事件1',
        status: 'confirmed',
      });
      await createEvent({
        title: '事件2',
        status: 'confirmed',
      });

      const result = await getTimeAggregation('month');

      expect(result.length).toBeGreaterThan(0);
      // 应该使用 created_at 进行聚合
      const currentMonth = result[0];
      expect(currentMonth.count).toBe(2);
    });

    it('should return empty array when no events exist', async () => {
      const result = await getTimeAggregation('month');
      expect(result).toEqual([]);
    });

    it('should order results chronologically', async () => {
      await createEvent({
        title: '事件1',
        status: 'confirmed',
        event_date: '2026-03-01',
      });
      await createEvent({
        title: '事件2',
        status: 'confirmed',
        event_date: '2026-01-01',
      });
      await createEvent({
        title: '事件3',
        status: 'confirmed',
        event_date: '2026-02-01',
      });

      const result = await getTimeAggregation('month');

      expect(result.length).toBe(3);
      expect(result[0].period).toBe('2026-01');
      expect(result[1].period).toBe('2026-02');
      expect(result[2].period).toBe('2026-03');
    });
  });
});
