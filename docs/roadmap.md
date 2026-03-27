# 开发计划

## Phase 1: 项目初始化与基础功能

**目标：** 搭建项目骨架，实现事件管理基础功能

### 后端
- [ ] 项目初始化（Fastify + TypeScript）
- [ ] 数据库初始化（better-sqlite3 + 迁移脚本）
- [ ] 事件 CRUD API
- [ ] 材料上传 API（支持 HTML + 资源文件夹）
- [ ] 文件存储服务

### 前端
- [ ] 项目初始化（Vue 3 + Vite + Naive UI）
- [ ] 基础布局（侧边栏 + 主内容区）
- [ ] 事件列表页
- [ ] 事件创建/编辑页
- [ ] 事件详情页
- [ ] 材料上传组件

---

## Phase 2: 时间线与标签

**目标：** 完善事件内部结构和分类能力

### 后端
- [ ] 时间线节点 API
- [ ] 标签管理 API（支持层级）
- [ ] 事件标签关联

### 前端
- [ ] 时间线编辑组件
- [ ] 时间线展示组件
- [ ] 标签管理页
- [ ] 标签选择器组件
- [ ] 标签筛选功能

---

## Phase 3: 搜索与关联

**目标：** 实现内容检索和事件关联

### 后端
- [ ] 全文搜索（SQLite FTS5）
- [ ] 事件关联 API
- [ ] 版本历史 API

### 前端
- [ ] 搜索页面
- [ ] 高级搜索组件
- [ ] 事件关联管理
- [ ] 版本历史查看

---

## Phase 4: AI 接口

**目标：** 为 AI Agent 提供操作接口

### 后端
- [ ] API Key 认证中间件
- [ ] AI 专用 API
- [ ] 操作日志记录
- [ ] 用户偏好统计 API

### 前端
- [ ] API Key 管理页
- [ ] AI 操作日志查看

---

## Phase 5: 回收站与导出

**目标：** 完善数据管理功能

### 后端
- [ ] 回收站 API
- [ ] 数据导出 API（JSON/Markdown）

### 前端
- [ ] 回收站页面
- [ ] 导出功能

---

## Phase 6: 部署

**目标：** 生产环境部署

- [ ] Docker 配置
- [ ] NAS 部署文档
- [ ] 数据目录说明文档
- [ ] 数据完整性检测

---

## 技术细节

### 依赖库

**后端：**
- fastify - Web 框架
- @fastify/cors - CORS 支持
- @fastify/multipart - 文件上传
- better-sqlite3 - SQLite 数据库
- uuid - UUID 生成
- dayjs - 日期处理

**前端：**
- vue - 框架
- vue-router - 路由
- pinia - 状态管理
- naive-ui - UI 组件库
- axios - HTTP 请求
- dayjs - 日期处理

### 目录结构

```
book-of-ages/
├── packages/
│   ├── web/
│   │   ├── src/
│   │   │   ├── views/          # 页面
│   │   │   ├── components/     # 组件
│   │   │   ├── stores/         # 状态管理
│   │   │   ├── api/            # API 调用
│   │   │   └── router/         # 路由配置
│   │   └── package.json
│   │
│   ├── server/
│   │   ├── src/
│   │   │   ├── routes/         # API 路由
│   │   │   ├── services/       # 业务逻辑
│   │   │   ├── db/             # 数据库操作
│   │   │   └── middleware/     # 中间件
│   │   └── package.json
│   │
│   └── shared/
│       └── types.ts            # 共享类型定义
│
├── data/                       # 数据目录（gitignore）
└── docker-compose.yml
```