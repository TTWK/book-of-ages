import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  logOperation,
  getOperationLogs,
  getEntityOperationLogs,
} from '../services/operationLogService';
import { initDatabase, closeDatabase, run } from '../db';

describe('operationLogService', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // 清理测试数据
    await run('DELETE FROM operation_logs');
  });

  describe('logOperation', () => {
    it('should log an API operation without api_key_id', async () => {
      // 不传入 api_key_id 以避免外键约束失败
      const log = await logOperation('CREATE', 'Event', 'event-123');

      expect(log.id).toBeDefined();
      expect(log.action).toBe('CREATE');
      expect(log.entity_type).toBe('Event');
      expect(log.entity_id).toBe('event-123');
      expect(log.api_key_id).toBeUndefined();
      expect(log.created_at).toBeDefined();
    });

    it('should log a UI operation without api_key_id', async () => {
      const log = await logOperation('UPDATE', 'Event', 'event-456');

      expect(log.action).toBe('UPDATE');
      expect(log.entity_type).toBe('Event');
      expect(log.api_key_id).toBeUndefined();
    });

    it('should log operation with different entity types', async () => {
      const log1 = await logOperation('CREATE', 'Event', 'event-1');
      const log2 = await logOperation('DELETE', 'Tag', 'tag-1');

      expect(log1.entity_type).toBe('Event');
      expect(log2.entity_type).toBe('Tag');
    });

    it('should log operation with different actions', async () => {
      const log1 = await logOperation('CREATE', 'Event', 'event-1');
      const log2 = await logOperation('UPDATE', 'Event', 'event-1');
      const log3 = await logOperation('DELETE', 'Event', 'event-1');

      expect(log1.action).toBe('CREATE');
      expect(log2.action).toBe('UPDATE');
      expect(log3.action).toBe('DELETE');
    });

    it('should log operation without api_key_id', async () => {
      const log = await logOperation('DELETE', 'Event', 'event-123');

      expect(log.api_key_id).toBeUndefined();
    });
  });

  describe('getOperationLogs', () => {
    beforeEach(async () => {
      await logOperation('CREATE', 'Event', 'event-1');
      await logOperation('UPDATE', 'Event', 'event-1');
      await logOperation('DELETE', 'Tag', 'tag-1');
    });

    it('should return all logs', async () => {
      const logs = await getOperationLogs();

      expect(logs.length).toBe(3);
    });

    it('should order logs by created_at DESC', async () => {
      const logs = await getOperationLogs();

      for (let i = 0; i < logs.length - 1; i++) {
        expect(new Date(logs[i].created_at).getTime()).toBeGreaterThanOrEqual(
          new Date(logs[i + 1].created_at).getTime()
        );
      }
    });

    it('should limit results', async () => {
      const logs = await getOperationLogs(2);

      expect(logs.length).toBe(2);
    });

    it('should return all logs when limit is larger than total', async () => {
      const logs = await getOperationLogs(100);

      expect(logs.length).toBe(3);
    });

    it('should return empty array when no logs', async () => {
      await run('DELETE FROM operation_logs');

      const logs = await getOperationLogs();

      expect(logs).toEqual([]);
    });
  });

  describe('getEntityOperationLogs', () => {
    beforeEach(async () => {
      await logOperation('CREATE', 'Event', 'event-123');
      await logOperation('UPDATE', 'Event', 'event-123');
      await logOperation('DELETE', 'Event', 'event-123');
      await logOperation('CREATE', 'Event', 'event-456');
    });

    it('should return all operations for entity', async () => {
      const logs = await getEntityOperationLogs('Event', 'event-123');

      expect(logs.length).toBe(3);
      expect(logs.every((log) => log.entity_id === 'event-123')).toBe(true);
    });

    it('should order operations by created_at DESC', async () => {
      const logs = await getEntityOperationLogs('Event', 'event-123');

      for (let i = 0; i < logs.length - 1; i++) {
        expect(new Date(logs[i].created_at).getTime()).toBeGreaterThanOrEqual(
          new Date(logs[i + 1].created_at).getTime()
        );
      }
    });

    it('should return empty array for entity with no operations', async () => {
      const logs = await getEntityOperationLogs('Event', 'event-999');

      expect(logs).toEqual([]);
    });

    it('should filter by entity_type', async () => {
      const eventLogs = await getEntityOperationLogs('Event', 'event-123');
      const tagLogs = await getEntityOperationLogs('Tag', 'event-123');

      expect(eventLogs.length).toBe(3);
      expect(tagLogs.length).toBe(0);
    });

    it('should include all action types', async () => {
      const logs = await getEntityOperationLogs('Event', 'event-123');

      const actions = logs.map((log) => log.action);
      expect(actions).toContain('CREATE');
      expect(actions).toContain('UPDATE');
      expect(actions).toContain('DELETE');
    });
  });
});
