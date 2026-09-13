# AI 辅助体系设计：权限分级、建议收件箱与自然语言检索

> 状态：草案（2026-09-13，三个前提决策已与维护者对齐）
> 前置依赖：建议在 `fix/code-review-2026-09-13`（鉴权与安全修复）合入后实施，本文引用的中间件与路由形态以该分支为准。

## 1. 背景与决策前提

系统的核心价值主张是"防篡改的个人历史档案"。当前 AI（外部 Agent）通过两条通道接入：MCP（stdio，6 个工具）与 HTTP API（`X-API-Key`）。经讨论确认三个方向性决策：

| 编号 | 决策                                                   |
| ---- | ------------------------------------------------------ |
| D1   | AI 创建的事件一律为 `draft`，`confirmed` 只能由人设置  |
| D2   | 所有接口（含 GET 读接口）一律鉴权，单机自用也不例外    |
| D3   | 引入"AI 建议"机制（AI 提议、人审核生效）与自然语言检索 |

## 2. 设计原则

- **P1 提议与定稿分离**：AI 的"提出能力"可以无限扩展，"生效"动作必须由人完成（即 admin scope 钥匙）。
- **P2 内核确定、智能外置**：server 不内嵌 LLM 调用。智能由外部 Agent（MCP）承担；如未来引入服务端 LLM 桥，LLM 只允许产出结构化"查询计划"，执行永远是确定性代码。
- **P3 可审计、可归属、可撤销**：一切写操作记录操作日志并归属到钥匙；删除走回收站；内容变更可溯源。

## 3. 关键洞察：全端鉴权后，"人"与"Agent"必须显式建模

现状的权限模型隐含一个假设：**不带钥匙的请求 = 人，带钥匙的请求 = Agent**。

- `confirmed` 不可篡改检查为 `existingEvent.status === 'confirmed' && apiKeyId` 时锁定核心字段——人的浏览器请求不带 key，因此不受锁；
- GET 接口无鉴权——浏览器无需凭证即可读。

D2 落地后，浏览器也必须携带凭证，"人"与"Agent"在服务端变得不可区分：若人的浏览器同样带 key，人会被 confirmed 锁挡住；若不区分 scope，Agent 也获得 confirmed 写权限，D1 失去执行点。

**结论：API Key scope 分级不是附加优化，而是 D1 + D2 的前置依赖。** "人"的显式形态 = admin scope 的钥匙（未来如引入用户名密码登录，可平滑替换），"Agent" = write / read scope 的钥匙。

## 4. 方案设计

### 4.1 API Key 权限分级（scope）

**数据模型**：`api_keys` 新增 `scopes TEXT NOT NULL DEFAULT 'admin'`（逗号分隔）。迁移时现有 key 一律升为 `admin`（能力不缩水），文档引导为 Agent 另发低权钥匙。

**能力矩阵**：

| 能力                                 | admin（人）  | write（Agent）     | read（Agent） |
| ------------------------------------ | ------------ | ------------------ | ------------- |
| 读接口                               | ✅           | ✅                 | ✅            |
| 创建事件                             | 自主选择状态 | **强制 `draft`**   | ❌            |
| 修改 `draft` / `archived` 事件       | ✅           | ✅（核心字段）     | ❌            |
| 修改 `confirmed` 核心字段            | ✅           | ❌（沿用现有锁定） | ❌            |
| 软删除 / 恢复                        | ✅           | ✅                 | ❌            |
| 状态流转（draft→confirmed→archived） | ✅           | ❌                 | ❌            |
| 上传材料、管理标签                   | ✅           | ✅                 | ❌            |
| 建议 accept / dismiss                | ✅           | ❌（只能 propose） | ❌            |
| Key 管理、批量导入、导出、审计       | ✅           | ❌                 | ❌            |

**鉴权语义改造**（`packages/server/src/middleware/auth.ts`）：

- `request.apiKeyId` 扩展为 `request.auth: { keyId: string; scopes: Scope[] }`；
- `confirmed` 锁定条件从 `apiKeyId 存在` 改为 `scopes 不含 admin`（`eventService.updateEvent`）；
- 创建强制 draft：`POST /api/events` 与 `PUT /api/events/batch` 在 `scopes 不含 admin` 时将 `status` 覆写为 `draft`（route 层覆写，service 层兜底）；
- 403 错误信息包含缺失的 scope，便于 Agent 自我纠正。

**MCP 通道 = write 语义**：MCP server 的存在意义就是给 AI 用，整条通道按 write scope 对待：

