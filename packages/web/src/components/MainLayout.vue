<template>
  <div
    class="min-h-screen bg-[#F0FDFA] flex flex-col text-[#134E4A] font-sans transition-colors duration-200"
  >
    <!-- Top Navigation (Web) -->
    <header
      class="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm hidden md:block"
    >
      <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <!-- Logo -->
        <div
          class="flex items-center space-x-2 cursor-pointer group"
          @click="router.push({ name: 'events' })"
        >
          <BookOpen class="w-6 h-6 text-[#0D9488] group-hover:text-[#14B8A6] transition-colors" />
          <span class="text-lg font-semibold text-[#134E4A]">岁月史书</span>
        </div>

        <!-- Desktop Nav Links -->
        <nav class="flex items-center space-x-1">
          <button
            v-for="item in navItems"
            :key="item.key"
            @click="handleMenuClick(item.key)"
            class="px-3 py-2 rounded-md flex items-center space-x-1.5 transition-colors duration-200"
            :class="
              currentRoute === item.key
                ? 'bg-[#0D9488]/10 text-[#0D9488] font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
            "
          >
            <component :is="item.icon" class="w-4 h-4" />
            <span class="text-sm">{{ item.label }}</span>
          </button>
        </nav>

        <!-- Search & Actions -->
        <div class="flex items-center space-x-3">
          <div class="relative group">
            <Search
              class="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400 group-focus-within:text-[#0D9488] transition-colors"
            />
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="搜索..."
              class="pl-9 pr-3 py-1.5 w-48 bg-gray-50 border border-transparent focus:border-[#0D9488] focus:bg-white rounded-full text-sm outline-none transition-all duration-200"
            />
          </div>

          <button
            @click="appStore.toggleTheme()"
            class="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
            :title="appStore.isDark ? '切换到浅色模式' : '切换到深色模式'"
          >
            <Sun v-if="appStore.isDark" class="w-5 h-5" />
            <Moon v-else class="w-5 h-5" />
          </button>

          <button
            @click="router.push({ name: 'audit' })"
            class="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
            title="操作日志"
          >
            <ScrollText class="w-5 h-5" />
          </button>

          <button
            @click="router.push({ name: 'settings' })"
            class="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <Settings class="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Top Header -->
    <header
      class="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm"
    >
      <div class="px-4 h-14 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <BookOpen class="w-5 h-5 text-[#0D9488]" />
          <span class="text-base font-semibold text-[#134E4A]">{{ pageTitle }}</span>
        </div>
        <button
          @click="router.push({ name: 'search' })"
          class="p-2 text-gray-500 hover:text-[#0D9488] transition-colors cursor-pointer"
        >
          <Search class="w-5 h-5" />
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-4xl w-full mx-auto p-4 md:py-8 pb-24 md:pb-8">
      <router-view />
    </main>

    <!-- Mobile Bottom Tab Bar -->
    <nav
      class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
    >
      <div class="flex items-center justify-around h-14 px-2">
        <button
          v-for="item in navItems"
          :key="item.key"
          @click="handleMenuClick(item.key)"
          class="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 cursor-pointer"
          :class="
            currentRoute === item.key ? 'text-[#0D9488]' : 'text-gray-500 hover:text-gray-900'
          "
        >
          <component
            :is="item.icon"
            class="w-5 h-5"
            :class="{ 'fill-current': currentRoute === item.key }"
          />
          <span class="text-[10px] font-medium leading-none">{{ item.label }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import appRouter from '../router';
import {
  BookOpen,
  Inbox,
  FileText,
  Tags,
  Search,
  Settings,
  Sun,
  Moon,
  CalendarDays,
  ScrollText,
  TrendingUp,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';

const appStore = useAppStore();

// Fallback to the imported router instance if the inject context is lost
const router = useRouter() || appRouter;
const route = useRoute();

const searchQuery = ref('');

const currentRoute = computed(() => {
  return (route?.name as string) || (appRouter?.currentRoute?.value?.name as string) || '';
});
const pageTitle = computed(() => {
  return (
    (route?.meta?.title as string) ||
    (appRouter?.currentRoute?.value?.meta?.title as string) ||
    '岁月史书'
  );
});

const navItems = [
  { label: '事件库', key: 'events', icon: FileText },
  { label: '收件箱', key: 'inbox', icon: Inbox },
  { label: '时间线', key: 'timeline', icon: CalendarDays },
  { label: '时间分析', key: 'analytics', icon: TrendingUp },
  { label: '标签', key: 'tags', icon: Tags },
  { label: '搜索', key: 'search', icon: Search },
];

function handleMenuClick(key: string) {
  if (router) {
    router.push({ name: key });
  } else {
    console.error('Fatal Error: Vue Router is undefined.');
  }
}

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ name: 'search', query: { q: searchQuery.value } });
    searchQuery.value = '';
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
