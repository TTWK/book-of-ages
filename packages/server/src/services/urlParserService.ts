/**
 * URL 解析服务
 * 使用 Readability 提取网页正文
 */

import type { ParsedURLResult, ParseURLInput } from '@book-of-ages/shared';

/**
 * 解析 URL 内容
 * 注意：这是一个简化实现，实际项目中可能需要使用 puppeteer 或 playwright
 * 来进行完整的网页渲染和抓取
 */
export async function parseURL(input: ParseURLInput): Promise<ParsedURLResult> {
  const { url } = input;

  // 验证 URL 格式
  try {
    new URL(url);
  } catch {
    throw new Error('无效的 URL 格式');
  }

  // 简化实现：返回基本信息
  // 在生产环境中，这里应该使用 puppeteer 或 @mozilla/readability
  // 来实际抓取和解析网页内容

  try {
    // 尝试使用 fetch 获取网页内容（需要处理 CORS 和反爬虫）
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BookOfAges/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP 错误：${response.status}`);
    }

    const html = await response.text();

    // 提取标题
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    // 简化版正文提取（移除脚本和样式）
    let content = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000); // 限制长度

    // 转换为简单的 Markdown
    content = content
      .replace(/^#{1,6}\s+/gm, '#### ') // 标题
      .replace(/\*\*([^*]+)\*\*/g, '**$1**') // 粗体
      .replace(/\*([^*]+)\*/g, '*$1*') // 斜体
      .replace(/^- /gm, '- ') // 列表
      .replace(/\n{3,}/g, '\n\n'); // 多余空行

    return {
      title,
      content: content || '无法提取正文内容',
      url,
    };
  } catch (error) {
    // 如果无法抓取，返回 URL 本身作为标题
    return {
      title: url,
      content: `无法访问该 URL: ${error instanceof Error ? error.message : '未知错误'}`,
      url,
    };
  }
}
