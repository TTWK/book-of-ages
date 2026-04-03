# Manual Event Creation and Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement manual event creation and editing functionality in the Web UI via a unified modal.

**Architecture:** We will extend the existing `EventsView.vue` to include a top-bar "Add Event" button and row-level "Edit" buttons that open a unified `Add/Edit Event` modal. The existing modal in `EventsView` will be upgraded. We will also add an "Edit" button to `EventDetailView.vue` that opens its existing modal, ensuring it supports all fields. Events created manually will default to the `draft` state.

**Tech Stack:** Vue 3, Naive UI, TypeScript.

---

### Task 1: Upgrade Unified Add/Edit Modal in EventsView

**Files:**
- Modify: `packages/web/src/views/EventsView.vue`

- [ ] **Step 1: Update component state variables**
  - Add `editingEventId` ref to track whether we are in edit mode.
  - Rename `showCreateModal` to `showEventModal` (and update template bindings).
  - Add `saving` ref to replace `creating` and `importing` loading states for the form submission.

```typescript
// Replace existing modal state
const showEventModal = ref(false);
const saving = ref(false);
const editingEventId = ref<string | null>(null);

// Form model remains the same:
const eventForm = ref({
  title: '',
  summary: '',
  content: '',
  event_date: null as number | null,
  source_url: '',
});
```

- [ ] **Step 2: Create open modal handlers**
  - Add `openCreateModal()` and `openEditModal(event: Event)`.

```typescript
function openCreateModal() {
  editingEventId.value = null;
  eventForm.value = {
    title: '',
    summary: '',
    content: '',
    event_date: null,
    source_url: '',
  };
  importUrl.value = '';
  showEventModal.value = true;
}

function openEditModal(event: Event) {
  editingEventId.value = event.id;
  eventForm.value = {
    title: event.title,
    summary: event.summary || '',
    content: event.content || '',
    event_date: event.event_date ? new Date(event.event_date).getTime() : null,
    source_url: event.source_url || '',
  };
  importUrl.value = '';
  showEventModal.value = true;
}
```

- [ ] **Step 3: Update submit handler (`handleSave`)**
  - Replace `handleCreate` with `handleSave` to handle both create and update.

```typescript
import { getEventList, createEvent, updateEvent } from '../api/eventApi';

async function handleSave() {
  await createFormRef.value?.validate();
  
  saving.value = true;
  try {
    const payload = {
      title: eventForm.value.title,
      summary: eventForm.value.summary || undefined,
      content: eventForm.value.content || undefined,
      event_date: eventForm.value.event_date ? new Date(eventForm.value.event_date).toISOString() : undefined,
      source_url: eventForm.value.source_url || undefined,
    };

    if (editingEventId.value) {
      await updateEvent(editingEventId.value, payload);
      message.success('更新成功');
    } else {
      await createEvent({ ...payload, status: 'draft' });
      message.success('创建成功');
    }
    showEventModal.value = false;
    loadEvents();
  } catch (error) {
    message.error(editingEventId.value ? '更新失败' : '创建失败');
    console.error(error);
  } finally {
    saving.value = false;
  }
}
```

- [ ] **Step 4: Update Template UI**
  - Update Top "Add Event" button to call `openCreateModal()`.
  - Add "Edit" button to Data Table `actions` column calling `openEditModal(row)`.
  - Update Modal bindings to use `showEventModal`, `eventForm`, and `handleSave`.

```html
<!-- Top Button -->
<n-button type="primary" @click="openCreateModal">
  <template #icon>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </template>
  新建事件
</n-button>

<!-- Table Actions -->
render: (row) =>
  h(NSpace, {}, {
    default: () => [
      h(NButton, {
        size: 'small',
        onClick: () => openEditModal(row),
      }, { default: () => '编辑' }),
      h(NButton, {
        size: 'small',
        onClick: () => router.push(`/events/${row.id}`),
      }, { default: () => '详情' }),
    ],
  }),

<!-- Modal -->
<n-modal v-model:show="showEventModal" preset="dialog" :title="editingEventId ? '编辑事件' : '新建事件'">
  <n-form ref="createFormRef" :model="eventForm" :rules="formRules">
    <n-form-item label="标题" path="title">
      <n-input v-model:value="eventForm.title" placeholder="输入事件标题" />
    </n-form-item>

    <n-form-item label="从 URL 导入" path="importUrl" v-if="!editingEventId">
      <n-input-group>
        <n-input v-model:value="importUrl" placeholder="输入网页 URL 自动提取内容" />
        <n-button type="primary" :loading="importing" @click="handleImportUrl">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </template>
          提取
        </n-button>
      </n-input-group>
    </n-form-item>
    
    <n-form-item label="摘要" path="summary">
      <n-input
        v-model:value="eventForm.summary"
        type="textarea"
        placeholder="简要描述事件"
        :rows="2"
      />
    </n-form-item>
    <n-form-item label="内容" path="content">
      <n-input
        v-model:value="eventForm.content"
        type="textarea"
        placeholder="详细内容（支持 Markdown）"
        :rows="6"
      />
    </n-form-item>
    <n-form-item label="事件日期" path="event_date">
      <n-date-picker v-model:value="eventForm.event_date" type="date" clearable />
    </n-form-item>
    <n-form-item label="来源链接" path="source_url">
      <n-input v-model:value="eventForm.source_url" placeholder="https://..." />
    </n-form-item>
  </n-form>
  <template #action>
    <n-button @click="showEventModal = false">取消</n-button>
    <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
  </template>
</n-modal>
```

