import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { initDatabase, closeDatabase } from './db';
import { authPlugin, optionalAuthMiddleware, enforceAuthOnAllRoutes } from './middleware/auth';
import { recoverStaleImportTasks } from './services/importService';
import { eventRoutes } from './routes/events';
import { timelineRoutes } from './routes/timeline';
import { materialRoutes } from './routes/materials';
import { exportRoutes } from './routes/export';
import { analyticsRoutes } from './routes/analytics';
import { tagRoutes } from './routes/tags';
import { toolRoutes } from './routes/tools';
import { searchRoutes } from './routes/search';
import { settingsRoutes } from './routes/settings';
import { importRoutes } from './routes/imports';
import { authRoutes } from './routes/auth';
import { suggestionRoutes } from './routes/suggestions';

const fastify = Fastify({ logger: true });

// 数据库将在 start 函数中初始化

// 注册插件
fastify.register(authPlugin);
fastify.register(cors, {
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
});
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// 全局认证中间件（可选认证：标记合法密钥——header 或会话 cookie，供 scope 检查使用）
fastify.addHook('preHandler', optionalAuthMiddleware);

// 所有 /api 路由一律鉴权（2026-09-13 设计）：GET → read scope，非 GET → write scope；
// 管理端点显式挂 requireAdminScope（须在路由注册前挂载）
enforceAuthOnAllRoutes(fastify);

// 健康检查
fastify.get('/', async () => {
  return { name: 'Book of Ages Server', status: 'running' };
});

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 注册路由
fastify.register(eventRoutes);
fastify.register(timelineRoutes);
fastify.register(materialRoutes);
fastify.register(exportRoutes);
fastify.register(analyticsRoutes);
fastify.register(tagRoutes);
fastify.register(toolRoutes);
fastify.register(searchRoutes);
fastify.register(settingsRoutes);
fastify.register(importRoutes);
fastify.register(authRoutes);
fastify.register(suggestionRoutes);

const start = async () => {
  const port = parseInt(process.env.PORT || '3000', 10);

  try {
    await initDatabase();
    // 服务重启后，把中断的导入任务标记为失败（避免永久停留在 processing）
    await recoverStaleImportTasks();
    await fastify.listen({ port, host: '0.0.0.0' });
    console.info(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    closeDatabase();
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGINT', () => {
  console.info('Shutting down server...');
  fastify.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.info('Shutting down server...');
  fastify.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

start();
