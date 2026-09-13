# 多阶段构建

# 阶段 1: 构建
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖清单与 lockfile（npm ci 保证依赖可复现）
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
COPY packages/clipper/package.json ./packages/clipper/

# 安装依赖
RUN npm ci

# 复制源代码
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

# 构建共享类型
WORKDIR /app/packages/shared
RUN npm run build

# 构建服务器
WORKDIR /app/packages/server
RUN npm run build

# 阶段 2: 生产环境
FROM node:22-alpine

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/package*.json ./

# 复制 node_modules（避免版本不兼容问题）
COPY --from=builder /app/node_modules ./node_modules

# 创建数据目录并授权给非 root 运行用户
RUN mkdir -p /app/data && chown -R node:node /app
USER node

# 数据目录（DATA_DIR 由代码直接支持）
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# 启动服务
CMD ["npm", "run", "start", "-w", "@book-of-ages/server"]
