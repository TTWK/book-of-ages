<template>
  <div class="settings-view">
    <n-grid :cols="24" :x-gap="16">
      <!-- API Key 管理 -->
      <n-gi :span="12">
        <n-card title="API Key 管理">
          <template #header-extra>
            <n-button size="small" type="primary" @click="showCreateKeyModal = true">
              生成新密钥
            </n-button>
          </template>

          <n-list>
            <n-list-item v-for="key in apiKeys" :key="key.id">
              <n-space justify="space-between">
                <n-space vertical>
                  <n-text strong>{{ key.name }}</n-text>
                  <n-text depth="3" style="font-size: 12px">
                    最后使用：{{ key.last_used || '从未使用' }}
                  </n-text>
                </n-space>
                <n-popconfirm @positive-click="handleDeleteKey(key.id)">
                  <template #trigger>
                    <n-button size="small" type="error" quaternary>吊销</n-button>
                  </template>
                  确定要吊销此 API Key 吗？
                </n-popconfirm>
              </n-space>
            </n-list-item>
            <n-list-item v-if="apiKeys.length === 0">
              <n-empty description="暂无 API Key" />
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>

      <!-- 操作日志 -->
      <n-gi :span="12">
        <n-card title="操作日志">
          <template #header-extra>
            <n-button size="small" @click="loadLogs">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </template>
              刷新
            </n-button>
          </template>

          <n-list>
            <n-list-item v-for="log in logs" :key="log.id">
              <n-space vertical>
                <n-space>
                  <n-tag :type="getActionType(log.action)" size="small">
                    {{ log.action }}
                  </n-tag>
                  <n-text strong>{{ log.entity_type }}</n-text>
                  <n-text depth="3">{{ log.entity_id.slice(0, 8) }}...</n-text>
                </n-space>
                <n-text depth="3" style="font-size: 12px">
                  {{ log.created_at }}
                  <n-text v-if="log.api_key_id" depth="3"> (API)</n-text>
                </n-text>
              </n-space>
            </n-list-item>
            <n-list-item v-if="logs.length === 0">
              <n-empty description="暂无操作日志" />
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 创建 API Key Modal -->
    <n-modal v-model:show="showCreateKeyModal" preset="dialog" title="生成 API Key">
      <n-form ref="keyFormRef" :model="keyForm" :rules="keyFormRules">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="keyForm.name" placeholder="例如：Daily Crawler Agent" />
        </n-form-item>
      </n-form>
      
      <n-alert v-if="createdKey" type="success" title="API Key 已生成" style="margin-top: 16px">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </template>
        <n-space vertical>
          <n-text>请复制以下 API Key（仅显示一次）：</n-text>
          <n-input :value="createdKey.plain_key" readonly>
            <template #suffix>
              <n-button size="small" @click="copyKey">复制</n-button>
            </template>
          </n-input>
          <n-text depth="3" style="font-size: 12px">
            提示：在请求头中使用 <code>X-API-Key: {{ createdKey.plain_key }}</code>
          </n-text>
        </n-space>
      </n-alert>

      <template #action>
        <n-button v-if="!createdKey" @click="showCreateKeyModal = false">取消</n-button>
        <n-button v-if="!createdKey" type="primary" :loading="creating" @click="handleCreateKey">生成</n-button>
        <n-button v-if="createdKey" type="primary" @click="closeKeyModal">完成</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import type { FormRules, FormInst } from 'naive-ui';
import type { APIKey, OperationLog } from '@book-of-ages/shared';
import { getAPIKeys, createAPIKey, deleteAPIKey, getOperationLogs } from '../api/settingsApi';

const message = useMessage();

const apiKeys = ref<Omit<APIKey, 'key_hash'>[]>([]);
const logs = ref<OperationLog[]>([]);
const showCreateKeyModal = ref(false);
const creating = ref(false);
const createdKey = ref<{ plain_key: string } | null>(null);

const keyForm = ref({
  name: '',
});

const keyFormRules: FormRules = {
  name: { required: true, message: '请输入名称', trigger: 'blur' },
};

const keyFormRef = ref<FormInst | null>(null);

// 加载 API Keys
async function loadAPIKeys() {
  try {
    apiKeys.value = await getAPIKeys();
  } catch (error) {
    message.error('加载 API Key 失败');
    console.error(error);
  }
}

// 加载操作日志
async function loadLogs() {
  try {
    logs.value = await getOperationLogs(50);
  } catch (error) {
    console.error('加载日志失败', error);
  }
}

// 创建 API Key
async function handleCreateKey() {
  await keyFormRef.value?.validate();
  
  creating.value = true;
  try {
    const result = await createAPIKey(keyForm.value.name);
    createdKey.value = result;
    loadAPIKeys();
  } catch (error) {
    message.error('生成失败');
    console.error(error);
  } finally {
    creating.value = false;
  }
}

// 删除 API Key
async function handleDeleteKey(id: string) {
  try {
    await deleteAPIKey(id);
    message.success('已吊销');
    loadAPIKeys();
  } catch (error) {
    message.error('吊销失败');
    console.error(error);
  }
}

// 复制 Key
function copyKey() {
  if (createdKey.value) {
    navigator.clipboard.writeText(createdKey.value.plain_key);
    message.success('已复制到剪贴板');
  }
}

// 关闭 Modal
function closeKeyModal() {
  showCreateKeyModal.value = false;
  createdKey.value = null;
  keyForm.value.name = '';
}

// 获取操作类型标签颜色
function getActionType(action: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  const map: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    CREATE: 'success',
    UPDATE: 'info',
    DELETE: 'error',
  };
  return map[action] || 'default';
}

onMounted(() => {
  loadAPIKeys();
  loadLogs();
});
</script>

<style scoped>
.settings-view {
  height: 100%;
}
</style>
