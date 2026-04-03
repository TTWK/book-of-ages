<template>
  <div class="max-w-3xl mx-auto min-h-[calc(100vh-8rem)] pb-20">
    <div class="text-center py-8">
      <h1 class="text-2xl font-bold text-[#134E4A] mb-6">全库检索</h1>
      
      <div class="relative max-w-2xl mx-auto group">
        <Search class="w-6 h-6 absolute left-4 top-3.5 text-gray-400 group-focus-within:text-[#0D9488] transition-colors" />
        <input 
          v-model="searchQuery" 
          @keyup.enter="handleSearch"
          type="text" 
          placeholder="搜索事件、摘要、材料或时间线..." 
          class="w-full pl-12 pr-24 py-3.5 bg-white border-2 border-gray-100 rounded-xl text-base text-gray-800 focus:outline-none focus:border-[#0D9488] focus:shadow-[0_0_0_4px_rgba(13,148,136,0.1)] transition-all shadow-sm"
        />
        <button 
          @click="handleSearch"
          :disabled="loading"
          class="absolute right-2 top-2 bottom-2 px-4 bg-[#0D9488] hover:bg-[#14B8A6] text-white rounded-lg font-medium transition-colors flex items-center cursor-pointer disabled:opacity-70"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <span v-else>搜索</span>
        </button>
      </div>

      <div class="flex justify-center mt-4 space-x-2">
        <button 
          v-for="type in [
            { id: 'all', label: '全部' },
            { id: 'event', label: '事件' },
            { id: 'material', label: '材料' },
            { id: 'timeline', label: '时间线' }
          ]" 
          :key="type.id"
          @click="searchType = type.id as any"
          class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer"
          :class="searchType === type.id ? 'bg-[#134E4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <!-- Search Results -->
    <div v-if="hasSearched && !loading" class="mt-8 space-y-8 animate-in fade-in duration-300">
      
      <!-- Events -->
      <div v-if="results.events.length > 0 && (searchType === 'all' || searchType === 'event')">
        <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
          <FileText class="w-4 h-4 mr-2" /> 事件 ({{ results.events.length }})
        </h3>
        <div class="space-y-3">
          <div 
            v-for="event in results.events" 
            :key="event.id"
            @click="viewEvent(event.id)"
            class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0D9488]/30 transition-all cursor-pointer group"
          >
            <div class="flex items-start justify-between">
              <h4 class="text-lg font-semibold text-[#134E4A] group-hover:text-[#0D9488] transition-colors line-clamp-1">{{ event.title }}</h4>
              <span class="px-2 py-0.5 ml-3 text-[10px] font-medium rounded-full shrink-0" :class="event.status === 'confirmed' ? 'bg-teal-100 text-teal-800' : 'bg-yellow-100 text-yellow-800'">
                {{ event.status === 'confirmed' ? '已收录' : '待处理' }}
              </span>
            </div>
            <p class="text-sm text-gray-500 mt-2 line-clamp-2">{{ event.summary || event.content?.slice(0, 150) }}</p>
          </div>
        </div>
      </div>

      <!-- Materials -->
      <div v-if="results.materials.length > 0 && (searchType === 'all' || searchType === 'material')">
        <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
          <Files class="w-4 h-4 mr-2" /> 材料 ({{ results.materials.length }})
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div 
            v-for="material in results.materials" 
            :key="material.id"
            class="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center"
          >
            <div class="w-10 h-10 rounded-md bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center mr-3 shrink-0">
              <Image v-if="material.type === 'image'" class="w-5 h-5" />
              <FileText v-else-if="material.type === 'pdf'" class="w-5 h-5" />
              <Link v-else-if="material.type === 'snapshot'" class="w-5 h-5" />
              <Paperclip v-else class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h4 class="text-sm font-medium text-gray-800 truncate">{{ material.title || '无标题材料' }}</h4>
              <p class="text-xs text-gray-500 capitalize">{{ material.type }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline Nodes -->
      <div v-if="results.timelineNodes.length > 0 && (searchType === 'all' || searchType === 'timeline')">
        <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
          <GitCommit class="w-4 h-4 mr-2" /> 时间线节点 ({{ results.timelineNodes.length }})
        </h3>
        <div class="space-y-3">
          <div 
            v-for="node in results.timelineNodes" 
            :key="node.id"
            class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden"
          >
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-[#14B8A6]"></div>
            <div class="flex justify-between items-start">
              <h4 class="text-base font-medium text-gray-800">{{ node.title }}</h4>
              <span v-if="node.node_date" class="text-xs text-gray-400 ml-2 shrink-0">{{ new Date(node.node_date).toLocaleDateString() }}</span>
            </div>
            <p v-if="node.description" class="text-sm text-gray-500 mt-1 line-clamp-2">{{ node.description }}</p>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-if="noResults" class="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <SearchX class="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900">未找到相关结果</h3>
        <p class="text-sm text-gray-500 mt-1">尝试使用其他关键词，或更改搜索范围。</p>
      </div>

    </div>

    <!-- Initial State -->
    <div v-if="!hasSearched" class="text-center py-32 text-gray-400">
      <Telescope class="w-16 h-16 mx-auto mb-4 opacity-20" />
      <p>输入关键词，在书海中检索</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { Search, Loader2, FileText, Files, GitCommit, SearchX, Telescope, Image, Link, Paperclip } from 'lucide-vue-next';
import { search, type SearchParams } from '../api/searchApi';

const message = useMessage();
const router = useRouter();

const searchQuery = ref('');
const searchType = ref<'all' | 'event' | 'material' | 'timeline'>('all');
const loading = ref(false);
const hasSearched = ref(false);
const results = ref({
  events: [] as Array<{ id: string; title: string; summary?: string; content?: string; status: string }>,
  materials: [] as Array<{ id: string; title?: string; type: string }>,
  timelineNodes: [] as Array<{ id: string; title: string; description?: string; node_date?: string }>,
});

const noResults = ref(false);

async function handleSearch() {
  if (!searchQuery.value.trim()) {
    message.warning('请输入搜索关键词');
    return;
  }

  loading.value = true;
  hasSearched.value = true;
  
  try {
    const params: SearchParams = {
      q: searchQuery.value.trim(),
      type: searchType.value === 'all' ? undefined : searchType.value,
      limit: 20,
    };

    const data = await search(params);
    results.value = data;
    noResults.value = !data.events.length && !data.materials.length && !data.timelineNodes.length;
  } catch (error) {
    message.error('搜索失败');
  } finally {
    loading.value = false;
  }
}

function viewEvent(id: string) {
  router.push(`/events/${id}`);
}
</script>
