<template>
  <div
    class="pull-to-refresh-indicator"
    :style="{
      height: `${pullDistance}px`,
      opacity: isPulling || isRefreshing ? 1 : 0,
    }"
  >
    <div class="flex items-center justify-center h-full text-neutral-500 text-sm">
      <Loader2 v-if="isRefreshing" class="w-4 h-4 mr-2 animate-spin" />
      <ArrowDown v-else class="w-4 h-4 mr-2" :class="{ 'rotate-180': pullDistance > threshold }" />
      <span v-if="isRefreshing">正在刷新...</span>
      <span v-else-if="pullDistance > threshold">释放刷新</span>
      <span v-else>下拉刷新</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2, ArrowDown } from 'lucide-vue-next';

interface Props {
  /** 当前下拉距离 */
  pullDistance: number;
  /** 是否正在刷新 */
  isRefreshing: boolean;
  /** 是否正在下拉 */
  isPulling: boolean;
  /** 触发阈值 */
  threshold?: number;
}

withDefaults(defineProps<Props>(), {
  threshold: 60,
});
</script>

<style scoped>
.pull-to-refresh-indicator {
  overflow: hidden;
  transition: height 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, var(--color-neutral-50), transparent);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
}
</style>
