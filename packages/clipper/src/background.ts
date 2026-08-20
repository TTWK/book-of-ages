/**
 * 岁月史书 Clipper Background Service Worker
 * 提供右键菜单与后台静默剪藏通道
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'boa-clip-page',
    title: '📖 冻结当前网页并保存到岁月史书',
    contexts: ['page', 'selection', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'boa-clip-page' && tab?.id) {
    // 读取配置
    const config = await chrome.storage.sync.get(['serverUrl', 'apiKey']);
    const serverUrl = (config.serverUrl || 'http://localhost:3000').replace(/\/+$/, '');
    const apiKey = config.apiKey || '';

    const targetUrl = info.linkUrl || tab.url || '';
    const title = tab.title || targetUrl;

    try {
      const response = await fetch(`${serverUrl}/api/tools/archive-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
          url: targetUrl,
          title,
          tags: ['剪藏'],
          auto_confirm: false,
        }),
      });

      if (response.ok) {
        // 通知用户
        chrome.notifications?.create({
          type: 'basic',
          iconUrl: '',
          title: '岁月史书',
          message: '已成功将网页冻结快照推入草稿箱 (Inbox)！',
        });
      }
    } catch (err) {
      console.error('Clipper background push failed:', err);
    }
  }
});
