<template>
  <div class="event-detail-view" v-if="event">
    <n-grid :cols="24" :x-gap="16" :y-gap="16">
      <!-- 主内容区 -->
      <n-gi :span="16">
        <n-card :title="event.title" style="margin-bottom: 16px">
          <template #header-extra>
            <n-tag :type="statusType">{{ statusLabel }}</n-tag>
          </template>
          
          <n-space vertical>
            <n-text depth="3" v-if="event.event_date">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {{ event.event_date }}
            </n-text>
            
            <n-alert v-if="event.summary" type="info" :title="'摘要'">
              {{ event.summary }}
            </n-alert>
            
            <n-divider />
            
            <n-scrollbar style="max-height: 60vh">
              <div class="markdown-content" v-html="renderedContent"></div>
            </n-scrollbar>
            
            <n-divider />
            
            <n-space v-if="event.source_url">
              <n-text depth="3">来源：</n-text>
              <a :href="event.source_url" target="_blank">{{ event.source_url }}</a>
            </n-space>
          </n-space>
        </n-card>

        <!-- 时间线节点 -->
        <n-card title="时间线" style="margin-bottom: 16px">
          <template #header-extra>
            <n-button size="small" type="primary" @click="showAddTimeline = true">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </template>
              添加节点
            </n-button>
          </template>

          <n-timeline v-if="timelineNodes.length > 0">
            <n-timeline-item
              v-for="node in timelineNodes"
              :key="node.id"
              :title="node.title"
              :description="node.description"
              :time="node.node_date || undefined"
              :type="'default'"
            >
              <template #icon>
                <n-button size="tiny" text type="primary" @click="editTimelineNode(node)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </n-button>
              </template>
              <n-space style="margin-top: 8px">
                <n-button size="small" text type="error" @click="deleteTimelineNodeItem(node)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </n-button>
              </n-space>
            </n-timeline-item>
          </n-timeline>
          
          <n-empty v-else description="暂无时间线节点" />
        </n-card>

        <!-- 参考材料 -->
        <n-card title="参考材料" style="margin-bottom: 16px">
          <template #header-extra>
            <n-button size="small" type="primary" @click="showUploadMaterial = true">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </template>
              上传材料
            </n-button>
          </template>

          <n-grid v-if="materials.length > 0" :cols="2" :x-gap="12" :y-gap="12">
            <n-gi v-for="material in materials" :key="material.id">
              <n-card :title="material.title || '无标题'" size="small">
                <template #cover>
                  <div v-if="material.type === 'image'" class="material-cover">
                    <img :src="getMaterialPreviewUrl(material.id)" style="width: 100%; height: 120px; object-fit: cover" />
                  </div>
                  <div v-else-if="material.type === 'pdf'" class="material-cover pdf-cover">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div v-else class="material-cover">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                </template>
                <n-space vertical>
                  <n-tag size="small">{{ material.type }}</n-tag>
                  <n-text depth="3" style="font-size: 12px" v-if="material.source_url">
                    {{ material.source_url?.slice(0, 50) }}...
                  </n-text>
                  <n-space>
                    <n-button size="small" @click="previewMaterial(material)">预览</n-button>
                    <n-button size="small" type="error" text @click="deleteMaterialItem(material.id)">删除</n-button>
                  </n-space>
                </n-space>
              </n-card>
            </n-gi>
          </n-grid>
          
          <n-empty v-else description="暂无参考材料" />
        </n-card>
      </n-gi>

      <!-- 侧边栏 -->
      <n-gi :span="8">
        <n-card title="操作" style="margin-bottom: 16px">
          <n-space vertical>
            <n-button block @click="handleEdit">编辑</n-button>
            <n-button block type="warning" @click="handleArchive">归档</n-button>
            <n-button block type="error" @click="handleDelete">删除</n-button>
            <n-button block @click="handleBack">返回</n-button>
          </n-space>
        </n-card>

        <n-card title="标签" style="margin-bottom: 16px">
          <n-space>
            <n-tag v-for="tag in tags" :key="tag.id" :color="{ color: tag.color || undefined }">
              {{ tag.name }}
            </n-tag>
            <n-button size="small" text type="primary" @click="showTagModal = true">
              + 添加
            </n-button>
          </n-space>
        </n-card>

        <n-card title="信息">
          <n-descriptions bordered :column="1" size="small">
            <n-descriptions-item label="创建时间">
              {{ event.created_at }}
            </n-descriptions-item>
            <n-descriptions-item label="更新时间">
              {{ event.updated_at }}
            </n-descriptions-item>
            <n-descriptions-item label="ID">
              {{ event.id.slice(0, 8) }}...
            </n-descriptions-item>
          </n-descriptions>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 标签选择 Modal -->
    <n-modal v-model:show="showTagModal" preset="dialog" title="选择标签">
      <n-space vertical>
        <n-checkbox-group v-model:value="selectedTagIds">
          <n-space vertical>
            <n-checkbox v-for="tag in allTags" :key="tag.id" :value="tag.id">
              <n-tag :color="{ color: tag.color || undefined }">{{ tag.name }}</n-tag>
            </n-checkbox>
          </n-space>
        </n-checkbox-group>
      </n-space>
      <template #action>
        <n-button @click="showTagModal = false">取消</n-button>
        <n-button type="primary" @click="handleSaveTags">保存</n-button>
      </template>
    </n-modal>

    <!-- 编辑事件 Modal -->
    <n-modal v-model:show="showEditModal" preset="dialog" title="编辑事件">
      <n-form ref="editFormRef" :model="editForm" :rules="formRules">
        <n-form-item label="标题" path="title">
          <n-input v-model:value="editForm.title" />
        </n-form-item>
        <n-form-item label="摘要" path="summary">
          <n-input v-model:value="editForm.summary" type="textarea" :rows="2" />
        </n-form-item>
        <n-form-item label="内容" path="content">
          <n-input v-model:value="editForm.content" type="textarea" :rows="8" />
        </n-form-item>
        <n-form-item label="日期" path="event_date">
          <n-date-picker v-model:value="editForm.event_date" />
        </n-form-item>
        <n-form-item label="来源链接" path="source_url">
          <n-input v-model:value="editForm.source_url" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showEditModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
      </template>
    </n-modal>

    <!-- 添加/编辑时间线节点 Modal -->
    <n-modal v-model:show="showAddTimeline" preset="dialog" :title="editingTimelineNode ? '编辑节点' : '添加时间线节点'">
      <n-form ref="timelineFormRef" :model="timelineForm" :rules="timelineFormRules">
        <n-form-item label="标题" path="title">
          <n-input v-model:value="timelineForm.title" placeholder="节点标题" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="timelineForm.description" type="textarea" :rows="3" placeholder="节点详情" />
        </n-form-item>
        <n-form-item label="日期" path="node_date">
          <n-date-picker v-model:value="timelineForm.node_date" placeholder="节点发生日期" />
        </n-form-item>
        <n-form-item label="排序" path="sort_order">
          <n-input-number v-model:value="timelineForm.sort_order" :min="0" placeholder="数字越小越靠前" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showAddTimeline = false">取消</n-button>
        <n-button type="primary" :loading="savingTimeline" @click="handleSaveTimeline">保存</n-button>
      </template>
    </n-modal>

    <!-- 上传材料 Modal -->
    <n-modal v-model:show="showUploadMaterial" preset="dialog" title="上传材料">
      <n-form ref="materialFormRef" :model="materialForm" :rules="materialFormRules">
        <n-form-item label="标题" path="title">
          <n-input v-model:value="materialForm.title" placeholder="材料标题" />
        </n-form-item>
        <n-form-item label="类型" path="type">
          <n-select
            v-model:value="materialForm.type"
            :options="[
              { label: '图片', value: 'image' },
              { label: '视频', value: 'video' },
              { label: 'PDF', value: 'pdf' },
              { label: '网页快照', value: 'snapshot' },
              { label: '其他', value: 'other' },
            ]"
          />
        </n-form-item>
        <n-form-item label="上传文件" path="file">
          <n-upload
            :default-upload="false"
            :file-list="materialForm.file ? [materialForm.file] : []"
            @change="handleFileChange"
          >
            <n-button>选择文件</n-button>
          </n-upload>
          <n-text depth="3" style="font-size: 12px; margin-top: 8px; display: block">
            或
          </n-text>
        </n-form-item>
        <n-form-item label="来源链接" path="source_url">
          <n-input v-model:value="materialForm.source_url" placeholder="https://..." />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showUploadMaterial = false">取消</n-button>
        <n-button type="primary" :loading="uploadingMaterial" @click="handleUploadMaterial">上传</n-button>
      </template>
    </n-modal>
  </div>

  <n-empty v-else description="事件不存在" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import type { Event, Tag, TimelineNode, Material } from '@book-of-ages/shared';
