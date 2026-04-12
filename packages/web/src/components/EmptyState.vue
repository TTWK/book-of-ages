<template>
  <div class="flex flex-col items-center justify-center py-12 px-4">
    <!-- 图标 -->
    <div v-if="icon" class="mb-4 p-4 rounded-full" :class="iconBgClass || 'bg-neutral-100'">
      <component :is="icon" class="w-16 h-16" :class="iconColorClass || 'text-neutral-400'" />
    </div>

    <!-- 标题 -->
    <h3 v-if="title" class="text-lg font-semibold text-neutral-700 mb-2">
      {{ title }}
    </h3>

    <!-- 描述 -->
    <p v-if="description" class="text-sm text-neutral-500 text-center max-w-sm mb-4">
      {{ description }}
    </p>

    <!-- 操作按钮 -->
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

interface Props {
  /** 图标组件 */
  icon?: Component;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 图标背景色 */
  iconBgClass?: string;
  /** 图标颜色 */
  iconColorClass?: string;
}

defineProps<Props>();
</script>
