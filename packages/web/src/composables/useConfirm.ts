/**
 * 确认对话框 Hook：以 Promise 形式封装 naive-ui Dialog，
 * 替代原生 window.confirm（风格统一且可定制危险操作样式）
 */

import { useDialog } from 'naive-ui';

export interface ConfirmOptions {
  title?: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  /** 危险操作（确认按钮显示为红色） */
  danger?: boolean;
}

export function useConfirm() {
  const dialog = useDialog();

  return function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.warning({
        title: options.title ?? '确认操作',
        content: options.content,
        positiveText: options.confirmText ?? '确认',
        negativeText: options.cancelText ?? '取消',
        positiveButtonProps: {
          type: options.danger ? 'error' : 'primary',
        },
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false),
      });
    });
  };
}
