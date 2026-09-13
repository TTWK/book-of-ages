/**
 * 文件上传与 CAS 内容寻址存储服务
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { resolveDataDir } from '../db';
import type { MaterialType } from '@book-of-ages/shared';

const DATA_DIR = resolveDataDir();
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

/**
 * 确保上传目录存在
 */
function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // 创建各类子目录
  const types: MaterialType[] = ['image', 'video', 'pdf', 'snapshot', 'other'];
  for (const type of types) {
    const dir = path.join(UPLOAD_DIR, type);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * 计算数据的 SHA-256 哈希
 */
export function calculateSha256(content: Buffer | string): string {
  const hash = crypto.createHash('sha256');
  if (typeof content === 'string') {
    hash.update(content, 'utf8');
  } else {
    hash.update(content);
  }
  return hash.digest('hex');
}

/**
 * 使用内容寻址 (CAS) 保存文件（去重与防篡改）
 */
export function saveCasFile(
  content: Buffer | string,
  type: MaterialType = 'snapshot',
  ext: string = '.html'
): { relativePath: string; fullPath: string; hash: string; size: number } {
  ensureUploadDir();

  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  const hash = calculateSha256(buffer);
  const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
  const filename = `${hash}${cleanExt}`;
  const dirPath = path.join(UPLOAD_DIR, type);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const fullPath = path.join(dirPath, filename);
  const relativePath = `uploads/${type}/${filename}`;

  // 如果文件不存在则写入
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, buffer);
  }

  return {
    relativePath,
    fullPath,
    hash,
    size: buffer.length,
  };
}

/**
 * 各材料类型允许的扩展名白名单（other 不限制）
 */
const ALLOWED_EXTENSIONS: Partial<Record<MaterialType, string[]>> = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif'],
  video: ['.mp4', '.webm', '.mov', '.mkv'],
  pdf: ['.pdf'],
  snapshot: ['.html', '.htm', '.mhtml', '.mht'],
};

/**
 * 校验上传文件扩展名是否与材料类型匹配
 * @returns null 表示合法，否则返回错误信息
 */
export function validateUploadExtension(filename: string, type: MaterialType): string | null {
  const allowed = ALLOWED_EXTENSIONS[type];
  if (!allowed) return null; // other 类型不限制

  const ext = path.extname(filename).toLowerCase();
  if (!ext) {
    return `无法识别文件扩展名，${type} 类型要求: ${allowed.join(', ')}`;
  }
  if (!allowed.includes(ext)) {
    return `文件类型不匹配：${type} 类型不允许上传 ${ext} 文件`;
  }
  return null;
}

/**
 * 保存上传的文件内容（内存缓冲区 → 磁盘）
 * @param buffer 文件内容
 * @param filename 原始文件名（用于保留扩展名）
 * @param type 材料类型
 * @returns 文件存储路径
 */
export async function saveUploadedFile(
  buffer: Buffer,
  filename: string,
  type: MaterialType
): Promise<string> {
  ensureUploadDir();

  // 生成唯一文件名
  const ext = path.extname(filename).toLowerCase();
  const filenameSafe = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, type, filenameSafe);

  // 保存文件
  fs.writeFileSync(filePath, buffer);

  // 返回相对路径（用于数据库存储）
  return `uploads/${type}/${filenameSafe}`;
}

/**
 * 获取文件完整路径
 * @param filePath 相对路径
 * @returns 完整文件路径
 */
export function getFilePath(filePath: string): string {
  return path.join(DATA_DIR, filePath);
}

/**
 * 删除文件
 * @param filePath 相对路径
 */
export function deleteFile(filePath: string): boolean {
  try {
    const fullPath = getFilePath(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

/**
 * 检查文件是否存在
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(getFilePath(filePath));
}

/**
 * 获取文件 MIME 类型
 */
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.html': 'text/html',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
