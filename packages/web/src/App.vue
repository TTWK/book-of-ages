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

const themeOverrides = computed<GlobalThemeOverrides>(() => {
  // 如果是深色模式，使用 Naive UI 默认的深色配置，或者针对深色模式进行微调
  if (appStore.isDark) {
    return {
      common: {
        primaryColor: '#F5F5F4', // Stone-100 for dark mode contrast
        primaryColorHover: '#E7E5E4',
        primaryColorPressed: '#D6D3D1',
        primaryColorSuppl: 'rgba(245, 245, 244, 0.1)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        borderRadius: '4px',
      },
    };
  }

  // 浅色模式下的 Book of Ages 经典设计系统颜色
  return {
    common: {
      // Primary Colors (Zinc/Stone)
      primaryColor: '#18181B',
      primaryColorHover: '#3F3F46',
      primaryColorPressed: '#09090B',
      primaryColorSuppl: 'rgba(24, 24, 27, 0.1)',

      // Info Colors (Stone/Blue)
      infoColor: '#44403C',
      infoColorHover: '#57534E',
      infoColorPressed: '#292524',
      infoColorSuppl: 'rgba(68, 64, 60, 0.1)',

      // Success Colors (Sage)
      successColor: '#15803D',
      successColorHover: '#16A34A',
      successColorPressed: '#14532D',

      // Error Colors (Rose)
      errorColor: '#BE123C',
      errorColorHover: '#E11D48',
      errorColorPressed: '#881337',

      // Neutral Colors
      textColorBase: '#1C1917',
      textColor1: '#1C1917',
      textColor2: '#44403C',
      textColor3: '#78716C',
      textColorDisabled: 'rgba(120, 113, 108, 0.5)',
      placeholderColor: '#A8A29E',
      borderColor: '#E7E5E4',

      // Background Colors
      bodyColor: '#FDFCFB',
      cardColor: '#FFFFFF',
      modalColor: '#FFFFFF',
      popoverColor: '#FFFFFF',

      // CTA/Action Colors (Gold/Bronze)
      actionColor: '#CA8A04',

      // Font
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      borderRadius: '4px',
    },

    Button: {
      borderRadius: '2px',
      fontWeight: '500',
      heightLarge: '48px',
    },

    Card: {
      borderRadius: '4px',
      borderColor: '#E7E5E4',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },

    Input: {
      borderRadius: '2px',
      borderColor: '#E7E5E4',
      borderColorHover: '#D6D3D1',
      borderColorFocus: '#18181B',
    },

    Modal: {
      borderRadius: '4px',
    },
  };
});
</script>
