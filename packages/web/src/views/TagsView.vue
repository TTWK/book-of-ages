<template>
  <div class="tags-view">
    <n-card title="标签管理">
      <template #header-extra>
        <n-button type="primary" @click="handleCreate()">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </template>
          新建标签
        </n-button>
      </template>

      <n-space vertical>
        <n-tree
          :data="treeData"
          :render-prefix="renderPrefix"
          :render-suffix="renderSuffix"
          block-line
          key-field="id"
          label-field="name"
        />
      </n-space>
    </n-card>

    <!-- 创建/编辑标签 Modal -->
    <n-modal v-model:show="showModal" preset="dialog" :title="editingTag ? '编辑标签' : '新建标签'">
      <n-form ref="formRef" :model="formData" :rules="formRules">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="formData.name" placeholder="标签名称" />
        </n-form-item>
        <n-form-item label="父标签" path="parent_id">
          <n-select
            v-model:value="formData.parent_id"
            :options="parentTagOptions"
            clearable
            placeholder="选择父标签（可选）"
          />
        </n-form-item>
        <n-form-item label="颜色" path="color">
          <n-color-picker v-model:value="formData.color" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSubmit">保存</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue';
import type { FormRules, FormInst, TreeOption } from 'naive-ui';
import { NButton, NTag, useMessage } from 'naive-ui';
import type { Tag } from '@book-of-ages/shared';
import { getTagList, createTag, updateTag, deleteTag } from '../api/tagApi';

const message = useMessage();

const tags = ref<Tag[]>([]);
const showModal = ref(false);
const saving = ref(false);
const editingTag = ref<Tag | null>(null);

const formData = ref({
  name: '',
  parent_id: undefined as string | undefined,
  color: undefined as string | undefined,
});

const formRules: FormRules = {
  name: { required: true, message: '请输入标签名称', trigger: 'blur' },
};

const formRef = ref<FormInst | null>(null);

// 构建树形数据
const treeData = computed(() => {
  const tagMap = new Map<string, TreeOption & { children?: TreeOption[] }>();
  const roots: TreeOption[] = [];

  // 初始化所有节点
  tags.value.forEach(tag => {
    tagMap.set(tag.id, {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      key: tag.id,
      label: tag.name,
      children: [],
    });
  });

  // 构建树形结构
  tags.value.forEach(tag => {
    const node = tagMap.get(tag.id)!;
    if (tag.parent_id && tagMap.has(tag.parent_id)) {
      tagMap.get(tag.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
});

// 父标签选项
const parentTagOptions = computed(() => {
  return tags.value
    .filter(t => !editingTag.value || t.id !== editingTag.value.id)
    .map(t => ({
      label: t.name,
      value: t.id,
    }));
});

// 渲染前缀（颜色标签）
function renderPrefix(option: TreeOption) {
  return h(NTag, {
    size: 'small',
    type: 'default',
    style: {
      backgroundColor: (option as any).color || undefined,
      marginRight: '8px',
    },
  }, { default: () => '' });
}

// 渲染后缀（操作按钮）
function renderSuffix(option: TreeOption) {
  return h(NButton, {
    size: 'tiny',
    text: true,
    type: 'primary',
    onClick: (e: Event) => {
      e.stopPropagation();
      handleEdit(option as any);
    },
  }, { default: () => '编辑' });
}

// 打开创建模态框
function handleCreate() {
  editingTag.value = null;
  formData.value = {
    name: '',
    parent_id: undefined,
    color: undefined,
  };
  showModal.value = true;
}

// 打开编辑模态框
function handleEdit(tag: Tag) {
  editingTag.value = tag;
  formData.value = {
    name: tag.name,
    parent_id: tag.parent_id,
    color: tag.color || undefined,
  };
  showModal.value = true;
}

// 提交表单
async function handleSubmit() {
  await formRef.value?.validate();
  
  saving.value = true;
  try {
    if (editingTag.value) {
      await updateTag(editingTag.value.id, formData.value);
      message.success('更新成功');
    } else {
      await createTag(formData.value);
      message.success('创建成功');
    }
    showModal.value = false;
    loadTags();
  } catch (error) {
    message.error('操作失败');
    console.error(error);
  } finally {
    saving.value = false;
  }
}

// 删除标签
// @ts-ignore
async function handleDelete(tag: Tag) {
  try {
    await deleteTag(tag.id);
    message.success('删除成功');
    loadTags();
  } catch (error) {
    message.error('删除失败');
    console.error(error);
  }
}

// 加载标签列表
async function loadTags() {
  try {
    tags.value = await getTagList();
  } catch (error) {
    message.error('加载标签失败');
    console.error(error);
  }
}

onMounted(() => {
  loadTags();
});
</script>

<style scoped>
.tags-view {
  height: 100%;
}
</style>
