import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 禁用文件级并发，避免 SQLite 数据库锁定
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    // 设置测试环境变量
    env: {
      NODE_ENV: 'test',
    },
    // 测试之间完全隔离，顺序执行
    sequence: {
      concurrent: false,
    },
  },
});
