/**
 * 工具 API
 */

import apiClient from './client';
import type { ParsedURLResult } from '@book-of-ages/shared';

/**
 * 解析 URL
 */
export async function parseURL(url: string): Promise<ParsedURLResult> {
  return apiClient.post<ParsedURLResult>('/api/tools/parse-url', { url });
}
