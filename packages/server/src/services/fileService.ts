/**
 * 文件上传与 CAS 内容寻址存储服务
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { MaterialType } from '@book-of-ages/shared';

const DATA_DIR = path.join(process.cwd(), 'data');
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
 * 保存上传的文件
 * @param file 文件对象（来自 multipart）
 * @param type 材料类型
 * @returns 文件存储路径
 */
export async function saveUploadedFile(
  file: { filename: string; mimetype: string; toBuffer: () => Promise<Buffer> },
  type: MaterialType
): Promise<string> {
  ensureUploadDir();

  // 生成唯一文件名
  const ext = path.extname(file.filename);
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, type, filename);

  // 保存文件
  const buffer = await file.toBuffer();
  fs.writeFileSync(filePath, buffer);

  // 返回相对路径（用于数据库存储）
  return `uploads/${type}/${filename}`;
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
