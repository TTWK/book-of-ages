<template>
  <n-modal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    class="max-w-2xl"
    :title="editingId ? '修订记忆' : '开启新篇章'"
  >
    <n-form ref="formRef" :model="form" :rules="rules">
      <div
        v-if="!editingId"
        class="mb-8 p-6 bg-stone-50 rounded-sm border border-stone-100"
      >
        <label class="block text-xs font-bold tracking-widest text-stone-900 uppercase mb-3"
          >灵感捕捉 (从 URL 导入)</label
        >
        <div class="flex space-x-2">
          <input
            v-model="importUrl"
            type="text"
            placeholder="https://..."
            class="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 transition-all text-sm"
          />
          <button
            @click.prevent="handleImportUrl"
            :disabled="importing"
            class="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-sm font-semibold transition-colors disabled:opacity-50 flex items-center cursor-pointer text-sm"
          >
            <Loader2 v-if="importing" class="w-4 h-4 mr-2 animate-spin" />
            <Download v-else class="w-4 h-4 mr-2" />
            提取
          </button>
        </div>
      </div>

      <n-form-item label="标题" path="title">
        <n-input v-model:value="form.title" placeholder="为这段记忆命名" size="large" />
      </n-form-item>

      <n-form-item label="摘要" path="summary">
        <n-input
          v-model:value="form.summary"
          type="textarea"
          placeholder="简要概括其要义"
          :rows="2"
        />
      </n-form-item>

      <n-form-item label="详细内容 (Markdown)" path="content">
        <n-input
          v-model:value="form.content"
          type="textarea"
          placeholder="在此详尽叙述细节..."
          :rows="6"
        />
      </n-form-item>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <n-form-item label="发生日期" path="event_date">
          <n-date-picker
            v-model:value="form.event_date"
            type="date"
            clearable
            class="w-full"
          />
        </n-form-item>
        <n-form-item label="原始来源" path="source_url">
          <n-input v-model:value="form.source_url" placeholder="https://..." />
        </n-form-item>
      </div>

      <n-form-item label="标签关联" path="tags">
        <n-select
          v-model:value="form.tags"
          multiple
          filterable
          tag
          placeholder="输入关键词并按回车"
          :options="[]"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          @click="$emit('update:show', false)"
          class="px-5 py-2 text-stone-500 bg-stone-100 hover:bg-stone-200 rounded-sm font-semibold transition-colors cursor-pointer"
        >
          取消
        </button>
        <button
          @click="handleSave"
          :disabled="saving"
          class="px-8 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-sm font-bold transition-all flex items-center cursor-pointer shadow-sm active:scale-95"
        >
          <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
          <Save v-else class="w-4 h-4 mr-2" />
          封存
        </button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FormRules, FormInst } from 'naive-ui';
import { useMessage } from 'naive-ui';
import { Loader2, Download, Save } from 'lucide-vue-next';
import { parseURL } from '../api/toolApi';

const props = defineProps<{
  show: boolean;
  editingId: string | null;
  initialData: {
    title: string;
    summary: string;
    content: string;
    event_date: number | null;
    source_url: string;
    tags: string[];
  };
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'save', data: any): void;
}>();

const message = useMessage();
const formRef = ref<FormInst | null>(null);
const importing = ref(false);
const saving = ref(false);
const importUrl = ref('');

const form = ref({ ...props.initialData });

watch(() => props.initialData, (newVal) => {
  form.value = { ...newVal };
  importUrl.value = '';
}, { deep: true });

const rules: FormRules = {
  title: { required: true, message: '名不正则言不顺，请输入标题', trigger: 'blur' },
};

async function handleImportUrl() {
  if (!importUrl.value.trim()) {
    message.warning('请输入档案地址');
    return;
  }

  importing.value = true;
  try {
    const result = await parseURL(importUrl.value.trim());
    if (!form.value.title) form.value.title = result.title;
    if (!form.value.summary) form.value.summary = result.content.slice(0, 200) + '...';
    if (!form.value.content) form.value.content = result.content;
    if (!form.value.source_url) form.value.source_url = importUrl.value;
    message.success('提取成功');
  } catch (error) {
    message.error('提取档案失败');
    console.error(error);
  } finally {
    importing.value = false;
  }
}

async function handleSave() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    await emit('save', form.value);
  } catch (error) {
    // Error handled by parent
  } finally {
    saving.value = false;
  }
}
</script>
