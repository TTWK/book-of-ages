import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTag,
  listTags,
  getTagById,
  updateTag,
  deleteTag,
  getTagEventCount,
  addTagToEvent,
  removeTagFromEvent,
  getEventTags,
  updateEventTags,
} from '../services/tagService';
import { createEvent } from '../services/eventService';
import { initDatabase, closeDatabase, run } from '../db';

describe('tagService', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // 清理测试数据
    await run('DELETE FROM event_tags');
    await run('DELETE FROM tags');
    await run('DELETE FROM events');
  });

  describe('createTag', () => {
    it('should create a tag with required fields', async () => {
      const tag = await createTag({ name: '测试标签' });

      expect(tag.id).toBeDefined();
      expect(tag.name).toBe('测试标签');
      expect(tag.parent_id).toBeNull();
      expect(tag.color).toBeNull();
      expect(tag.created_at).toBeDefined();
      expect(tag.updated_at).toBeDefined();
    });

    it('should create a tag with all fields', async () => {
      const parentTag = await createTag({ name: '父标签' });
      const tag = await createTag({
        name: '子标签',
        parent_id: parentTag.id,
        color: '#FF0000',
      });

      expect(tag.name).toBe('子标签');
      expect(tag.parent_id).toBe(parentTag.id);
      expect(tag.color).toBe('#FF0000');
    });

    it('should generate unique UUIDs', async () => {
      const tag1 = await createTag({ name: '标签1' });
      const tag2 = await createTag({ name: '标签2' });

      expect(tag1.id).not.toBe(tag2.id);
    });
  });

  describe('listTags', () => {
    it('should return all tags', async () => {
      await createTag({ name: '标签A' });
      await createTag({ name: '标签B' });
      await createTag({ name: '标签C' });

      const tags = await listTags();

      expect(tags.length).toBe(3);
    });

    it('should return empty array when no tags', async () => {
      const tags = await listTags();

      expect(tags).toEqual([]);
    });

    it('should order tags by parent_id and name', async () => {
      const parent = await createTag({ name: 'Parent' });
      await createTag({ name: 'Child B', parent_id: parent.id });
      await createTag({ name: 'Child A', parent_id: parent.id });
      await createTag({ name: 'Another' });

      const tags = await listTags();

      // parent_id 为 NULL 的排在前面
      expect(tags[0].name).toBe('Another');
      expect(tags[1].name).toBe('Parent');
      // 然后是按 name 排序的子标签
      expect(tags[2].name).toBe('Child A');
      expect(tags[3].name).toBe('Child B');
    });
  });

  describe('getTagById', () => {
    it('should return tag by id', async () => {
      const tag = await createTag({ name: '查找标签', color: '#00FF00' });
      const found = await getTagById(tag.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(tag.id);
      expect(found!.name).toBe('查找标签');
      expect(found!.color).toBe('#00FF00');
    });

    it('should return null for non-existent tag', async () => {
      const found = await getTagById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('updateTag', () => {
    it('should update tag name', async () => {
      const tag = await createTag({ name: '原名称' });
      const updated = await updateTag(tag.id, { name: '新名称' });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('新名称');
    });

    it('should update multiple fields', async () => {
      const tag = await createTag({ name: '原标签' });
      const updated = await updateTag(tag.id, {
        name: '更新标签',
        color: '#FF0000',
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('更新标签');
      expect(updated!.color).toBe('#FF0000');
    });

    it('should update parent_id', async () => {
      const parent = await createTag({ name: '父标签' });
      const child = await createTag({ name: '子标签' });

      const updated = await updateTag(child.id, { parent_id: parent.id });

      expect(updated).not.toBeNull();
      expect(updated!.parent_id).toBe(parent.id);
    });

    it('should not modify updated_at when no fields provided', async () => {
      const tag = await createTag({ name: '标签' });
      const beforeUpdate = await getTagById(tag.id);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await updateTag(tag.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.updated_at).toBe(beforeUpdate!.updated_at);
    });

    it('should return null for non-existent tag', async () => {
      const updated = await updateTag('non-existent-id', { name: '新名称' });

      expect(updated).toBeNull();
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      const tag = await createTag({ name: '待删除标签' });
      const deleted = await deleteTag(tag.id);

      expect(deleted).toBe(true);

      const found = await getTagById(tag.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent tag', async () => {
      const deleted = await deleteTag('non-existent-id');

      expect(deleted).toBe(false);
    });

    it('should return false for already deleted tag', async () => {
      const tag = await createTag({ name: '标签' });
      await deleteTag(tag.id);

      const deletedAgain = await deleteTag(tag.id);
      expect(deletedAgain).toBe(false);
    });
  });

  describe('getTagEventCount', () => {
    it('should return 0 for tag with no events', async () => {
      const tag = await createTag({ name: '标签' });
      const count = await getTagEventCount(tag.id);

      expect(count).toBe(0);
    });

    it('should return correct count for tag with events', async () => {
      const tag = await createTag({ name: '标签' });
      const event1 = await createEvent({ title: '事件1' });
      const event2 = await createEvent({ title: '事件2' });

      await addTagToEvent(event1.id, tag.id);
      await addTagToEvent(event2.id, tag.id);

      const count = await getTagEventCount(tag.id);

      expect(count).toBe(2);
    });
  });

  describe('addTagToEvent', () => {
    it('should add tag to event', async () => {
      const event = await createEvent({ title: '事件' });
      const tag = await createTag({ name: '标签' });

      await addTagToEvent(event.id, tag.id);

      const tags = await getEventTags(event.id);
      expect(tags.length).toBe(1);
      expect(tags[0].id).toBe(tag.id);
    });

    it('should not duplicate tag assignment', async () => {
      const event = await createEvent({ title: '事件' });
      const tag = await createTag({ name: '标签' });

      await addTagToEvent(event.id, tag.id);
      await addTagToEvent(event.id, tag.id);

      const tags = await getEventTags(event.id);
      expect(tags.length).toBe(1);
    });

    it('should allow multiple tags on same event', async () => {
      const event = await createEvent({ title: '事件' });
      const tag1 = await createTag({ name: '标签1' });
      const tag2 = await createTag({ name: '标签2' });

      await addTagToEvent(event.id, tag1.id);
      await addTagToEvent(event.id, tag2.id);

      const tags = await getEventTags(event.id);
      expect(tags.length).toBe(2);
    });
  });

  describe('removeTagFromEvent', () => {
    it('should remove tag from event', async () => {
      const event = await createEvent({ title: '事件' });
      const tag = await createTag({ name: '标签' });

      await addTagToEvent(event.id, tag.id);
      await removeTagFromEvent(event.id, tag.id);

      const tags = await getEventTags(event.id);
      expect(tags.length).toBe(0);
    });

    it('should not error when removing non-existent tag', async () => {
      const event = await createEvent({ title: '事件' });
      const tag = await createTag({ name: '标签' });

      await expect(removeTagFromEvent(event.id, tag.id)).resolves.not.toThrow();
    });
  });

  describe('getEventTags', () => {
    it('should return all tags for event', async () => {
      const event = await createEvent({ title: '事件' });
      const tag1 = await createTag({ name: '标签1' });
      const tag2 = await createTag({ name: '标签2' });

      await addTagToEvent(event.id, tag1.id);
      await addTagToEvent(event.id, tag2.id);

      const tags = await getEventTags(event.id);

      expect(tags.length).toBe(2);
      expect(tags.map((t) => t.id).sort()).toEqual([tag1.id, tag2.id].sort());
    });

    it('should return empty array for event with no tags', async () => {
      const event = await createEvent({ title: '事件' });

      const tags = await getEventTags(event.id);

      expect(tags).toEqual([]);
    });
  });

  describe('updateEventTags', () => {
    it('should replace all tags for event', async () => {
      const event = await createEvent({ title: '事件' });
      const tag1 = await createTag({ name: '标签1' });
      const tag2 = await createTag({ name: '标签2' });
      const tag3 = await createTag({ name: '标签3' });

      await addTagToEvent(event.id, tag1.id);
      await addTagToEvent(event.id, tag2.id);

      await updateEventTags(event.id, [tag2.id, tag3.id]);

      const tags = await getEventTags(event.id);
      expect(tags.length).toBe(2);
      expect(tags.map((t) => t.id).sort()).toEqual([tag2.id, tag3.id].sort());
    });

    it('should remove all tags when empty array provided', async () => {
      const event = await createEvent({ title: '事件' });
      const tag = await createTag({ name: '标签' });

      await addTagToEvent(event.id, tag.id);
      await updateEventTags(event.id, []);

      const tags = await getEventTags(event.id);
      expect(tags).toEqual([]);
    });
  });
});
