/**
 * 岁月史书 Clipper Content Script
 * 负责提取当前活动标签页的 DOM、选中文本与元数据
 */

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'GET_PAGE_DATA') {
    const selection = window.getSelection()?.toString() || '';
    const title = document.title || '';
    const url = window.location.href || '';
    const fullHtml = document.documentElement.outerHTML;

    // 提取 Meta Description
    const metaDesc =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      '';

    sendResponse({
      title,
      url,
      selectedText: selection.trim(),
      description: metaDesc.trim(),
      fullHtml,
    });
  }
  return true;
});
