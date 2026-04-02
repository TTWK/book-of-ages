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
          <n-button type="primary" @click="showCreateModal = true">
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

    <!-- 创建事件 Modal -->
    <n-modal v-model:show="showCreateModal" preset="dialog" title="新建事件">
      <n-form ref="createFormRef" :model="newEvent" :rules="formRules">
        <n-form-item label="标题" path="title">
          <n-input v-model:value="newEvent.title" placeholder="输入事件标题" />
        </n-form-item>
        
        <n-form-item label="从 URL 导入" path="importUrl">
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
              导入
            </n-button>
          </n-input-group>
        </n-form-item>
        
        <n-form-item label="摘要" path="summary">
          <n-input
            v-model:value="newEvent.summary"
            type="textarea"
            placeholder="简要描述事件"
            :rows="2"
          />
        </n-form-item>
        <n-form-item label="内容" path="content">
          <n-input
            v-model:value="newEvent.content"
            type="textarea"
            placeholder="详细内容（支持 Markdown）"
            :rows="6"
          />
        </n-form-item>
        <n-form-item label="事件日期" path="event_date">
          <n-date-picker v-model:value="newEvent.event_date" />
        </n-form-item>
        <n-form-item label="来源链接" path="source_url">
          <n-input v-model:value="newEvent.source_url" placeholder="https://..." />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showCreateModal = false">取消</n-button>
        <n-button type="primary" :loading="creating" @click="handleCreate">创建</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue';
import type { DataTableColumns, FormRules, FormInst } from 'naive-ui';
import { NButton, NTag, NText, useMessage } from 'naive-ui';
import type { Event, EventStatus } from '@book-of-ages/shared';
import { getEventList, createEvent } from '../api/eventApi';
import { parseURL } from '../api/toolApi';
import { useRouter } from 'vue-router';

const message = useMessage();
const router = useRouter();

const events = ref<Event[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const creating = ref(false);
const importing = ref(false);
const statusFilter = ref<EventStatus | undefined>(undefined);
const currentPage = ref(1);
const importUrl = ref('');

const statusOptions = [
  { label: '全部', value: undefined },
  { label: '草稿', value: 'draft' },
  { label: '已确认', value: 'confirmed' },
  { label: '已归档', value: 'archived' },
];

const newEvent = ref({
  title: '',
  summary: '',
  content: '',
  event_date: null as number | null,
  source_url: '',
});

const formRules: FormRules = {
  title: { required: true, message: '请输入标题', trigger: 'blur' },
};

const pagination = {
  page: currentPage.value,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  itemCount: 0,
  onChange: (page: number) => {
    currentPage.value = page;
    loadEvents();
  },
};

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
      h(NButton, {
        size: 'small',
        onClick: () => router.push(`/events/${row.id}`),
      }, { default: () => '详情' }),
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
    pagination.itemCount = result.pagination.total;
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
    if (!newEvent.value.title) {
      newEvent.value.title = result.title;
    }
    if (!newEvent.value.summary) {
      newEvent.value.summary = result.content.slice(0, 200) + '...';
    }
    if (!newEvent.value.content) {
      newEvent.value.content = result.content;
    }
    if (!newEvent.value.source_url) {
      newEvent.value.source_url = importUrl.value;
    }
    
    message.success('导入成功');
  } catch (error) {
    message.error('导入失败');
    console.error(error);
  } finally {
    importing.value = false;
  }
}

// 创建事件
const createFormRef = ref<FormInst | null>(null);

async function handleCreate() {
  await createFormRef.value?.validate();
  
  creating.value = true;
  try {
    await createEvent({
      title: newEvent.value.title,
      summary: newEvent.value.summary || undefined,
      content: newEvent.value.content || undefined,
      status: 'draft',
      event_date: newEvent.value.event_date ? new Date(newEvent.value.event_date).toISOString() : undefined,
      source_url: newEvent.value.source_url || undefined,
    });
    message.success('创建成功');
    showCreateModal.value = false;
    loadEvents();
    // 重置表单
    newEvent.value = {
      title: '',
      summary: '',
      content: '',
      event_date: null,
      source_url: '',
    };
    importUrl.value = '';
  } catch (error) {
    message.error('创建失败');
    console.error(error);
  } finally {
    creating.value = false;
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
