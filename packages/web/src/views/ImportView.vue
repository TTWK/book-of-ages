<template>
  <div class="space-y-8 max-w-5xl mx-auto pb-16">
    <div>
      <h1 class="text-3xl font-serif font-bold text-stone-900 mb-2">史料批量导入</h1>
      <p class="text-stone-500 font-medium">
        导入浏览器书签或批量 URL，系统将在后台逐条抓取数字快照并推入草稿箱 (Inbox)
      </p>
    </div>

    <!-- 上传与录入卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 方式 1: 上传书签 HTML 或 URL 文本文件 -->
      <div
        class="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center space-x-2 mb-3">
            <Bookmark class="w-5 h-5 text-teal-600" />
            <h2 class="text-lg font-bold text-stone-900">文件上传导入</h2>
          </div>
          <p class="text-xs text-stone-500 leading-relaxed mb-4">
            支持从 Chrome、Edge、Firefox 导出的标准
            <code class="bg-stone-100 px-1 py-0.5 rounded text-stone-700">bookmarks.html</code>
            文件，或包含 URL 列表的
            <code class="bg-stone-100 px-1 py-0.5 rounded text-stone-700">.txt</code> 文件。
          </p>

          <n-upload
            :show-file-list="false"
            :custom-request="handleFileUpload"
            accept=".html,.htm,.txt"
          >
            <n-upload-dragger>
              <div class="py-4 flex flex-col items-center">
                <UploadCloud class="w-10 h-10 text-stone-400 mb-2" />
                <span class="text-sm font-bold text-stone-700">点击或拖拽书签文件到此处</span>
                <span class="text-xs text-stone-400 mt-1">支持 .html, .htm, .txt</span>
              </div>
            </n-upload-dragger>
          </n-upload>
        </div>
      </div>

      <!-- 方式 2: 粘贴 URL 列表文本 -->
      <div
        class="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center space-x-2 mb-3">
            <List class="w-5 h-5 text-teal-600" />
            <h2 class="text-lg font-bold text-stone-900">粘贴 URL 列表</h2>
          </div>
          <p class="text-xs text-stone-500 leading-relaxed mb-3">
            每行一个链接，系统将自动识别并去重。
          </p>
          <textarea
            v-model="urlTextContent"
            rows="4"
            class="w-full p-3 border border-stone-200 rounded-md text-xs font-mono outline-none focus:border-teal-600 bg-stone-50"
            placeholder="https://openai.com/blog/...\nhttps://news.ycombinator.com/..."
          ></textarea>
        </div>

        <button
          @click="handleTextImport"
          :disabled="submitting || !urlTextContent.trim()"
          class="mt-4 w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-md font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
          <span>开始解析并批量导入</span>
        </button>
      </div>
    </div>

    <!-- 导入任务历史与状态 -->
    <div class="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
      <div class="flex items-center justify-between mb-6 pb-3 border-b border-stone-100">
        <h2 class="text-lg font-bold text-stone-900">导入任务队列</h2>
        <button
          @click="loadTasks"
          class="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loadingTasks }" />
          刷新状态
        </button>
      </div>

      <div v-if="tasks.length === 0" class="text-center py-10 text-stone-400 text-sm">
        暂无导入任务，请在上方上传或提交链接
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="p-4 rounded-lg bg-stone-50 border border-stone-100 space-y-3"
        >
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div class="flex items-center space-x-3">
              <span
                class="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider"
                :class="{
                  'bg-amber-100 text-amber-800':
                    task.status === 'processing' || task.status === 'pending',
                  'bg-emerald-100 text-emerald-800': task.status === 'completed',
                  'bg-red-100 text-red-800': task.status === 'failed',
                }"
              >
                {{ formatStatus(task.status) }}
              </span>
              <span class="font-bold text-sm text-stone-900">
                {{ task.type === 'bookmarks' ? '浏览器书签文件' : 'URL 链接列表' }}
              </span>
              <span class="text-xs text-stone-400">
                创建于 {{ new Date(task.created_at).toLocaleString() }}
              </span>
            </div>

            <div class="text-xs font-mono font-bold text-stone-600 flex items-center gap-3">
              <span>总数: {{ task.total_count }}</span>
              <span class="text-emerald-700">成功: {{ task.success_count }}</span>
              <span class="text-red-600">失败: {{ task.failed_count }}</span>
            </div>
          </div>

          <!-- 进度条 -->
          <div class="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
            <div
              class="h-full bg-teal-600 transition-all duration-300"
              :style="{
                width: `${task.total_count > 0 ? (task.processed_count / task.total_count) * 100 : 0}%`,
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useMessage, type UploadCustomRequestOptions } from 'naive-ui';
import { Bookmark, List, UploadCloud, Loader2, RefreshCw } from 'lucide-vue-next';
import { getImportTaskList, createImportTask, uploadImportFile } from '../api/importApi';
import type { ImportTask, ImportTaskStatus } from '@book-of-ages/shared';

const message = useMessage();
const tasks = ref<ImportTask[]>([]);
const loadingTasks = ref(false);
const submitting = ref(false);
const urlTextContent = ref('');
let pollTimer: number | null = null;

function formatStatus(status: ImportTaskStatus): string {
  switch (status) {
    case 'pending':
      return '排队中';
    case 'processing':
      return '正在抓取快照';
    case 'completed':
      return '已完成';
    case 'failed':
      return '处理失败';
    default:
      return status;
  }
}

async function loadTasks() {
  loadingTasks.value = true;
  try {
    tasks.value = await getImportTaskList();
  } catch (_error) {
    message.error('加载任务失败');
  } finally {
    loadingTasks.value = false;
  }
}

async function handleFileUpload(options: UploadCustomRequestOptions) {
  const file = options.file.file;
  if (!file) return;

  try {
    const task = await uploadImportFile(file);
    message.success(`任务已创建，共提取 ${task.total_count} 条链接`);
    await loadTasks();
  } catch (_error) {
    message.error('上传解析失败');
  }
}

async function handleTextImport() {
  if (!urlTextContent.value.trim()) return;
  submitting.value = true;
  try {
    const task = await createImportTask({
      type: 'urls',
      content: urlTextContent.value.trim(),
    });
    message.success(`任务已创建，共提取 ${task.total_count} 条链接`);
    urlTextContent.value = '';
    await loadTasks();
  } catch (_error) {
    message.error('提交失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadTasks();
  // 轮询活跃任务进度
  pollTimer = window.setInterval(() => {
    const hasActiveTask = tasks.value.some(
      (t) => t.status === 'pending' || t.status === 'processing'
    );
    if (hasActiveTask) {
      loadTasks();
    }
  }, 3000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>