import { getEvent, updateEvent, deleteEvent, getEventTags, updateEventTags } from '../api/eventApi';
import { getTagList } from '../api/tagApi';
import { getTimelineNodes, createTimelineNode, updateTimelineNode, deleteTimelineNode } from '../api/timelineApi';
import { getMaterials, uploadMaterial, deleteMaterial, getMaterialPreviewUrl } from '../api/materialApi';
import { marked } from 'marked';

const message = useMessage();
const route = useRoute();
const router = useRouter();

const event = ref<Event | null>(null);
const tags = ref<Tag[]>([]);
const allTags = ref<Tag[]>([]);
const timelineNodes = ref<TimelineNode[]>([]);
const materials = ref<Material[]>([]);

const showTagModal = ref(false);
const showEditModal = ref(false);
const showAddTimeline = ref(false);
const showUploadMaterial = ref(false);

const saving = ref(false);
const savingTimeline = ref(false);
const uploadingMaterial = ref(false);

const selectedTagIds = ref<string[]>([]);
const editingTimelineNode = ref<TimelineNode | null>(null);

const editForm = ref({
  title: '',
  summary: '',
  content: '',
  event_date: null as number | null,
  source_url: '',
});

const timelineForm = ref({
  title: '',
  description: '',
  node_date: null as number | null,
  sort_order: 0,
});

