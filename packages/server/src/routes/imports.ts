/**
 * 批量导入路由
 */

import { FastifyPluginAsync } from 'fastify';
import { createImportTask, getImportTasks, getImportTaskDetail } from '../services/importService';
import type { CreateImportTaskInput, ImportType } from '@book-of-ages/shared';

export const importRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/imports - 创建批量导入任务
   */
  fastify.post<{
    Body: CreateImportTaskInput;
  }>('/api/imports', async (request, reply) => {
    // 支持 multipart 文件上传或 JSON body
    if (request.isMultipart()) {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_INPUT', message: '请上传文件' },
        });
      }

      const buffer = await data.toBuffer();
      const content = buffer.toString('utf-8');
      const filename = data.filename.toLowerCase();
      const type: ImportType =
        filename.endsWith('.html') || filename.endsWith('.htm') ? 'bookmarks' : 'urls';

      const task = await createImportTask(type, content);
      return { success: true, data: task };
    }

    const { type, content } = request.body || {};
    if (!content || !type) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: '导入类型和内容不能为空' },
      });
    }

    const task = await createImportTask(type, content);
    return { success: true, data: task };
  });

  /**
   * GET /api/imports - 获取导入任务列表
   */
  fastify.get('/api/imports', async () => {
    const tasks = await getImportTasks(50);
    return { success: true, data: tasks };
  });

  /**
   * GET /api/imports/:id - 获取指定导入任务详情及明细
   */
  fastify.get<{
    Params: { id: string };
  }>('/api/imports/:id', async (request, reply) => {
    const detail = await getImportTaskDetail(request.params.id);
    if (!detail) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: '任务不存在' },
      });
    }
    return { success: true, data: detail };
  });
};
