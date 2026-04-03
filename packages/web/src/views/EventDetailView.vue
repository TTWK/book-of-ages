<template>
  <div v-if="loading && !event" class="flex justify-center items-center py-32">
    <Loader2 class="w-8 h-8 animate-spin text-[#0D9488]" />
  </div>

  <div v-else-if="event" class="relative pb-24 md:pb-10">
    <!-- Mobile Back Button -->
    <div class="md:hidden flex items-center mb-4">
      <button @click="handleBack" class="flex items-center text-[#0D9488] font-medium p-2 -ml-2 hover:bg-[#0D9488]/10 rounded-lg transition-colors">
        <ArrowLeft class="w-5 h-5 mr-1" />
        返回
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      
      <!-- Main Content Area (Left 70% on Desktop) -->
      <div class="lg:col-span-8 space-y-6">
        <div class="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
          
          <!-- Header -->
          <div class="flex justify-between items-start mb-6">
            <div class="flex-1">
              <div v-if="isEditing">
                <input 
                  v-model="editForm.title" 
                  class="w-full text-2xl font-bold text-[#134E4A] border-b-2 border-[#0D9488]/30 focus:border-[#0D9488] outline-none pb-1 bg-transparent transition-colors"
                  placeholder="事件标题"
                />
              </div>
              <h1 v-else class="text-2xl md:text-3xl font-bold text-[#134E4A] leading-tight">{{ event.title }}</h1>
              
              <div class="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-500">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getStatusColor(event.status)">
                  {{ getStatusLabel(event.status) }}
                </span>
                
                <div v-if="isEditing" class="flex items-center">
                  <Calendar class="w-4 h-4 mr-1.5" />
                  <n-date-picker v-model:value="editForm.event_date" type="date" clearable size="small" class="w-36" />
                </div>
                <span v-else-if="event.event_date" class="flex items-center">
                  <Calendar class="w-4 h-4 mr-1.5" />
                  {{ new Date(event.event_date).toLocaleDateString() }}
                </span>
                
                <a v-if="!isEditing && event.source_url" :href="event.source_url" target="_blank" class="flex items-center text-[#0D9488] hover:text-[#14B8A6] hover:underline transition-colors">
                  <Link class="w-4 h-4 mr-1.5" />
                  来源链接
                </a>
              </div>
            </div>
            
            <div class="ml-4 flex-shrink-0 flex space-x-2">
              <button 
                v-if="!isEditing" 
                @click="startEdit"
                class="p-2 text-gray-400 hover:text-[#0D9488] bg-gray-50 hover:bg-[#F0FDFA] rounded-md transition-colors cursor-pointer"
              >
                <Edit2 class="w-5 h-5" />
              </button>
              <template v-else>
                <button @click="cancelEdit" class="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer">取消</button>
                <button 
                  @click="handleSave"
                  :disabled="saving"
                  class="px-4 py-1.5 text-sm text-white bg-[#F97316] hover:bg-[#FB923C] rounded-md font-medium transition-colors cursor-pointer flex items-center shadow-sm"
                >
                  <Loader2 v-if="saving" class="w-4 h-4 mr-1 animate-spin" />
                  <Save v-else class="w-4 h-4 mr-1" />
                  保存
                </button>
              </template>
            </div>
          </div>

          <!-- Summary -->
          <div v-if="isEditing" class="mb-6">
            <textarea 
              v-model="editForm.summary" 
              class="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#0D9488] transition-colors"
              placeholder="添加事件摘要..."
              rows="3"
            ></textarea>
          </div>
          <div v-else-if="event.summary" class="mb-8 p-4 bg-gray-50 border-l-4 border-[#0D9488] rounded-r-lg text-gray-700 leading-relaxed text-sm md:text-base">
            {{ event.summary }}
          </div>

          <!-- Content -->
          <div v-if="isEditing" class="mt-6">
            <textarea 
              v-model="editForm.content" 
              class="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-gray-800 focus:outline-none focus:border-[#0D9488] transition-colors resize-y min-h-[300px]"
              placeholder="详细内容 (支持 Markdown)"
            ></textarea>
            
            <div class="mt-4">
              <input 
                v-model="editForm.source_url" 
                type="text"
                class="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#0D9488] transition-colors"
                placeholder="来源链接 https://..."
              />
            </div>
          </div>
          <div v-else class="prose prose-teal max-w-none text-gray-800 leading-loose prose-headings:text-[#134E4A] prose-a:text-[#0D9488] prose-a:no-underline hover:prose-a:underline">
            <div v-html="renderedContent"></div>
          </div>
        </div>
      </div>

      <!-- Sidebar (Right 30% on Desktop) -->
      <div class="lg:col-span-4 space-y-6">
        
        <!-- Actions & Tags -->
        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider">操作与标签</h3>
            <button @click="showStatusModal = true" class="text-xs font-medium text-[#F97316] hover:text-[#FB923C] cursor-pointer">修改状态</button>
          </div>
          
          <div class="flex flex-wrap gap-2 mb-4">
            <span 
              v-for="tag in tags" 
              :key="tag.id" 
              class="px-2.5 py-1 bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] rounded-md text-xs font-medium flex items-center"
            >
              <Hash class="w-3 h-3 mr-1 opacity-70" />
              {{ tag.name }}
            </span>
            <button @click="showTagModal = true" class="px-2 py-1 bg-gray-50 text-gray-500 hover:text-[#0D9488] hover:bg-[#F0FDFA] border border-dashed border-gray-300 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center">
              <Plus class="w-3 h-3 mr-0.5" />
              标签
            </button>
          </div>
          
          <div class="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
            <button @click="handleBack" class="flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors cursor-pointer">
              <ArrowLeft class="w-4 h-4 mr-1.5" /> 返回
            </button>
            <button @click="handleDelete" class="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors cursor-pointer">
              <Trash2 class="w-4 h-4 mr-1.5" /> 删除
            </button>
          </div>
        </div>

        <!-- Timeline -->
        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
              <GitCommit class="w-4 h-4 mr-1.5" />
              时间线
            </h3>
            <button @click="openAddTimeline" class="p-1 text-gray-400 hover:text-[#0D9488] bg-gray-50 hover:bg-[#F0FDFA] rounded transition-colors cursor-pointer">
              <Plus class="w-4 h-4" />
            </button>
          </div>

          <div v-if="timelineNodes.length === 0" class="text-center py-6 text-sm text-gray-400">
            暂无节点，点击右侧 + 号添加
          </div>
          
          <div v-else class="relative border-l-2 border-gray-100 ml-2.5 space-y-6 pb-2">
            <div v-for="node in timelineNodes" :key="node.id" class="relative pl-6 group">
              <!-- Timeline Dot -->
              <div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#14B8A6] group-hover:border-[#F97316] transition-colors"></div>
              
              <!-- Timeline Content -->
              <div class="bg-gray-50 group-hover:bg-[#F0FDFA] p-3 rounded-lg transition-colors border border-transparent group-hover:border-[#CCFBF1]">
                <div class="flex justify-between items-start mb-1">
                  <h4 class="font-semibold text-sm text-[#134E4A]">{{ node.title }}</h4>
                  <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="editTimelineNode(node)" class="p-1 text-gray-400 hover:text-[#0D9488] rounded cursor-pointer"><Edit2 class="w-3 h-3" /></button>
                    <button @click="deleteTimelineNodeItem(node)" class="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"><Trash2 class="w-3 h-3" /></button>
                  </div>
                </div>
                <div class="text-xs text-gray-500 mb-2 font-medium">{{ formatDate(node.node_date, true) }}</div>
                <p v-if="node.description" class="text-xs text-gray-600 line-clamp-2">{{ node.description }}</p>
                <div class="mt-2 text-xs">
                  <button @click="uploadMaterialToNode(node)" class="text-[#0D9488] hover:underline cursor-pointer flex items-center">
                    <Paperclip class="w-3 h-3 mr-1" /> 添加材料
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Materials -->
        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
              <Files class="w-4 h-4 mr-1.5" />
              参考材料
            </h3>
            <button @click="showUploadMaterial = true" class="p-1 text-gray-400 hover:text-[#0D9488] bg-gray-50 hover:bg-[#F0FDFA] rounded transition-colors cursor-pointer">
              <Upload class="w-4 h-4" />
            </button>
          </div>

          <div v-if="materials.length === 0" class="text-center py-6 text-sm text-gray-400">
            暂无附件材料
          </div>
          
          <div v-else class="grid grid-cols-2 gap-3">
            <div 
              v-for="material in materials" 
              :key="material.id"
              class="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
            >
              <!-- Cover Preview -->
              <div class="h-20 w-full bg-gray-100 flex items-center justify-center relative cursor-pointer" @click="previewMaterial(material)">
                <img v-if="material.type === 'image'" :src="getMaterialPreviewUrl(material.id)" class="w-full h-full object-cover" />
                <FileText v-else-if="material.type === 'pdf'" class="w-8 h-8 text-red-400" />
                <Image v-else-if="material.type === 'snapshot'" class="w-8 h-8 text-[#0D9488]" />
                <File class="w-8 h-8 text-gray-400" v-else />
                
                <!-- Hover Overlay -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink class="w-5 h-5 text-white" />
                </div>
              </div>
              
              <!-- Info -->
              <div class="p-2 bg-white flex items-center justify-between">
                <span class="text-[10px] font-medium text-gray-600 truncate">{{ material.title || material.type }}</span>
                <button @click="deleteMaterialItem(material.id)" class="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Status Modal -->
    <n-modal v-model:show="showStatusModal" preset="card" class="max-w-md" title="修改事件状态">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">当前状态</label>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getStatusColor(event.status)">
            {{ getStatusLabel(event.status) }}
          </span>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">新状态</label>
          <n-select v-model:value="newStatus" :options="[{label: '草稿', value: 'draft'}, {label: '已收录', value: 'confirmed'}, {label: '已归档', value: 'archived'}]" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button @click="showStatusModal = false" class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md">取消</button>
          <button @click="handleSaveStatus" :disabled="savingStatus" class="px-4 py-2 text-white bg-[#0D9488] rounded-md flex items-center">保存</button>
        </div>
      </template>
    </n-modal>

    <!-- Tag Select Modal -->
    <n-modal v-model:show="showTagModal" preset="card" class="max-w-md" title="选择标签">
      <div class="max-h-60 overflow-y-auto">
        <n-checkbox-group v-model:value="selectedTagIds">
          <div class="grid grid-cols-2 gap-2">
            <n-checkbox v-for="tag in allTags" :key="tag.id" :value="tag.id" class="p-2 border border-gray-100 rounded hover:bg-gray-50">
              <span class="text-sm">{{ tag.name }}</span>
            </n-checkbox>
          </div>
        </n-checkbox-group>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button @click="showTagModal = false" class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md">取消</button>
          <button @click="handleSaveTags" class="px-4 py-2 text-white bg-[#0D9488] rounded-md">保存</button>
        </div>
      </template>
    </n-modal>

    <!-- Add Timeline Modal -->
    <n-modal v-model:show="showAddTimeline" preset="card" class="max-w-xl" :title="editingTimelineNode ? '编辑节点' : '添加时间线节点'">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">节点标题 *</label>
          <input v-model="timelineForm.title" class="w-full p-2 border border-gray-200 rounded-md focus:border-[#0D9488] outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">节点详情</label>
          <textarea v-model="timelineForm.description" rows="3" class="w-full p-2 border border-gray-200 rounded-md focus:border-[#0D9488] outline-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <n-date-picker v-model:value="timelineForm.node_date" type="datetime" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">排序权重 (越小越靠前)</label>
            <n-input-number v-model:value="timelineForm.sort_order" :min="0" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button @click="showAddTimeline = false" class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md">取消</button>
          <button @click="handleSaveTimeline" :disabled="savingTimeline" class="px-4 py-2 text-white bg-[#0D9488] rounded-md">保存</button>
        </div>
      </template>
    </n-modal>

    <!-- Upload Material Modal -->
    <n-modal v-model:show="showUploadMaterial" preset="card" class="max-w-lg" title="上传参考材料">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">材料标题</label>
          <input v-model="materialForm.title" class="w-full p-2 border border-gray-200 rounded-md outline-none focus:border-[#0D9488]" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">材料类型</label>
          <n-select v-model:value="materialForm.type" :options="[{label:'图片',value:'image'},{label:'视频',value:'video'},{label:'PDF',value:'pdf'},{label:'网页快照',value:'snapshot'},{label:'其他',value:'other'}]" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">关联节点 (可选)</label>
          <n-select v-model:value="materialForm.timeline_node_id" :options="timelineNodeOptions" clearable />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">上传文件</label>
          <n-upload :default-upload="false" :file-list="materialForm.file ? [materialForm.file] : []" @change="handleFileChange">
            <n-button>选择文件</n-button>
          </n-upload>
          <p class="text-xs text-gray-400 mt-2">或提供来源链接：</p>
          <input v-model="materialForm.source_url" class="w-full p-2 mt-1 border border-gray-200 rounded-md outline-none focus:border-[#0D9488]" placeholder="https://..." />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button @click="showUploadMaterial = false" class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md">取消</button>
          <button @click="handleUploadMaterial" :disabled="uploadingMaterial" class="px-4 py-2 text-white bg-[#0D9488] rounded-md">上传</button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  ArrowLeft, Edit2, Save, Loader2, Calendar, Link,
  Trash2, Plus, Hash, GitCommit, Paperclip, Files,
  Upload, FileText, Image, File, ExternalLink, X
} from 'lucide-vue-next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Event, Tag, TimelineNode, Material, EventStatus } from '@book-of-ages/shared';
import { getEvent, updateEvent, deleteEvent, getEventTags, updateEventTags } from '../api/eventApi';
import { getTagList } from '../api/tagApi';
import { getTimelineNodes, createTimelineNode, updateTimelineNode, deleteTimelineNode } from '../api/timelineApi';
import { getMaterials, uploadMaterial, deleteMaterial, getMaterialPreviewUrl } from '../api/materialApi';

