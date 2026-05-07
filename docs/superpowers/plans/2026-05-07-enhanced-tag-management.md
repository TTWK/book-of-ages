# 增强标签管理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提升标签管理的便捷性，支持详情页直接删除（带撤销）以及在任何标签选择处直接创建新标签（随机颜色）。

**Architecture:**

- 在 `EventDetailView.vue` 中集成 `useUndo` 用于标签删除。
- 封装通用的标签处理逻辑（识别并创建新标签）。
- 升级 `n-select` 组件配置，启用 `tag` 模式。

**Tech Stack:** Vue 3, Naive UI, Lucide Vue Next

---

### Task 1: 详情页侧边栏标签直接删除 (带撤销)

**Files:**

- Modify: `packages/web/src/views/EventDetailView.vue`
- Modify: `packages/web/src/composables/useUndo.ts` (可选，添加通用方法)

- [ ] **Step 1: 在 useUndo.ts 中添加 removeEventTag 通用方法**

```typescript
// packages/web/src/composables/useUndo.ts

// 在 useCommonUndoActions 中添加:
    /**
     * 移除标签（带撤销）
     */
    removeTag: async (
      removeFn: () => Promise<void>,
      addBackFn: () => Promise<void>,
      tagName: string
    ) => {
      return undo.executeWithUndo({
        execute: removeFn,
        undo: addBackFn,
        successMessage: `已移除标签: ${tagName}`,
        errorMessage: '移除标签失败',
      });
    },
```

- [ ] **Step 2: 修改 EventDetailView.vue 模板，添加删除图标**

```vue
<!-- EventDetailView.vue 侧边栏标签循环部分 -->
<span
  v-for="tag in tags"
  :key="tag.id"
  class="group/tag px-2.5 py-1 bg-primary-50 text-primary-600 border border-primary-100 rounded-md text-xs font-medium flex items-center transition-all"
>
  <Hash class="w-3 h-3 mr-1 opacity-70" />
  {{ tag.name }}
  <X 
    class="w-3 h-3 ml-1 cursor-pointer opacity-0 group-hover/tag:opacity-100 hover:text-error-500 transition-opacity" 
    @click.stop="handleRemoveTag(tag)"
  />
</span>
```

- [ ] **Step 3: 实现 handleRemoveTag 逻辑**

```typescript
// EventDetailView.vue script
const { removeTag: removeTagWithUndo } = useCommonUndoActions(message);

async function handleRemoveTag(tag: Tag) {
  const originalTagIds = selectedTagIds.value.slice();
  const newTagIds = originalTagIds.filter((id) => id !== tag.id);

  await removeTagWithUndo(
    async () => {
      await updateEventTags(event.value!.id, newTagIds);
      selectedTagIds.value = newTagIds;
      tags.value = tags.value.filter((t) => t.id !== tag.id);
    },
    async () => {
      await updateEventTags(event.value!.id, originalTagIds);
      selectedTagIds.value = originalTagIds;
      tags.value = allTags.value.filter((t) => originalTagIds.includes(t.id));
    },
    tag.name
  );
}
```

### Task 2: 详情页标签选择模态框升级 (支持创建)

**Files:**

- Modify: `packages/web/src/views/EventDetailView.vue`

- [ ] **Step 1: 替换模态框中的复选框组为 n-select**

```vue
<!-- Tag Select Modal -->
<n-select
  v-model:value="selectedTagIds"
  multiple
  filterable
  tag
  placeholder="输入新标签或选择已有标签"
  :options="allTags.map((t) => ({ label: t.name, value: t.id }))"
/>
```

- [ ] **Step 2: 更新 handleSaveTags 逻辑以支持创建新标签**

```typescript
const PRESET_COLORS = ['#71717a', '#14b8a6', '#eab308', '#f43f5e', '#22c55e', '#3b82f6'];
const getRandomColor = () => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];

async function processTags(tagValues: string[]): Promise<string[]> {
  const finalTagIds: string[] = [];

  for (const value of tagValues) {
    // 检查是否是 UUID 格式 (假设 ID 是 UUID)
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

    if (isId) {
      finalTagIds.push(value);
    } else {
      // 创建新标签
      try {
        const newTag = await createTag({
          name: value,
          color: getRandomColor(),
        });
        allTags.value.push(newTag);
        finalTagIds.push(newTag.id);
      } catch (e) {
        console.error('创建标签失败:', value);
      }
    }
  }
  return finalTagIds;
}

async function handleSaveTags() {
  try {
    const finalTagIds = await processTags(selectedTagIds.value);
    await updateEventTags(event.value!.id, finalTagIds);
    selectedTagIds.value = finalTagIds;
    tags.value = allTags.value.filter((t) => finalTagIds.includes(t.id));
    showTagModal.value = false;
    message.success('标签已更新');
  } catch (error) {
    message.error('更新失败');
  }
}
```

### Task 3: 事件表单模态框升级 (EventFormModal & EventsView)

**Files:**

- Modify: `packages/web/src/components/EventFormModal.vue`
- Modify: `packages/web/src/views/EventsView.vue`

- [ ] **Step 1: 在 EventFormModal.vue 中传入并显示已有标签选项**

```vue
<!-- EventFormModal.vue props -->
defineProps<{ ... tagOptions: { label: string, value: string }[]; }>();

<!-- template -->
<n-select
  v-model:value="form.tags"
  multiple
  filterable
  tag
  placeholder="输入关键词并按回车"
  :options="tagOptions"
/>
```

- [ ] **Step 2: 在 EventsView.vue 中加载并传入标签选项**

```typescript
// EventsView.vue
const tagOptions = ref<{ label: string; value: string }[]>([]);

async function loadTags() {
  const data = await getTagList();
  tagOptions.value = data.map((t) => ({ label: t.name, value: t.id }));
}
onMounted(() => {
  loadEvents();
  loadTags();
});
```

- [ ] **Step 3: 修改 EventsView.vue 的 handleSave 以处理标签关联**

```typescript
// EventsView.vue handleSave
async function handleSave(formData: any) {
  try {
    const { tags: tagValues, ...rest } = formData;
    const payload: any = {
      ...rest,
      event_date: formData.event_date ? new Date(formData.event_date).toISOString() : undefined,
    };

    let eventId: string;
    if (editingEventId.value) {
      const updated = await updateEvent(editingEventId.value, payload);
      eventId = updated!.id;
      message.success('修史成功');
    } else {
      const created = await createEvent({ ...payload, status: 'confirmed' });
      eventId = created.id;
      message.success('已载入史册');
    }

    // 处理标签 (需要复用 processTags 逻辑或在 EventsView 中实现)
    if (tagValues) {
      const finalTagIds = await processTagsInEventsView(tagValues);
      await updateEventTags(eventId, finalTagIds);
      await loadTags(); // 刷新标签列表以防创建了新标签
    }

    showEventModal.value = false;
    await loadEvents();
  } catch (error: any) {
    ...
  }
}
```

- [ ] **Step 4: 在 EventsView.vue 中实现 processTagsInEventsView**

由于逻辑重复，可以考虑提取到工具类，但这里直接实现即可。

### Task 4: 细节与验证

- [ ] **Step 1: 检查 MainLayout 中的搜索是否受影响**
- [ ] **Step 2: 验证新标签颜色随机性**
- [ ] **Step 3: 验证撤销功能在详情页的稳定性**
