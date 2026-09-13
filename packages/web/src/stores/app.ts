/**
 * 应用状态管理
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../api/client';
import { startSession, endSession } from '../api/authApi';

export const useAppStore = defineStore('app', () => {
  // 状态
  const apiKey = ref<string | null>(null);
  const sidebarCollapsed = ref(false);
  const isDark = ref(false);

  // 计算属性
  const isAuthenticated = computed(() => !!apiKey.value);

  // 方法
  function setApiKey(key: string) {
    apiKey.value = key;
    localStorage.setItem('boa_api_key', key);
    // 同步到 API 客户端：后续请求自动携带 X-API-Key
    apiClient.setApiKey(key);
    // 预热会话 cookie：材料预览（<img>/<iframe>）无法携带请求头，读接口依赖会话
    startSession().catch(() => {
      // 密钥无效时由全局 401 拦截统一引导，此处静默
    });
  }

  function clearApiKey() {
    apiKey.value = null;
    localStorage.removeItem('boa_api_key');
    apiClient.clearApiKey();
    endSession().catch(() => {});
  }

  function initApiKey() {
    const stored = localStorage.getItem('boa_api_key');
    if (stored) {
      apiKey.value = stored;
      apiClient.setApiKey(stored);
      startSession().catch(() => {});
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  function toggleTheme() {
    isDark.value = !isDark.value;
  }

  return {
    apiKey,
    sidebarCollapsed,
    isDark,
    isAuthenticated,
    setApiKey,
    clearApiKey,
    initApiKey,
    toggleSidebar,
    toggleTheme,
  };
});
