/**
 * 无限滚动 Hook
 * 实现滚动到底部自动加载更多的功能
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export interface UseInfiniteScrollOptions {
  /** 距离底部多少像素时触发加载 */
  threshold?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 无限滚动
 * @param loadMore 加载更多数据的函数
 * @param options 配置选项
 */
export function useInfiniteScroll(
  loadMore: () => Promise<boolean>,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 200, enabled = true } = options;

  const loading = ref(false);
  const hasMore = ref(true);
  const container = ref<HTMLElement | null>(null);

  async function handleScroll() {
    if (!container.value || loading.value || !hasMore.value || !enabled) return;

    const { scrollTop, scrollHeight, clientHeight } = container.value;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceToBottom <= threshold) {
      loading.value = true;
      try {
        const result = await loadMore();
        hasMore.value = result;
      } catch (error) {
        console.error('Infinite scroll load failed:', error);
      } finally {
        loading.value = false;
      }
    }
  }

  onMounted(() => {
    if (container.value) {
      container.value.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
  });

  onUnmounted(() => {
    if (container.value) {
      container.value.removeEventListener('scroll', handleScroll);
    } else {
      window.removeEventListener('scroll', handleScroll);
    }
  });

  return {
    loading,
    hasMore,
    container,
  };
}
