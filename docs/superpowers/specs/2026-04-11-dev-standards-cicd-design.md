# 开发规范与 CI/CD 体系设计文档

**日期**: 2026-04-11
**状态**: 待实施
**范围**: 代码质量、测试、CI/CD、分支管理、发布流程

---

## 1. 背景与目标

### 1.1 项目现状

Book of Ages（岁月史书）已完成 Phase 1-4 的核心功能开发，包括：

- 后端 Fastify API（事件 CRUD、标签、搜索、材料、时间线）
- 前端 Vue 3 管理界面
- Docker 容器化部署

**当前缺失**：

- 零测试覆盖
- 无 CI/CD 流程
- 无代码质量自动检查
- 无提交规范和发布流程

### 1.2 设计目标

1. **保障代码质量**：每次提交自动检查，防止坏代码入库
2. **建立工程规范**：覆盖开发 → 测试 → 合并 → 发布的完整链路
3. **新手友好**：每个工具职责清晰、配置可读、出错有明确提示
4. **为 NAS 部署预留**：当前聚焦本地开发，部署能力预留接口
5. **学习价值**：作为实践者能理解并掌握完整的工程规范体系

### 1.3 适用范围

- 个人项目，单仓库，个人账号
- 当前本地运行，后续部署个人 NAS
- 主要开发者即唯一审核人

---

## 2. 整体文件结构

实施后将新增以下文件：

```
book-of-ages/
├── .github/                              # GitHub 配置（新增）
│   ├── workflows/
│   │   ├── ci.yml                        # CI：push/PR 时自动运行
│   │   └── release.yml                   # 发布：手动触发
│   ├── PULL_REQUEST_TEMPLATE.md          # PR 提交模板
│   └── CODEOWNERS                        # 代码负责人
├── .husky/                               # Git Hooks（新增，install 后生成）
│   ├── pre-commit                        # 提交前自动格式化
│   └── commit-msg                        # 提交信息格式检查
├── packages/
│   ├── web/
│   │   ├── vitest.config.ts              # （新增）前端测试配置
│   │   └── src/
│   ├── server/
│   │   ├── vitest.config.ts              # （新增）后端测试配置
│   │   ├── __tests__/                    # （新增）后端测试目录
│   │   └── src/
│   └── shared/
├── .prettierrc                           # （新增）Prettier 配置
├── .prettierignore                       # （新增）Prettier 忽略
├── .editorconfig                         # （新增）编辑器统一配置
├── commitlint.config.js                  # （新增）提交信息格式检查配置
├── lint-staged.config.js                 # （新增）提交前检查范围配置
├── package.json                          # （修改）增加 scripts 和 devDependencies
└── docs/
    └── superpowers/specs/
        └── 2026-04-11-dev-standards-cicd-design.md  # 本文档
```

**设计原则**：

- 每个文件职责单一，命名自解释
- 配置文件放在项目根目录或对应 package 内
- `.github/` 使用 GitHub 约定目录结构

---

## 3. CI 工作流设计

### 3.1 `ci.yml` — 持续集成

**触发条件**：push 到任何分支、创建或更新 Pull Request

**执行步骤**：

| 步骤         | 命令                              | 目的                     |
| ------------ | --------------------------------- | ------------------------ |
| 检出代码     | `actions/checkout@v4`             | 获取代码                 |
| 设置 Node.js | `actions/setup-node@v4` (Node 20) | 统一运行环境             |
| 安装依赖     | `npm ci`                          | 快速、确定性的安装       |
| 代码风格检查 | `npm run lint`                    | 检查 ESLint 问题         |
| 类型检查     | `npm run typecheck`               | TypeScript 编译检查      |
| 运行测试     | `npm run test`                    | 执行 Vitest 测试         |
| 构建         | `npm run build`                   | 确保前端后端都能成功构建 |

**失败行为**：任何步骤失败，workflow 标记为 failed，PR 显示 ❌，无法合并。

**优化考虑**：

- 使用 `npm ci` 而非 `npm install`，利用 lockfile 确保确定性
- 测试步骤配置 `continue-on-error: false`（默认），确保测试失败阻断合并

### 3.2 `release.yml` — 发布流程

**触发条件**：GitHub Actions 页面手动触发，输入版本号（如 `1.1.0`）

**执行步骤**：

| 步骤           | 说明                                                   |
| -------------- | ------------------------------------------------------ |
| 创建 Git Tag   | 基于当前 main 创建 `v{version}` 标签                   |
| 生成 Changelog | 根据 Conventional Commits 规范，自动从 commit 历史提取 |
| 创建 Release   | 在 GitHub 上创建 Release，附带 Changelog 内容          |
| （预留）部署   | 注释掉的 NAS 部署步骤，未来取消注释即可启用            |

