<template>
  <div class="relative min-h-[calc(100vh-8rem)]">
    <!-- Header Area -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-[#134E4A] tracking-tight">时间线</h1>
        <p class="text-sm text-gray-500 mt-1">按时间顺序浏览事件</p>
      </div>

      <div class="flex items-center space-x-3">
        <n-select
          v-model:value="groupBy"
          :options="[
            { label: '按年分组', value: 'year' },
            { label: '按月分组', value: 'month' }
          ]"
          class="w-32"
          @update:value="loadTimeline"
        />
        <button
          @click="loadTimeline"
          :disabled="loading"
          class="flex items-center px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <RefreshCw class="w-4 h-4 mr-1" :class="{ 'animate-spin': loading }" />
          刷新
        </button>
      </div>
    </div>

    <!-- Timeline List -->
    <div v-if="loading && timelineGroups.length === 0" class="flex justify-center items-center py-20">
      <Loader2 class="w-8 h-8 animate-spin text-[#0D9488]" />
    </div>

    <div v-else-if="timelineGroups.length === 0" class="flex flex-col items-center justify-center py-32 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
      <Calendar class="w-16 h-16 mb-4 text-[#14B8A6]/40" />
      <p class="text-xl font-medium text-[#134E4A]">暂无时间线数据</p>
      <p class="text-sm mt-2">收录事件后将自动显示在这里</p>
    </div>

    <div v-else class="space-y-8 pb-20">
      <div v-for="group in timelineGroups" :key="group.label" class="relative">
        <!-- Group Header -->
        <div class="sticky top-0 z-10 bg-white/90 backdrop-blur-sm py-3 mb-4 border-b border-gray-200">
          <h2 class="text-lg font-bold text-[#134E4A]">{{ group.label }}</h2>
          <p class="text-xs text-gray-500 mt-0.5">{{ group.events.length }} 个事件</p>
        </div>

        <!-- Events in Group -->
        <div class="space-y-3">
          <div
            v-for="event in group.events"
            :key="event.id"
            class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 group cursor-pointer"
            @click="openEvent(event.id)"
          >
            <div class="flex items-start">
              <div class="w-2 h-2 mt-2 mr-3 rounded-full bg-[#0D9488] flex-shrink-0"></div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-semibold text-[#134E4A] group-hover:text-[#0D9488] transition-colors line-clamp-1">{{ event.title }}</h3>
                <p v-if="event.summary" class="text-sm text-gray-500 mt-1 line-clamp-2">{{ event.summary }}</p>
                
                <div class="flex items-center text-xs text-gray-400 mt-2 space-x-4">
                  <span v-if="event.event_date" class="flex items-center">
                    <Calendar class="w-3.5 h-3.5 mr-1" />
                    {{ formatDate(event.event_date) }}
                  </span>
                  <span v-if="event.tags && event.tags.length > 0" class="flex items-center">
                    <Hash class="w-3.5 h-3.5 mr-1" />
                    {{ event.tags.map(t => t.name).join(', ') }}
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
import { Loader2, RefreshCw, Calendar, Hash } from 'lucide-vue-next';
import type { Event } from '@book-of-ages/shared';
import { getEventList } from '../api/eventApi';

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
      pageSize: pageSize.value
    });

    total.value = result.pagination.total;
    totalPages.value = result.pagination.totalPages;

    // 按日期分组
    const groups: Map<string, Event[]> = new Map();

    result.items.forEach(event => {
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
        })
      }))
      .sort((a, b) => b.label.localeCompare(a.label, 'zh-CN'));

  } catch (error) {
    message.error('加载时间线失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
