/**
 * 岁月史书 Clipper Popup 交互逻辑
 */

let currentUrl = '';
let currentHtml = '';
let currentSelectedText = '';

document.addEventListener('DOMContentLoaded', async () => {
  const titleInput = document.getElementById('title') as HTMLInputElement;
  const tagsInput = document.getElementById('tags') as HTMLInputElement;
  const notesInput = document.getElementById('notes') as HTMLTextAreaElement;
  const autoConfirmCheck = document.getElementById('autoConfirm') as HTMLInputElement;
  const clipBtn = document.getElementById('clipBtn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  const toggleSettings = document.getElementById('toggleSettings') as HTMLDivElement;
  const settingsPanel = document.getElementById('settingsPanel') as HTMLDivElement;
  const serverUrlInput = document.getElementById('serverUrl') as HTMLInputElement;
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const saveSettingsBtn = document.getElementById('saveSettingsBtn') as HTMLButtonElement;

  // 加载配置
  const config = await chrome.storage.sync.get(['serverUrl', 'apiKey']);
  if (config.serverUrl) serverUrlInput.value = config.serverUrl;
  if (config.apiKey) apiKeyInput.value = config.apiKey;

  // 获取当前标签页数据
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    currentUrl = tab.url || '';
    titleInput.value = tab.title || '';

    try {
      chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_DATA' }, (response) => {
        if (response) {
          if (response.title) titleInput.value = response.title;
          if (response.selectedText) {
            currentSelectedText = response.selectedText;
            notesInput.value = `> 摘录: ${currentSelectedText}`;
          }
          if (response.fullHtml) {
            currentHtml = response.fullHtml;
          }
        }
      });
    } catch (_e) {
      // Content script not ready
    }
  }

  toggleSettings.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
  });

  saveSettingsBtn.addEventListener('click', async () => {
    await chrome.storage.sync.set({
      serverUrl: serverUrlInput.value.trim(),
      apiKey: apiKeyInput.value.trim(),
    });
    showStatus('配置已保存', 'success');
  });

  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;
    showStatus('正在生成证据快照并推入档案馆...', '');

    const serverUrl = (serverUrlInput.value || 'http://localhost:3000').replace(/\/+$/, '');
    const apiKey = apiKeyInput.value.trim();
    const tags = tagsInput.value
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const response = await fetch(`${serverUrl}/api/tools/archive-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
          url: currentUrl,
          title: titleInput.value.trim() || undefined,
          tags,
          auto_confirm: autoConfirmCheck.checked,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        showStatus(
          autoConfirmCheck.checked ? '已正式收录于岁月史书！' : '快照已成功推入草稿箱 (Inbox)！',
          'success'
        );
        setTimeout(() => window.close(), 1500);
      } else {
        showStatus(`保存失败: ${result.error?.message || '未知错误'}`, 'error');
        clipBtn.disabled = false;
      }
    } catch (err) {
      showStatus(`连接失败: 请检查后端服务是否正在运行 (${serverUrl})`, 'error');
      clipBtn.disabled = false;
    }
  });

  function showStatus(text: string, type: 'success' | 'error' | '') {
    statusDiv.textContent = text;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
  }
});
