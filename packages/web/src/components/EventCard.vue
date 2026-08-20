<template>
  <div
    @click="$emit('click', event.id)"
    class="card-scrapbook group p-6 relative overflow-hidden cursor-pointer"
    :class="{ 'ring-1 ring-stone-900 shadow-lg': selected }"
  >
    <!-- Checkbox for batch selection -->
    <div v-if="selectable" class="absolute left-2 top-2 z-10" @click.stop>
      <n-checkbox :checked="selected" @update:checked="$emit('select', $event)" />
    </div>

    <!-- Status Indicator Dot -->
    <div
      class="absolute left-0 top-0 bottom-0 w-1"
      :class="{
        'bg-stone-200': event.status === 'draft',
        'bg-stone-900': event.status === 'confirmed',
        'bg-stone-400': event.status === 'archived',
      }"
    ></div>

    <div class="flex justify-between items-start mb-4">
      <div class="flex-1 mr-4">
        <h2
          class="text-2xl font-serif font-bold text-stone-900 group-hover:text-stone-700 transition-colors mb-2 leading-tight"
        >
          {{ event.title }}
        </h2>
        <div
          class="flex items-center space-x-4 text-xs font-bold tracking-widest text-stone-400 uppercase no-caret"
        >
          <span v-if="event.event_date" class="flex items-center">
            <Calendar class="w-3.5 h-3.5 mr-1.5" />
            {{ formatDate(event.event_date) }}
          </span>
          <StatusBadge :status="event.status" />
        </div>
      </div>

      <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          @click.stop="$emit('edit', event)"
          class="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-sm transition-colors"
          title="修改"
        >
          <Edit2 class="w-4 h-4" />
        </button>
        <button
          @click.stop="$emit('delete', event)"
          class="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-sm transition-colors"
          title="移入回收站"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <p v-if="event.summary" class="text-stone-600 leading-relaxed line-clamp-2 max-w-2xl no-caret">
      {{ event.summary }}
    </p>

    <div v-if="event.tags && event.tags.length > 0" class="flex flex-wrap gap-1.5 mt-3">
      <span
        v-for="tag in event.tags"
        :key="tag.id"
        class="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-sm flex items-center gap-1"
        :style="tag.color ? { backgroundColor: `${tag.color}15`, color: tag.color } : undefined"
        :class="{ 'bg-stone-100 text-stone-500': !tag.color }"
      >
        <span
          v-if="tag.color"
          class="w-1.5 h-1.5 rounded-full"
          :style="{ backgroundColor: tag.color }"
        ></span>
        {{ tag.name }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Calendar, Edit2, Trash2 } from 'lucide-vue-next';
import type { Event } from '@book-of-ages/shared';
import StatusBadge from './StatusBadge.vue';

defineProps<{
  event: Event;
  selectable?: boolean;
  selected?: boolean;
}>();

defineEmits<{
  (e: 'click', id: string): void;
  (e: 'edit', event: Event): void;
  (e: 'delete', event: Event): void;
  (e: 'select', selected: boolean): void;
}>();

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>
