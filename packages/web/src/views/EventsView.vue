<template>
  <div class="events-view">
    <n-card title="事件库">
      <template #header-extra>
        <n-space>
          <n-select
            v-model:value="statusFilter"
            :options="statusOptions"
            style="width: 120px"
            @update:value="loadEvents"
          />
          <n-button type="primary" @click="openCreateModal">
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </template>
            新建事件
          </n-button>
        </n-space>
      </template>

      <n-data-table
        :columns="columns"
        :data="events"
        :loading="loading"
        :pagination="pagination"
        @update:page="onPageChange"
      />
    </n-card>

    <!-- 创建/编辑事件 Modal -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted, computed } from 'vue';
import type { DataTableColumns, FormRules, FormInst } from 'naive-ui';
import { NButton, NTag, NText, NSpace, useMessage } from 'naive-ui';
import type { Event, EventStatus } from '@book-of-ages/shared';
import { getEventList, createEvent, updateEvent } from '../api/eventApi';
import { parseURL } from '../api/toolApi';
import { useRouter } from 'vue-router';

const message = useMessage();
const router = useRouter();

const events = ref<Event[]>([]);
const loading = ref(false);
const showEventModal = ref(false);
const saving = ref(false);
const importing = ref(false);
const statusFilter = ref<EventStatus | undefined>(undefined);
const currentPage = ref(1);
const importUrl = ref('');
const editingEventId = ref<string | null>(null);

const statusOptions = [
  { label: '全部', value: undefined },
  { label: '草稿', value: 'draft' },
  { label: '已确认', value: 'confirmed' },
  { label: '已归档', value: 'archived' },
];

const eventForm = ref({
  title: '',
  summary: '',
  content: '',
  event_date: null as number | null,
  source_url: '',
});

const formRules: FormRules = {
  title: { required: true, message: '请输入标题', trigger: 'blur' },
};

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

const paginationState = {
  itemCount: 0,
};

const pagination = computed(() => ({
  page: currentPage.value,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  itemCount: paginationState.itemCount,
  onChange: (page: number) => {
    currentPage.value = page;
    loadEvents();
  },
}));

// 表格列定义
const columns: DataTableColumns<Event> = [
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) => {
      const typeMap: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
        draft: 'warning',
        confirmed: 'success',
        archived: 'info',
        deleted: 'error',
      };
      const labelMap: Record<string, string> = {
        draft: '草稿',
        confirmed: '已确认',
        archived: '已归档',
        deleted: '已删除',
      };
      return h(NTag, { type: typeMap[row.status] || 'default' }, { default: () => labelMap[row.status] || row.status });
    },
  },
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
    render: (row) =>
      h(NText, { depth: 1 }, { default: () => row.title }),
  },
  {
    title: '摘要',
    key: 'summary',
    ellipsis: { tooltip: true },
    width: 300,
  },
  {
    title: '日期',
    key: 'event_date',
    width: 120,
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
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
        ]
      }),
  },
];

// 加载事件列表
async function loadEvents() {
  loading.value = true;
  try {
    const result = await getEventList({
      status: statusFilter.value || undefined,
      page: currentPage.value,
      pageSize: 20,
    });
    events.value = result.items;
    paginationState.itemCount = result.pagination.total;
  } catch (error) {
    message.error('加载事件列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// 页面变化
function onPageChange(page: number) {
  currentPage.value = page;
  loadEvents();
}

// 从 URL 导入
async function handleImportUrl() {
  if (!importUrl.value.trim()) {
    message.warning('请输入 URL');
    return;
  }

  importing.value = true;
  try {
    const result = await parseURL(importUrl.value.trim());
    
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

// 创建或更新事件
const createFormRef = ref<FormInst | null>(null);

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

onMounted(() => {
  loadEvents();
});
</script>

<style scoped>
.events-view {
  height: 100%;
}
</style>