- [ ] **Step 5: Update `handleImportUrl`**
  - Make sure `handleImportUrl` writes to the new `eventForm` variables.

```typescript
// 从 URL 导入
async function handleImportUrl() {
  if (!importUrl.value.trim()) {
    message.warning('请输入 URL');
    return;
  }

  importing.value = true;
  try {
    const result = await parseURL({ url: importUrl.value.trim() });
    
    // 填充表单
    if (!eventForm.value.title) {
      eventForm.value.title = result.title;
    }
    if (!eventForm.value.summary) {
      eventForm.value.summary = result.content.slice(0, 200) + '...';
    }
    if (!eventForm.value.content) {
      eventForm.value.content = result.content;
    }
    if (!eventForm.value.source_url) {
      eventForm.value.source_url = importUrl.value;
    }
    
    message.success('导入成功');
  } catch (error) {
    message.error('导入失败');
    console.error(error);
  } finally {
    importing.value = false;
  }
}
```

- [ ] **Step 6: Build & Check Types**
  - Run `npm run build -w @book-of-ages/web`
  - Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/views/EventsView.vue
git commit -m "feat(web): unified add and edit modal in EventsView"
```

### Task 2: Enhance Edit Modal in EventDetailView

**Files:**
- Modify: `packages/web/src/views/EventDetailView.vue`

- [ ] **Step 1: Verify existing edit modal implementation**
  - The `EventDetailView.vue` already has a `showEditModal` and `editForm` implemented and hooked up to `handleSave` and an `Edit` button.
  - Review the code to ensure `handleSave` uses the correct API call (`updateEvent`) and reloads `event.value` upon success.
  - We simply need to ensure the template uses `<n-date-picker type="date" clearable>` to match the style above, and ensure it builds.

```vue
<!-- packages/web/src/views/EventDetailView.vue -->
<!-- Make sure n-date-picker has type="date" clearable -->
        <n-form-item label="日期" path="event_date">
          <n-date-picker v-model:value="editForm.event_date" type="date" clearable />
        </n-form-item>
```

- [ ] **Step 2: Allow editing Status**
  - Add a form item for `status` in the `EventDetailView.vue` edit modal so users can change it from `draft` to `confirmed` inside the detail view.

```typescript
// Add status to editForm
const editForm = ref({
  title: '',
  summary: '',
  content: '',
  event_date: null as number | null,
  source_url: '',
  status: 'draft' as EventStatus,
});

// Update loadEvent to populate status
    editForm.value = {
      title: data.title,
      summary: data.summary || '',
      content: data.content || '',
      event_date: data.event_date ? new Date(data.event_date).getTime() : null,
      source_url: data.source_url || '',
      status: data.status,
    };

// Update handleSave payload to include status
    const updated = await updateEvent(event.value!.id, {
      title: editForm.value.title,
      summary: editForm.value.summary || undefined,
      content: editForm.value.content || undefined,
      event_date: editForm.value.event_date ? new Date(editForm.value.event_date).toISOString() : undefined,
      source_url: editForm.value.source_url || undefined,
      status: editForm.value.status,
    });
```

```html
<!-- Add Status select to the modal template -->
        <n-form-item label="状态" path="status">
          <n-select v-model:value="editForm.status" :options="[
            { label: '草稿', value: 'draft' },
            { label: '已确认', value: 'confirmed' },
            { label: '已归档', value: 'archived' }
          ]" />
        </n-form-item>
```

- [ ] **Step 3: Build & Check Types**
  - Run `npm run build -w @book-of-ages/web`
  - Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/views/EventDetailView.vue
git commit -m "feat(web): support editing event status and fix date picker in detail view"
```