**Changelog 生成规则**：

- `feat:` → Features 章节
- `fix:` → Bug Fixes 章节
- `refactor:` → 不显示（内部改进）
- `docs:` → 不显示（文档更新）

---

## 4. 测试策略

### 4.1 测试框架选型

| 包                       | 框架   | 选型理由                                                         |
| ------------------------ | ------ | ---------------------------------------------------------------- |
| **@book-of-ages/web**    | Vitest | 与 Vite 原生集成，零额外配置，API 兼容 Jest                      |
| **@book-of-ages/server** | Vitest | 统一使用同一框架，降低维护成本；Node 原生 test runner API 不稳定 |
| **@book-of-ages/shared** | Vitest | 纯类型定义，测试需求低，但保持统一                               |

> **注意**：原本考虑后端用 Node.js 原生 test runner，但为保持统一性和更好的 watch 模式，全部采用 Vitest。

### 4.2 测试分层

```
Level 1: 单元测试（第一阶段实施）
  ├── 前端：工具函数、数据格式化、URL 解析结果处理
  └── 后端：Service 层纯函数、URL 解析服务

Level 2: API 集成测试（第二阶段实施）
  └── 后端：supertest 测试各路由端点
      ├── 正常请求（happy path）
      ├── 错误输入（4xx 响应）
      └── 鉴权失败（无/错误 API Key）

Level 3: 组件测试（暂不实施）
  └── 前端：@vue/test-utils 测试 Vue 组件行为
      → 配置复杂度高，优先级低，留到以后
```

### 4.3 初期测试目标

| 指标          | 目标                                 |
| ------------- | ------------------------------------ |
| 初始测试数    | 5-10 个                              |
| 关键 API 覆盖 | 事件 CRUD 各至少 1 个测试            |
| CI 要求       | 测试全部通过才能合并                 |
| 覆盖率要求    | **不追求数字**，追求核心逻辑有人兜底 |

### 4.4 测试编写规范

**文件命名**：`{源文件名}.test.ts`，与源文件放在同一目录或 `__tests__/` 目录。

**测试结构示例**（后端）：

```typescript
import { describe, it, expect } from 'vitest';
import { parseUrlService } from './urlParser';

describe('parseUrlService', () => {
  it('should extract title and content from a valid URL', async () => {
    const result = await parseUrlService('https://example.com/article');
    expect(result.title).toBeDefined();
    expect(result.content).toBeDefined();
  });
});
```

**测试结构示例**（前端）：

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('should format ISO date to readable string', () => {
    expect(formatDate('2026-04-11T00:00:00Z')).toBe('2026年4月11日');
  });

  it('should return empty string for invalid date', () => {
    expect(formatDate('invalid')).toBe('');
  });
});
```

### 4.5 AI 写测试的指令模板

当 AI 实现新功能时，应同步编写测试，覆盖以下场景：

1. **正常输入**：函数在预期输入下的正确输出
2. **边界情况**：空输入、null/undefined、最大值/最小值
3. **错误情况**：无效输入是否抛出预期错误或返回错误码

---

## 5. 代码质量保障

### 5.1 Prettier — 自动格式化

**配置文件**：`.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5"
}
```

**忽略文件**：`.prettierignore`

```
node_modules/
dist/
data/
package-lock.json
```

**执行方式**：

- 提交前自动格式化修改后的文件（lint-staged）
- CI 检查格式化状态：`npm run format:check`
- 手动修复：`npm run format`

### 5.2 ESLint — 代码质量检查

**配置**：根据项目已有的 TypeScript 和 Vue 3 技术栈配置。

**核心规则**：
| 规则 | 级别 | 说明 |
|------|------|------|
| `@typescript-eslint/no-unused-vars` | warn | 未使用的变量 |
| `@typescript-eslint/no-explicit-any` | warn | 避免 any 类型 |
| `no-console` | warn | 生产环境不应有 console |
| `vue/no-unused-components` | error | 未使用的组件 |

**执行方式**：

- `npm run lint` 检查
- `npm run lint:fix` 自动修复可修复的问题
- CI 中 `npm run lint` 失败则阻断合并

### 5.3 TypeScript 严格模式

**配置**：确保 `tsconfig.json` 中 `strict: true`。

**要求**：

- 所有函数参数和返回值必须标注类型
- 不允许隐式 any
- `noImplicitAny`、`strictNullChecks` 开启

---

## 6. 提交规范

### 6.1 Conventional Commits 格式

```
<type>(scope): <description>