const message = useMessage();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const event = ref<Event | null>(null);
const tags = ref<Tag[]>([]);
const allTags = ref<Tag[]>([]);
const timelineNodes = ref<TimelineNode[]>([]);
const materials = ref<Material[]>([]);

const isEditing = ref(false);
const saving = ref(false);

const showStatusModal = ref(false);
const savingStatus = ref(false);
const newStatus = ref<EventStatus>('draft');

const showTagModal = ref(false);
const selectedTagIds = ref<string[]>([]);

const showAddTimeline = ref(false);
const savingTimeline = ref(false);
const editingTimelineNode = ref<TimelineNode | null>(null);

const showUploadMaterial = ref(false);
const uploadingMaterial = ref(false);

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
  timeline_node_id: undefined as string | undefined,
  file: null as File | null,
  source_url: '',
});

const renderedContent = computed(() => {
  if (!event.value?.content) return '<p class="text-gray-400 italic">暂无内容详情...</p>';
  const html = marked(event.value.content);
  return DOMPurify.sanitize(html);
});

const timelineNodeOptions = computed(() => {
  return timelineNodes.value.map(n => ({ label: n.title, value: n.id }));
});

function formatDate(dateStr: string | null | undefined, short = false): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  if (short) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return date.toLocaleString();
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-teal-100 text-teal-800',
    archived: 'bg-gray-100 text-gray-600',
    deleted: 'bg-red-100 text-red-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft: '待收录',
    confirmed: '已收录',
    archived: '已归档',
    deleted: '已删除',
  };
  return map[status] || status;
}

