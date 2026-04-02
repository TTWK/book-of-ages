<template>
  <n-layout class="app-layout" has-sider>
    <!-- 侧边栏 -->
    <n-layout-sider
      class="app-sider"
      :collapsed="collapsed"
      collapse-mode="width"
      :collapsed-width="64"
      :width="200"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="logo">
        <span v-if="!collapsed">岁月史书</span>
        <span v-else>书</span>
      </div>
      
      <n-menu
        :collapsed="collapsed"
        :options="menuOptions"
        :value="currentRoute"
        @update:value="handleMenuClick"
      />
    </n-layout-sider>

    <!-- 主内容区 -->
    <n-layout class="app-content">
      <n-layout-header class="app-header" bordered>
        <n-space align="center" justify="space-between">
          <n-space>
            <n-button quaternary @click="toggleSidebar">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </template>
            </n-button>
            <n-h3 style="margin: 0">{{ pageTitle }}</n-h3>
          </n-space>
          
          <n-space>
            <n-input
              v-model:value="searchQuery"
              placeholder="搜索..."
              style="width: 200px"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </template>
            </n-input>
            
            <n-dropdown :options="apiMenuOptions" @select="handleApiMenuSelect">
              <n-button quaternary>
                <template #icon>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </template>
              </n-button>
            </n-dropdown>
          </n-space>
        </n-space>
      </n-layout-header>

      <n-layout-content class="app-main" embedded>
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NIcon } from 'naive-ui';
import type { MenuOption } from 'naive-ui';

const router = useRouter();
const route = useRoute();

const collapsed = ref(false);
const searchQuery = ref('');

const currentRoute = computed(() => route.name as string);
const pageTitle = computed(() => route.meta.title as string || '岁月史书');

// 菜单图标渲染
function renderIcon(iconPath: string) {
  return () => h(NIcon, null, {
    default: () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: '18',
      height: '18',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      innerHTML: iconPath
    })
  });
}

// 菜单选项
const menuOptions: MenuOption[] = [
  {
    label: '收件箱',
    key: 'inbox',
    icon: renderIcon('<rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="22 6 12 13 2 6"/>'),
  },
  {
    label: '事件库',
    key: 'events',
    icon: renderIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
  },
  {
    label: '标签',
    key: 'tags',
    icon: renderIcon('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
  },
  {
    label: '搜索',
    key: 'search',
    icon: renderIcon('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  },
  {
    label: '设置',
    key: 'settings',
    icon: renderIcon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  },
];

// API 菜单选项
const apiMenuOptions = [
  {
    label: '生成 API Key',
    key: 'generate-key',
    icon: renderIcon('<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>'),
  },
  {
    label: '查看日志',
    key: 'view-logs',
    icon: renderIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
  },
];

function handleMenuClick(key: string) {
  router.push({ name: key });
}

function handleApiMenuSelect(key: string) {
  if (key === 'generate-key') {
    router.push({ name: 'settings' });
  } else if (key === 'view-logs') {
    router.push({ name: 'settings' });
  }
}

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ name: 'search', query: { q: searchQuery.value } });
    searchQuery.value = '';
  }
}

function toggleSidebar() {
  collapsed.value = !collapsed.value;
}
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-sider {
  background-color: var(--n-color);
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid var(--n-color-embedded);
}

.app-header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 64px;
}

.app-main {
  padding: 16px;
  overflow: auto;
}
</style>
