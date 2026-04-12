<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    :title="title"
    :content="content"
    :positive-text="confirmText"
    :negative-text="cancelText"
    :positive-button-props="{ type: danger ? 'error' : 'primary' }"
    @positive-click="handleConfirm"
    @negative-click="handleCancel"
    @close="handleCancel"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDialog } from 'naive-ui';

interface ConfirmOptions {
  /** 标题 */
  title?: string;
  /** 内容 */
  content?: string;
  /** 确认按钮文字 */
  confirmText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 是否为危险操作 */
  danger?: boolean;
}

interface Props {
  /** 标题 */
  title?: string;
  /** 内容 */
  content?: string;
  /** 确认按钮文字 */
  confirmText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 是否为危险操作 */
  danger?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认操作',
  content: '确定要执行此操作吗？',
  confirmText: '确认',
  cancelText: '取消',
  danger: false,
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const showModal = ref(false);
const dialog = useDialog();

/**
 * 显示确认对话框
 */
function open(options?: ConfirmOptions) {
  const config = { ...props, ...options };

  dialog.warning({
    title: config.title,
    content: config.content,
    positiveText: config.confirmText,
    negativeText: config.cancelText,
    positiveButtonProps: {
      type: config.danger ? 'error' : 'primary',
    },
    onPositiveClick: () => {
      emit('confirm');
    },
    onNegativeClick: () => {
      emit('cancel');
    },
  });
}

function handleConfirm() {
  emit('confirm');
}

function handleCancel() {
  emit('cancel');
  showModal.value = false;
}

// 暴露方法
defineExpose({
  open,
});
</script>
