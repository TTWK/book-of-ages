<template>
  <n-modal
    :show="show"
    preset="card"
    class="w-full max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden"
    :title="title || '网页快照证据原件'"
    @update:show="$emit('update:show', $event)"
  >
    <template #header-extra>
      <div class="flex items-center space-x-2 mr-4">
        <a
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors flex items-center gap-1"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          新窗口独立打开
        </a>
      </div>
    </template>

    <div class="flex-1 w-full h-[calc(85vh-110px)] bg-stone-100 relative">
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-stone-50/80 z-10"
      >
        <Loader2 class="w-8 h-8 animate-spin text-teal-600" />
      </div>
      <iframe
        v-if="previewUrl"
        :src="previewUrl"
        class="w-full h-full border-0 bg-white"
        sandbox=""
        @load="loading = false"
      ></iframe>
      <div v-else class="flex items-center justify-center h-full text-stone-400">暂无快照文件</div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ExternalLink, Loader2 } from 'lucide-vue-next';
import { getMaterialPreviewUrl } from '../api/materialApi';

const props = defineProps<{
  show: boolean;
  title?: string;
  /** 材料 ID：快照经 /api/materials/:id/preview 提供服务（HTML 响应带 CSP sandbox，脚本禁用） */
  materialId?: string;
}>();

defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const loading = ref(true);
const previewUrl = ref<string>('');

watch(
  () => props.materialId,
  (id) => {
    loading.value = true;
    previewUrl.value = id ? getMaterialPreviewUrl(id) : '';
  },
  { immediate: true }
);
</script>
