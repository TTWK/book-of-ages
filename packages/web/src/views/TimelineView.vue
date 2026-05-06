<template>
  <div class="relative min-h-[calc(100vh-10rem)]">
    <!-- Header Area -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
      <div>
        <h1 class="text-4xl font-serif font-bold text-stone-900 mb-2">时间轴</h1>
        <p class="text-stone-500 font-medium">纵览岁月更迭，追溯记忆源头</p>
      </div>

      <div class="flex items-center space-x-3">
        <n-select
          v-model:value="groupBy"
          :options="[
            { label: '按年编撰', value: 'year' },
            { label: '按月编撰', value: 'month' },
          ]"
          class="w-36"
          @update:value="loadTimeline"
        />
        <button
          @click="loadTimeline"
          :disabled="loading"
          class="flex items-center px-4 py-2 bg-white border border-stone-200 hover:border-stone-900 text-stone-900 rounded-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 whitespace-nowrap flex-shrink-0"
        >
          <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
          重塑视角
        </button>
      </div>
    </div>

    <!-- Timeline List -->
    <LoadingSkeleton v-if="loading && timelineGroups.length === 0" type="cards" :count="3" />

    <EmptyState
      v-else-if="timelineGroups.length === 0"
      :icon="Calendar"
      title="时光暂无痕迹"
      description="正式收录事件后，它们将在此汇聚成流。"
      icon-bg-class="bg-stone-100"
      icon-color-class="text-stone-300"
    />

    <div v-else class="space-y-12 pb-20 relative">
      <!-- Vertical line through the timeline -->
      <div class="absolute left-[7px] top-4 bottom-10 w-px bg-stone-200 hidden md:block"></div>

      <div v-for="group in timelineGroups" :key="group.label" class="relative pl-0 md:pl-10">
        <!-- Group Header -->
        <div
          class="sticky top-0 z-10 bg-bg-main/90 backdrop-blur-sm py-4 mb-6 border-b border-stone-100 flex items-end justify-between"
        >
          <h2 class="text-2xl font-serif font-bold text-stone-900 leading-none">
            {{ group.label }}
          </h2>
          <p class="text-xs font-bold tracking-widest text-stone-400 uppercase">
            {{ group.events.length }} 卷记录
          </p>
        </div>

        <!-- Events in Group -->
        <div class="space-y-4">
          <div
            v-for="event in group.events"
            :key="event.id"
            class="card-scrapbook group p-5 cursor-pointer relative"
            @click="openEvent(event.id)"
          >
            <!-- Timeline connector dot -->
            <div
              class="absolute -left-[41px] top-[26px] w-4 h-4 rounded-full border-4 border-white bg-stone-900 shadow-sm hidden md:block group-hover:scale-125 transition-transform"
            ></div>

            <div class="flex items-start">
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-2">
                  <h3
                    class="text-xl font-serif font-bold text-stone-900 group-hover:text-stone-700 transition-colors leading-tight"
                  >
                    {{ event.title }}
                  </h3>
                  <span
                    v-if="event.event_date"
                    class="text-xs font-bold tracking-widest text-stone-400 uppercase whitespace-nowrap ml-4"
                  >
                    {{ formatDateShort(event.event_date) }}
                  </span>
                </div>

                <p v-if="event.summary" class="text-stone-600 text-sm leading-relaxed line-clamp-2">
                  {{ event.summary }}
                </p>

                <div
                  v-if="(event as any).tags && (event as any).tags.length > 0"
                  class="flex flex-wrap gap-2 mt-4"
                >
                  <span
                    v-for="tag in (event as any).tags"
                    :key="tag.id"
                    class="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold tracking-widest uppercase rounded-sm"
                  >
                    {{ tag.name }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="flex justify-center mt-6">
      <n-pagination
        v-model:page="currentPage"
        :page-count="totalPages"
        :page-size="pageSize"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { RefreshCw, Calendar } from 'lucide-vue-next';
import type { Event } from '@book-of-ages/shared';
import { getEventList } from '../api/eventApi';
import { LoadingSkeleton, EmptyState } from '../components/ui';

interface TimelineGroup {
  label: string;
  events: Event[];
}

const message = useMessage();
const router = useRouter();

const loading = ref(false);
const timelineGroups = ref<TimelineGroup[]>([]);
const groupBy = ref<'year' | 'month'>('year');
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);
const totalPages = ref(0);

async function loadTimeline() {
  loading.value = true;
  try {
    const result = await getEventList({
      status: 'confirmed',
      page: currentPage.value,
      pageSize: pageSize.value,
    });

    total.value = result.pagination.total;
    totalPages.value = result.pagination.totalPages;

    // 按日期分组
    const groups: Map<string, Event[]> = new Map();

    result.items.forEach((event) => {
      if (!event.event_date) return;

      const date = new Date(event.event_date);
      let label: string;

      if (groupBy.value === 'year') {
        label = `${date.getFullYear()}年`;
      } else {
        label = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
      }

      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label)!.push(event);
    });

    // 转换为数组并按时间排序
    timelineGroups.value = Array.from(groups.entries())
      .map(([label, events]) => ({
        label,
        events: events.sort((a, b) => {
          if (!a.event_date || !b.event_date) return 0;
          return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
        }),
      }))
      .sort((a, b) => b.label.localeCompare(a.label, 'zh-CN'));
  } catch (error) {
    message.error('加载时间线失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function openEvent(id: string) {
  router.push({ name: 'event-detail', params: { id } });
}

function handlePageChange(page: number) {
  currentPage.value = page;
  loadTimeline();
}

onMounted(() => {
  loadTimeline();
});
</script>
