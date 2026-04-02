<template>
  <div class="inbox-view">
    <n-card title="收件箱">
      <template #header-extra>
        <n-space>
          <n-tag type="info" size="small">草稿事件</n-tag>
          <n-button size="small" @click="loadEvents">
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </template>
            刷新
          </n-button>
        </n-space>
      </template>

      <n-data-table
        :columns="columns"
        :data="events"
        :loading="loading"
        :pagination="pagination"
        @update:checked-row-keys="onChecked"
      />
    </n-card>

    <!-- 快速预览 Modal -->
    <n-modal v-model:show="showPreview" preset="dialog" title="事件预览" :style="{ width: '600px' }">
      <div v-if="selectedEvent" class="preview-content">
        <n-h4>{{ selectedEvent.title }}</n-h4>
        <n-space vertical>
          <n-tag v-if="selectedEvent.status" :type="getStatusType(selectedEvent.status)">
            {{ getStatusLabel(selectedEvent.status) }}
          </n-tag>
          <n-text depth="3">{{ selectedEvent.event_date }}</n-text>
          <n-divider />
          <n-text>{{ selectedEvent.summary }}</n-text>
          <n-divider />
          <n-scrollbar style="max-height: 200px">
            <n-text depth="3">{{ selectedEvent.content }}</n-text>
          </n-scrollbar>
          <n-input-group v-if="selectedEvent.source_url">
            <n-input :value="selectedEvent.source_url" disabled />
            <a :href="selectedEvent.source_url" target="_blank">
              <n-button>打开链接</n-button>
            </a>
          </n-input-group>
        </n-space>
      </div>
      <template #action>
        <n-space justify="space-between">
          <n-space>
            <n-button @click="showPreview = false">关闭</n-button>
            <n-button @click="handlePreview">重新加载预览</n-button>
          </n-space>
          <n-space>
            <n-button type="warning" @click="() => handleArchive()">归档</n-button>
            <n-button type="primary" @click="() => handleConfirm()">收录</n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, computed, onMounted } from 'vue';
import type { DataTableColumns, TagProps } from 'naive-ui';
import { NButton, NTag, NText, NSpace } from 'naive-ui';
import type { Event } from '@book-of-ages/shared';
import { getEventList, updateEvent } from '../api/eventApi';
import { useMessage } from 'naive-ui';

const message = useMessage();

const events = ref<Event[]>([]);
const loading = ref(false);
const showPreview = ref(false);
const selectedEvent = ref<Event | null>(null);

const pagination = computed(() => ({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
}));

// 表格列定义
const columns: DataTableColumns<Event> = [
  {
    type: 'selection',
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) => {
      const typeMap: Record<string, TagProps['type']> = {
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
      h(NText, { depth: row.status === 'draft' ? 1 : 2 }, { default: () => row.title }),
  },
  {
    title: '摘要',
    key: 'summary',
    ellipsis: { tooltip: true },
    width: 300,
  },
  {
    title: '来源',
    key: 'source_url',
    width: 150,
    render: (row) => {
      if (!row.source_url) return h(NText, { depth: 3 }, { default: () => '-' });
      return h(
        'a',
        { href: row.source_url, target: '_blank', style: { fontSize: '12px' } },
        { default: () => '查看链接' }
      );
    },
  },
  {
    title: '日期',
    key: 'event_date',
    width: 120,
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    render: (row) =>
      h(NSpace, {}, {
        default: () => [
          h(NButton, {
            size: 'small',
            onClick: () => openPreview(row),
          }, { default: () => '预览' }),
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => handleConfirm(row),
          }, { default: () => '收录' }),
          h(NButton, {
            size: 'small',
            type: 'warning',
            onClick: () => handleArchive(row),
          }, { default: () => '归档' }),
        ],
      }),
  },
];

// 加载事件列表
async function loadEvents() {
  loading.value = true;
  try {
    const result = await getEventList({ status: 'draft', page: 1, pageSize: 50 });
    events.value = result.items;
  } catch (error) {
    message.error('加载事件列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// 打开预览
function openPreview(event: Event) {
  selectedEvent.value = event;
  showPreview.value = true;
}

// 重新加载预览
function handlePreview() {
  if (selectedEvent.value) {
    openPreview(selectedEvent.value);
  }
}

// 收录事件
async function handleConfirm(event?: Event) {
  const target = event || selectedEvent.value;
  if (!target) return;

  try {
    await updateEvent(target.id, { status: 'confirmed' });
    message.success('已收录事件');
    showPreview.value = false;
    loadEvents();
  } catch (error) {
    message.error('收录失败');
    console.error(error);
  }
}

// 归档事件
async function handleArchive(event?: Event) {
  const target = event || selectedEvent.value;
  if (!target) return;

  try {
    await updateEvent(target.id, { status: 'archived' });
    message.success('已归档事件');
    showPreview.value = false;
    loadEvents();
  } catch (error) {
    message.error('归档失败');
    console.error(error);
  }
}

// 表格选择
function onChecked(rowKeys: (string | number)[]) {
  console.log('选中行:', rowKeys);
}

// 获取状态标签类型
function getStatusType(status: string): TagProps['type'] {
  const typeMap: Record<string, TagProps['type']> = {
    draft: 'warning',
    confirmed: 'success',
    archived: 'info',
    deleted: 'error',
  };
  return typeMap[status] || 'default';
}

// 获取状态标签文本
function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    archived: '已归档',
    deleted: '已删除',
  };
  return labelMap[status] || status;
}

onMounted(() => {
  loadEvents();
});
</script>

<style scoped>
.inbox-view {
  height: 100%;
}

.preview-content {
  padding: 8px 0;
}
</style>
