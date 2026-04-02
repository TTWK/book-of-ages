/**
 * 应用状态管理
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAppStore = defineStore('app', () => {
  // 状态
  const apiKey = ref<string | null>(null);
  const sidebarCollapsed = ref(false);

  // 计算属性
  const isAuthenticated = computed(() => !!apiKey.value);

  // 方法
  function setApiKey(key: string) {
    apiKey.value = key;
    localStorage.setItem('boa_api_key', key);
  }

  function clearApiKey() {
    apiKey.value = null;
    localStorage.removeItem('boa_api_key');
  }

  function initApiKey() {
    const stored = localStorage.getItem('boa_api_key');
    if (stored) {
      apiKey.value = stored;
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  return {
    apiKey,
    sidebarCollapsed,
    isAuthenticated,
    setApiKey,
    clearApiKey,
    initApiKey,
    toggleSidebar,
  };
});