const materialForm = ref({
  title: '',
  type: 'image' as 'image' | 'video' | 'pdf' | 'snapshot' | 'other',
  file: null as File | null,
  source_url: '',
});

const formRules = {
  title: { required: true, message: '标题不能为空', trigger: 'blur' },
};

const timelineFormRules = {
  title: { required: true, message: '标题不能为空', trigger: 'blur' },
};

const materialFormRules = {
  type: { required: true, message: '请选择类型', trigger: 'change' },
};

// @ts-ignore
const editFormRef = ref<any>(null);
// @ts-ignore
const timelineFormRef = ref<any>(null);
// @ts-ignore
const materialFormRef = ref<any>(null);

const statusType = computed(() => {
  const map: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    draft: 'warning',
    confirmed: 'success',
    archived: 'info',
    deleted: 'error',
  };
  return map[event.value?.status || ''] || 'default';
});

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    archived: '已归档',
    deleted: '已删除',
  };
  return map[event.value?.status || ''] || '';
});

const renderedContent = computed(() => {
  if (!event.value?.content) return '';
  return marked(event.value.content);
});

// 加载事件详情
async function loadEvent() {
  const id = route.params.id as string;
  try {
    const data = await getEvent(id);
    event.value = data;
    
    // 加载标签
    const tagData = await getEventTags(id);
    tags.value = tagData;
    selectedTagIds.value = tagData.map(t => t.id);
    
    // 加载时间线
    await loadTimeline();
    
    // 加载材料
    await loadMaterials();
    
    // 填充编辑表单
    editForm.value = {
      title: data.title,
      summary: data.summary || '',
      content: data.content || '',
      event_date: data.event_date ? new Date(data.event_date).getTime() : null,
      source_url: data.source_url || '',
    };
  } catch (error) {
    message.error('加载事件详情失败');
    console.error(error);
  }
}

// 加载时间线
async function loadTimeline() {
  try {
    timelineNodes.value = await getTimelineNodes(event.value!.id);
  } catch (error) {
    console.error('加载时间线失败', error);
  }
}

// 加载材料
async function loadMaterials() {
  try {
    materials.value = await getMaterials(event.value!.id);
  } catch (error) {
    console.error('加载材料失败', error);
  }
}

// 加载所有标签
async function loadTags() {
  try {
    allTags.value = await getTagList();
  } catch (error) {
    console.error('加载标签失败', error);
  }
}

// 保存标签
async function handleSaveTags() {
  try {
    await updateEventTags(event.value!.id, selectedTagIds.value);
    tags.value = allTags.value.filter(t => selectedTagIds.value.includes(t.id));
    showTagModal.value = false;
    message.success('标签已更新');
  } catch (error) {
    message.error('更新标签失败');
    console.error(error);
  }
}

// 编辑事件
function handleEdit() {
  showEditModal.value = true;
}