function handleBack() {
  router.back();
}

async function loadEvent() {
  const id = route.params.id as string;
  try {
    const data = await getEvent(id);
    event.value = data;
    newStatus.value = data.status as EventStatus;
    
    // Parallel loading
    const [tagData, timelineData, materialData, allTagsData] = await Promise.all([
      getEventTags(id),
      getTimelineNodes(id),
      getMaterials(id),
      getTagList()
    ]);
    
    tags.value = tagData;
    selectedTagIds.value = tagData.map(t => t.id);
    timelineNodes.value = timelineData.sort((a,b) => a.sort_order - b.sort_order);
    materials.value = materialData;
    allTags.value = allTagsData;

  } catch (error) {
    message.error('加载详情失败');
  } finally {
    loading.value = false;
  }
}

function startEdit() {
  isEditing.value = true;
  editForm.value = {
    title: event.value!.title,
    summary: event.value!.summary || '',
    content: event.value!.content || '',
    event_date: event.value!.event_date ? new Date(event.value!.event_date).getTime() : null,
    source_url: event.value!.source_url || '',
  };
}

function cancelEdit() {
  isEditing.value = false;
}

async function handleSave() {
  if (!editForm.value.title.trim()) {
    message.warning('标题不能为空');
    return;
  }
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
    isEditing.value = false;
    message.success('保存成功');
  } catch (error) {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!confirm('确定要删除此事件吗？')) return;
  try {
    await deleteEvent(event.value!.id);
    message.success('已删除');
    router.replace('/events');
  } catch (error) {
    message.error('删除失败');
  }
}

