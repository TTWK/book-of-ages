<template>
  <div class="relative min-h-[calc(100vh-10rem)]">
    <!-- Header Area -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
      <div>
        <h1 class="text-4xl font-serif font-bold text-stone-900 mb-2">事件库</h1>
        <p class="text-stone-500 font-medium no-caret">梳理历史脉络，珍藏岁月记忆</p>
      </div>

      <div class="flex items-center space-x-3">
        <n-select
          v-model:value="statusFilter"
          :options="statusOptions"
          class="w-36"
          :consistent-menu-width="false"
          @update:value="loadEvents"
        />
        <button
          @click="router.push({ name: 'tags' })"
          class="flex items-center px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap flex-shrink-0"
        >
          管理标签
        </button>
        <button
          @click="openCreateModal"
          class="flex items-center px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap flex-shrink-0"
        >
          <Plus class="w-5 h-5 mr-2" />
          记录新事件
        </button>
      </div>
    </div>

    <!-- Events List -->
    <LoadingSkeleton v-if="loading" type="cards" :count="3" />

    <EmptyState
      v-else-if="events.length === 0"
      :icon="InboxIcon"
      title="这卷史书尚为空白"
      description="开始记录第一个重要时刻吧"
      icon-bg-class="bg-stone-100"
      icon-color-class="text-stone-400"
    />

    <div v-else class="space-y-6 pb-20">
      <EventCard
        v-for="event in events"
        :key="event.id"
        :event="event"
        @click="router.push(`/events/${event.id}`)"
        @edit="openEditModal"
        @delete="handleDelete"
      />

      <!-- Pagination -->
      <div class="flex justify-center pt-10">
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
      class="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 active:scale-95 transition-all z-40 cursor-pointer"
    >
      <Plus class="w-6 h-6" />
    </button>

    <!-- Create/Edit Modal Component -->
    <EventFormModal
      v-model:show="showEventModal"
      :editing-id="editingEventId"
      :initial-data="eventForm"
      :tag-options="tagOptions"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { Plus, Inbox as InboxIcon } from 'lucide-vue-next';
import type { Event, EventStatus } from '@book-of-ages/shared';
import {
  getEventList,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventTags,
  updateEventTags,
} from '../api/eventApi';
import { getTagList, createTag } from '../api/tagApi';
import { EmptyState, LoadingSkeleton } from '../components/ui';
import { useCommonUndoActions } from '../composables/useUndo';
import EventCard from '../components/EventCard.vue';
import EventFormModal from '../components/EventFormModal.vue';

const message = useMessage();
const router = useRouter();

const { deleteEvent: deleteEventWithUndo } = useCommonUndoActions(message);

const events = ref<Event[]>([]);
const loading = ref(false);
const showEventModal = ref(false);
const statusFilter = ref<EventStatus | 'all'>('confirmed');
const currentPage = ref(1);
const editingEventId = ref<string | null>(null);
const tagOptions = ref<{ label: string; value: string }[]>([]);

async function loadTags() {
  try {
    const data = await getTagList();
    tagOptions.value = data.map((t) => ({ label: t.name, value: t.id }));
  } catch (error) {
    console.error('加载标签失败:', error);
  }
}

const statusOptions = [
  { label: '全部记录', value: 'all' },
  { label: '待处理', value: 'draft' },
  { label: '正式收录', value: 'confirmed' },
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

const paginationState = {
  itemCount: 0,
};

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
  showEventModal.value = true;
}

async function openEditModal(event: Event) {
  editingEventId.value = event.id;
  let currentTags: string[] = [];
  try {
    const tags = await getEventTags(event.id);
    currentTags = tags.map((t) => t.id);
  } catch (error) {
    console.error('加载事件标签失败:', error);
  }

  eventForm.value = {
    title: event.title,
    summary: event.summary || '',
    content: event.content || '',
    event_date: event.event_date ? new Date(event.event_date).getTime() : null,
    source_url: event.source_url || '',
    tags: currentTags,
  };
  showEventModal.value = true;
}

async function handleDelete(event: Event) {
  await deleteEventWithUndo(
    async () => {
      await deleteEvent(event.id);
      events.value = events.value.filter((e) => e.id !== event.id);
    },
    async () => {
      await createEvent({
        title: event.title,
        summary: event.summary,
        content: event.content,
        status: event.status,
        event_date: event.event_date,
        source_url: event.source_url,
      });
      await loadEvents();
    },
    '事件'
  );
}

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
    message.error('加载史书目录失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function onPageChange(page: number) {
  currentPage.value = page;
  loadEvents();
}

const PRESET_COLORS = ['#71717a', '#14b8a6', '#eab308', '#f43f5e', '#22c55e', '#3b82f6'];
const getRandomColor = () => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];

async function processTagsInEventsView(tagValues: string[]): Promise<string[]> {
  const finalTagIds: string[] = [];
  for (const value of tagValues) {
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    if (isId) {
      finalTagIds.push(value);
    } else {
      try {
        const newTag = await createTag({
          name: value,
          color: getRandomColor(),
        });
        finalTagIds.push(newTag.id);
      } catch (e) {
        console.error('创建标签失败:', value);
      }
    }
  }
  return finalTagIds;
}

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

    if (tagValues) {
      const finalTagIds = await processTagsInEventsView(tagValues);
      await updateEventTags(eventId, finalTagIds);
      await loadTags();
    }

    showEventModal.value = false;
    await loadEvents();
  } catch (error: any) {
    if (error.response?.status === 403) {
      message.error('无法修改：已成定论的历史不容篡改');
    } else {
      message.error(editingEventId.value ? '修订失败' : '载入失败');
    }
    throw error;
  }
}

onMounted(() => {
  loadEvents();
  loadTags();
});
</script>
