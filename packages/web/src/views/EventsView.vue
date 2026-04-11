<template>
  <div class="relative min-h-[calc(100vh-8rem)]">
    <!-- Header Area -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-[#134E4A] tracking-tight">事件库</h1>

      <div class="hidden md:flex items-center space-x-4">
        <n-select
          v-model:value="statusFilter"
          :options="statusOptions"
          class="w-32"
          @update:value="loadEvents"
        />
        <button
          @click="openCreateModal"
          class="flex items-center px-4 py-2 bg-[#F97316] hover:bg-[#FB923C] text-white rounded-md font-medium transition-colors duration-200 cursor-pointer shadow-sm shadow-orange-500/20"
        >
          <Plus class="w-5 h-5 mr-1" />
          新建事件
        </button>
      </div>
    </div>

    <!-- Events List -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <Loader2 class="w-8 h-8 animate-spin text-[#0D9488]" />
    </div>

    <div
      v-else-if="events.length === 0"
      class="flex flex-col items-center justify-center py-20 text-gray-500"
    >
      <InboxIcon class="w-12 h-12 mb-4 text-gray-300" />
      <p class="text-lg">暂无事件记录</p>
    </div>

    <div v-else class="space-y-4 pb-20">
      <div
        v-for="event in events"
        :key="event.id"
        @click="router.push(`/events/${event.id}`)"
        class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0D9488]/30 transition-all duration-200 cursor-pointer group"
      >
        <div class="flex justify-between items-start mb-2">
          <h2
            class="text-lg font-semibold text-[#134E4A] group-hover:text-[#0D9488] transition-colors line-clamp-1"
          >
            {{ event.title }}
          </h2>
          <span
            class="px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap"
            :class="getStatusColor(event.status)"
          >
            {{ getStatusLabel(event.status) }}
          </span>
        </div>

        <p v-if="event.summary" class="text-sm text-gray-600 mb-3 line-clamp-2">
          {{ event.summary }}
        </p>

        <div class="flex items-center justify-between text-xs text-gray-400">
          <div class="flex items-center space-x-3">
            <span v-if="event.event_date" class="flex items-center">
              <Calendar class="w-3.5 h-3.5 mr-1" />
              {{ new Date(event.event_date).toLocaleDateString() }}
            </span>
          </div>
          <button
            @click.stop="openEditModal(event)"
            class="p-1.5 text-gray-400 hover:text-[#0D9488] hover:bg-[#0D9488]/10 rounded transition-colors"
          >
            <Edit2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex justify-center pt-6">
        <n-pagination
          v-model:page="currentPage"
          :item-count="paginationState.itemCount"
          :page-size="20"
          @update:page="onPageChange"
        />
      </div>
    </div>

    <!-- Mobile FAB -->
    <button
      @click="openCreateModal"
      class="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-[#F97316] text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 hover:bg-[#FB923C] active:scale-95 transition-all z-40 cursor-pointer"
    >
      <Plus class="w-6 h-6" />
    </button>

    <!-- Create/Edit Modal -->
    <n-modal
      v-model:show="showEventModal"
      preset="card"
      class="max-w-2xl"
      :title="editingEventId ? '编辑事件' : '新建事件'"
    >
      <n-form ref="createFormRef" :model="eventForm" :rules="formRules">
        <div
          v-if="!editingEventId"
          class="mb-6 p-4 bg-[#F0FDFA] rounded-lg border border-[#14B8A6]/20"
        >
          <label class="block text-sm font-medium text-[#134E4A] mb-2"
            >一键剪藏 (从 URL 导入)</label
          >
          <div class="flex space-x-2">
            <input
              v-model="importUrl"
              type="text"
              placeholder="https://..."
              class="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/50 focus:border-[#0D9488] transition-all"
            />
            <button
              @click.prevent="handleImportUrl"
              :disabled="importing"
              class="px-4 py-2 bg-[#0D9488] hover:bg-[#14B8A6] text-white rounded-md font-medium transition-colors disabled:opacity-50 flex items-center cursor-pointer"
            >
              <Loader2 v-if="importing" class="w-4 h-4 mr-2 animate-spin" />
              <Download v-else class="w-4 h-4 mr-2" />
              提取
            </button>
          </div>
        </div>

        <n-form-item label="标题" path="title">
          <n-input v-model:value="eventForm.title" placeholder="输入事件标题" size="large" />
        </n-form-item>

        <n-form-item label="摘要" path="summary">
          <n-input
            v-model:value="eventForm.summary"
            type="textarea"
            placeholder="简要描述事件"
            :rows="2"
          />
        </n-form-item>

        <n-form-item label="详细内容 (Markdown)" path="content">
          <n-input
            v-model:value="eventForm.content"
            type="textarea"
            placeholder="正文..."
            :rows="6"
          />
        </n-form-item>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <n-form-item label="发生日期" path="event_date">
            <n-date-picker
              v-model:value="eventForm.event_date"
              type="date"
              clearable
              class="w-full"
            />
          </n-form-item>
          <n-form-item label="来源链接" path="source_url">
            <n-input v-model:value="eventForm.source_url" placeholder="https://..." />
          </n-form-item>
        </div>

        <!-- Tags placeholder -->
        <n-form-item label="标签" path="tags">
          <n-select
            v-model:value="eventForm.tags"
            multiple
            filterable
            tag
            placeholder="输入按回车创建标签"
            :options="[]"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            @click="showEventModal = false"
            class="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            @click="handleSave"
            :disabled="saving"
            class="px-6 py-2 bg-[#F97316] hover:bg-[#FB923C] text-white rounded-md font-medium transition-colors flex items-center cursor-pointer shadow-sm"
          >
            <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
            <Save v-else class="w-4 h-4 mr-2" />
            保存
          </button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { FormRules, FormInst } from 'naive-ui';