- `create_event`：移除 `status` 参数（传入即忽略），结果恒为 `draft`；
- `archive_url`：忽略 `auto_confirm`，恒落 `draft`（工具描述同步更新，避免 Agent 误解）；
- 新增 `propose_suggestion`（见 4.4）；
- 如未来需要"MCP 以 admin 身份操作"（例如个人脚本），可增加环境变量 `BOA_MCP_API_KEY` 显式提权，默认不提。

**剪藏端（clipper）**：`auto_confirm` 字段保留兼容。剪藏是"人在浏览器中的动作"，使用的通常是 admin 钥匙，admin 下 `auto_confirm=true` 仍可生效；write scope 下恒为 draft。语义规则一句话：**write 恒 draft，admin 自主决定**。

### 4.2 全接口鉴权（D2）

**范围**：所有 `/api/*` 路由（含全部 GET）与材料预览。经核实，服务端不存在 `/uploads` 静态路由（nginx 亦未配置该 location），媒体统一经 `/api/materials/:id/preview` 流式输出——保护 `/api` 即覆盖媒体；vite 代理中的 `/uploads` 条目属遗留配置，一并清理。

**凭证形态**：

1. `X-API-Key` header：所有请求（Web axios 已全局注入，Agent 原样使用）；
2. 会话 cookie：仅 GET 读接口接受，解决 `<img>` / `<iframe src>` 无法携带 header 的问题（材料预览、快照渲染）。

**会话端点**：`POST /api/auth/session`，以 header 鉴权换取 cookie：

- `Set-Cookie: boa_session=<token>; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`（生产环境追加 `Secure`）；
- token 为服务端签名的短期会话（HMAC，载荷含 keyId + scopes + 过期时间），无需新表；
- cookie 与钥匙同权（scope 随 key），验签时回查 key 状态，吊销钥匙即吊销会话。

**CSRF 论证**：写接口只接受 header、不接受 cookie——跨站请求无法伪造 header，CSRF 面不存在；读接口接受 cookie 但读操作无副作用。`SameSite=Strict` 作为第二道保险。

**前端改造**：

- `client.ts` 增加全局 401 响应拦截：提示跳转设置页（已有"设置 → 本站访问密钥"流程）；
- `initApiKey` 后调用一次 `POST /api/auth/session` 预热 cookie，保证媒体直接可渲染；
- `SnapshotModal` / 详情页图片的 preview URL 不变（同源 cookie 自动携带）。

**错误契约**：401 `{ code: 'UNAUTHORIZED' }`；403 `{ code: 'FORBIDDEN', message: '需要 admin scope …' }`。

### 4.3 Provenance（内容溯源）

- `events` 新增 `created_by TEXT`（取值：`'web'` / api_key id / `'bootstrap'`）；`materials` 不加（经所属事件可溯源，最小改动）；
- 前端详情页显示"收录来源：人工收录 / Agent：<key 名称>"；
- 更新链路的追溯已有 `operation_logs` 支撑，本节只补创建链路的显式字段。

### 4.4 AI 建议收件箱（D3-a）

**新表 `ai_suggestions`**：

```sql
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,                      -- tag | summary | date | merge
    target_id TEXT NOT NULL,                 -- 事件 id
    payload TEXT NOT NULL,                   -- JSON：建议内容
    rationale TEXT,                          -- AI 给出的理由
    model TEXT,                              -- 产出模型标识（可空）
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | dismissed
    created_by_key TEXT REFERENCES api_keys(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME,
    decided_by_key TEXT REFERENCES api_keys(id)
);
```

**API 面**：

| 端点                                | 最低 scope | 说明                                                                                 |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `POST /api/suggestions`             | write      | AI 提议；同 target 同 type 的 pending 自动去重（覆盖 rationale/payload）             |
| `GET /api/suggestions?status=`      | read       | 列表                                                                                 |
| `POST /api/suggestions/:id/accept`  | admin      | 服务端确定性执行（复用现有 service），记 `operation_logs(action='APPLY_SUGGESTION')` |
| `POST /api/suggestions/:id/dismiss` | admin      | 仅标记，不执行                                                                       |

**建议类型与 accept 语义（一期）**：

- `tag`：`{ tag_names: string[] }` → 逐个 `addTagToEvent`（不存在则建）；
- `summary`：`{ summary: string }` → 执行 `updateEvent` 的 summary 字段；
- `date`：`{ event_date }` → 同上；
- `merge`：`{ merge_into_event_id }` → 一期不自动合并，accept 仅在两条事件上互记"疑似重复"标记，人工在 UI 完成合并。

