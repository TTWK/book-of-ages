<template>
  <div class="search-view">
    <n-card>
      <n-space vertical>
        <n-input-group>
          <n-input
            v-model:value="searchQuery"
            placeholder="搜索事件、材料、时间线..."
            size="large"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </template>
          </n-input>
          <n-button type="primary" size="large" :loading="loading" @click="handleSearch">
            搜索
          </n-button>
        </n-input-group>

        <n-space>
          <n-radio-group v-model:value="searchType">
            <n-radio-button value="all">全部</n-radio-button>
            <n-radio-button value="event">事件</n-radio-button>
            <n-radio-button value="material">材料</n-radio-button>
            <n-radio-button value="timeline">时间线</n-radio-button>
          </n-radio-group>
        </n-space>
      </n-space>
    </n-card>

    <!-- 搜索结果 -->
    <n-space vertical style="margin-top: 16px" v-if="hasSearched">
      <!-- 事件结果 -->
      <n-card v-if="results.events.length > 0 && (searchType === 'all' || searchType === 'event')" title="事件">
        <n-list>
          <n-list-item v-for="event in results.events" :key="event.id">
            <template #prefix>
              <n-tag :type="event.status === 'confirmed' ? 'success' : 'warning'">
                {{ event.status === 'confirmed' ? '已确认' : '草稿' }}
              </n-tag>
            </template>
            <n-space vertical>
              <n-text strong style="font-size: 16px">{{ event.title }}</n-text>
              <n-text depth="3">{{ event.summary || event.content?.slice(0, 100) }}</n-text>
              <n-button size="small" @click="viewEvent(event.id)">查看详情</n-button>
            </n-space>
          </n-list-item>
        </n-list>
      </n-card>

      <!-- 材料结果 -->
      <n-card v-if="results.materials.length > 0 && (searchType === 'all' || searchType === 'material')" title="材料">
        <n-list>
          <n-list-item v-for="material in results.materials" :key="material.id">
            <n-space vertical>
              <n-text strong>{{ material.title || '无标题材料' }}</n-text>
              <n-text depth="3">类型：{{ material.type }}</n-text>
            </n-space>
          </n-list-item>
        </n-list>
      </n-card>

      <!-- 时间线结果 -->
      <n-card v-if="results.timelineNodes.length > 0 && (searchType === 'all' || searchType === 'timeline')" title="时间线节点">
        <n-list>
          <n-list-item v-for="node in results.timelineNodes" :key="node.id">
            <n-space vertical>
              <n-text strong>{{ node.title }}</n-text>
              <n-text depth="3">{{ node.description?.slice(0, 100) }}</n-text>
              <n-text depth="3" v-if="node.node_date">{{ node.node_date }}</n-text>
            </n-space>
          </n-list-item>
        </n-list>
      </n-card>

      <!-- 无结果 -->
      <n-empty
        v-if="noResults"
        description="没有找到相关结果"
      />
    </n-space>

    <!-- 初始状态 -->
    <n-empty
      v-if="!hasSearched"
      description="输入关键词开始搜索"
      style="margin-top: 48px"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
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
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function viewEvent(id: string) {
  router.push(`/events/${id}`);
}
</script>

<style scoped>
.search-view {
  height: 100%;
}
</style>