// 保存编辑
async function handleSave() {
  saving.value = true;
  try {
    const updated = await updateEvent(event.value!.id, {
      title: editForm.value.title,
      summary: editForm.value.summary || undefined,
      content: editForm.value.content || undefined,
      event_date: editForm.value.event_date ? new Date(editForm.value.event_date).toISOString() : undefined,
      source_url: editForm.value.source_url || undefined,
    });
    event.value = updated;
    showEditModal.value = false;
    message.success('保存成功');
  } catch (error) {
    message.error('保存失败');
    console.error(error);
  } finally {
    saving.value = false;
  }
}

// 归档
async function handleArchive() {
  try {
    await updateEvent(event.value!.id, { status: 'archived' });
    message.success('已归档');
    router.push('/events');
  } catch (error) {
    message.error('归档失败');
    console.error(error);
  }
}

// 删除
async function handleDelete() {
  try {
    await deleteEvent(event.value!.id);
    message.success('已删除');
    router.push('/events');
  } catch (error) {
    message.error('删除失败');
    console.error(error);
  }
}

// 返回
function handleBack() {
  router.back();
}

// 时间线相关
function editTimelineNode(node: TimelineNode) {
  editingTimelineNode.value = node;
  timelineForm.value = {
    title: node.title,
    description: node.description || '',
    node_date: node.node_date ? new Date(node.node_date).getTime() : null,
    sort_order: node.sort_order,
  };
  showAddTimeline.value = true;
}

async function handleSaveTimeline() {
  savingTimeline.value = true;
  try {
    if (editingTimelineNode.value) {
      await updateTimelineNode(editingTimelineNode.value.id, {
        title: timelineForm.value.title,
        description: timelineForm.value.description || undefined,
        node_date: timelineForm.value.node_date ? new Date(timelineForm.value.node_date).toISOString() : undefined,
        sort_order: timelineForm.value.sort_order,
      });
      message.success('节点已更新');
    } else {
      await createTimelineNode(event.value!.id, {
        title: timelineForm.value.title,
        description: timelineForm.value.description || undefined,
        node_date: timelineForm.value.node_date ? new Date(timelineForm.value.node_date).toISOString() : undefined,
        sort_order: timelineForm.value.sort_order,
      });
      message.success('节点已添加');
    }
    showAddTimeline.value = false;
    editingTimelineNode.value = null;
    loadTimeline();
  } catch (error) {
    message.error('操作失败');
    console.error(error);
  } finally {
    savingTimeline.value = false;
  }
}

async function deleteTimelineNodeItem(node: TimelineNode) {
  try {
    await deleteTimelineNode(node.id);
    message.success('节点已删除');
    loadTimeline();
  } catch (error) {
    message.error('删除失败');
    console.error(error);
  }
}

// 材料相关
function handleFileChange({ file }: { file: File | null }) {
  materialForm.value.file = file;
}

async function handleUploadMaterial() {
  if (!materialForm.value.file && !materialForm.value.source_url) {
    message.warning('请上传文件或提供来源链接');
    return;
  }

  uploadingMaterial.value = true;
  try {
    await uploadMaterial({
      event_id: event.value!.id,
      type: materialForm.value.type,
      title: materialForm.value.title || undefined,
      source_url: materialForm.value.source_url || undefined,
      file: materialForm.value.file || undefined,
    });
    message.success('材料已上传');
    showUploadMaterial.value = false;
    materialForm.value = {
      title: '',
      type: 'image',
      file: null,
      source_url: '',
    };
    loadMaterials();
  } catch (error) {
    message.error('上传失败');
    console.error(error);
  } finally {
    uploadingMaterial.value = false;
  }
}

function previewMaterial(material: Material) {
  window.open(getMaterialPreviewUrl(material.id), '_blank');
}

async function deleteMaterialItem(id: string) {
  try {
    await deleteMaterial(id);
    message.success('材料已删除');
    loadMaterials();
  } catch (error) {
    message.error('删除失败');
    console.error(error);
  }
}

onMounted(() => {
  loadEvent();
  loadTags();
});
</script>

<style scoped>
.event-detail-view {
  padding: 0;
}

.markdown-content {
  line-height: 1.8;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-content :deep(p) {
  margin-bottom: 16px;
}

.markdown-content :deep(code) {
  background-color: var(--n-color-embedded);
  padding: 2px 6px;
  border-radius: 4px;
}

.markdown-content :deep(pre) {
  background-color: var(--n-color-embedded);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

.material-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  background-color: var(--n-color-embedded);
}

.pdf-cover {
  background-color: #fff5f5;
}
</style>
