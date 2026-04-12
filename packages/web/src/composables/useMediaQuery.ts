import { ref, onMounted, onUnmounted } from 'vue';

/**
 * 响应式媒体查询 composable
 */
export function useMediaQuery(query: string) {
  const matches = ref(false);
  let mediaQuery: MediaQueryList | null = null;

  function update() {
    matches.value = mediaQuery?.matches ?? false;
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(query);
    update();
    mediaQuery.addEventListener('change', update);
  });

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', update);
  });

  return matches;
}

/**
 * 移动端检测 (默认断点 768px)
 */
export function useIsMobile(breakpoint = 768) {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}
