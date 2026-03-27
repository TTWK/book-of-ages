# 岁月史书 (Book of Ages)

个人事件记录与管理系统，用于保存和整理个人关注的事件材料，支持 AI Agent 操作。

## 核心功能

- **事件管理**：创建、编辑、删除事件，支持版本历史
- **发展脉络**：事件内时间线，记录事件发展过程
- **材料存储**：网页快照（HTML + 资源文件夹）、截图、文件
- **层级标签**：灵活的分类和合集功能
- **事件关联**：手动 + AI 分析建议
- **全文搜索**：事件 + 材料 + 时间线节点
- **AI 就绪**：API Key 认证，支持外部 AI 系统调用

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Naive UI |
| 后端 | Fastify (TypeScript) |
| 存储 | SQLite + 文件系统 |
| 搜索 | SQLite FTS5 |

## 项目结构

```
book-of-ages/
├── packages/
│   ├── web/                 # 前端
│   ├── server/              # 后端
│   └── shared/              # 共享类型
├── data/                    # 数据目录
│   ├── book-of-ages.db      # SQLite 数据库
│   └── materials/           # 材料存储
│       └── {year}/{month}/{event-id}/
│           ├── snapshot.html
│           └── snapshot_assets/
└── docs/                    # 文档
```

## 文档

- [数据模型](./docs/data-model.md)
- [API 设计](./docs/api.md)
- [开发计划](./docs/roadmap.md)

## 快速开始

（待补充）

## 许可证

MIT