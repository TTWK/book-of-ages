import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  saveUploadedFile,
  getFilePath,
  deleteFile,
  fileExists,
  getMimeType,
} from '../services/fileService';
import fs from 'fs';
import path from 'path';

describe('fileService', () => {
  const testUploadDir = path.join(process.cwd(), 'data', 'uploads');

  afterAll(() => {
    // 清理测试文件
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  describe('saveUploadedFile', () => {
    it('should save file and return relative path', async () => {
      const mockFile = {
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        toBuffer: async () => Buffer.from('test image content'),
      };

      const result = await saveUploadedFile(mockFile, 'image');

      // 返回的路径是 uploads/type/uuid.jpg
      expect(result).toMatch(/^uploads\/image\/[a-f0-9-]+\.jpg$/);
    });

    it('should create unique filenames with UUID', async () => {
      const mockFile1 = {
        filename: 'test1.txt',
        mimetype: 'text/plain',
        toBuffer: async () => Buffer.from('content1'),
      };
      const mockFile2 = {
        filename: 'test2.txt',
        mimetype: 'text/plain',
        toBuffer: async () => Buffer.from('content2'),
      };

      const result1 = await saveUploadedFile(mockFile1, 'other');
      const result2 = await saveUploadedFile(mockFile2, 'other');

      expect(result1).not.toBe(result2);
    });

    it('should preserve file extension', async () => {
      const mockFile = {
        filename: 'document.pdf',
        mimetype: 'application/pdf',
        toBuffer: async () => Buffer.from('pdf content'),
      };

      const result = await saveUploadedFile(mockFile, 'pdf');

      expect(result).toMatch(/\.pdf$/);
    });

    it('should save files to correct directory based on type', async () => {
      const types = ['image', 'video', 'pdf', 'snapshot', 'other'] as const;

      for (const type of types) {
        const mockFile = {
          filename: `test.${type}`,
          mimetype: 'application/octet-stream',
          toBuffer: async () => Buffer.from(`${type} content`),
        };

        const result = await saveUploadedFile(mockFile, type);

        expect(result).toMatch(new RegExp(`^uploads/${type}/`));
      }
    });

    it('should actually create the file on disk', async () => {
      const mockFile = {
        filename: 'existence-test.txt',
        mimetype: 'text/plain',
        toBuffer: async () => Buffer.from('exists'),
      };

      const result = await saveUploadedFile(mockFile, 'other');
      // saveUploadedFile 返回的是 uploads/other/filename
      // 但实际文件保存在 UPLOAD_DIR/other/filename
      const filename = result.replace('uploads/', '');
      const fullPath = path.join(testUploadDir, filename);

      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  describe('getFilePath', () => {
    it('should return full path from relative path', () => {
      const relativePath = 'uploads/image/test.jpg';
      const fullPath = getFilePath(relativePath);

      expect(fullPath).toBe(path.join(testUploadDir, relativePath));
    });

    it('should handle nested paths', () => {
      const relativePath = 'uploads/snapshot/test.html';
      const fullPath = getFilePath(relativePath);

      expect(fullPath).toContain(testUploadDir);
      expect(fullPath).toContain('test.html');
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      const mockFile = {
        filename: 'to-delete.txt',
        mimetype: 'text/plain',
        toBuffer: async () => Buffer.from('delete me'),
      };

      const relativePath = await saveUploadedFile(mockFile, 'other');
      // deleteFile 期望的路径是 uploads/other/filename，但 getFilePath 会加入 UPLOAD_DIR
      // 实际需要传入的是相对于 UPLOAD_DIR 的路径
      const filename = relativePath.replace('uploads/', '');
      const deleted = deleteFile(filename);

      expect(deleted).toBe(true);
    });

    it('should return false for non-existent file', () => {
      const deleted = deleteFile('other/non-existent.txt');

      expect(deleted).toBe(false);
    });

    it('should actually remove the file from disk', async () => {
      const mockFile = {
        filename: 'verify-delete.txt',
        mimetype: 'text/plain',
        toBuffer: async () => Buffer.from('delete and verify'),
      };

      const relativePath = await saveUploadedFile(mockFile, 'other');
      const filename = relativePath.replace('uploads/', '');
      const fullPath = path.join(testUploadDir, filename);

      expect(fs.existsSync(fullPath)).toBe(true);

      deleteFile(filename);

      expect(fs.existsSync(fullPath)).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const mockFile = {
        filename: 'check-exists.txt',
        mimetype: 'text/plain',
        toBuffer: async () => Buffer.from('exists'),
      };

      const relativePath = await saveUploadedFile(mockFile, 'other');
      const filename = relativePath.replace('uploads/', '');

      expect(fileExists(filename)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(fileExists('other/ghost.txt')).toBe(false);
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
