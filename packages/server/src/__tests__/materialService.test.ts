import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createMaterial,
  getMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
} from '../services/materialService';
import { createEvent } from '../services/eventService';
import { initDatabase, closeDatabase, run } from '../db';

describe('materialService', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // 清理测试数据
    await run('DELETE FROM materials');
    await run('DELETE FROM events');
  });

  describe('createMaterial', () => {
    it('should create a material with required fields', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/images/test.jpg',
      });

      expect(material.id).toBeDefined();
      expect(material.event_id).toBe(event.id);
      expect(material.type).toBe('image');
      expect(material.file_path).toBe('/uploads/images/test.jpg');
      expect(material.timeline_node_id).toBeNull();
      expect(material.created_at).toBeDefined();
      expect(material.updated_at).toBeDefined();
    });

    it('should create a material with all fields', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        // 不使用 timeline_node_id，因为它需要引用实际存在的时间线节点
        type: 'pdf',
        title: '测试文档',
        file_path: '/uploads/docs/test.pdf',
        source_url: 'https://example.com',
        content_text: '文档内容',
      });

      expect(material.event_id).toBe(event.id);
      expect(material.timeline_node_id).toBeNull();
      expect(material.type).toBe('pdf');
      expect(material.title).toBe('测试文档');
      expect(material.file_path).toBe('/uploads/docs/test.pdf');
      expect(material.source_url).toBe('https://example.com');
      expect(material.content_text).toBe('文档内容');
    });

    it('should create materials with different types', async () => {
      const event = await createEvent({ title: '测试事件' });
      const types = ['image', 'video', 'pdf', 'snapshot', 'other'] as const;

      for (const type of types) {
        const material = await createMaterial({
          event_id: event.id,
          type,
          file_path: `/uploads/${type}/test`,
        });

        expect(material.type).toBe(type);
      }
    });

    it('should generate unique UUIDs', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material1 = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test1.jpg',
      });
      const material2 = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test2.jpg',
      });

      expect(material1.id).not.toBe(material2.id);
    });
  });

  describe('getMaterials', () => {
    beforeEach(async () => {
      const event = await createEvent({ title: '测试事件' });

      await createMaterial({
        event_id: event.id,
        type: 'image',
        title: '材料1',
        file_path: '/uploads/test1.jpg',
      });
      await createMaterial({
        event_id: event.id,
        type: 'pdf',
        title: '材料2',
        file_path: '/uploads/test2.pdf',
      });
      await createMaterial({
        event_id: event.id,
        type: 'image',
        title: '材料3',
        file_path: '/uploads/test3.jpg',
      });
    });

    it('should return all materials for event', async () => {
      const event = await createEvent({ title: '测试事件' });
      await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test1.jpg',
      });
      await createMaterial({
        event_id: event.id,
        type: 'pdf',
        file_path: '/uploads/test2.pdf',
      });

      const materials = await getMaterials(event.id);

      expect(materials.length).toBe(2);
    });

    it('should order materials by created_at DESC', async () => {
      const event = await createEvent({ title: '测试事件' });
      const mat1 = await createMaterial({
        event_id: event.id,
        type: 'image',
        title: '材料1',
        file_path: '/uploads/test1.jpg',
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const mat2 = await createMaterial({
        event_id: event.id,
        type: 'image',
        title: '材料2',
        file_path: '/uploads/test2.jpg',
      });

      const materials = await getMaterials(event.id);

      expect(materials.length).toBe(2);
      expect(materials[0].id).toBe(mat2.id);
      expect(materials[1].id).toBe(mat1.id);
    });

    it('should filter by timeline_node_id', async () => {
      const event = await createEvent({ title: '测试事件' });
      // 先创建时间线节点
      const { createTimelineNode } = await import('../services/timelineService');
      const node1 = await createTimelineNode(event.id, { title: '节点1' });
      const node2 = await createTimelineNode(event.id, { title: '节点2' });

      await createMaterial({
        event_id: event.id,
        timeline_node_id: node1.id,
        type: 'image',
        title: '节点1材料',
        file_path: '/uploads/test1.jpg',
      });
      await createMaterial({
        event_id: event.id,
        timeline_node_id: node2.id,
        type: 'image',
        title: '节点2材料',
        file_path: '/uploads/test2.jpg',
      });

      const materials = await getMaterials(event.id, node1.id);

      expect(materials.length).toBe(1);
      expect(materials[0].timeline_node_id).toBe(node1.id);
    });

    it('should return empty array for event with no materials', async () => {
      const event = await createEvent({ title: '测试事件' });

      const materials = await getMaterials(event.id);

      expect(materials).toEqual([]);
    });

    it('should not return deleted materials', async () => {
      const event = await createEvent({ title: '测试事件' });
      const mat1 = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test1.jpg',
      });
      await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test2.jpg',
      });

      await deleteMaterial(mat1.id);

      const materials = await getMaterials(event.id);

      expect(materials.length).toBe(1);
      expect(materials[0].id).not.toBe(mat1.id);
    });
  });

  describe('getMaterialById', () => {
    it('should return material by id', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        title: '查找材料',
        file_path: '/uploads/test.jpg',
      });

      const found = await getMaterialById(material.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(material.id);
      expect(found!.title).toBe('查找材料');
    });

    it('should return null for non-existent material', async () => {
      const found = await getMaterialById('non-existent-id');

      expect(found).toBeNull();
    });

    it('should return null for deleted material', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test.jpg',
      });

      await deleteMaterial(material.id);

      const found = await getMaterialById(material.id);
      expect(found).toBeNull();
    });
  });

  describe('updateMaterial', () => {
    it('should update material title', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        title: '原标题',
        file_path: '/uploads/test.jpg',
      });

      const updated = await updateMaterial(material.id, { title: '新标题' });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('新标题');
    });

    it('should update multiple fields', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        title: '原名称',
        file_path: '/uploads/test.jpg',
      });

      const updated = await updateMaterial(material.id, {
        title: '新名称',
        source_url: 'https://example.com',
        content_text: '新内容',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('新名称');
      expect(updated!.source_url).toBe('https://example.com');
      expect(updated!.content_text).toBe('新内容');
    });

    it('should update source_url', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test.jpg',
      });

      const updated = await updateMaterial(material.id, {
        source_url: 'https://new-url.com',
      });

      expect(updated).not.toBeNull();
      expect(updated!.source_url).toBe('https://new-url.com');
    });

    it('should update content_text', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test.jpg',
      });

      const updated = await updateMaterial(material.id, {
        content_text: '更新的内容文本',
      });

      expect(updated).not.toBeNull();
      expect(updated!.content_text).toBe('更新的内容文本');
    });

    it('should not modify updated_at when no fields provided', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test.jpg',
      });
      const beforeUpdate = await getMaterialById(material.id);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await updateMaterial(material.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.updated_at).toBe(beforeUpdate!.updated_at);
    });

    it('should return null for non-existent material', async () => {
      const updated = await updateMaterial('non-existent-id', { title: '新标题' });

      expect(updated).toBeNull();
    });
  });

  describe('deleteMaterial', () => {
    it('should soft delete a material', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test.jpg',
      });

      const deleted = await deleteMaterial(material.id);

      expect(deleted).toBe(true);

      const found = await getMaterialById(material.id);
      expect(found).toBeNull();
    });

    it('should set deleted_at timestamp', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test.jpg',
      });

      await deleteMaterial(material.id);

      const result = await import('../db');
      const dbMaterial = await result.get<any>('SELECT * FROM materials WHERE id = ?', [
        material.id,
      ]);

      expect(dbMaterial).toBeDefined();
      expect(dbMaterial.deleted_at).not.toBeNull();
    });

    it('should return false for non-existent material', async () => {
      const deleted = await deleteMaterial('non-existent-id');

      expect(deleted).toBe(false);
    });

    it('should return false for already deleted material', async () => {
      const event = await createEvent({ title: '测试事件' });
      const material = await createMaterial({
        event_id: event.id,
        type: 'image',
        file_path: '/uploads/test.jpg',
      });

      const firstDelete = await deleteMaterial(material.id);
      expect(firstDelete).toBe(true);

      const deletedAgain = await deleteMaterial(material.id);
      expect(deletedAgain).toBe(false);
    });
  });
});
