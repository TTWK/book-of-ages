import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTimelineNode,
  getTimelineNodes,
  getTimelineNodeById,
  updateTimelineNode,
  deleteTimelineNode,
} from '../services/timelineService';
import { initDatabase, closeDatabase, run } from '../db';
import { createEvent } from '../services/eventService';

describe('timelineService', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // 清理测试数据 - 必须先删除子表，再删除父表
    await run('DELETE FROM event_timeline_nodes');
    await run('DELETE FROM events');
  });

  describe('createTimelineNode', () => {
    it('should create a timeline node with required fields', async () => {
      const event = await createEvent({ title: '测试事件' });

      const node = await createTimelineNode(event.id, {
        title: '时间线节点',
      });

      expect(node.id).toBeDefined();
      expect(node.event_id).toBe(event.id);
      expect(node.title).toBe('时间线节点');
      expect(node.sort_order).toBe(0);
      expect(node.created_at).toBeDefined();
      expect(node.updated_at).toBeDefined();
    });

    it('should create a timeline node with all optional fields', async () => {
      const event = await createEvent({ title: '测试事件' });

      const node = await createTimelineNode(event.id, {
        title: '完整节点',
        description: '节点描述',
        node_date: '2026-04-12',
        sort_order: 5,
      });

      expect(node.title).toBe('完整节点');
      expect(node.description).toBe('节点描述');
      expect(node.node_date).toBe('2026-04-12');
      expect(node.sort_order).toBe(5);
    });

    it('should use default sort_order when not provided', async () => {
      const event = await createEvent({ title: '测试事件' });

      const node = await createTimelineNode(event.id, {
        title: '默认排序节点',
      });

      expect(node.sort_order).toBe(0);
    });

    it('should generate unique UUIDs for each node', async () => {
      const event = await createEvent({ title: '测试事件' });

      const node1 = await createTimelineNode(event.id, { title: '节点1' });
      const node2 = await createTimelineNode(event.id, { title: '节点2' });

      expect(node1.id).toBeDefined();
      expect(node2.id).toBeDefined();
      expect(node1.id).not.toBe(node2.id);
    });

    it('should create multiple nodes for the same event', async () => {
      const event = await createEvent({ title: '测试事件' });

      await createTimelineNode(event.id, { title: '节点1' });
      await createTimelineNode(event.id, { title: '节点2' });
      await createTimelineNode(event.id, { title: '节点3' });

      const nodes = await getTimelineNodes(event.id);
      expect(nodes.length).toBe(3);
    });
  });

  describe('getTimelineNodes', () => {
    it('should return all nodes for an event', async () => {
      const event = await createEvent({ title: '测试事件' });

      await createTimelineNode(event.id, { title: '节点1', sort_order: 2 });
      await createTimelineNode(event.id, { title: '节点2', sort_order: 1 });
      await createTimelineNode(event.id, { title: '节点3', sort_order: 3 });

      const nodes = await getTimelineNodes(event.id);

      expect(nodes.length).toBe(3);
    });

    it('should order nodes by sort_order ASC', async () => {
      const event = await createEvent({ title: '测试事件' });

      await createTimelineNode(event.id, { title: '节点2', sort_order: 2 });
      await createTimelineNode(event.id, { title: '节点1', sort_order: 1 });
      await createTimelineNode(event.id, { title: '节点3', sort_order: 3 });

      const nodes = await getTimelineNodes(event.id);

      expect(nodes[0].title).toBe('节点1');
      expect(nodes[1].title).toBe('节点2');
      expect(nodes[2].title).toBe('节点3');
    });

    it('should order nodes by node_date ASC when sort_order is equal', async () => {
      const event = await createEvent({ title: '测试事件' });

      await createTimelineNode(event.id, {
        title: '节点2',
        sort_order: 0,
        node_date: '2026-04-12',
      });
      await createTimelineNode(event.id, {
        title: '节点1',
        sort_order: 0,
        node_date: '2026-01-01',
      });
      await createTimelineNode(event.id, {
        title: '节点3',
        sort_order: 0,
        node_date: '2026-07-01',
      });

      const nodes = await getTimelineNodes(event.id);

      expect(nodes[0].title).toBe('节点1');
      expect(nodes[1].title).toBe('节点2');
      expect(nodes[2].title).toBe('节点3');
    });

    it('should return empty array for event with no nodes', async () => {
      const event = await createEvent({ title: '测试事件' });

      const nodes = await getTimelineNodes(event.id);

      expect(nodes).toEqual([]);
    });

    it('should return empty array for non-existent event', async () => {
      const nodes = await getTimelineNodes('non-existent-event-id');

      expect(nodes).toEqual([]);
    });

    it('should only return nodes for the specified event', async () => {
      const event1 = await createEvent({ title: '事件1' });
      const event2 = await createEvent({ title: '事件2' });

      await createTimelineNode(event1.id, { title: '事件1节点1' });
      await createTimelineNode(event1.id, { title: '事件1节点2' });
      await createTimelineNode(event2.id, { title: '事件2节点' });

      const nodes = await getTimelineNodes(event1.id);

      expect(nodes.length).toBe(2);
      expect(nodes.every((n) => n.event_id === event1.id)).toBe(true);
    });
  });

  describe('getTimelineNodeById', () => {
    it('should return node by id', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '查找节点' });

      const found = await getTimelineNodeById(node.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(node.id);
      expect(found!.title).toBe('查找节点');
    });

    it('should return all fields of the node', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, {
        title: '完整节点',
        description: '描述',
        node_date: '2026-04-12',
        sort_order: 10,
      });

      const found = await getTimelineNodeById(node.id);

      expect(found).not.toBeNull();
      expect(found!.title).toBe('完整节点');
      expect(found!.description).toBe('描述');
      expect(found!.node_date).toBe('2026-04-12');
      expect(found!.sort_order).toBe(10);
      expect(found!.event_id).toBe(event.id);
    });

    it('should return null for non-existent node', async () => {
      const found = await getTimelineNodeById('non-existent-id');

      expect(found).toBeNull();
    });

    it('should return null for deleted node', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '待删除节点' });

      await deleteTimelineNode(node.id);

      const found = await getTimelineNodeById(node.id);
      expect(found).toBeNull();
    });
  });

  describe('updateTimelineNode', () => {
    it('should update node title', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '原标题' });

      const updated = await updateTimelineNode(node.id, { title: '新标题' });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('新标题');
    });

    it('should update multiple fields', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, {
        title: '原节点',
        description: '原描述',
        sort_order: 0,
      });

      const updated = await updateTimelineNode(node.id, {
        title: '新标题',
        description: '新描述',
        sort_order: 10,
        node_date: '2026-04-12',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('新标题');
      expect(updated!.description).toBe('新描述');
      expect(updated!.sort_order).toBe(10);
      expect(updated!.node_date).toBe('2026-04-12');
    });

    it('should update description only', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '节点' });

      const updated = await updateTimelineNode(node.id, {
        description: '新描述',
      });

      expect(updated).not.toBeNull();
      expect(updated!.description).toBe('新描述');
      expect(updated!.title).toBe('节点');
    });

    it('should update node_date', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '节点' });

      const updated = await updateTimelineNode(node.id, {
        node_date: '2026-01-01',
      });

      expect(updated).not.toBeNull();
      expect(updated!.node_date).toBe('2026-01-01');
    });

    it('should return node without modification when no fields provided', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '节点' });

      const updated = await updateTimelineNode(node.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('节点');
      expect(updated!.updated_at).toBe(node.updated_at);
    });

    it('should return null for non-existent node', async () => {
      const updated = await updateTimelineNode('non-existent-id', { title: '新标题' });

      expect(updated).toBeNull();
    });

    it('should update updated_at timestamp when fields change', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '节点' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await updateTimelineNode(node.id, { title: '新标题' });

      expect(updated).not.toBeNull();
      expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(
        new Date(node.updated_at).getTime()
      );
    });
  });

  describe('deleteTimelineNode', () => {
    it('should delete a timeline node', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '待删除节点' });

      const deleted = await deleteTimelineNode(node.id);

      expect(deleted).toBe(true);

      const fetched = await getTimelineNodeById(node.id);
      expect(fetched).toBeNull();
    });

    it('should return true for successful deletion', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '节点' });

      const deleted = await deleteTimelineNode(node.id);

      expect(deleted).toBe(true);
    });

    it('should return false for non-existent node', async () => {
      const deleted = await deleteTimelineNode('non-existent-id');

      expect(deleted).toBe(false);
    });

    it('should return false for already deleted node', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node = await createTimelineNode(event.id, { title: '节点' });

      await deleteTimelineNode(node.id);
      const deletedAgain = await deleteTimelineNode(node.id);

      expect(deletedAgain).toBe(false);
    });

    it('should remove node from event timeline list', async () => {
      const event = await createEvent({ title: '测试事件' });
      const node1 = await createTimelineNode(event.id, { title: '节点1' });
      const node2 = await createTimelineNode(event.id, { title: '节点2' });

      await deleteTimelineNode(node1.id);

      const nodes = await getTimelineNodes(event.id);

      expect(nodes.length).toBe(1);
      expect(nodes[0].id).toBe(node2.id);
    });
  });
});
