/**
 * 网页快照与数字冻结服务
 * 负责抓取网页、生成自包含 DOM 离线快照、提炼 Markdown 并进行内容寻址 (CAS) 存储
 */

import { saveCasFile } from './fileService';
import type { SnapshotResult, SnapshotAsset } from '@book-of-ages/shared';

export interface SnapshotOptions {
  rawHtml?: string;
  title?: string;
  notes?: string;
}

/**
 * 提取元数据与正文
 */
function extractHtmlMetadata(
  html: string,
  url: string
): {
  title: string;
  description: string;
  byline: string;
  siteName: string;
} {
  // Title
  const ogTitleMatch = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  );
  const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = ogTitleMatch?.[1] || titleTagMatch?.[1] || url;

  // Description / Excerpt
  const ogDescMatch = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
  );
  const metaDescMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  const description = ogDescMatch?.[1] || metaDescMatch?.[1] || '';

  // Byline / Author
  const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
  const byline = authorMatch?.[1] || '';

  // Site name
  const siteNameMatch = html.match(
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i
  );
  let siteName = siteNameMatch?.[1] || '';
  if (!siteName) {
    try {
      siteName = new URL(url).hostname;
    } catch {
      siteName = '';
    }
  }

  return {
    title: title.trim(),
    description: description.trim(),
    byline: byline.trim(),
    siteName: siteName.trim(),
  };
}

/**
 * 将 HTML 转换为干净的结构化 Markdown
 */
function htmlToMarkdown(html: string): string {
  // 1. 移除无关脚本、样式、导航、广告标签
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '');

  // 2. 转换常见 HTML 标签为 Markdown 标记
  cleaned = cleaned
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n#### $1\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']?([^"']*)["']?[^>]*>/gi, '![$2]($1)');

  // 3. 去除剩余 HTML 标签并整理空行
  const text = cleaned
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/**
 * 封装包含防篡改归档头的自包含离线 HTML 快照
 */
function buildFrozenSnapshotHtml(
  rawHtml: string,
  url: string,
  title: string,
  dateIso: string
): string {
  const archiveBanner = `
<!-- BOOK OF AGES IMMUTABLE DIGITAL ARCHIVE HEADER -->
<div id="boa-archive-banner" style="position:sticky;top:0;left:0;right:0;z-index:9999999;background:#18181b;color:#f4f4f5;padding:10px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;font-size:12px;border-bottom:2px solid #0d9488;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,0.3);">
  <div style="display:flex;align-items:center;gap:8px;">
    <span style="background:#0d9488;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px;">岁月史书 证据冻结</span>
    <span style="font-weight:600;color:#ffffff;max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(title)}</span>
  </div>
  <div style="display:flex;align-items:center;gap:16px;color:#a1a1aa;">
    <span>归档时间: <strong>${dateIso.slice(0, 19).replace('T', ' ')}</strong></span>
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:#2dd4bf;text-decoration:none;font-weight:500;">查看原始链接 ↗</a>
  </div>
</div>
`;

  // 移除可能导致重定向或弹窗的内联脚本
  const sanitizedHtml = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, '');

  if (sanitizedHtml.includes('<body')) {
    return sanitizedHtml.replace(/<body([^>]*)>/i, `<body$1>${archiveBanner}`);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${archiveBanner}${sanitizedHtml}</body></html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 捕获并冻结网页快照
 */
export async function captureSnapshot(
  url: string,
  options?: SnapshotOptions
): Promise<SnapshotResult> {
  let html = options?.rawHtml;

  if (!html) {
    // 远程抓取
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 BookOfAges/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`抓取网页失败，HTTP 状态码: ${response.status}`);
    }

    html = await response.text();
  }

  const nowIso = new Date().toISOString();
  const metadata = extractHtmlMetadata(html, url);
  const title = options?.title || metadata.title;

  // 1. 生成防篡改自包含快照并存入 CAS
  const frozenHtml = buildFrozenSnapshotHtml(html, url, title, nowIso);
  const casResult = saveCasFile(frozenHtml, 'snapshot', '.html');

  // 2. 提取结构化 Markdown
  const markdown = htmlToMarkdown(html);

  const savedAssets: SnapshotAsset[] = [
    {
      originalUrl: url,
      localPath: casResult.relativePath,
      hash: casResult.hash,
      size: casResult.size,
    },
  ];

  return {
    title,
    excerpt: metadata.description || undefined,
    byline: metadata.byline || undefined,
    siteName: metadata.siteName || undefined,
    url,
    htmlSnapshotPath: casResult.relativePath,
    markdownContent: markdown,
    savedAssets,
  };
}
