import { describe, it, expect } from 'vitest';
import { parseURL } from '../services/urlParserService';

describe('parseURL', () => {
  it('should reject invalid URL format', async () => {
    await expect(parseURL({ url: 'not-a-url' })).rejects.toThrow('无效的 URL 格式');
  });

  it('should return fallback when URL is unreachable', async () => {
    const result = await parseURL({ url: 'http://localhost:19999/nonexistent' });
    expect(result.title).toBe('http://localhost:19999/nonexistent');
    expect(result.content).toContain('无法访问');
  });
});
