<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[#134E4A]">时间分析</h1>
      <div class="flex space-x-2">
        <button
          v-for="g in granularities"
          :key="g.value"
          @click="granularity = g.value"
          :class="[
            'px-3 py-1.5 text-sm rounded-md font-medium transition-colors',
            granularity === g.value
              ? 'bg-[#0D9488] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ]"
        >
          {{ g.label }}
        </button>
      </div>
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
        <div
          v-for="(item, index) in aggregatedData"
          :key="item.period"
          class="flex items-center gap-4"
        >
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import { getTimeAggregation } from '../api/analyticsApi';
import type { TimeAggregationData } from '../api/analyticsApi';

const granularity = ref<'week' | 'month' | 'year'>('month');
const aggregatedData = ref<TimeAggregationData[]>([]);
const loading = ref(true);

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
  if (aggregatedData.value.length === 0) return 0;
  return (totalEvents.value / aggregatedData.value.length).toFixed(1);
});

const maxCount = computed(() => {
  return Math.max(...aggregatedData.value.map((item) => item.count), 1);
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
    const [year, week] = period.split('-');
    return `W${week}`;
  }
  if (granularity.value === 'month') {
    const [year, month] = period.split('-');
    return `${month}月`;
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

watch(granularity, () => {
  loadData();
});

onMounted(() => {
  loadData();
});
</script>