[optional body]
```

**type 类型**：
| type | 用途 | 是否出现在 Changelog |
|------|------|---------------------|
| `feat` | 新功能 | ✅ Features |
| `fix` | Bug 修复 | ✅ Bug Fixes |
| `docs` | 文档更新 | ❌ |
| `style` | 代码格式（不影响功能） | ❌ |
| `refactor` | 重构 | ❌ |
| `test` | 测试相关 | ❌ |
| `chore` | 构建/工具配置 | ❌ |

**scope（可选）**：指明影响范围，如 `feat(server): 添加搜索 API`

**示例**：

```
feat(web): 添加全局搜索框组件
fix(server): 修复标签创建时的重复问题
docs: 更新 API 文档中的请求示例
refactor(server/db): 重构数据库初始化逻辑
```

### 6.2 Commitlint 配置

**配置文件**：`commitlint.config.js`

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
};
```

**执行方式**：通过 Husky 的 `commit-msg` hook 在提交时检查，格式不对则拒绝提交。

---

## 7. Husky + lint-staged

### 7.1 Husky

**安装**：`npx husky init`

**钩子**：

- `pre-commit`：运行 lint-staged（格式检查 + lint）
- `commit-msg`：运行 commitlint（提交信息格式检查）

### 7.2 lint-staged

**配置**：只对已暂存的文件进行检查，避免全量扫描。

```javascript
export default {
  '*.{ts,js,vue}': ['prettier --write', 'eslint --fix'],
  '*.{json,md}': ['prettier --write'],
};
```

**效果**：`git commit` 时自动格式化暂存的文件，如有无法自动修复的 lint 错误，拒绝提交。

### 7.3 `prepare` Script

在根 `package.json` 中添加：

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

`npm install` 后自动执行 `husky install`，初始化 Git hooks。

---

## 8. 分支管理与 PR 规范

### 8.1 分支策略

```
main              ← 稳定分支，始终可构建通过
  ↑
  ├── feat/xxx    ← 新功能分支（如 feat/search, feat/tags-tree）
  ├── fix/xxx     ← Bug 修复（如 fix/tag-duplicate）
  ├── refactor/xxx ← 重构（如 refactor/db-init）
  └── docs/xxx    ← 文档更新
```

**规则**：

- 不直接在 `main` 上提交代码
- 每个功能/修复开独立分支
- 完成后通过 Pull Request 合入 `main`
- 分支命名使用 kebab-case，简短明了

### 8.2 Pull Request 模板

**文件**：`.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## 变更类型

- [ ] feat: 新功能
- [ ] fix: Bug 修复
- [ ] refactor: 重构
- [ ] docs: 文档更新
- [ ] chore: 构建/配置修改

## 变更说明

<!-- 描述你做了什么、为什么这么做 -->

## 自测清单

- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过
- [ ] `npm run test` 通过
- [ ] 已在本地手动测试功能

## 相关 Issue

<!-- 如有关联的 Issue，使用 #issue_number 引用 -->
```

### 8.3 Branch Protection Rules（GitHub 设置）

需要在 GitHub 仓库设置中手动开启：

**路径**：Settings → Branches → Add rule

**规则配置**：
| 设置项 | 值 | 说明 |
|--------|-----|------|
| Branch name pattern | `main` | 保护 main 分支 |
| Require a pull request before merging | ✅ | 必须通过 PR |
| Require approvals | ✅ (1) | 至少 1 人审批 |
| Dismiss stale pull request approvals when new commits are pushed | ✅ | 有新提交时自动失效审批 |
| Require status checks to pass before merging | ✅ | CI 必须通过 |
| Status checks that are required | `CI` (ci.yml 的 job 名) | 指定必须通过的 check |
| Require branches to be up to date before merging | ✅ | 合入前必须先更新到最新 main |
| Include administrators | ✅ | 管理员也受限制（防止自己绕过） |

### 8.4 CODEOWNERS

**文件**：`.github/CODEOWNERS`

```
# 所有代码变更都需要仓库所有者审核
* @YOUR_GITHUB_USERNAME
```

> **注意**：实施时需将 `@YOUR_GITHUB_USERNAME` 替换为实际的 GitHub 用户名。

---

## 9. npm Scripts 清单

根 `package.json` 将新增以下 scripts：

