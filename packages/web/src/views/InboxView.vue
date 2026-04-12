<template>
  <div class="relative min-h-[calc(100vh-8rem)]">
    <!-- Pull to Refresh Indicator -->
    <PullToRefresh
      :pull-distance="pullDistance"
      :is-refreshing="isPullRefreshing"
      :is-pulling="isPulling"
    />

    <!-- Header Area -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-text-main tracking-tight">收件箱</h1>
        <p class="text-sm text-neutral-500 mt-1">待处理的抓取记录</p>
      </div>

      <button
        @click="loadEvents"
        :disabled="loading"
        class="flex items-center px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-md font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 shadow-sm"
      >
        <RefreshCw class="w-4 h-4 mr-1" :class="{ 'animate-spin': loading }" />
        刷新
      </button>
    </div>

    <!-- Inbox List -->
    <LoadingSkeleton v-if="loading && events.length === 0" type="cards" :count="3" />

    <EmptyState
      v-else-if="events.length === 0"
      :icon="CheckCircle"
      title="收件箱已清空"
      description="干得漂亮！所有抓取的记录都已处理完毕。"
      icon-bg-class="bg-primary-100"
      icon-color-class="text-primary-500/40"
    />

    <div v-else class="space-y-3 pb-20">
      <div
        v-for="event in events"
        :key="event.id"
        class="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow duration-200 group flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="flex-1 min-w-0 cursor-pointer" @click="openPreview(event)">
          <div class="flex items-start mb-1">
            <div class="w-2 h-2 mt-2 mr-3 rounded-full bg-cta-500 flex-shrink-0"></div>
            <div>
              <h2
                class="text-base font-semibold text-text-main group-hover:text-primary-600 transition-colors line-clamp-1"
              >
                {{ event.title }}
              </h2>
              <p v-if="event.summary" class="text-sm text-neutral-500 mt-1 line-clamp-1">
                {{ event.summary }}
              </p>
            </div>
          </div>

          <div class="flex items-center text-xs text-neutral-400 pl-5 mt-2 space-x-4">
            <span v-if="event.event_date" class="flex items-center">
              <Calendar class="w-3.5 h-3.5 mr-1" />
              {{ new Date(event.event_date).toLocaleDateString() }}
            </span>
            <a
              v-if="event.source_url"
              :href="event.source_url"
              target="_blank"
              @click.stop
              class="flex items-center text-primary-600 hover:text-primary-500 hover:underline"
            >
              <Link class="w-3.5 h-3.5 mr-1" />
              来源链接
            </a>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="flex items-center justify-end space-x-2 pl-5 md:pl-0 shrink-0">
          <button
            @click.stop="handleArchive(event)"
            class="px-3 py-1.5 text-sm text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-md font-medium transition-colors cursor-pointer flex items-center"
          >
            <Archive class="w-4 h-4 mr-1" />
            归档
          </button>
          <button
            @click.stop="handleConfirm(event)"
            class="px-4 py-1.5 text-sm text-white bg-cta-500 hover:bg-cta-400 rounded-md font-medium transition-colors cursor-pointer flex items-center shadow-sm shadow-cta-500/20"
          >
            <Check class="w-4 h-4 mr-1" />
            收录
          </button>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <n-modal v-model:show="showPreview" preset="card" class="max-w-2xl" title="预览待处理事件">
      <div v-if="selectedEvent" class="space-y-4">
        <div>
          <h2 class="text-xl font-bold text-text-main">{{ selectedEvent.title }}</h2>
          <div class="flex items-center space-x-3 text-sm text-neutral-500 mt-2">
            <StatusBadge status="draft" />
            <span v-if="selectedEvent.event_date" class="flex items-center">
              <Calendar class="w-4 h-4 mr-1" />
              {{ new Date(selectedEvent.event_date).toLocaleDateString() }}
            </span>
          </div>
        </div>

        <div
          v-if="selectedEvent.summary"
          class="p-4 bg-neutral-50 rounded-lg text-neutral-700 text-sm"
        >
          {{ selectedEvent.summary }}
        </div>

        <div class="prose prose-sm max-w-none max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          <p class="whitespace-pre-wrap text-neutral-600">{{ selectedEvent.content }}</p>
        </div>

        <div v-if="selectedEvent.source_url" class="pt-2">
          <a
            :href="selectedEvent.source_url"
            target="_blank"
            class="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-md transition-colors text-sm font-medium"
          >
            <ExternalLink class="w-4 h-4 mr-2" />
            打开原始的链接
          </a>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between items-center w-full">
          <button
            @click="showPreview = false"
            class="px-4 py-2 text-neutral-500 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
          >
            关闭
          </button>
          <div class="flex space-x-3">
            <button
              @click="handleArchive(selectedEvent)"
              class="px-4 py-2 text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors cursor-pointer flex items-center"
            >
              <Archive class="w-4 h-4 mr-2" />
              归档
            </button>
            <button
              @click="handleConfirm(selectedEvent)"
              class="px-6 py-2 bg-cta-500 hover:bg-cta-400 text-white rounded-md font-medium transition-colors flex items-center cursor-pointer shadow-sm"
            >
              <Check class="w-4 h-4 mr-2" />
              确认收录
            </button>
          </div>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import {
  RefreshCw,
  CheckCircle,
  Calendar,
  Link,
  Archive,
  Check,
  ExternalLink,
} from 'lucide-vue-next';
import type { Event } from '@book-of-ages/shared';
import { getEventList, updateEvent } from '../api/eventApi';
import { EmptyState, LoadingSkeleton, StatusBadge } from '../components/ui';
import { useCommonUndoActions } from '../composables/useUndo';
import { usePullToRefresh } from '../composables/usePullToRefresh';
import PullToRefresh from '../components/PullToRefresh.vue';

const message = useMessage();

// Undo 功能
const { archiveEvent } = useCommonUndoActions(message);

const events = ref<Event[]>([]);
const loading = ref(false);
const showPreview = ref(false);
const selectedEvent = ref<Event | null>(null);

// 下拉刷新
const {
  isRefreshing: isPullRefreshing,
  pullDistance,
  isPulling,
} = usePullToRefresh(async () => {
  await loadEvents();
});

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

function openPreview(event: Event) {
  selectedEvent.value = event;
  showPreview.value = true;
}

async function handleConfirm(event: Event | null) {
  if (!event) return;
  try {
    await updateEvent(event.id, { status: 'confirmed' });
    message.success('已收录事件');
    showPreview.value = false;
    events.value = events.value.filter((e) => e.id !== event.id);
  } catch (error) {
    message.error('收录失败');
    console.error(error);
  }
}

async function handleArchive(event: Event | null) {
  if (!event) return;
  await archiveEvent(
    event.id,
    async () => {
      await updateEvent(event.id, { status: 'archived' });
      events.value = events.value.filter((e) => e.id !== event.id);
    },
    async () => {
      await updateEvent(event.id, { status: 'draft' });
      events.value = [...events.value, event].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    '事件'
  );
  showPreview.value = false;
}

onMounted(() => {
  loadEvents();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(13, 148, 136, 0.2);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(13, 148, 136, 0.4);
}
</style>
