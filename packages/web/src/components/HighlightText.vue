<template>
  <span v-html="highlightedText"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DOMPurify from 'dompurify';

const props = defineProps<{
  text: string;
  query: string;
  maxLength?: number;
}>();

const highlightedText = computed(() => {
  if (!props.text || !props.query) {
    return props.text || '';
  }

  let displayText = props.text;
  
  // 如果文本太长，截取包含关键词的部分
  if (props.maxLength && displayText.length > props.maxLength) {
    const queryLower = props.query.toLowerCase();
    const textLower = displayText.toLowerCase();
    const index = textLower.indexOf(queryLower);
    
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(displayText.length, index + props.query.length + 100);
      displayText = (start > 0 ? '...' : '') + 
                    displayText.slice(start, end) + 
                    (end < displayText.length ? '...' : '');
    } else {
      displayText = displayText.slice(0, props.maxLength) + '...';
    }
  }

  // 高亮关键词
  const regex = new RegExp(`(${escapeRegex(props.query)})`, 'gi');
  const highlighted = displayText.replace(regex, '<mark class="bg-yellow-200 text-inherit px-0.5 rounded">$1</mark>');
  
  return DOMPurify.sanitize(highlighted);
});

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
</script>