```json
{
  "scripts": {
    "lint": "npm run lint -w packages/server && npm run lint -w packages/web",
    "lint:fix": "npm run lint:fix -w packages/server && npm run lint:fix -w packages/web",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "npm run typecheck -w packages/server && npm run typecheck -w packages/web",
    "test": "npm run test -w packages/server && npm run test -w packages/web",
    "test:watch": "npm run test:watch -w packages/server & npm run test:watch -w packages/web",
    "prepare": "husky"
  }
}
```

各子包也需要添加对应的 scripts（如 `packages/server/package.json`、`packages/web/package.json`）。

---

## 10. GitHub 网页设置指南

以下操作**无法通过代码自动完成**，需要在 GitHub 仓库页面上手动操作。

### 10.1 开启 GitHub Actions

**路径**：Settings → Actions → General

- 选择 **Allow all actions and reusable workflows**
- 确认保存

> 通常默认已开启。

### 10.2 配置 Branch Protection

**路径**：Settings → Branches → Add rule

1. **Branch name pattern** 输入 `main`
2. 勾选以下选项：
   - [x] **Require a pull request before merging**
   - [x] **Require approvals** → 设置为 1
   - [x] **Dismiss stale pull request approvals when new commits are pushed**
   - [x] **Require status checks to pass before merging**
   - [x] **Require branches to be up to date before merging**
   - [x] **Include administrators**
3. 在 **Status checks that are required** 中搜索并选择 `CI`（第一次 push 后会出现在列表中）
4. 点击 **Create** 或 **Save changes**

### 10.3 验证 Actions 权限

提交代码后，在仓库的 **Actions** 标签页应该能看到 workflow 开始运行。

如果看不到：

1. 进入 Settings → Actions → General
2. 确认没有勾选 **Disable actions**
3. 确认 **Allow select actions** 中包含了 `actions/checkout` 和 `actions/setup-node`

---

## 11. 实施顺序

按照以下顺序逐步实施，每步完成后可独立验证：

| 步骤 | 任务                                           | 验证方式                     |
| ---- | ---------------------------------------------- | ---------------------------- |
| 1    | 安装依赖（prettier, eslint, vitest, husky 等） | `npm ls` 能看到包            |
| 2    | 创建 Prettier、ESLint 配置文件                 | `npm run format:check` 运行  |
| 3    | 创建 Vitest 配置和示例测试                     | `npm run test` 通过          |
| 4    | 设置 Husky + lint-staged + commitlint          | `git commit` 触发 hooks      |
| 5    | 创建 `.github/workflows/ci.yml`                | Push 后 Actions 页面看到运行 |
| 6    | 创建 `.github/workflows/release.yml`           | 手动触发能创建 Release       |
| 7    | 创建 PR 模板和 CODEOWNERS                      | 新建 PR 时显示模板           |
| 8    | 修改 package.json scripts                      | `npm run` 能看到新命令       |
| 9    | （用户手动操作）配置 Branch Protection         | 合 PR 时需要检查通过         |

---

## 12. 未来扩展

以下内容不在本次实施范围，但设计时预留了扩展空间：

| 能力                   | 预留位置                            | 启用方式                 |
| ---------------------- | ----------------------------------- | ------------------------ |
| NAS 自动部署           | `release.yml` 中注释的 deploy job   | 取消注释 + 配置 SSH Key  |
| 测试覆盖率报告         | CI workflow 中可加 `--coverage`     | Vitest 内置支持          |
| 代码质量评分           | 集成 Codecov / SonarQube            | 注册服务 + 添加 token    |
| 依赖自动更新           | 可加 Dependabot / Renovate          | `.github/dependabot.yml` |
| 多环境部署（dev/prod） | `release.yml` 增加 environment 选择 | GitHub Environments      |

---

## 13. 设计决策记录

| 决策                  | 选项                 | 理由                                  |
| --------------------- | -------------------- | ------------------------------------- |
| 测试框架              | Vitest（统一前后端） | Vite 原生集成、API 一致、减少维护负担 |
| 不用 Jest             | —                    | 与 Vite 需要额外配置，没必要          |
| 后端也用 Vitest       | Node test runner     | 保持统一，减少学习成本                |
| 不使用 Docker 构建 CI | 直接用 Node 环境     | 更快、更简单，Docker 留给部署         |
| PR 审批人数设为 1     | —                    | 个人项目，自审即可，重点是流程习惯    |
| 不追求测试覆盖率数字  | —                    | 新手友好，避免为了数字写无意义测试    |
| 暂不实施组件测试      | —                    | Vue 组件测试配置复杂，收益相对低      |
