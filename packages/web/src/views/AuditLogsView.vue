<template>
  <div class="relative min-h-[calc(100vh-8rem)]">
    <!-- Header Area -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-[#134E4A] tracking-tight">操作日志</h1>
        <p class="text-sm text-gray-500 mt-1">查看系统操作记录</p>
      </div>

      <button
        @click="loadLogs"
        :disabled="loading"
        class="flex items-center px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 shadow-sm"
      >
        <RefreshCw class="w-4 h-4 mr-1" :class="{ 'animate-spin': loading }" />
        刷新
      </button>
    </div>

    <!-- Logs List -->
    <div v-if="loading && logs.length === 0" class="flex justify-center items-center py-20">
      <Loader2 class="w-8 h-8 animate-spin text-[#0D9488]" />
    </div>

    <div
      v-else-if="logs.length === 0"
      class="flex flex-col items-center justify-center py-32 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm"
    >
      <ScrollText class="w-16 h-16 mb-4 text-[#14B8A6]/40" />
      <p class="text-xl font-medium text-[#134E4A]">暂无操作日志</p>
    </div>

    <div v-else class="space-y-3 pb-20">
      <div
        v-for="log in logs"
        :key="log.id"
        class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <span
                class="px-2 py-0.5 text-xs font-medium rounded-full"
                :class="getActionColor(log.action)"
              >
                {{ log.action }}
              </span>
              <span class="text-sm font-medium text-[#134E4A]">{{ log.entity_type }}</span>
              <span class="text-xs text-gray-400 font-mono"
                >{{ log.entity_id.slice(0, 8) }}...</span
              >
            </div>

            <div class="flex items-center text-xs text-gray-500 space-x-4">
              <span class="flex items-center">
                <Clock class="w-3.5 h-3.5 mr-1" />
                {{ formatDate(log.created_at) }}
              </span>
              <span v-if="log.api_key_id" class="flex items-center">
                <Key class="w-3.5 h-3.5 mr-1" />
                API Key: {{ log.api_key_id.slice(0, 8) }}...
              </span>
              <span v-else class="flex items-center text-[#0D9488]">
                <User class="w-3.5 h-3.5 mr-1" />
                Web UI 操作
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { Loader2, RefreshCw, ScrollText, Clock, Key, User } from 'lucide-vue-next';
import type { OperationLog } from '@book-of-ages/shared';
import { getOperationLogs } from '../api/settingsApi';

const message = useMessage();

const logs = ref<OperationLog[]>([]);
const loading = ref(false);

async function loadLogs() {
  loading.value = true;
  try {
    logs.value = await getOperationLogs(100);
  } catch (error) {
    message.error('加载操作日志失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getActionColor(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
  };
  return map[action] || 'bg-gray-100 text-gray-800';
}

onMounted(() => {
  loadLogs();
});
</script>
