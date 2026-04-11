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
import { computed } from 'vue';
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui';
import MainLayout from './components/MainLayout.vue';
import { useAppStore } from './stores/app';

const appStore = useAppStore();
const currentTheme = computed(() => (appStore.isDark ? darkTheme : null));

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0D9488',
    primaryColorHover: '#14B8A6',
    primaryColorPressed: '#0F766E',
    primaryColorSuppl: 'rgba(13, 148, 136, 0.15)',
    infoColor: '#F97316', // mapping info color to CTA orange
    infoColorHover: '#FB923C',
    infoColorPressed: '#EA580C',
    infoColorSuppl: 'rgba(249, 115, 22, 0.15)',
    fontFamily: 'Inter, sans-serif',
  },
  Button: {
    textColorPrimary: '#FFFFFF',
    textColorHoverPrimary: '#FFFFFF',
    textColorPressedPrimary: '#FFFFFF',
    textColorFocusPrimary: '#FFFFFF',
    colorInfo: '#F97316',
    colorHoverInfo: '#FB923C',
    colorPressedInfo: '#EA580C',
    textColorInfo: '#FFFFFF',
    textColorHoverInfo: '#FFFFFF',
    textColorPressedInfo: '#FFFFFF',
    textColorFocusInfo: '#FFFFFF',
  },
};
</script>
