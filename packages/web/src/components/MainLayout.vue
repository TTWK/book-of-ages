<template>
  <div
    class="min-h-screen bg-bg-main flex flex-col text-text-main font-sans transition-colors duration-200"
  >
    <!-- Top Navigation (Web) -->
    <header
      class="sticky top-0 z-50 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60 hidden md:block"
    >
      <div class="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
        <!-- Logo -->
        <div
          class="flex items-center space-x-3 cursor-pointer group flex-shrink-0"
          @click="router.push({ name: 'events' })"
        >
          <div
            class="p-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-sm group-hover:bg-stone-800 dark:group-hover:bg-stone-200 transition-colors"
          >
            <BookOpen class="w-5 h-5" />
          </div>
          <span
            class="text-xl font-serif font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap no-caret"
            >岁月史书</span
          >
        </div>

        <!-- Desktop Nav Links -->
        <nav class="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          <button
            v-for="item in navItems"
            :key="item.key"
            @click="handleMenuClick(item.key)"
            class="px-4 py-2 rounded-sm flex items-center space-x-2 transition-all duration-200 group flex-shrink-0 whitespace-nowrap no-caret"
            :class="
              currentRoute === item.key
                ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer'
            "
          >
            <component :is="item.icon" class="w-4 h-4 transition-transform group-hover:scale-110" />
            <span class="text-sm tracking-wide">{{ item.label }}</span>
          </button>
        </nav>

        <!-- Search & Actions -->
        <div class="flex items-center space-x-4">
          <div class="relative group">
            <Search
              class="w-4 h-4 absolute left-3 top-2.5 text-stone-400 group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100 transition-colors"
            />
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              placeholder="寻找记忆..."
              class="pl-9 pr-4 py-2 w-40 focus:w-56 bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 focus:border-stone-300 dark:focus:border-stone-600 focus:bg-white dark:focus:bg-stone-800 rounded-sm text-sm outline-none transition-all duration-300 placeholder:text-stone-300 dark:placeholder:text-stone-600 dark:text-stone-200"
            />
          </div>

          <div class="h-6 w-px bg-stone-200 dark:bg-stone-800 mx-1"></div>

          <div class="flex items-center space-x-1">
            <!-- <button
              @click="appStore.toggleTheme()"
              class="p-2 rounded-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
              :title="appStore.isDark ? '浅色模式' : '深色模式'"
            >
              <Sun v-if="appStore.isDark" class="w-5 h-5" />
              <Moon v-else class="w-5 h-5" />
            </button> -->

            <button
              @click="router.push({ name: 'analytics' })"
              class="p-2 rounded-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
              title="时间分析"
            >
              <TrendingUp class="w-5 h-5" />
            </button>

            <button
              @click="router.push({ name: 'audit' })"
              class="p-2 rounded-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
              title="操作审计"
            >
              <ScrollText class="w-5 h-5" />
            </button>

            <button
              @click="router.push({ name: 'settings' })"
              class="p-2 rounded-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
              title="设置"
            >
              <Settings class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile Top Header -->
    <header
      class="md:hidden sticky top-0 z-50 bg-white/90 dark:bg-stone-950/90 backdrop-blur border-b border-stone-100 dark:border-stone-800 shadow-sm"
    >
      <div class="px-4 h-16 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div
            class="p-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-sm"
          >
            <BookOpen class="w-4 h-4" />
          </div>
          <span class="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">{{
            pageTitle
          }}</span>
        </div>
        <button
          @click="router.push({ name: 'search' })"
          class="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
        >
          <Search class="w-5 h-5" />
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-5xl w-full mx-auto p-4 md:px-8 md:py-10 pb-24 md:pb-12">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <keep-alive :include="cachedViews">
            <component :is="Component" :key="$route.path" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <!-- Mobile Bottom Tab Bar -->
    <nav
      class="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-950 border-t border-stone-100 dark:border-stone-800 pb-safe z-50"
    >
      <div class="flex items-center justify-around h-16 px-2">
        <button
          v-for="item in navItems"
          :key="item.key"
          @click="handleMenuClick(item.key)"
          class="flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 cursor-pointer no-caret"
          :class="
            currentRoute === item.key
              ? 'text-stone-900 dark:text-stone-100'
              : 'text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400'
          "
        >
          <component
            :is="item.icon"
            class="w-5 h-5"
            :class="{ 'stroke-[2.5px]': currentRoute === item.key }"
          />
          <span class="text-[10px] font-bold tracking-wider uppercase">{{ item.label }}</span>
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
  Search,
  Settings,
  CalendarDays,
  ScrollText,
  TrendingUp,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { useCommonShortcuts } from '../composables/useKeyboardShortcuts';

const appStore = useAppStore();

// Fallback to the imported router instance if the inject context is lost
const router = useRouter() || appRouter;
const route = useRoute();

const searchQuery = ref('');

// 缓存的视图组件（keep-alive）
const cachedViews = ['EventsView', 'InboxView', 'TimelineView', 'TagsView'];

// 注册全局快捷键
useCommonShortcuts({
  onSearch: () => {
    router.push({ name: 'search' });
  },
  onBack: () => {
    if (route.name !== 'events') {
      router.back();
    }
  },
  onToggleTheme: () => {
    appStore.isDark = !appStore.isDark;
  },
});

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
/* 淡入淡出动画（旧版，保留兼容） */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 淡入 + 滑动动画（新版） */
.fade-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
