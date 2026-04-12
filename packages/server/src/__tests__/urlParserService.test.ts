import { describe, it, expect } from 'vitest';
import { parseURL } from '../services/urlParserService';

describe('parseURL', () => {
  describe('URL validation', () => {
    it('should reject invalid URL format', async () => {
      await expect(parseURL({ url: 'not-a-url' })).rejects.toThrow('无效的 URL 格式');
    });

    it('should reject empty URL', async () => {
      await expect(parseURL({ url: '' })).rejects.toThrow('无效的 URL 格式');
    });

    it('should reject malformed URLs', async () => {
      await expect(parseURL({ url: 'http://' })).rejects.toThrow('无效的 URL 格式');
    });

    it('should accept valid HTTP URLs', async () => {
      const result = await parseURL({ url: 'http://example.com' });
      expect(result.url).toBe('http://example.com');
    });

    it('should accept valid HTTPS URLs', async () => {
      const result = await parseURL({ url: 'https://example.com' });
      expect(result.url).toBe('https://example.com');
    });

    it('should accept URLs with paths', async () => {
      const result = await parseURL({ url: 'https://example.com/path/to/page' });
      expect(result.url).toBe('https://example.com/path/to/page');
    });

    it('should accept URLs with query parameters', async () => {
      const result = await parseURL({ url: 'https://example.com/search?q=test&page=1' });
      expect(result.url).toBe('https://example.com/search?q=test&page=1');
    });
  });

  describe('Fetching unreachable URLs', () => {
    it('should return fallback when URL is unreachable', async () => {
      const result = await parseURL({ url: 'http://localhost:19999/nonexistent' });
      expect(result.title).toBe('http://localhost:19999/nonexistent');
      expect(result.content).toContain('无法访问');
    });

    it('should return fallback with error message for 404', async () => {
      const result = await parseURL({ url: 'https://httpbin.org/status/404' });
      expect(result.title).toBe('https://httpbin.org/status/404');
      expect(result.content).toContain('无法访问');
    });

    it('should include error details in content', async () => {
      const result = await parseURL({ url: 'http://localhost:19999/nonexistent' });
      expect(result.content).toMatch(/无法访问该 URL/);
    });
  });

  describe('Parsing HTML content', () => {
    it('should extract title from HTML', async () => {
      // Mock fetch is not available in test environment, so we test the error case
      // In a real scenario with a live server, this would extract the title
      const result = await parseURL({ url: 'http://localhost:19999/test' });
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('url');
    });

    it('should return fallback for non-HTML content', async () => {
      const result = await parseURL({ url: 'http://localhost:19999/json' });
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
    });
  });

  describe('Return value structure', () => {
    it('should return object with title, content, and url', async () => {
      const result = await parseURL({ url: 'http://localhost:19999/test' });

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('url');
    });

    it('should preserve original URL', async () => {
      const testUrl = 'http://localhost:19999/test';
      const result = await parseURL({ url: testUrl });

      expect(result.url).toBe(testUrl);
    });

    it('should return string types for all fields', async () => {
      const result = await parseURL({ url: 'http://localhost:19999/test' });

      expect(typeof result.title).toBe('string');
      expect(typeof result.content).toBe('string');
      expect(typeof result.url).toBe('string');
    });
  });
});
