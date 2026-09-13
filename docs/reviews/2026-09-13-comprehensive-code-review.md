# 全面代码审查报告（2026-09-13）

> **审查范围**：packages/server（Fastify 后端）、packages/web（Vue 3 前端）、packages/clipper（浏览器插件）、packages/shared（共享类型）、Docker/nginx/CI 配置、docs 文档。
> **审查方式**：全量代码通读 + grep 交叉验证；关键结论经运行时实测复现（材料上传 400、`/uploads/` 静态路径 404）。审查与修复过程未直接改动主分支，全部修改在 `fix/code-review-2026-09-13` 分支完成。
> **基线状态**：现有 221 个 server 测试全部通过；SQL 全程参数化未见注入风险；前端 `v-html` 均经 DOMPurify 消毒。

**严重程度图例**：🔴 严重（P0） / 🟠 高（P1） / 🟡 中等（P2） / 🟢 轻微（P3）

---

## 🔴 严重（P0）

### 1. 全部 API 无强制鉴权，`requireAuthMiddleware` 定义后从未使用

- **位置**：`packages/server/src/middleware/auth.ts:38`（定义，全仓库无引用）；`packages/server/src/index.ts:40`（只注册了 `optionalAuthMiddleware`）
- **严重程度**：严重
- **问题**：所有路由——包括创建/吊销 API Key（`routes/settings.ts:22,64`）、事件增删改、文件上传、`/api/tools/archive-url`、`/api/mcp`（`routes/tools.ts:60,96`）——不带任何密钥即可调用。带不带 `X-API-Key` 的唯一区别只是审计日志里是否记录 key。API Key 体系形同虚设，且与问题 3 的 SSRF 叠加后被外网直连时危害倍增。
- **建议**：在写操作与敏感路由上挂 `requireAuthMiddleware`（只读路由可保留 optional）；同时给 web 端补"粘贴密钥"入口把 `stores/app.ts` 的 `setApiKey` 接进 `apiClient`（当前 `initApiKey/setApiKey` 无人调用，前端从不发送 `X-API-Key`，整个密钥链路端到端断裂）。

### 2. 材料上传接口运行时必然 400，Web 端上传功能完全不可用（已实测复现）

- **位置**：`packages/server/src/routes/materials.ts:82`（`request.body` 解构）+ `:56-68`（multipart 路由声明了 JSON body schema）
- **严重程度**：严重（功能性故障）
- **问题**：`@fastify/multipart` 默认模式不填充 `request.body`，实测 `POST /api/materials/upload` 一律返回 `400 {"code":"FST_ERR_VALIDATION","message":"body must be object"}`。EventDetailView 的上传弹窗（`views/EventDetailView.vue:948-977`）任何操作都会失败。服务测试只覆盖 service 层所以未暴露。
- **建议**：移除该路由的 `body` schema，改为先 `const data = await request.file()`，从 `data.fields` 读取 `event_id/type/title/source_url`；或全局启用 `attachFieldsToBody: 'keyValues'` 配合 `sharedSchemaId`。

### 3. 服务端 SSRF：抓取任意 URL 且无内网防护，暴露在无鉴权端点上

- **位置**：`packages/server/src/services/snapshotService.ts:169`、`packages/server/src/services/urlParserService.ts:29`；暴露面 `routes/tools.ts:14,60`、`routes/tools.ts:96`（MCP `tools/call`）、`services/importService.ts:168`
- **严重程度**：严重
- **问题**：`fetch(url)` 无 scheme/host 校验，可被用来探测云元数据（169.254.169.254）、内网服务、localhost 端口，并把响应写入快照（等于把内网内容带回给调用者）。
- **建议**：新建统一的 URL 校验器：仅允许 http/https、解析后拒绝私网/环回/链路本地地址与非常规端口、限制重定向次数并逐跳复检、限制响应体大小；并与问题 1 的鉴权联动。

### 4. 生产部署下前端必然回源 `http://localhost:3000`，部署即坏

- **位置**：`packages/web/.env:1`；回退值同写在 `packages/web/src/api/client.ts:8`、`api/materialApi.ts:62`、`api/eventApi.ts:96`、`components/SnapshotModal.vue`（`API_BASE_URL` 常量）
- **严重程度**：严重（部署即坏）
- **问题**：nginx 已配置 `/api` 反代，但前端所有请求使用绝对地址 `VITE_API_BASE_URL`。`packages/web/.env`（=localhost:3000）虽被 git 忽略，却会被 `Dockerfile.web:17` 复制进构建（`.dockerignore` 的 `.env` 只匹配根级）并 bake 进产物；即使没有 .env，代码里的 `|| 'http://localhost:3000'` 回退也指向用户本机。
- **建议**：`VITE_API_BASE_URL` 留空、代码回退改为 `''`（同源走 nginx 代理）；`Dockerfile.web` 用 build-arg 注入；`.dockerignore` 追加 `**/.env`。

