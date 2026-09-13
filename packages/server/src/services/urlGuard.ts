/**
 * SSRF 防护：对外抓取 URL 的统一校验与安全请求封装
 * - 仅允许 http/https
 * - 拒绝环回/私网/链路本地/保留地址（含 IPv6）与非常规端口
 * - DNS 解析后按 IP 复检（防基于域名的绕过）
 * - 重定向手动逐跳复检（默认上限 3 次）
 * - 限制响应体大小
 */

import dns from 'dns';
import net from 'net';

const MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

/** 判断 IPv4/IPv6 是否属于环回、私网、链路本地或保留段 */
export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // 链路本地（含云元数据 169.254.169.254）
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::' || lower === '::ffff:127.0.0.1') return true;
    // IPv4-mapped 地址取出内层 IPv4 复检
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (lower.startsWith('fe80')) return true; // 链路本地
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
    return false;
  }

  return true;
}

/**
 * 校验 URL 是否可安全抓取；不合法时抛出错误。
 * 注意：返回的 URL 已复检，调用方应使用 safeFetch 而非原生 fetch。
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('无效的 URL 格式');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`不允许的协议: ${url.protocol}`);
  }

  const port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
  if (![80, 443, 8080, 8443].includes(port)) {
    throw new Error(`不允许的目标端口: ${port}`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  // 主机名本身就是 IP 时直接复检
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error('禁止抓取内网或保留地址');
    }
    return url;
  }

  // 域名：解析后按 IP 复检（取所有 A/AAAA 记录，任一命中即拒绝）
  let addresses: string[];
  try {
    const result = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    addresses = result.map((r) => r.address);
  } catch {
    throw new Error(`无法解析主机: ${hostname}`);
  }

  if (addresses.length === 0 || addresses.some((ip) => isPrivateAddress(ip))) {
    throw new Error('禁止抓取内网或保留地址');
  }

  return url;
}

export interface SafeFetchOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  maxBytes?: number;
  maxRedirects?: number;
}

/**
 * 带 SSRF 防护的抓取：每一跳重定向都重新做地址校验，
 * 响应体流式读取并限制最大字节数。
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<{ response: Response; body: string; url: string }> {
  const {
    headers = {},
    signal,
    maxBytes = DEFAULT_MAX_BYTES,
    maxRedirects = MAX_REDIRECTS,
  } = options;

  let currentUrl = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertSafeUrl(currentUrl);

    const response = await fetch(url, {
      headers,
      signal,
      redirect: 'manual',
    });

    // 手动处理重定向：逐跳复检目标地址
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      response.body?.cancel();
      if (!location) {
        throw new Error(`抓取失败，HTTP 状态码: ${response.status}`);
      }
      if (hop === maxRedirects) {
        throw new Error('重定向次数超限');
      }
      currentUrl = new URL(location, url).toString();
      continue;
    }

    if (!response.ok) {
      response.body?.cancel();
      throw new Error(`抓取网页失败，HTTP 状态码: ${response.status}`);
    }

    // 流式读取并限制大小
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > maxBytes) {
      response.body?.cancel();
      throw new Error('响应体超过大小限制');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return { response, body: '', url: url.toString() };
    }

    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new Error('响应体超过大小限制');
      }
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { response, body: buffer.toString('utf-8'), url: url.toString() };
  }

  throw new Error('重定向次数超限');
}
