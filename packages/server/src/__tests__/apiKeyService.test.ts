import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createAPIKey,
  listAPIKeys,
  getAPIKeyById,
  deleteAPIKey,
  verifyAPIKey,
} from '../services/apiKeyService';
import { initDatabase, closeDatabase, run } from '../db';

describe('apiKeyService', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // 清理测试数据
    await run('DELETE FROM api_keys');
  });

  describe('createAPIKey', () => {
    it('should create an API key with name', async () => {
      const result = await createAPIKey({ name: '测试密钥' });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('测试密钥');
      expect(result.key_hash).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
      expect(result.plain_key).toBeDefined();
    });

    it('should generate API key with boa_ prefix', async () => {
      const result = await createAPIKey({ name: '测试密钥' });

      expect(result.plain_key).toMatch(/^boa_[a-f0-9]{48}$/);
    });

    it('should store hashed key in database', async () => {
      const result = await createAPIKey({ name: '测试密钥' });

      // key_hash 应该是 SHA256 哈希（64 个十六进制字符）
      expect(result.key_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique keys', async () => {
      const result1 = await createAPIKey({ name: '密钥1' });
      const result2 = await createAPIKey({ name: '密钥2' });

      expect(result1.plain_key).not.toBe(result2.plain_key);
      expect(result1.key_hash).not.toBe(result2.key_hash);
    });

    it('should create API key with different names', async () => {
      const result1 = await createAPIKey({ name: 'Daily Crawler' });
      const result2 = await createAPIKey({ name: 'Weekly Reporter' });

      expect(result1.name).toBe('Daily Crawler');
      expect(result2.name).toBe('Weekly Reporter');
      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('listAPIKeys', () => {
    it('should return all API keys', async () => {
      await createAPIKey({ name: '密钥A' });
      await createAPIKey({ name: '密钥B' });
      await createAPIKey({ name: '密钥C' });

      const keys = await listAPIKeys();

      expect(keys.length).toBe(3);
    });

    it('should not return key_hash', async () => {
      await createAPIKey({ name: '密钥' });

      const keys = await listAPIKeys();

      expect(keys[0]).not.toHaveProperty('key_hash');
    });

    it('should return keys ordered by created_at DESC', async () => {
      const key1 = await createAPIKey({ name: '密钥1' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const key2 = await createAPIKey({ name: '密钥2' });

      const keys = await listAPIKeys();

      expect(keys.length).toBe(2);
      expect(keys[0].id).toBe(key2.id);
      expect(keys[1].id).toBe(key1.id);
    });

    it('should return empty array when no keys', async () => {
      const keys = await listAPIKeys();

      expect(keys).toEqual([]);
    });
  });

  describe('getAPIKeyById', () => {
    it('should return API key by id', async () => {
      const created = await createAPIKey({ name: '查找密钥' });
      const found = await getAPIKeyById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('查找密钥');
    });

    it('should not return key_hash', async () => {
      const created = await createAPIKey({ name: '密钥' });
      const found = await getAPIKeyById(created.id);

      expect(found).not.toHaveProperty('key_hash');
    });

    it('should return null for non-existent key', async () => {
      const found = await getAPIKeyById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('deleteAPIKey', () => {
    it('should delete an API key', async () => {
      const created = await createAPIKey({ name: '待删除密钥' });
      const deleted = await deleteAPIKey(created.id);

      expect(deleted).toBe(true);

      const found = await getAPIKeyById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent key', async () => {
      const deleted = await deleteAPIKey('non-existent-id');

      expect(deleted).toBe(false);
    });

    it('should return false for already deleted key', async () => {
      const created = await createAPIKey({ name: '密钥' });
      await deleteAPIKey(created.id);

      const deletedAgain = await deleteAPIKey(created.id);
      expect(deletedAgain).toBe(false);
    });
  });

  describe('verifyAPIKey', () => {
    it('should verify correct API key', async () => {
      const created = await createAPIKey({ name: '验证密钥' });
      const verified = await verifyAPIKey(created.plain_key);

      expect(verified).not.toBeNull();
      expect(verified!.id).toBe(created.id);
      expect(verified!.name).toBe('验证密钥');
    });

    it('should return null for incorrect key', async () => {
      const verified = await verifyAPIKey('boa_invalidkey1234567890abcdef1234567890abcdef');

      expect(verified).toBeNull();
    });

    it('should return null for random string', async () => {
      const verified = await verifyAPIKey('random-string');

      expect(verified).toBeNull();
    });

    it('should update last_used time after verification', async () => {
      const created = await createAPIKey({ name: '验证密钥' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await verifyAPIKey(created.plain_key);

      const key = await getAPIKeyById(created.id);
      expect(key).not.toBeNull();
      expect(key!.last_used).not.toBeNull();
    });

    it('should update updated_at time after verification', async () => {
      const created = await createAPIKey({ name: '验证密钥' });
      const beforeVerify = await getAPIKeyById(created.id);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await verifyAPIKey(created.plain_key);

      const afterVerify = await getAPIKeyById(created.id);
      expect(afterVerify!.updated_at).not.toBe(beforeVerify!.updated_at);
    });

    it('should verify key and return full API key info', async () => {
      const created = await createAPIKey({ name: '测试密钥' });

      const verified = await verifyAPIKey(created.plain_key);

      expect(verified).not.toBeNull();
      expect(verified!.id).toBe(created.id);
      expect(verified!.name).toBe('测试密钥');
      expect(verified!.key_hash).toBe(created.key_hash);
    });
  });
});