import { useMessage } from 'naive-ui';
import {
  Plus,
  Loader2,
  Calendar,
  Edit2,
  Inbox as InboxIcon,
  Download,
  Save,
} from 'lucide-vue-next';
import type { Event, EventStatus } from '@book-of-ages/shared';
import { getEventList, createEvent, updateEvent } from '../api/eventApi';
import { parseURL } from '../api/toolApi';

const message = useMessage();
const router = useRouter();

const events = ref<Event[]>([]);
const loading = ref(false);
const showEventModal = ref(false);
const saving = ref(false);
const importing = ref(false);
const statusFilter = ref<EventStatus | 'all'>('confirmed');
const currentPage = ref(1);
const importUrl = ref('');
const editingEventId = ref<string | null>(null);

const statusOptions = [
  { label: '全部', value: 'all' },
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
  tags: [] as string[],
});

const formRules: FormRules = {
  title: { required: true, message: '请输入标题', trigger: 'blur' },
};

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-teal-100 text-teal-800',
    archived: 'bg-gray-100 text-gray-600',
    deleted: 'bg-red-100 text-red-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft: '待收录',
    confirmed: '已收录',
    archived: '已归档',
    deleted: '已删除',
  };
  return map[status] || status;
}

function openCreateModal() {
  editingEventId.value = null;
  eventForm.value = {
    title: '',
    summary: '',
    content: '',
    event_date: null,
    source_url: '',
    tags: [],
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
    tags: [], // Assuming tags aren't fully loaded in the list, or need separate logic
  };
  importUrl.value = '';
  showEventModal.value = true;
}

const paginationState = {
  itemCount: 0,
};

async function loadEvents() {
  loading.value = true;
  try {
    const result = await getEventList({
      status: statusFilter.value === 'all' ? undefined : (statusFilter.value as EventStatus),
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

function onPageChange(page: number) {
  currentPage.value = page;
  loadEvents();
}

async function handleImportUrl() {
  if (!importUrl.value.trim()) {
    message.warning('请输入 URL');
    return;
  }

  importing.value = true;
  try {
    const result = await parseURL(importUrl.value.trim());
    if (!eventForm.value.title) eventForm.value.title = result.title;
    if (!eventForm.value.summary) eventForm.value.summary = result.content.slice(0, 200) + '...';
    if (!eventForm.value.content) eventForm.value.content = result.content;
    if (!eventForm.value.source_url) eventForm.value.source_url = importUrl.value;
    message.success('提取成功');
  } catch (error) {
    message.error('提取失败');
    console.error(error);
  } finally {
    importing.value = false;
  }
}

const createFormRef = ref<FormInst | null>(null);

async function handleSave() {
  await createFormRef.value?.validate();

  saving.value = true;
  try {
    const payload: any = {
      title: eventForm.value.title,
      summary: eventForm.value.summary || undefined,
      content: eventForm.value.content || undefined,
      event_date: eventForm.value.event_date
        ? new Date(eventForm.value.event_date).toISOString()
        : undefined,
      source_url: eventForm.value.source_url || undefined,
      tags: eventForm.value.tags, // Send tags as array of strings
    };

    if (editingEventId.value) {
      await updateEvent(editingEventId.value, payload);
      message.success('更新成功');
    } else {
      // Create manually: default confirmed
      await createEvent({ ...payload, status: 'confirmed' });
      message.success('已成功收录');
    }

    showEventModal.value = false;
    loadEvents();
  } catch (error: any) {
    if (error.response?.status === 403) {
      message.error('无法修改：外部 Agent 无权修改已收录的主体内容');
    } else {
      message.error(editingEventId.value ? '更新失败' : '创建失败');
    }
    console.error(error);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadEvents();
});
</script>
