<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
      <div>
        <h1 class="text-4xl font-serif font-bold text-stone-900 mb-2">数据洞察与分析</h1>
        <p class="text-stone-500 font-medium">洞察历史规律，量化时光沉淀，追踪聚类脉络</p>
      </div>

      <!-- Mode Switcher -->
      <div class="flex space-x-2 bg-stone-100 p-1 rounded-md">
        <button
          @click="activeTab = 'time'"
          class="px-4 py-1.5 text-sm rounded-sm font-bold transition-all whitespace-nowrap cursor-pointer"
          :class="
            activeTab === 'time'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          "
        >
          时间维度
        </button>
        <button
          @click="activeTab = 'tag'"
          class="px-4 py-1.5 text-sm rounded-sm font-bold transition-all whitespace-nowrap cursor-pointer"
          :class="
            activeTab === 'tag'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          "
        >
          标签脉络
        </button>
      </div>
    </div>

    <!-- Tab 1: 时间维度分析 -->
    <div v-if="activeTab === 'time'" class="space-y-6">
      <div class="flex justify-end space-x-2">
        <button
          v-for="g in granularities"
          :key="g.value"
          @click="granularity = g.value"
          class="px-4 py-1.5 text-xs rounded-sm font-bold transition-all whitespace-nowrap cursor-pointer"
          :class="
            granularity === g.value
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
          "
        >
          {{ g.label }}
        </button>
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div class="text-sm text-gray-500 mb-1">总事件数</div>
          <div class="text-3xl font-bold text-[#134E4A]">{{ totalEvents }}</div>
        </div>
        <div class="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div class="text-sm text-gray-500 mb-1">活跃周期</div>
          <div class="text-3xl font-bold text-[#134E4A]">{{ activePeriods }}</div>
        </div>
        <div class="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div class="text-sm text-gray-500 mb-1">平均事件/周期</div>
          <div class="text-3xl font-bold text-[#134E4A]">{{ avgPerPeriod }}</div>
        </div>
      </div>

      <!-- 柱状图 -->
      <div class="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h2 class="text-lg font-semibold text-[#134E4A] mb-4">事件趋势</h2>
        <div v-if="loading" class="flex justify-center py-12">
          <Loader2 class="w-8 h-8 animate-spin text-[#0D9488]" />
        </div>
        <div v-else-if="aggregatedData.length === 0" class="text-center py-12 text-gray-400">
          暂无数据
        </div>
        <div v-else class="space-y-3">
          <div v-for="item in aggregatedData" :key="item.period" class="flex items-center gap-4">
            <div class="w-24 text-sm text-gray-600 text-right flex-shrink-0">
              {{ formatPeriod(item.period) }}
            </div>
            <div class="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-[#0D9488] to-[#14B8A6] rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                :style="{ width: `${getBarWidth(item.count)}%` }"
              >
                <span v-if="item.count > 0" class="text-xs font-medium text-white">{{
                  item.count
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 热力图 -->
      <div class="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h2 class="text-lg font-semibold text-[#134E4A] mb-4">密度热力图</h2>
        <div v-if="loading" class="flex justify-center py-12">
          <Loader2 class="w-8 h-8 animate-spin text-[#0D9488]" />
        </div>
        <div v-else-if="aggregatedData.length === 0" class="text-center py-12 text-gray-400">
          暂无数据
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <div
            v-for="item in aggregatedData"
            :key="item.period"
            class="w-12 h-12 rounded-lg flex items-center justify-center text-xs font-medium transition-all hover:scale-110 cursor-pointer"
            :class="getHeatmapColor(item.count)"
            :title="`${formatPeriod(item.period)}: ${item.count} 个事件`"
          >
            {{ item.count }}
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: 标签聚类脉络分析 -->
    <div v-else class="space-y-6">
      <div class="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 class="text-lg font-semibold text-[#134E4A]">按标签聚类追溯</h2>
          <div class="w-72">
            <n-select
              v-model:value="selectedTagId"
              :options="tagSelectOptions"
              placeholder="选择标签查看完整脉络"
              filterable
              @update:value="loadTagAggregation"
            />
          </div>
        </div>

        <div v-if="tagLoading" class="flex justify-center py-12">
          <Loader2 class="w-8 h-8 animate-spin text-[#0D9488]" />
        </div>

        <div
          v-else-if="!selectedTagDetails || selectedTagDetails.events.length === 0"
          class="text-center py-12 text-gray-400"
        >
          {{ selectedTagId ? '该标签下暂无已确认收录的事件' : '请在上方选择一个标签查看历史脉络' }}
        </div>

        <div v-else class="space-y-6">
          <div class="flex items-center space-x-3 pb-4 border-b border-stone-100">
            <span
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: selectedTagDetails.tag.color || '#0D9488' }"
            ></span>
            <span class="text-xl font-serif font-bold text-stone-900">
              {{ selectedTagDetails.tag.name }}
            </span>
            <span class="text-xs bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full font-bold">
              共 {{ selectedTagDetails.events.length }} 卷事件
            </span>
          </div>

          <div class="relative pl-6 space-y-6 border-l-2 border-stone-200 ml-2">
            <div
              v-for="ev in selectedTagDetails.events"
              :key="ev.id"
              class="relative group cursor-pointer"
              @click="router.push(`/events/${ev.id}`)"
            >
              <div
                class="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-stone-900 group-hover:scale-125 transition-transform"
              ></div>
              <div
                class="bg-stone-50 hover:bg-stone-100 p-4 rounded-lg transition-colors border border-stone-100"
              >
                <div class="flex items-start justify-between">
                  <h3
                    class="text-base font-bold text-stone-900 group-hover:text-teal-800 transition-colors"
                  >
                    {{ ev.title }}
                  </h3>
                  <span class="text-xs text-stone-400 font-medium whitespace-nowrap ml-2">
                    {{
                      ev.event_date
                        ? new Date(ev.event_date).toLocaleDateString()
                        : new Date(ev.created_at).toLocaleDateString()
                    }}
                  </span>
                </div>
                <p
                  v-if="ev.summary"
                  class="text-xs text-stone-600 mt-2 line-clamp-2 leading-relaxed"
                >
                  {{ ev.summary }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Loader2 } from 'lucide-vue-next';
import { getTimeAggregation, getTagAggregation } from '../api/analyticsApi';
import { getTagList } from '../api/tagApi';
import type { TimeAggregationData } from '../api/analyticsApi';
import type { Tag, TagAggregationResult } from '@book-of-ages/shared';

const router = useRouter();

const activeTab = ref<'time' | 'tag'>('time');
const granularity = ref<'week' | 'month' | 'year'>('month');
const aggregatedData = ref<TimeAggregationData[]>([]);
const loading = ref(true);

const allTags = ref<Tag[]>([]);
const selectedTagId = ref<string | null>(null);
const selectedTagDetails = ref<TagAggregationResult | null>(null);
const tagLoading = ref(false);

const granularities = [
  { label: '按周', value: 'week' as const },
  { label: '按月', value: 'month' as const },
  { label: '按年', value: 'year' as const },
];

const totalEvents = computed(() => {
  return aggregatedData.value.reduce((sum, item) => sum + item.count, 0);
});

const activePeriods = computed(() => {
  return aggregatedData.value.filter((item) => item.count > 0).length;
});

const avgPerPeriod = computed(() => {
  if (aggregatedData.value.length === 0) return '0.0';
  return (totalEvents.value / aggregatedData.value.length).toFixed(1);
});

const maxCount = computed(() => {
  return Math.max(...aggregatedData.value.map((item) => item.count), 1);
});

const tagSelectOptions = computed(() => {
  return allTags.value.map((t) => ({
    label: `${t.name}`,
    value: t.id,
  }));
});

function getBarWidth(count: number): number {
  if (count === 0) return 2;
  return Math.max((count / maxCount.value) * 100, 10);
}

function getHeatmapColor(count: number): string {
  if (count === 0) return 'bg-gray-100 text-gray-400';
  if (count === 1) return 'bg-teal-100 text-teal-700';
  if (count <= 3) return 'bg-teal-200 text-teal-800';
  if (count <= 5) return 'bg-teal-300 text-teal-900';
  if (count <= 10) return 'bg-teal-400 text-white';
  return 'bg-teal-500 text-white';
}

function formatPeriod(period: string): string {
  if (granularity.value === 'week') {
    const parts = period.split('-');
    return `W${parts[1] || parts[0]}`;
  }
  if (granularity.value === 'month') {
    const parts = period.split('-');
    return `${parts[1] || parts[0]}月`;
  }
  return period;
}

async function loadData() {
  loading.value = true;
  try {
    aggregatedData.value = await getTimeAggregation(granularity.value);
  } catch (error) {
    console.error('加载聚合数据失败:', error);
  } finally {
    loading.value = false;
  }
}

async function loadTagList() {
  try {
    allTags.value = await getTagList();
    if (allTags.value.length > 0 && !selectedTagId.value) {
      selectedTagId.value = allTags.value[0].id;
      await loadTagAggregation();
    }
  } catch (error) {
    console.error('加载标签列表失败:', error);
  }
}

async function loadTagAggregation() {
  if (!selectedTagId.value) return;
  tagLoading.value = true;
  try {
    selectedTagDetails.value = await getTagAggregation(selectedTagId.value);
  } catch (error) {
    console.error('加载标签聚合数据失败:', error);
    selectedTagDetails.value = null;
  } finally {
    tagLoading.value = false;
  }
}

watch(granularity, () => {
  loadData();
});

watch(activeTab, (tab) => {
  if (tab === 'tag' && allTags.value.length === 0) {
    loadTagList();
  }
});

onMounted(() => {
  loadData();
  loadTagList();
});
</script>