---

## 🟠 高（P1）

### 5. shared 包 `main` 指向 TS 源码，生产启动依赖 Node 版本运气

- **位置**：`packages/shared/package.json:4`（`"main": "src/index.ts"`）；`Dockerfile:4`（node:22-alpine）
- **严重程度**：高
- **问题**：编译后的 `dist/index.js` 在运行时 `require('@book-of-ages/shared')` 会解析到 `.ts` 文件，只有 Node ≥22.18（默认启用类型剥离）才能跑；Node 20（docs 自述的最低版本）与 Node 22.0–22.17 直接启动崩溃。
- **建议**：`main: "dist/index.js"`、`types: "dist/index.d.ts"`（或 `exports` 条件导出），构建产物先于 server 构建生成。

### 6. 网页快照在 Web 端无法查看：`/uploads/**` 无任何路由（已实测 404）

- **位置**：`packages/web/src/components/SnapshotModal.vue:65-70`（iframe 拼接 `${API_BASE}/uploads/...`）；server 端未注册静态文件服务
- **严重程度**：高（核心卖点"证据冻结"在前端打不开）
- **问题**：快照文件存在 `data/uploads/`，但服务器只提供 `/api/materials/:id/preview`；SnapshotModal 直接用裸路径访问 → 404。
- **建议**：SnapshotModal 改传 material id 走 `/api/materials/:id/preview`；同时给该响应加 CSP sandbox（见问题 7）。

### 7. 快照/上传文件的存储型 XSS 面：HTML 以 `text/html` 内联返回 + iframe 沙箱自我失效

- **位置**：`packages/server/src/routes/materials.ts:187-191`（`fs.readFileSync` + 按扩展名设 MIME，`.html→text/html`）；`services/snapshotService.ts:139-141`（仅删 `<script>` 与 meta refresh，inline 事件/iframe 保留）；`SnapshotModal.vue`（`sandbox="allow-same-origin allow-scripts"` 等于无沙箱）
- **严重程度**：高
- **问题**：归档的恶意页面（或直接上传的 .html）经 nginx 同源代理返回时可在应用源上执行脚本；localStorage 中的 API Key（`stores/app.ts:20`）可被窃取。
- **建议**：对 `text/html` 强制 CSP `sandbox` 响应头 + `nosniff`；iframe 移除 `allow-scripts`（冻结证据本不该执行脚本）；上传时按 type 校验扩展名/MIME 白名单。

### 8. 批量删除与单个删除语义不一致："批量删除"后事件仍出现在"全部记录"

- **位置**：`routes/events.ts:102-141`（batch 走 `batchUpdateEvents` 只改 `status='deleted'`）vs `services/eventService.ts:220-233`（单个删除还写 `deleted_at`）；`listEvents`（eventService.ts:62）只按 `deleted_at IS NULL` 过滤
- **严重程度**：高（数据语义错误）
- **问题**：批量删除后 `deleted_at` 仍为 NULL，EventsView 的"全部记录"（不带 status 过滤）继续展示这些"已删除"事件；`status='deleted'` 的列表查询反而永远为空。
- **建议**：批量删除复用 `deleteEvent`；或在 `updateEvent` 中拦截 `status='deleted'` 时同步写 `deleted_at`；`listEvents` 增加默认排除。

### 9. SQLite 事务 helper 无并发保护，连接也未设 busy_timeout

- **位置**：`packages/server/src/db/index.ts:183-231`（`transaction()` 顺序执行 BEGIN…COMMIT）；`db/index.ts:67-68`（仅 foreign_keys/WAL）
- **严重程度**：高
- **问题**：单连接上两个并发请求交错执行各自的 `BEGIN/COMMIT` 会互相包含对方的写操作（回滚时连带丢失）；WAL 下并发写无 `busy_timeout` 易抛 SQLITE_BUSY。
- **建议**：用 Promise 链把事务串行化（简单互斥队列）；打开连接后追加 `PRAGMA busy_timeout = 5000`。

---

## 🟡 中等（P2）

### 10. 上传文件用 `readFileSync` 同步返回，最大 50MB 会卡死事件循环

- `routes/materials.ts:190` → 改 `fs.createReadStream` / `@fastify/static` 流式发送。

