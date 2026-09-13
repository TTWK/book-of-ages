<template>
  <div class="relative min-h-[calc(100vh-8rem)] max-w-5xl mx-auto">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1
          class="text-2xl font-bold text-[#134E4A] dark:text-stone-100 tracking-tight flex items-center"
        >
          <Sparkles class="w-6 h-6 mr-2 text-[#0D9488]" />
          AI 建议收件箱
        </h1>
        <p class="text-sm text-gray-500 dark:text-stone-400 mt-1">
          外部 Agent 的改进建议（打标签 / 润色摘要 / 推断日期 /
          疑似重复）。建议不会直接生效，由你逐条定夺。
        </p>
      </div>
      <button
        @click="loadSuggestions"
        class="p-2 text-gray-400 hover:text-[#0D9488] bg-gray-50 dark:bg-stone-900 hover:bg-[#F0FDFA] rounded transition-colors cursor-pointer"
        title="刷新"
      >
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <div class="flex items-center space-x-2 mb-4">
      <button
        v-for="option in statusOptions"
        :key="option.value"
        @click="activeStatus = option.value"
        class="px-4 py-1.5 rounded-full text-sm transition-colors cursor-pointer border"
        :class="
          activeStatus === option.value
            ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100 font-semibold'
            : 'text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-400'
        "
      >
        {{ option.label }}
      </button>
    </div>

    <LoadingSkeleton v-if="loading" />

    <div
      v-else-if="suggestions.length === 0"
      class="flex flex-col items-center justify-center py-20 text-gray-400"
    >
      <Inbox class="w-10 h-10 mb-3 text-gray-200" />
      <p class="text-sm">暂无{{ activeStatus === 'pending' ? '待审' : '' }}建议</p>
      <p class="text-xs text-gray-400 mt-1">可通过 MCP 工具 propose_suggestion 让 Agent 提交建议</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        class="bg-white dark:bg-stone-900 rounded-xl border border-gray-100 dark:border-stone-800 p-5"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center flex-wrap gap-2 mb-2">
              <span
                class="text-xs font-bold px-2 py-0.5 rounded"
                :class="typeBadgeClass(suggestion.type)"
              >
                {{ typeLabel(suggestion.type) }}
              </span>
              <button
                class="text-[10px] text-gray-400 font-mono bg-gray-50 dark:bg-stone-800 px-1 rounded hover:text-[#0D9488] transition-colors cursor-pointer"
                title="查看目标事件"
                @click="goEvent(suggestion.target_id)"
              >
                {{ suggestion.target_id.slice(0, 8) }}…
              </button>
              <span v-if="suggestion.model" class="text-[10px] text-gray-400">
                {{ suggestion.model }}
              </span>
              <span class="text-[10px] text-gray-400">
                {{ new Date(suggestion.created_at).toLocaleString() }}
              </span>
            </div>

            <p class="text-sm text-gray-700 dark:text-stone-300 leading-relaxed">
              {{ describePayload(suggestion) }}
            </p>
            <p v-if="suggestion.rationale" class="text-xs text-gray-400 mt-1.5 leading-relaxed">
              理由：{{ suggestion.rationale }}
            </p>
          </div>

          <div v-if="suggestion.status === 'pending'" class="flex-shrink-0 flex items-center gap-2">
            <button
              @click="handleAccept(suggestion)"
              class="px-3 py-1.5 text-white bg-[#0D9488] hover:bg-[#14B8A6] rounded-md text-xs font-bold transition-colors cursor-pointer"
            >
              采纳
            </button>
            <button
              @click="handleDismiss(suggestion)"
              class="px-3 py-1.5 text-gray-600 dark:text-stone-400 bg-gray-100 dark:bg-stone-800 hover:bg-gray-200 rounded-md text-xs transition-colors cursor-pointer"
            >
              驳回
            </button>
          </div>
          <span
            v-else
            class="flex-shrink-0 text-xs px-2 py-1 rounded"
            :class="
              suggestion.status === 'accepted'
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-gray-500 bg-gray-100'
            "
          >
            {{ suggestion.status === 'accepted' ? '已采纳' : '已驳回' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { Sparkles, RefreshCw, Inbox } from 'lucide-vue-next';
import { LoadingSkeleton } from '../components/ui';
import { useConfirm } from '../composables/useConfirm';
import type { AISuggestion, AISuggestionStatus } from '@book-of-ages/shared';
import { getSuggestions, acceptSuggestion, dismissSuggestion } from '../api/suggestionApi';

const router = useRouter();
const message = useMessage();
const confirm = useConfirm();

const loading = ref(true);
const suggestions = ref<AISuggestion[]>([]);
const activeStatus = ref<AISuggestionStatus>('pending');

const statusOptions: Array<{ label: string; value: AISuggestionStatus }> = [
  { label: '待审', value: 'pending' },
  { label: '已采纳', value: 'accepted' },
  { label: '已驳回', value: 'dismissed' },
];

async function loadSuggestions() {
  loading.value = true;
  try {
    suggestions.value = await getSuggestions(activeStatus.value);
  } catch (_error) {
    message.error('加载建议失败');
  } finally {
    loading.value = false;
  }
}

function typeLabel(type: AISuggestion['type']): string {
  const map: Record<string, string> = {
    tag: '补充标签',
    summary: '润色摘要',
    date: '推断日期',
    merge: '疑似重复',
  };
  return map[type] || type;
}

function typeBadgeClass(type: AISuggestion['type']): string {
  const map: Record<string, string> = {
    tag: 'text-teal-700 bg-teal-50',
    summary: 'text-blue-700 bg-blue-50',
    date: 'text-amber-700 bg-amber-50',
    merge: 'text-rose-700 bg-rose-50',
  };
  return map[type] || 'text-gray-600 bg-gray-100';
}

function describePayload(suggestion: AISuggestion): string {
  const { type, payload } = suggestion;
  if (type === 'tag') {
    return `为事件追加标签：${(payload.tag_names ?? []).join('、') || '（空）'}`;
  }
  if (type === 'summary') {
    return `将摘要润色为：${payload.summary || '（空）'}`;
  }
  if (type === 'date') {
    return `将事件日期推断为：${payload.event_date || '（空）'}`;
  }
  if (type === 'merge') {
    return `疑似与事件 ${payload.merge_into_event_id?.slice(0, 8) || '?'}… 重复（采纳后互挂"疑似重复"标记，请人工完成合并）`;
  }
  return JSON.stringify(payload);
}

async function handleAccept(suggestion: AISuggestion) {
  const confirmed = await confirm({
    title: '采纳建议',
    content: `确认执行该${typeLabel(suggestion.type)}建议？采纳后立即生效并记入操作日志。`,
    confirmText: '采纳',
    cancelText: '取消',
  });
  if (!confirmed) return;

  try {
    await acceptSuggestion(suggestion.id);
    message.success('建议已采纳');
    await loadSuggestions();
  } catch (_error) {
    message.error('采纳失败');
  }
}

async function handleDismiss(suggestion: AISuggestion) {
  const confirmed = await confirm({
    title: '驳回建议',
    content: '确认驳回该建议？驳回后可在"已驳回"标签中查看。',
    confirmText: '驳回',
    cancelText: '取消',
  });
  if (!confirmed) return;

  try {
    await dismissSuggestion(suggestion.id);
    message.success('已驳回');
    await loadSuggestions();
  } catch (_error) {
    message.error('驳回失败');
  }
}

function goEvent(id: string) {
  router.push(`/events/${id}`);
}

watch(activeStatus, () => {
  loadSuggestions();
});

onMounted(() => {
  loadSuggestions();
});
</script>
