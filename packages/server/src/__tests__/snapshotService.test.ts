import { describe, it, expect } from 'vitest';
import { captureSnapshot } from '../services/snapshotService';
import { fileExists, getFilePath } from '../services/fileService';
import fs from 'fs';

describe('snapshotService', () => {
  it('should generate a frozen HTML snapshot and Markdown from raw HTML', async () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OpenAI 董事会历史事件记录</title>
          <meta property="og:description" content="2023年11月OpenAI发生重大高管变动">
          <meta name="author" content="科技观察员">
        </head>
        <body>
          <header><p>网站导航</p></header>
          <h1>OpenAI 董事会风云</h1>
          <p>2023年11月17日，Sam Altman 突遭解雇，引发行业巨大震动。</p>
          <blockquote>此事件成为AI行业历史性转折点。</blockquote>
          <footer><p>版权信息</p></footer>
        </body>
      </html>
    `;

    const result = await captureSnapshot('https://example.com/openai-event', {
      rawHtml,
    });

    expect(result.title).toBe('OpenAI 董事会历史事件记录');
    expect(result.excerpt).toBe('2023年11月OpenAI发生重大高管变动');
    expect(result.byline).toBe('科技观察员');
    expect(result.htmlSnapshotPath).toContain('uploads/snapshot/');
    expect(fileExists(result.htmlSnapshotPath)).toBe(true);

    // 验证快照文件中包含防篡改归档头
    const snapshotContent = fs.readFileSync(getFilePath(result.htmlSnapshotPath), 'utf-8');
    expect(snapshotContent).toContain('boa-archive-banner');
    expect(snapshotContent).toContain('岁月史书 证据冻结');
    expect(snapshotContent).toContain('OpenAI 董事会历史事件记录');

    // 验证 Markdown 内容提炼
    expect(result.markdownContent).toContain('# OpenAI 董事会风云');
    expect(result.markdownContent).toContain('Sam Altman 突遭解雇');
    expect(result.markdownContent).toContain('> 此事件成为AI行业历史性转折点。');
  });

  it('should use fallback values when metadata is absent', async () => {
    const rawHtml = '<div><p>一段没有Title的普通文本</p></div>';
    const result = await captureSnapshot('https://news.ycombinator.com/item?id=123', {
      rawHtml,
    });

    expect(result.url).toBe('https://news.ycombinator.com/item?id=123');
    expect(result.htmlSnapshotPath).toBeDefined();
    expect(result.markdownContent).toContain('一段没有Title的普通文本');
  });
});
