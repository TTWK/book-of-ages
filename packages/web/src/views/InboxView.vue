<template>
  <div class="relative min-h-[calc(100vh-10rem)]">
    <!-- Pull to Refresh Indicator -->
    <PullToRefresh
      :pull-distance="pullDistance"
      :is-refreshing="isPullRefreshing"
      :is-pulling="isPulling"
    />

    <!-- Header Area -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
      <div>
        <h1 class="text-4xl font-serif font-bold text-stone-900 mb-2">收件箱</h1>
        <p class="text-stone-500 font-medium">审阅 Agent 采集的片段，编撰入册</p>
      </div>

      <div class="flex items-center space-x-3">
        <button
          v-if="events.length > 0"
          @click="toggleSelectAll"
          class="flex items-center px-4 py-2 bg-white border border-stone-200 hover:border-stone-900 text-stone-900 rounded-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          {{ selectedIds.length === events.length ? '取消全选' : '全选本页' }}
        </button>
        <button
          @click="loadEvents"
          :disabled="loading"
          class="flex items-center px-4 py-2 bg-white border border-stone-200 hover:border-stone-900 text-stone-900 rounded-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 whitespace-nowrap flex-shrink-0"
        >
          <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
          刷新状态
        </button>
      </div>
    </div>

    <!-- Inbox List -->
    <LoadingSkeleton v-if="loading && events.length === 0" type="cards" :count="3" />

    <EmptyState
      v-else-if="events.length === 0"
      :icon="CheckCircle"
      title="清逸如初"
      description="所有的采集记录都已审阅完毕，史书已准备就绪。"
      icon-bg-class="bg-stone-100"
      icon-color-class="text-stone-300"
    />

    <div v-else class="space-y-4 pb-20">
      <div
        v-for="event in events"
        :key="event.id"
        class="card-scrapbook p-5 group flex flex-col md:flex-row md:items-center justify-between gap-6 relative"
        :class="{ 'border- stone-900 ring-1 ring-stone-900': selectedIds.includes(event.id) }"
      >
        <!-- Checkbox Overlay -->
        <div class="absolute left-2 top-2 z-10">
          <n-checkbox
            :checked="selectedIds.includes(event.id)"
            @update:checked="(val: boolean) => toggleSelect(event.id, val)"
          />
        </div>

        <div class="flex-1 min-w-0 cursor-pointer pl-6" @click="openPreview(event)">
          <div class="flex items-start mb-2">
            <div
              class="w-2 h-2 mt-2 mr-4 rounded-full bg-cta-500 flex-shrink-0 animate-pulse"
            ></div>
            <div>
              <h2
                class="text-xl font-serif font-bold text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-1 leading-tight"
              >
                {{ event.title }}
              </h2>
              <p
                v-if="event.summary"
                class="text-stone-500 mt-2 text-sm line-clamp-1 leading-relaxed"
              >
                {{ event.summary }}
              </p>
            </div>
          </div>

          <div
            class="flex items-center text-xs font-bold tracking-widest text-stone-400 uppercase pl-6 mt-2 space-x-6"
          >
            <span v-if="event.event_date" class="flex items-center">
              <Calendar class="w-3.5 h-3.5 mr-1.5" />
              {{ new Date(event.event_date).toLocaleDateString() }}
            </span>
            <a
              v-if="event.source_url"
              :href="event.source_url"
              target="_blank"
              @click.stop
              class="flex items-center text-stone-600 hover:text-stone-900 transition-colors"
            >
              <Link class="w-3.5 h-3.5 mr-1.5" />
              原始档案
            </a>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="flex items-center justify-end space-x-2 pl-6 md:pl-0 shrink-0">
          <button
            @click.stop="handleArchive(event)"
            class="px-4 py-2 text-sm text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-sm font-bold transition-all cursor-pointer flex items-center"
          >
            <Archive class="w-4 h-4 mr-2" />
            归档
          </button>
          <button
            @click.stop="handleConfirm(event)"
            class="px-6 py-2 text-sm text-white bg-stone-900 hover:bg-stone-800 rounded-sm font-bold transition-all cursor-pointer flex items-center shadow-sm"
          >
            <Check class="w-4 h-4 mr-2" />
            入册
          </button>
        </div>
      </div>
    </div>

    <!-- Batch Action Bar -->
    <Transition name="fade">
      <div
        v-if="selectedIds.length > 0"
        class="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-6 border border-stone-800"
      >
        <div class="flex items-center space-x-2 border-r border-stone-700 pr-6 mr-2">
          <span class="text-stone-400 font-bold text-xs uppercase tracking-widest">已选中</span>
          <span class="bg-cta-500 text-white px-2 py-0.5 rounded-full text-xs font-black">{{
            selectedIds.length
          }}</span>
        </div>

        <div class="flex items-center space-x-4">
          <button
            @click="handleBatchConfirm"
            :disabled="batchProcessing"
            class="flex items-center hover:text-cta-400 transition-colors font-bold text-sm cursor-pointer disabled:opacity-50"
          >
            <Check class="w-4 h-4 mr-2" />
            批量收录
          </button>
          <button
            @click="handleBatchArchive"
            :disabled="batchProcessing"
            class="flex items-center hover:text-stone-300 transition-colors font-bold text-sm cursor-pointer disabled:opacity-50"
          >
            <Archive class="w-4 h-4 mr-2" />
            批量归档
          </button>
          <button
            @click="selectedIds = []"
            class="p-1 hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </Transition>

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
  X,
} from 'lucide-vue-next';
import type { Event } from '@book-of-ages/shared';
import { getEventList, updateEvent, batchUpdateEvents } from '../api/eventApi';
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

// 批量操作
const selectedIds = ref<string[]>([]);
const batchProcessing = ref(false);

function toggleSelect(id: string, selected: boolean) {
  if (selected) {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value.push(id);
    }
  } else {
    selectedIds.value = selectedIds.value.filter((i) => i !== id);
  }
}

function toggleSelectAll() {
  if (selectedIds.value.length === events.value.length) {
    selectedIds.value = [];
  } else {
    selectedIds.value = events.value.map((e) => e.id);
  }
}

async function handleBatchConfirm() {
  if (selectedIds.value.length === 0) return;
  batchProcessing.value = true;
  try {
    const result = await batchUpdateEvents(selectedIds.value, { status: 'confirmed' });
    message.success(`成功收录 ${result.successIds.length} 条事件`);
    events.value = events.value.filter((e) => !result.successIds.includes(e.id));
    selectedIds.value = [];
  } catch (error) {
    message.error('批量收录失败');
  } finally {
    batchProcessing.value = false;
  }
}

async function handleBatchArchive() {
  if (selectedIds.value.length === 0) return;
  batchProcessing.value = true;
  try {
    const result = await batchUpdateEvents(selectedIds.value, { status: 'archived' });
    message.success(`成功归档 ${result.successIds.length} 条事件`);
    events.value = events.value.filter((e) => !result.successIds.includes(e.id));
    selectedIds.value = [];
  } catch (error) {
    message.error('批量归档失败');
  } finally {
    batchProcessing.value = false;
  }
}

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

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
