/**
 * 键盘快捷键 Hook
 * 提供全局键盘快捷键支持
 */

import { onMounted, onUnmounted } from 'vue';

export interface KeyboardShortcut {
  /** 快捷键组合 (如 'Ctrl+K', 'Escape') */
  keys: string;
  /** 回调函数 */
  handler: () => void;
  /** 是否在输入框中触发（默认 false） */
  allowInInput?: boolean;
}

/**
 * 注册键盘快捷键
 * @param shortcuts 快捷键配置数组
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  function handleKeyDown(event: KeyboardEvent) {
    // 检查是否在输入框中
    const target = event.target as HTMLElement;
    const isInput =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;

    for (const shortcut of shortcuts) {
      const keyCombo = shortcut.keys.toLowerCase();
      const allowInInput = shortcut.allowInInput || false;

      // 如果在输入框中且不允许在输入框中触发，跳过
      if (isInput && !allowInInput) continue;

      // 解析快捷键组合
      const parts = keyCombo.split('+');
      const key = parts[parts.length - 1];
      const hasCtrl = parts.includes('ctrl') || parts.includes('cmd');
      const hasShift = parts.includes('shift');
      const hasAlt = parts.includes('alt');

      // 检查是否匹配
      const isCtrlMatch = hasCtrl
        ? event.ctrlKey || event.metaKey
        : !event.ctrlKey && !event.metaKey;
      const isShiftMatch = hasShift ? event.shiftKey : !event.shiftKey;
      const isAltMatch = hasAlt ? event.altKey : !event.altKey;
      const isKeyMatch = event.key.toLowerCase() === key;

      if (isCtrlMatch && isShiftMatch && isAltMatch && isKeyMatch) {
        event.preventDefault();
        shortcut.handler();
        break;
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}

/**
 * 常用快捷键工厂函数
 */
export function useCommonShortcuts(handlers: {
  /** 快速搜索 (Ctrl/Cmd + K) */
  onSearch?: () => void;
  /** 新建 (Ctrl/Cmd + N) */
  onNew?: () => void;
  /** 返回/关闭 (Escape) */
  onBack?: () => void;
  /** 切换主题 (Ctrl/Cmd + D) */
  onToggleTheme?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onSearch) {
    shortcuts.push({
      keys: 'Ctrl+K',
      handler: handlers.onSearch,
      allowInInput: false,
    });
  }

  if (handlers.onNew) {
    shortcuts.push({
      keys: 'Ctrl+N',
      handler: handlers.onNew,
      allowInInput: false,
    });
  }

  if (handlers.onBack) {
    shortcuts.push({
      keys: 'Escape',
      handler: handlers.onBack,
      allowInInput: true,
    });
  }

  if (handlers.onToggleTheme) {
    shortcuts.push({
      keys: 'Ctrl+D',
      handler: handlers.onToggleTheme,
      allowInInput: false,
    });
  }

  useKeyboardShortcuts(shortcuts);
}
