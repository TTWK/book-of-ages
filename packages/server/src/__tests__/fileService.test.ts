import { describe, it, expect, afterAll } from 'vitest';
import {
  saveUploadedFile,
  getFilePath,
  deleteFile,
  fileExists,
  getMimeType,
  validateUploadExtension,
} from '../services/fileService';
import fs from 'fs';
import path from 'path';

describe('fileService', () => {
  const testDataDir = path.join(process.cwd(), 'data');
  const testUploadDir = path.join(testDataDir, 'uploads');

  afterAll(() => {
    // 清理测试文件
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  describe('saveUploadedFile', () => {
    it('should save file and return relative path', async () => {
      const result = await saveUploadedFile(Buffer.from('test image content'), 'test.jpg', 'image');

      // 返回的路径是 uploads/type/uuid.jpg
      expect(result).toMatch(/^uploads\/image\/[a-f0-9-]+\.jpg$/);
    });

    it('should create unique filenames with UUID', async () => {
      const result1 = await saveUploadedFile(Buffer.from('content1'), 'test1.txt', 'other');
      const result2 = await saveUploadedFile(Buffer.from('content2'), 'test2.txt', 'other');

      expect(result1).not.toBe(result2);
    });

    it('should preserve file extension', async () => {
      const result = await saveUploadedFile(Buffer.from('pdf content'), 'document.pdf', 'pdf');

      expect(result).toMatch(/\.pdf$/);
    });

    it('should save files to correct directory based on type', async () => {
      const types = ['image', 'video', 'pdf', 'snapshot', 'other'] as const;

      for (const type of types) {
        const result = await saveUploadedFile(
          Buffer.from(`${type} content`),
          `test.${type === 'snapshot' ? 'html' : type}`,
          type
        );

        expect(result).toMatch(new RegExp(`^uploads/${type}/`));
      }
    });

    it('should actually create the file on disk', async () => {
      const result = await saveUploadedFile(Buffer.from('exists'), 'existence-test.txt', 'other');
      const fullPath = getFilePath(result);

      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  describe('validateUploadExtension', () => {
    it('should allow matching extensions for type', () => {
      expect(validateUploadExtension('photo.jpg', 'image')).toBeNull();
      expect(validateUploadExtension('clip.mp4', 'video')).toBeNull();
      expect(validateUploadExtension('doc.pdf', 'pdf')).toBeNull();
      expect(validateUploadExtension('page.html', 'snapshot')).toBeNull();
    });

    it('should reject mismatched extensions', () => {
      expect(validateUploadExtension('page.html', 'image')).not.toBeNull();
      expect(validateUploadExtension('virus.exe', 'pdf')).not.toBeNull();
      expect(validateUploadExtension('noext', 'video')).not.toBeNull();
    });

    it('should not restrict the other type', () => {
      expect(validateUploadExtension('anything.bin', 'other')).toBeNull();
    });
  });

  describe('getFilePath', () => {
    it('should return full path from relative path', () => {
      const relativePath = 'uploads/image/test.jpg';
      const fullPath = getFilePath(relativePath);

      expect(fullPath).toBe(path.join(testDataDir, relativePath));
    });

    it('should handle nested paths', () => {
      const relativePath = 'uploads/snapshot/test.html';
      const fullPath = getFilePath(relativePath);

      expect(fullPath).toContain(testDataDir);
      expect(fullPath).toContain('test.html');
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      const relativePath = await saveUploadedFile(
        Buffer.from('delete me'),
        'to-delete.txt',
        'other'
      );
      const deleted = deleteFile(relativePath);

      expect(deleted).toBe(true);
    });

    it('should return false for non-existent file', () => {
      const deleted = deleteFile('uploads/other/non-existent.txt');

      expect(deleted).toBe(false);
    });

    it('should actually remove the file from disk', async () => {
      const relativePath = await saveUploadedFile(
        Buffer.from('delete and verify'),
        'verify-delete.txt',
        'other'
      );
      const fullPath = getFilePath(relativePath);

      expect(fs.existsSync(fullPath)).toBe(true);

      deleteFile(relativePath);

      expect(fs.existsSync(fullPath)).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const relativePath = await saveUploadedFile(
        Buffer.from('exists'),
        'check-exists.txt',
        'other'
      );

      expect(fileExists(relativePath)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(fileExists('uploads/other/ghost.txt')).toBe(false);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for jpg', () => {
      expect(getMimeType('test.jpg')).toBe('image/jpeg');
    });

    it('should return correct MIME type for jpeg', () => {
      expect(getMimeType('test.jpeg')).toBe('image/jpeg');
    });

    it('should return correct MIME type for png', () => {
      expect(getMimeType('test.png')).toBe('image/png');
    });

    it('should return correct MIME type for gif', () => {
      expect(getMimeType('test.gif')).toBe('image/gif');
    });

    it('should return correct MIME type for webp', () => {
      expect(getMimeType('test.webp')).toBe('image/webp');
    });

    it('should return correct MIME type for pdf', () => {
      expect(getMimeType('test.pdf')).toBe('application/pdf');
    });

    it('should return correct MIME type for mp4', () => {
      expect(getMimeType('test.mp4')).toBe('video/mp4');
    });

    it('should return correct MIME type for webm', () => {
      expect(getMimeType('test.webm')).toBe('video/webm');
    });

    it('should return correct MIME type for html', () => {
      expect(getMimeType('test.html')).toBe('text/html');
    });

    it('should return correct MIME type for txt', () => {
      expect(getMimeType('test.txt')).toBe('text/plain');
    });

    it('should return correct MIME type for md', () => {
      expect(getMimeType('test.md')).toBe('text/markdown');
    });

    it('should return octet-stream for unknown extension', () => {
      expect(getMimeType('test.xyz')).toBe('application/octet-stream');
    });

    it('should handle uppercase extensions', () => {
      expect(getMimeType('test.JPG')).toBe('image/jpeg');
    });

    it('should handle nested paths', () => {
      expect(getMimeType('uploads/image/2026/04/photo.png')).toBe('image/png');
    });
  });
});
