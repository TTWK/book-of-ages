/**
 * 操作撤销 (Undo) Hook
 * 提供类似 Gmail 的撤销操作功能
 */

import { ref, onUnmounted } from 'vue';

export interface UndoAction {
  /** 执行的操作 */
  execute: () => Promise<void>;
  /** 撤销操作 */
  undo: () => Promise<void>;
  /** 成功消息 */
  successMessage: string;
  /** 失败消息 */
  errorMessage: string;
}

/**
 * 显示撤销 Toast
 * @param message 成功消息
 * @param undoFn 撤销函数
 * @param duration 显示时长（毫秒）
 */
export function useUndo(message: {
  success: (
    msg: string,
    options?: { action?: { text: string; handler: () => void }; duration?: number }
  ) => void;
  error: (msg: string) => void;
}) {
  const pendingTimeouts = ref<Set<ReturnType<typeof setTimeout>>>(new Set());

  /**
   * 执行带撤销的操作
   * @param action 操作配置
   * @param undoDuration 撤销窗口时长（毫秒）
   */
  async function executeWithUndo(action: UndoAction, undoDuration = 5000): Promise<boolean> {
    try {
      // 执行操作
      await action.execute();

      // 显示撤销 Toast
      let undoTriggered = false;

      const timeout = setTimeout(() => {
        if (!undoTriggered) {
          // 超时后清理
          cleanup();
        }
      }, undoDuration);

      pendingTimeouts.value.add(timeout);

      message.success(action.successMessage, {
        action: {
          text: '撤销',
          handler: async () => {
            undoTriggered = true;
            clearTimeout(timeout);
            pendingTimeouts.value.delete(timeout);

            try {
              await action.undo();
              message.success('已撤销');
            } catch (_error) {
              message.error('撤销失败');
            }
          },
        },
        duration: undoDuration,
      });

      return true;
    } catch (_error) {
      message.error(action.errorMessage);
      return false;
    }
  }

  /**
   * 清理所有待执行的超时
   */
  function cleanup() {
    pendingTimeouts.value.forEach((timeout) => clearTimeout(timeout));
    pendingTimeouts.value.clear();
  }

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup();
  });

  return {
    executeWithUndo,
    cleanup,
  };
}

/**
 * 常见操作的撤销工厂函数
 */
export function useCommonUndoActions(message: {
  success: (
    msg: string,
    options?: { action?: { text: string; handler: () => void }; duration?: number }
  ) => void;
  error: (msg: string) => void;
}) {
  const undo = useUndo(message);

  return {
    /**
     * 删除事件（带撤销）
     */
    deleteEvent: async (
      eventId: string,
      deleteFn: () => Promise<void>,
      restoreFn: () => Promise<void>,
      eventName = '事件'
    ) => {
      return undo.executeWithUndo({
        execute: deleteFn,
        undo: restoreFn,
        successMessage: `已删除${eventName}`,
        errorMessage: `删除${eventName}失败`,
      });
    },

    /**
     * 归档事件（带撤销）
     */
    archiveEvent: async (
      eventId: string,
      archiveFn: () => Promise<void>,
      unarchiveFn: () => Promise<void>,
      eventName = '事件'
    ) => {
      return undo.executeWithUndo({
        execute: archiveFn,
        undo: unarchiveFn,
        successMessage: `已归档${eventName}`,
        errorMessage: `归档${eventName}失败`,
      });
    },

    /**
     * 修改状态（带撤销）
     */
    changeStatus: async (
      changeFn: () => Promise<void>,
      revertFn: () => Promise<void>,
      statusName: string
    ) => {
      return undo.executeWithUndo({
        execute: changeFn,
        undo: revertFn,
        successMessage: `状态已修改为${statusName}`,
        errorMessage: '状态修改失败',
      });
    },
  };
}
