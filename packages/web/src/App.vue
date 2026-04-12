<template>
  <n-config-provider :theme-overrides="themeOverrides" :theme="currentTheme">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <MainLayout />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui';
import MainLayout from './components/MainLayout.vue';
import { useAppStore } from './stores/app';

const appStore = useAppStore();

// 深色模式持久化 + 系统偏好跟随
onMounted(() => {
  // 如果没有存储过，则检测系统偏好
  const storedTheme = localStorage.getItem('theme');
  if (!storedTheme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    appStore.isDark = prefersDark;
  } else {
    appStore.isDark = storedTheme === 'dark';
  }

  // 监听系统偏好变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      appStore.isDark = e.matches;
    }
  });
});

// 监听主题变化，持久化到 localStorage
watch(
  () => appStore.isDark,
  (isDark) => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
);

const currentTheme = computed(() => (appStore.isDark ? darkTheme : null));

const themeOverrides: GlobalThemeOverrides = {
  common: {
    // Primary Colors (Teal)
    primaryColor: '#0D9488',
    primaryColorHover: '#14B8A6',
    primaryColorPressed: '#0F766E',
    primaryColorSuppl: 'rgba(13, 148, 136, 0.15)',

    // Info Colors (Blue)
    infoColor: '#3B82F6',
    infoColorHover: '#60A5FA',
    infoColorPressed: '#2563EB',
    infoColorSuppl: 'rgba(59, 130, 246, 0.15)',

    // Success Colors (Green)
    successColor: '#22C55E',
    successColorHover: '#4ADE80',
    successColorPressed: '#16A34A',
    successColorSuppl: 'rgba(34, 197, 94, 0.15)',

    // Warning Colors (Amber)
    warningColor: '#F59E0B',
    warningColorHover: '#FBBF24',
    warningColorPressed: '#D97706',
    warningColorSuppl: 'rgba(245, 158, 11, 0.15)',

    // Error Colors (Red)
    errorColor: '#EF4444',
    errorColorHover: '#F87171',
    errorColorPressed: '#DC2626',
    errorColorSuppl: 'rgba(239, 68, 68, 0.15)',

    // Neutral Colors
    textColorBase: '#0F172A',
    textColor1: '#0F172A',
    textColor2: '#334155',
    textColor3: '#475569',
    textColorDisabled: 'rgba(100, 116, 139, 0.5)',
    placeholderColor: '#94A3B8',
    placeholderColorDisabled: 'rgba(100, 116, 139, 0.3)',
    iconColor: '#475569',
    iconColorHover: '#334155',
    closeIconColor: '#64748B',

    // Border Colors
    borderColor: '#E2E8F0',
    borderColorHover: '#CBD5E1',
    borderColorPressed: '#94A3B8',
    borderColorDisabled: '#F1F5F9',

    // Background Colors
    bodyColor: '#FFFFFF',
    cardColor: '#FFFFFF',
    modalColor: '#FFFFFF',
    popoverColor: '#FFFFFF',
    drawerColor: '#FFFFFF',

    // CTA/Action Colors (Orange)
    actionColor: '#F97316',
    actionColorHover: '#FB923C',
    actionColorPressed: '#EA580C',
    actionColorSuppl: 'rgba(249, 115, 22, 0.15)',

    // Font
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontFamilyMono:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',

    // Border Radius
    borderRadius: '6px',
    borderRadiusSmall: '4px',

    // Shadows
    boxShadow1: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    boxShadow2: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    boxShadow3: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    boxShadowModal: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Button Component
  Button: {
    // Primary Button
    colorPrimary: '#0D9488',
    colorHoverPrimary: '#14B8A6',
    colorPressedPrimary: '#0F766E',
    colorFocusPrimary: '#0D9488',
    textColorPrimary: '#FFFFFF',
    textColorHoverPrimary: '#FFFFFF',
    textColorPressedPrimary: '#FFFFFF',
    textColorFocusPrimary: '#FFFFFF',

    // Info Button
    colorInfo: '#3B82F6',
    colorHoverInfo: '#60A5FA',
    colorPressedInfo: '#2563EB',
    textColorInfo: '#FFFFFF',
    textColorHoverInfo: '#FFFFFF',
    textColorPressedInfo: '#FFFFFF',

    // Success Button
    colorSuccess: '#22C55E',
    colorHoverSuccess: '#4ADE80',
    colorPressedSuccess: '#16A34A',
    textColorSuccess: '#FFFFFF',

    // Warning Button
    colorWarning: '#F59E0B',
    colorHoverWarning: '#FBBF24',
    colorPressedWarning: '#D97706',
    textColorWarning: '#FFFFFF',

    // Error Button
    colorError: '#EF4444',
    colorHoverError: '#F87171',
    colorPressedError: '#DC2626',
    textColorError: '#FFFFFF',
  },

  // Card Component
  Card: {
    borderColor: '#E2E8F0',
    borderRadius: '12px',
    color: '#FFFFFF',
    colorModal: '#FFFFFF',
  },

  // Modal Component
  Modal: {
    color: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Input Component
  Input: {
    color: '#FFFFFF',
    colorFocus: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderColorHover: '#CBD5E1',
    borderColorFocus: '#0D9488',
    borderRadius: '6px',
  },

  // Tag Component
  Tag: {
    borderRadius: '6px',
  },

  // Badge Component
  Badge: {
    colorProcessing: '#3B82F6',
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
  },
};
</script>