async function handleSaveStatus() {
  savingStatus.value = true;
  try {
    await updateEvent(event.value!.id, { status: newStatus.value });
    event.value!.status = newStatus.value;
    showStatusModal.value = false;
    message.success('状态已更新');
  } catch (error) {
    message.error('更新失败');
  } finally {
    savingStatus.value = false;
  }
}

async function handleSaveTags() {
  try {
    await updateEventTags(event.value!.id, selectedTagIds.value);
    tags.value = allTags.value.filter(t => selectedTagIds.value.includes(t.id));
    showTagModal.value = false;
    message.success('标签已更新');
  } catch (error) {
    message.error('更新失败');
  }
}

// Timeline
function openAddTimeline() {
  editingTimelineNode.value = null;
  timelineForm.value = { title: '', description: '', node_date: null, sort_order: timelineNodes.value.length * 10 };
  showAddTimeline.value = true;
}

function editTimelineNode(node: TimelineNode) {
  editingTimelineNode.value = node;
  timelineForm.value = { 
    title: node.title, 
    description: node.description || '', 
    node_date: node.node_date ? new Date(node.node_date).getTime() : null, 
    sort_order: node.sort_order 
  };
  showAddTimeline.value = true;
}

async function handleSaveTimeline() {
  if (!timelineForm.value.title.trim()) return message.warning('标题必填');
  savingTimeline.value = true;
  try {
    const payload = {
      title: timelineForm.value.title,
      description: timelineForm.value.description || undefined,
      node_date: timelineForm.value.node_date ? new Date(timelineForm.value.node_date).toISOString() : undefined,
      sort_order: timelineForm.value.sort_order,
    };
    
    if (editingTimelineNode.value) {
      await updateTimelineNode(editingTimelineNode.value.id, payload);
    } else {
      await createTimelineNode(event.value!.id, payload);
    }
    
    timelineNodes.value = (await getTimelineNodes(event.value!.id)).sort((a,b) => a.sort_order - b.sort_order);
    showAddTimeline.value = false;
    message.success('时间线已更新');
  } catch (error) {
    message.error('更新失败');
  } finally {
    savingTimeline.value = false;
  }
}

