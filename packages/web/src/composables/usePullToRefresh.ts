/**
 * 下拉刷新 Hook
 * 实现移动端下拉刷新功能
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export interface UsePullToRefreshOptions {
  /** 触发刷新的下拉距离（像素） */
  threshold?: number;
  /** 最大下拉距离（像素） */
  maxDistance?: number;
}

/**
 * 下拉刷新
 * @param onRefresh 刷新回调函数
 * @param options 配置选项
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: UsePullToRefreshOptions = {}
) {
  const { threshold = 60, maxDistance = 100 } = options;

  const isRefreshing = ref(false);
  const pullDistance = ref(0);
  const isPulling = ref(false);
  const container = ref<HTMLElement | null>(null);

  let startY = 0;
  let currentY = 0;

  function handleTouchStart(event: TouchEvent) {
    // 只有在顶部时才启用
    const el = container.value || window.document.documentElement;
    const scrollTop = container.value ? container.value.scrollTop : window.scrollY;

    if (scrollTop > 0) return;

    startY = event.touches[0].clientY;
    isPulling.value = true;
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isPulling.value || isRefreshing.value) return;

    currentY = event.touches[0].clientY;
    const distance = Math.min(currentY - startY, maxDistance);

    // 只处理向下拉
    if (distance > 0) {
      pullDistance.value = distance;

      // 阻止默认滚动行为
      if (distance > 10) {
        event.preventDefault();
      }
    }
  }

  async function handleTouchEnd() {
    if (!isPulling.value) return;
    isPulling.value = false;

    if (pullDistance.value >= threshold) {
      isRefreshing.value = true;
      pullDistance.value = threshold;

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        isRefreshing.value = false;
        pullDistance.value = 0;
      }
    } else {
      pullDistance.value = 0;
    }
  }

  onMounted(() => {
    const el = container.value || window;
    el.addEventListener('touchstart', handleTouchStart as any, { passive: true });
    el.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
  });

  onUnmounted(() => {
    const el = container.value || window;
    el.removeEventListener('touchstart', handleTouchStart as any);
    el.removeEventListener('touchmove', handleTouchMove as any);
    el.removeEventListener('touchend', handleTouchEnd);
  });

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    container,
  };
}
