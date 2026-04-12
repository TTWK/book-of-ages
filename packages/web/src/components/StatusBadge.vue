<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
    :class="badgeClasses"
  >
    <span v-if="dot" class="w-1.5 h-1.5 rounded-full mr-1.5" :class="dotClasses"></span>
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /** 状态值 */
  status: 'draft' | 'confirmed' | 'archived' | 'deleted' | string;
  /** 自定义标签 */
  label?: string;
  /** 是否显示圆点 */
  dot?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  dot: true,
});

// 状态映射
const statusMap: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: {
    label: '待收录',
    bg: 'bg-warning-100',
    text: 'text-warning-700',
    dot: 'bg-warning-500',
  },
  confirmed: {
    label: '已收录',
    bg: 'bg-success-100',
    text: 'text-success-700',
    dot: 'bg-success-500',
  },
  archived: {
    label: '已归档',
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    dot: 'bg-neutral-400',
  },
  deleted: {
    label: '已删除',
    bg: 'bg-error-100',
    text: 'text-error-700',
    dot: 'bg-error-500',
  },
};

const statusConfig = computed(() => {
  return (
    statusMap[props.status] || {
      label: props.status,
      bg: 'bg-neutral-100',
      text: 'text-neutral-600',
      dot: 'bg-neutral-400',
    }
  );
});

const badgeClasses = computed(() => {
  return `${statusConfig.value.bg} ${statusConfig.value.text}`;
});

const dotClasses = computed(() => {
  return statusConfig.value.dot;
});

const label = computed(() => {
  return props.label || statusConfig.value.label;
});
</script>
