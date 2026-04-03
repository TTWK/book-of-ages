<template>
  <div class="relative min-h-[calc(100vh-8rem)] pb-20 max-w-4xl mx-auto">
    <!-- Header Area -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-[#134E4A] tracking-tight">标签管理</h1>
        <p class="text-sm text-gray-500 mt-1">事件聚合与分类</p>
      </div>
      <button 
        @click="handleCreate()"
        class="flex items-center px-4 py-2 bg-[#F97316] hover:bg-[#FB923C] text-white rounded-md font-medium transition-colors duration-200 cursor-pointer shadow-sm shadow-orange-500/20"
      >
        <Plus class="w-5 h-5 mr-1" />
        新建标签
      </button>
    </div>

    <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <n-tree
        :data="treeData"
        :render-prefix="renderPrefix"
        :render-suffix="renderSuffix"
        block-line
        expand-on-click
        key-field="id"
        label-field="name"
        class="custom-tree"
      />
      <div v-if="tags.length === 0" class="text-center py-12 text-gray-400">
        暂无标签数据
      </div>
    </div>

    <!-- 创建/编辑标签 Modal -->
    <n-modal v-model:show="showModal" preset="card" class="max-w-md" :title="editingTag ? '编辑标签' : '新建标签'">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
          <input v-model="formData.name" class="w-full p-2 border border-gray-200 rounded-md outline-none focus:border-[#0D9488]" placeholder="标签名称" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">父标签 (可选)</label>
          <n-select
            v-model:value="formData.parent_id"
            :options="parentTagOptions"
            clearable
            placeholder="选择父标签"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">颜色</label>
          <n-color-picker v-model:value="formData.color" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button @click="showModal = false" class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">取消</button>
          <button @click="handleSubmit" :disabled="saving" class="px-4 py-2 text-white bg-[#0D9488] hover:bg-[#14B8A6] rounded-md transition-colors flex items-center">
            <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
            保存
          </button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue';
import type { TreeOption } from 'naive-ui';
import { NPopconfirm, useMessage } from 'naive-ui';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-vue-next';
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

const treeData = computed(() => {
  const tagMap = new Map<string, TreeOption & { children?: TreeOption[]; eventCount?: number }>();
  const roots: TreeOption[] = [];

  tags.value.forEach(tag => {
    tagMap.set(tag.id, {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      eventCount: (tag as any).eventCount || 0,
      key: tag.id,
      label: tag.name,
      children: [],
    });
  });

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

const parentTagOptions = computed(() => {
  return tags.value
    .filter(t => !editingTag.value || t.id !== editingTag.value.id)
    .map(t => ({
      label: t.name,
      value: t.id,
    }));
});

function renderPrefix(option: TreeOption) {
  const tag = option as any;
  const color = tag.color;
  
  return h('div', { class: 'flex items-center mr-2' }, [
    h('div', {
      class: 'w-3 h-3 rounded-full',
      style: { backgroundColor: color || '#D1D5DB' }
    }),
    tag.eventCount !== undefined ? h('span', {
      class: 'ml-2 text-xs text-gray-500'
    }, `(${tag.eventCount})`) : null
  ]);
}

function renderSuffix(option: TreeOption) {
  const tag = option as any;
  
  return h('div', { class: 'flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2' }, [
    h('button', {
      class: 'p-1 text-gray-400 hover:text-[#0D9488] rounded transition-colors',
      onClick: (e: Event) => { e.stopPropagation(); handleEdit(tag); }
    }, [ h(Edit2, { class: 'w-4 h-4' }) ]),
    
    h(NPopconfirm, {
      onPositiveClick: () => handleDelete(tag),
    }, {
      trigger: () => h('button', {
        class: 'p-1 text-gray-400 hover:text-red-500 rounded transition-colors',
        onClick: (e: Event) => e.stopPropagation()
      }, [ h(Trash2, { class: 'w-4 h-4' }) ]),
      default: () => `确定要删除标签"${tag.name}"吗？此操作不可撤销。`,
    }),
  ]);
}

function handleCreate() {
  editingTag.value = null;
  formData.value = { name: '', parent_id: undefined, color: '#0D9488' };
  showModal.value = true;
}

function handleEdit(tag: Tag) {
  editingTag.value = tag;
  formData.value = { name: tag.name, parent_id: tag.parent_id, color: tag.color || undefined };
  showModal.value = true;
}

async function handleSubmit() {
  if (!formData.value.name.trim()) return message.warning('标签名不能为空');
  
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
  } finally {
    saving.value = false;
  }
}

async function handleDelete(tag: Tag) {
  try {
    await deleteTag(tag.id);
    message.success('删除成功');
    loadTags();
  } catch (error) {
    message.error('删除失败');
  }
}

async function loadTags() {
  try {
    tags.value = await getTagList();
  } catch (error) {
    message.error('加载标签失败');
  }
}

onMounted(() => {
  loadTags();
});
</script>

<style>
@reference "../style.css";
.custom-tree .n-tree-node-content {
  padding: 8px 0;
}
.custom-tree .n-tree-node-content:hover {
  background-color: #F0FDFA !important;
}
.custom-tree .n-tree-node:hover .action-btns {
  opacity: 1 !important;
}
</style>