### 11. 软删除成了"黑洞"：删除后无任何回收站/恢复入口

- `routes/events.ts:144-167` 与 `eventService.ts:131` 都过滤 `deleted_at IS NULL`，`status=deleted` 列表亦为空。→ 提供回收站（`status=deleted` 列表返回已软删数据）+ 恢复接口。

### 12. UI"撤销删除"恢复的是全新 ID，且丢失标签/材料/时间线

- `views/EventsView.vue:309-328`（undo 调 `createEvent` 重建）→ 撤销改为调用恢复接口（恢复 `deleted_at`），保留原 ID 与关联。

### 13. 编辑表单无法清空已有字段（summary/content/source_url）

- `views/EventDetailView.vue:768-776` 用 `|| undefined` 跳过未填字段，而 `EventsView.vue:388-395` 又总是传空串。→ 约定显式语义：传 `null` 表示清空，服务端 `updateEvent` 识别 `null` 写 NULL。

### 14. 中文全文检索基本失效

- `services/searchService.ts:35-40`：FTS5 默认 unicode61 分词器把连续汉字视为整段 token，词中检索不命中；且 `escapeFtsQuery` 只转义引号/反斜杠，`-`、`AND/OR` 等会静默改变语义（异常时才回退 LIKE）。→ 关键词用双引号包裹（`"..."` + 内部 `""` 转义）；长期考虑 `trigram` tokenizer 或统一走 LIKE/外部分词。

### 15. 导入任务队列不可恢复，服务重启后永久卡在 processing

- `services/importService.ts:96-103`（`setTimeout` 进程内执行）+ 无启动恢复逻辑；且 `:82-91` 逐条 insert 无事务。→ 启动时把 `processing/pending` 任务重置或续跑；明细插入包事务。

### 16. `DATA_DIR` 环境变量被代码无视

- `db/index.ts:12-16` 只认 `DATABASE_PATH`/cwd；`docker-compose.yml:19`、`Dockerfile:55` 设置的 `DATA_DIR=/app/data` 无效。→ 统一支持 `DATA_DIR`，`fileService.ts:11` 的 `process.cwd()/data` 一并收敛。

### 17. nginx 未设 `client_max_body_size`，经代理的上传 >1MB 直接 413

- `nginx.conf:24-35` → `client_max_body_size 50m;`（与服务端 50MB 对齐）。

### 18. Clipper 构建产物与 manifest 不符，打包后插件无法加载；通知永不弹出

- `packages/clipper/manifest.json:13,19` 引用 `src/background.ts`/`src/content.ts`，但 `vite.config.ts:13-17` 产物是 `src/background.js`/`src/content.js` → manifest 需改为 `.js`；`background.ts:41-46` 使用 `chrome.notifications` 但未申请权限且 `iconUrl: ''` → 反馈静默失败。
- 另：`content.ts:11` 抓取 `fullHtml` 从未发送，且服务端自行无 cookie 抓取——登录态页面归档的是"游客视角"。→ 支持 rawHtml 通道（`WebClipperPayload` 类型已定义未使用）或明示局限。

### 19. Docker 构建不可复现 + 泄漏本地数据进构建上下文 + root 运行

- `Dockerfile:14`（`npm install` 且未 COPY lock 文件）→ COPY `package-lock.json` + `npm ci`；`.dockerignore:9` 的 `data/` 只匹配根级，`packages/server/data/*.db` 会进构建上下文 → 改 `**/data/`；生产镜像未声明 `USER` → `USER node`；`docker-compose.yml:14-15` 嵌套挂载冗余、底部 `volumes: data` 未使用。

### 20. 事件日期格式混杂

- Web 端 `EventDetailView.vue:772-774`、`EventsView.vue:394` 存完整 ISO 时间戳，clipper/MCP/导入存 `YYYY-MM-DD`。→ 入库前统一 `YYYY-MM-DD`。

### 21. 顶部搜索跳转后不执行搜索

- `views/SearchView.vue` 未读取 `route.query.q`（`MainLayout.vue:232-237` 传了参数被忽略）→ onMounted 读取并自动触发。

### 22. 标签可成环：前端可选自己的后代为父，服务端不校验，成环后两标签在树里同时消失

- `services/tagService.ts:57-92` + `views/TagsView.vue:156-163` → 服务端更新时校验祖先链，前端选项排除后代。

### 23. 杂项（中等）

