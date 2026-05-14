# 多阶段构建

# 阶段 1: 构建
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package.json
COPY package.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# 安装依赖
RUN npm install

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

# 安装运行时依赖
RUN apk add --no-cache sqlite-libs

# 复制构建产物
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/package*.json ./

# 复制 node_modules（避免版本不兼容问题）
COPY --from=builder /app/node_modules ./node_modules

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# 启动服务
CMD ["npm", "run", "start", "-w", "@book-of-ages/server"]