async function deleteTimelineNodeItem(node: TimelineNode) {
  if (!confirm('删除该节点？')) return;
  try {
    await deleteTimelineNode(node.id);
    timelineNodes.value = timelineNodes.value.filter(n => n.id !== node.id);
    message.success('已删除');
  } catch (error) {
    message.error('删除失败');
  }
}

// Materials
function handleFileChange({ file }: { file: File | null }) {
  materialForm.value.file = file;
}

function uploadMaterialToNode(node: TimelineNode) {
  materialForm.value.timeline_node_id = node.id;
  showUploadMaterial.value = true;
}

async function handleUploadMaterial() {
  if (!materialForm.value.file && !materialForm.value.source_url) {
    return message.warning('需提供文件或来源链接');
  }
  uploadingMaterial.value = true;
  try {
    await uploadMaterial({
      event_id: event.value!.id,
      timeline_node_id: materialForm.value.timeline_node_id,
      type: materialForm.value.type,
      title: materialForm.value.title || undefined,
      source_url: materialForm.value.source_url || undefined,
      file: materialForm.value.file || undefined,
    });
    showUploadMaterial.value = false;
    materialForm.value = { title: '', type: 'image', timeline_node_id: undefined, file: null, source_url: '' };
    materials.value = await getMaterials(event.value!.id);
    message.success('材料已上传');
  } catch (error) {
    message.error('上传失败');
  } finally {
    uploadingMaterial.value = false;
  }
}

function previewMaterial(material: Material) {
  if (material.type === 'image' || material.type === 'pdf') {
    window.open(getMaterialPreviewUrl(material.id), '_blank');
  } else if (material.source_url) {
    window.open(material.source_url, '_blank');
  }
}

async function deleteMaterialItem(id: string) {
  if (!confirm('删除该材料？')) return;
  try {
    await deleteMaterial(id);
    materials.value = materials.value.filter(m => m.id !== id);
    message.success('已删除');
  } catch (error) {
    message.error('删除失败');
  }
}

onMounted(() => {
  loadEvent();
});
</script>

<style>
@reference "../style.css";
/* Make Markdown headings smaller and integrated */
.prose h1 { @apply text-2xl mt-8 mb-4; }
.prose h2 { @apply text-xl mt-6 mb-3; }
.prose h3 { @apply text-lg mt-4 mb-2; }
.prose blockquote { @apply border-l-4 border-[#14B8A6] pl-4 italic text-gray-600 bg-[#F0FDFA] py-2 rounded-r-lg my-4; }
.prose pre { @apply bg-gray-50 text-gray-800 border border-gray-200 rounded-lg p-4 overflow-x-auto my-4; }
.prose code { @apply text-[#0D9488] bg-[#F0FDFA] px-1.5 py-0.5 rounded text-sm; }
</style>