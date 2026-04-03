<template>
  <div class="relative min-h-[calc(100vh-8rem)] pb-20 max-w-5xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-[#134E4A] tracking-tight">系统设置</h1>
      <p class="text-sm text-gray-500 mt-1">API Keys 与 防灾审计日志</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- API Key Management -->
      <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-[#134E4A] flex items-center">
            <Key class="w-5 h-5 mr-2 text-[#0D9488]" />
            API Key 管理
          </h2>
          <button 
            @click="showCreateKeyModal = true"
            class="px-3 py-1.5 bg-[#0D9488] hover:bg-[#14B8A6] text-white rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center"
          >
            <Plus class="w-4 h-4 mr-1" /> 生成密钥
          </button>
        </div>

        <div v-if="apiKeys.length === 0" class="flex-1 flex flex-col items-center justify-center py-12 text-gray-400">
          <ShieldAlert class="w-10 h-10 mb-3 text-gray-200" />
          <p class="text-sm">暂无 API Key，添加以允许外部 Agent 访问</p>
        </div>

        <div v-else class="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div v-for="key in apiKeys" :key="key.id" class="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
            <div>
              <h3 class="text-sm font-semibold text-gray-800">{{ key.name }}</h3>
              <p class="text-xs text-gray-500 mt-1 flex items-center">
                <Clock class="w-3 h-3 mr-1" />
                最后使用: {{ key.last_used ? new Date(key.last_used).toLocaleString() : '从未使用' }}
              </p>
            </div>
            <n-popconfirm @positive-click="handleDeleteKey(key.id)">
              <template #trigger>
                <button class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                  <Trash2 class="w-4 h-4" />
                </button>
              </template>
              确定要吊销此 API Key 吗？将立即失效。
            </n-popconfirm>
          </div>
        </div>
      </div>

      <!-- Operation Logs -->
      <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-[#134E4A] flex items-center">
            <Activity class="w-5 h-5 mr-2 text-[#0D9488]" />
            操作日志
          </h2>
          <button @click="loadLogs" class="p-1.5 text-gray-400 hover:text-[#0D9488] bg-gray-50 hover:bg-[#F0FDFA] rounded transition-colors cursor-pointer">
            <RefreshCw class="w-4 h-4" />
          </button>
        </div>

        <div v-if="logs.length === 0" class="flex-1 flex items-center justify-center py-12 text-gray-400">
          <p class="text-sm">暂无操作日志</p>
        </div>

        <div v-else class="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative border-l-2 border-gray-100 ml-2 pl-4">
          <div v-for="log in logs" :key="log.id" class="relative">
            <div class="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full" :class="getActionColor(log.action)"></div>
            <div class="flex justify-between items-start">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-bold uppercase tracking-wider" :class="getActionTextColor(log.action)">{{ log.action }}</span>
                  <span class="text-sm font-medium text-gray-700">{{ log.entity_type }}</span>
                </div>
                <p class="text-xs text-gray-500 mt-1 font-mono bg-gray-50 px-1 rounded inline-block">{{ log.entity_id.slice(0,8) }}...</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] text-gray-400">{{ new Date(log.created_at).toLocaleTimeString() }}</p>
                <p v-if="log.api_key_id" class="text-[10px] text-[#F97316] font-medium mt-0.5 border border-orange-200 px-1 rounded inline-block">API</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create API Key Modal -->
    <n-modal v-model:show="showCreateKeyModal" preset="card" class="max-w-md" title="生成 API Key">
      <div v-if="!createdKey" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">标识名称 *</label>
          <input v-model="keyForm.name" class="w-full p-2 border border-gray-200 rounded-md outline-none focus:border-[#0D9488]" placeholder="例如：Daily Crawler Agent" />
        </div>
      </div>
      
      <div v-else class="p-4 bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl text-center">
        <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
          <Check class="w-6 h-6 text-[#14B8A6]" />
        </div>
        <h3 class="text-lg font-bold text-[#134E4A] mb-2">API Key 已生成</h3>
        <p class="text-xs text-gray-500 mb-4">请立即复制并保存，离开此页面后将无法再次查看。</p>
        
        <div class="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
          <input :value="createdKey.plain_key" readonly class="flex-1 p-2.5 text-sm font-mono text-gray-700 outline-none bg-transparent" />
          <button @click="copyKey" class="px-4 py-2.5 bg-[#0D9488] hover:bg-[#14B8A6] text-white font-medium transition-colors">复制</button>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button v-if="!createdKey" @click="showCreateKeyModal = false" class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">取消</button>
          <button v-if="!createdKey" @click="handleCreateKey" :disabled="creating" class="px-4 py-2 text-white bg-[#0D9488] hover:bg-[#14B8A6] rounded-md transition-colors flex items-center">
            <Loader2 v-if="creating" class="w-4 h-4 mr-2 animate-spin" />生成
          </button>
          <button v-if="createdKey" @click="closeKeyModal" class="px-6 py-2 text-white bg-[#F97316] hover:bg-[#FB923C] rounded-md transition-colors font-medium">完成</button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { Key, Activity, Plus, ShieldAlert, Clock, Trash2, RefreshCw, Check, Loader2 } from 'lucide-vue-next';
import type { APIKey, OperationLog } from '@book-of-ages/shared';
import { getAPIKeys, createAPIKey, deleteAPIKey, getOperationLogs } from '../api/settingsApi';

const message = useMessage();

const apiKeys = ref<Omit<APIKey, 'key_hash'>[]>([]);
const logs = ref<OperationLog[]>([]);
const showCreateKeyModal = ref(false);
const creating = ref(false);
const createdKey = ref<{ plain_key: string } | null>(null);

const keyForm = ref({ name: '' });

async function loadAPIKeys() {
  try {
    apiKeys.value = await getAPIKeys();
  } catch (error) {
    message.error('加载 API Key 失败');
  }
}

async function loadLogs() {
  try {
    logs.value = await getOperationLogs(50);
  } catch (error) {
    console.error('加载日志失败', error);
  }
}

async function handleCreateKey() {
  if (!keyForm.value.name.trim()) return message.warning('请输入名称');
  
  creating.value = true;
  try {
    const result = await createAPIKey(keyForm.value.name);
    createdKey.value = result;
    loadAPIKeys();
  } catch (error) {
    message.error('生成失败');
  } finally {
    creating.value = false;
  }
}

async function handleDeleteKey(id: string) {
  try {
    await deleteAPIKey(id);
    message.success('已吊销');
    loadAPIKeys();
  } catch (error) {
    message.error('吊销失败');
  }
}

function copyKey() {
  if (createdKey.value) {
    navigator.clipboard.writeText(createdKey.value.plain_key);
    message.success('已复制到剪贴板');
  }
}

function closeKeyModal() {
  showCreateKeyModal.value = false;
  createdKey.value = null;
  keyForm.value.name = '';
}

function getActionColor(action: string) {
  const map: Record<string, string> = { CREATE: 'bg-teal-500', UPDATE: 'bg-blue-500', DELETE: 'bg-red-500' };
  return map[action] || 'bg-gray-400';
}
function getActionTextColor(action: string) {
  const map: Record<string, string> = { CREATE: 'text-teal-600', UPDATE: 'text-blue-600', DELETE: 'text-red-600' };
  return map[action] || 'text-gray-500';
}

onMounted(() => {
  loadAPIKeys();
  loadLogs();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}
</style>