**防泛滥**：pending 建议每 target 每类型最多 1 条；写路径挂 per-key rate limit（复用现有基建）。

**MCP 工具**：新增 `propose_suggestion`（参数：type / target_id / payload / rationale），工具描述明确"建议不会直接生效，由人工审核"。

**Web UI**：新增"建议收件箱"视图（路由 `/suggestions`，侧边栏入口），逐条展示建议内容、理由与目标事件跳转，提供 accept / dismiss 操作。

### 4.5 自然语言检索（D3-b）

**第一步：结构化查询契约**（`packages/shared` 定义）：

```ts
export interface StructuredQuery {
  text?: string; // FTS 词组（服务端做引号转义）
  tags?: string[];
  date_from?: string; // YYYY-MM-DD
  date_to?: string;
  status?: EventStatus;
  fields?: ('events' | 'materials' | 'timeline_nodes')[];
  sort?: 'relevance' | 'date_desc' | 'date_asc';
  limit?: number;
}
```

**`POST /api/search/query`（scope: read）**：确定性执行器——把 StructuredQuery 翻译为现有 `simpleSearch` / `listEvents` 能力，无任何 LLM 参与。Web 搜索页与 Agent 共用同一执行路径。

**NL 翻译的部署形态**：

- **一期（零服务端 LLM）**：由外部 Agent 完成。用户直接对 Claude/ZCode 说"帮我找 3 月关于迁移的事件"，Agent 通过 MCP 调 `search_archives`（增强为接受结构化参数）或 `/api/search/query`。
- **二期（可选桥，独立评审）**：设置页保存 OpenAI 兼容的 `{ baseURL, apiKey, model }`；`POST /api/search/nl` 调 LLM，system prompt 强约束其只输出 StructuredQuery JSON，Schema 校验失败即返回 422；执行复用同一执行器。P2 原则不破坏：LLM 产出查询计划，不产出 SQL、不触碰写路径。

## 5. 实施阶段

| 阶段               | 内容                                                                        | 主要涉及文件                                                                                                              |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 地基       | scopes 迁移、全端鉴权、会话 cookie、创建强制 draft、provenance、前端 401 流 | `db/schema.ts`、`middleware/auth.ts`、`services/eventService.ts`、`routes/*`、`shared`、`web/api/client.ts`、设置页       |
| Phase 2 建议收件箱 | ai_suggestions 表、路由、MCP propose_suggestion、Web 收件箱视图             | `db/schema.ts`、`routes/suggestions.ts`、`services/suggestionService.ts`、`mcp/tools.ts`、`web/views/SuggestionsView.vue` |
| Phase 3 结构化查询 | StructuredQuery、/api/search/query、MCP 增强；（可选）LLM 桥单独立项评审    | `shared`、`services/searchService.ts`、搜索路由、搜索页                                                                   |

每阶段独立提交、独立可回滚；Phase 1 建议在审查修复分支合并后实施，避免中间件双改。

## 6. 测试方案

- **鉴权矩阵**（冒烟脚本参数化）：{无凭证, read, write, admin} × {GET 读, POST 创建（status=confirmed/draft）, PUT confirmed 核心字段, DELETE, key 管理, 导入}——断言 401/403/200 与 status 覆写行为；
- **会话**：header 换 cookie；cookie 可读不可写；过期与吊销；
- **建议流转**：propose → 去重 → accept（断言副作用与日志）→ dismiss；write 调 accept 得 403；
- **结构化查询**：各字段组合的行为断言；FTS 引号转义；limit 边界；
- **回归**：现有 server 测试全绿；`typecheck` / `lint` / `build` 全绿。

## 7. 风险与未决问题

- **admin 钥匙存于浏览器 localStorage**：存在 XSS 暴露面。现有缓解：DOMPurify、快照 iframe `sandbox`。远期可演进为"用户名密码登录 → 服务端会话"，本期以短时效会话 cookie + header 双轨过渡；`/api/auth/session` 的接口形态已为该演进预留；
- **现有钥匙默认升为 admin**：能力不缩水，但应尽快为 Agent 另发 write 钥匙（文档引导 + 设置页提示）；
- **MCP stdio 无鉴权**：信任边界 = 本机用户；如需远程 MCP 再引入 key 绑定；
- **LLM 桥**：涉及服务端密钥保管与成本，单独立项评审，不在本期范围。
