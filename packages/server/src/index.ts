import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { initDatabase, closeDatabase } from './db';
import { authPlugin, optionalAuthMiddleware } from './middleware/auth';
import { eventRoutes } from './routes/events';
import { tagRoutes } from './routes/tags';
import { toolRoutes } from './routes/tools';
import { searchRoutes } from './routes/search';
import { settingsRoutes } from './routes/settings';

const fastify = Fastify({ logger: true });

// 数据库将在 start 函数中初始化

// 注册插件
fastify.register(authPlugin);
fastify.register(cors);
fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// 全局认证中间件（可选认证）
fastify.addHook('preHandler', optionalAuthMiddleware);

// 健康检查
fastify.get('/', async () => {
  return { name: 'Book of Ages Server', status: 'running' };
});

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 注册路由
fastify.register(eventRoutes);       // 包含 /api/events 和 /api/events/:id/* 子路由
fastify.register(tagRoutes);
fastify.register(toolRoutes);
fastify.register(searchRoutes);
fastify.register(settingsRoutes);

const start = async () => {
  const port = parseInt(process.env.PORT || '3000', 10);
  
  try {
    await initDatabase();
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    closeDatabase();
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  fastify.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  fastify.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

start();