- `POST /api/imports` 不校验 `type` 枚举，非法值落到 SQLite CHECK 500（`routes/imports.ts:36-44`）→ 显式校验；
- API Key/标签重名时 UNIQUE 冲突返回 500（`routes/tags.ts:73`、`routes/settings.ts`）→ 转 409；
- `verifyAPIKey` 每次请求都写库更新 last_used（`apiKeyService.ts:90-98`）→ 节流；
- 审计日志 `limit` 无上限（`routes/settings.ts:95`）→ schema `maximum: 500`；
- `main.ts:3` 全量引入 naive-ui → 按需导入（unplugin-vue-components + NaiveUiResolver）；
- `release.yml:57-59` changelog 变量注入 shell → 改走 env；
- `ci.yml` 仅 Node 20 单版本 → 补 22 并加 docker build 冒烟；
- `bin/mcp-server.ts` 不在 `tsconfig include` 内 → 移入 `src/bin/` 并补启动脚本。

---

## 🟢 轻微（P3）

### 24. 前端视觉/代码小问题

- `style.css` 的 `@theme` 未定义 `--color-warning-*`，而 `StatusBadge.vue`、`SearchView.vue:76-79` 使用 → 补 token；
- 无 `@tailwindcss/typography`，`.prose` 无基础排版 → `@plugin "@tailwindcss/typography"`；
- `EventsView.vue:271` `paginationState` 非响应式 → 改 `reactive`；
- `InboxView.vue:53` class 拼写错误 `border- stone-900`；
- `AnalyticsView.vue:269-279` 月份标签丢失年份；
- `EventFormModal.vue:177-178` `validate()` 拒绝时产生未捕获 Promise rejection → try/catch；
- `views/InboxView.vue:324` 收件箱固定 50 条无分页 → 补分页；
- `style.css:1` Google Fonts 外链 → self-host。

### 25. 死代码/重复代码

- `api/tagApi.ts:25` `getTagEventCount` 调用不存在的 `/api/tags/:id/events/count` 接口 → 删除；
- `composables/useInfiniteScroll.ts` 无人使用 → 删除；
- `ConfirmDialog.vue` 组件就绪但视图全用原生 `confirm()` → 统一替换；
- `shared` 的 `WebClipperPayload`/`PaginationResult` 未使用 → 接线或移除；
- `formatDate` 三处实现（`utils/date.ts`、`EventDetailView.vue:683`、`EventCard.vue:72`）→ 统一走 utils；
- `processTags` 在 EventsView/EventDetailView 各复制一份 → 提取公共函数；
- `eventApi.ts:94-100` `exportEvent` 绕过 apiClient 手写 axios/baseUrl → 收敛；
- `exportService.ts:20` markdown 导出对标题/正文无转义 → 基本转义。

### 26. 性能小项

- `routes/tags.ts:24-29` 标签列表 N+1 count → 子查询一次取回；
- `routes/events.ts:131-137` 批量日志循环逐条 await → 批量插入；
- `services/eventService.ts:272-275` 批量创建后 N+1 查询 → 一次 IN 查询。

### 27. 仓库与文档卫生

- 根目录存在 PowerShell 误生成的空文件 `$null` → 删除；
- `.github/CODEOWNERS:3` 仍是 `@YOUR_GITHUB_USERNAME` 占位符 → 需仓库所有者替换（本分支补充说明注释）；
- **缺少根 README.md** → 补充；
- `docs/README.md:10-28` 架构图缺 `packages/clipper` 与 MCP 入口 → 补充；部署文档、API 概览补充；
- 开发规范称文件用 kebab-case，实际全部 camelCase → 文档与实际对齐。

---

## 架构总体评价（正面确认）

- **分层清晰**：routes（参数校验/HTTP 语义）→ services（业务）→ db（薄封装）职责明确；shared 类型单一来源贯穿前后端；服务层 221 个测试全绿、SQL 全参数化、无一处字符串拼接 SQL。
- **前端**：composables（undo/快捷键/下拉刷新）抽象合理，v-html 全部过 DOMPurify，移动端适配完整。
- **主要结构性风险**：鉴权、SSRF、部署链路问题指向同一根因——**缺少端到端的集成测试与部署冒烟**（服务测试全部绕过 HTTP 层）。建议补一层 Fastify `inject` 级别的路由测试 + CI 里的 docker build 冒烟。

## 建议修复顺序

1. 问题 1（鉴权）→ 2（上传 400）→ 4（前端 baseURL）→ 6/7（快照可达性 + XSS）。
2. 问题 5（shared main）与 9（事务并发）。
3. 其余按 8、14、15、17、18 依次推进；P3 随迭代清理。
