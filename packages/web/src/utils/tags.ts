/**
 * 标签工具（EventsView 与 EventDetailView 共用）
 */

import type { CreateTagInput } from '@book-of-ages/shared';
import { createTag } from '../api/tagApi';

const PRESET_COLORS = ['#71717a', '#14b8a6', '#eab308', '#f43f5e', '#22c55e', '#3b82f6'];
const getRandomColor = () => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 将标签选择值（既有 ID 或新名称）归一化为标签 ID 列表：
 * 非 UUID 的值视为新标签名并创建；创建失败的项跳过。
 */
export async function processTagValues(tagValues: string[]): Promise<string[]> {
  const finalTagIds: string[] = [];

  for (const value of tagValues) {
    if (UUID_REGEX.test(value)) {
      finalTagIds.push(value);
      continue;
    }
    try {
      const input: CreateTagInput = { name: value, color: getRandomColor() };
      const newTag = await createTag(input);
      finalTagIds.push(newTag.id);
    } catch (_e) {
      // 创建失败（如重名 409）时跳过该标签
    }
  }

  return finalTagIds;
}
