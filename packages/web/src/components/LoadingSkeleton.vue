<template>
  <div class="animate-pulse space-y-4">
    <!-- 卡片列表骨架 -->
    <template v-if="type === 'cards'">
      <div
        v-for="i in count"
        :key="i"
        class="bg-white rounded-xl p-6 border border-neutral-200 space-y-3"
      >
        <!-- 标题骨架 -->
        <div class="h-6 bg-neutral-200 rounded w-3/4"></div>
        <!-- 摘要骨架 -->
        <div class="h-4 bg-neutral-100 rounded w-full"></div>
        <div class="h-4 bg-neutral-100 rounded w-5/6"></div>
        <!-- 标签骨架 -->
        <div class="flex gap-2 pt-2">
          <div class="h-6 w-16 bg-neutral-100 rounded-full"></div>
          <div class="h-6 w-20 bg-neutral-100 rounded-full"></div>
        </div>
      </div>
    </template>

    <!-- 详情页面骨架 -->
    <template v-else-if="type === 'detail'">
      <!-- 标题区域 -->
      <div class="bg-white rounded-xl p-6 border border-neutral-200">
        <div class="h-8 bg-neutral-200 rounded w-2/3 mb-4"></div>
        <div class="flex gap-3">
          <div class="h-6 w-20 bg-neutral-100 rounded-full"></div>
          <div class="h-6 w-32 bg-neutral-100 rounded-full"></div>
        </div>
      </div>
      <!-- 内容区域 -->
      <div class="bg-white rounded-xl p-6 border border-neutral-200 space-y-3">
        <div class="h-4 bg-neutral-100 rounded w-full"></div>
        <div class="h-4 bg-neutral-100 rounded w-5/6"></div>
        <div class="h-4 bg-neutral-100 rounded w-4/6"></div>
      </div>
    </template>

    <!-- 表格骨架 -->
    <template v-else-if="type === 'table'">
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <!-- 表头 -->
        <div class="bg-neutral-50 px-6 py-4 border-b border-neutral-200">
          <div class="flex gap-4">
            <div class="h-4 bg-neutral-200 rounded w-1/4"></div>
            <div class="h-4 bg-neutral-200 rounded w-1/3"></div>
            <div class="h-4 bg-neutral-200 rounded w-1/6"></div>
          </div>
        </div>
        <!-- 表格行 -->
        <div v-for="i in count" :key="i" class="px-6 py-4 border-b border-neutral-100">
          <div class="flex gap-4">
            <div class="h-4 bg-neutral-100 rounded w-1/4"></div>
            <div class="h-4 bg-neutral-100 rounded w-1/3"></div>
            <div class="h-4 bg-neutral-100 rounded w-1/6"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- 简单骨架 (通用) -->
    <template v-else>
      <div v-for="i in count" :key="i" class="space-y-3">
        <div class="h-4 bg-neutral-200 rounded w-full"></div>
        <div class="h-4 bg-neutral-100 rounded w-5/6"></div>
        <div class="h-4 bg-neutral-100 rounded w-4/6"></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 骨架类型 */
  type?: 'cards' | 'detail' | 'table' | 'simple';
  /** 重复数量 */
  count?: number;
}

withDefaults(defineProps<Props>(), {
  type: 'simple',
  count: 3,
});
</script>
