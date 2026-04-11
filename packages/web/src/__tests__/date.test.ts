import { describe, it, expect } from 'vitest';
import { formatDate } from '../utils/date';

describe('formatDate', () => {
  it('should format ISO date to Chinese readable format', () => {
    const result = formatDate('2026-04-11T00:00:00Z');
    expect(result).toContain('2026');
    expect(result).toContain('4');
    expect(result).toContain('11');
  });

  it('should return empty string for invalid date', () => {
    expect(formatDate('invalid')).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });
});
