# 针对性隐藏非输入文本光标 (Caret) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 针对性隐藏展示类文本（如标题、导航、Logo、说明文字等）的光标，提升用户体验并避免误导。

**Architecture:** 采用“常用标签自动覆盖 + 特定元素手动应用”的结合方案。在全局 CSS 中处理标题，并通过 `.no-caret` 工具类处理其他特定元素。

**Tech Stack:** Vue 3, Tailwind CSS (v4), Vanilla CSS

---

### Task 1: 定义全局 CSS 样式

**Files:**

- Modify: `packages/web/src/style.css`

- [ ] **Step 1: 添加标题覆盖和工具类样式**

在 `packages/web/src/style.css` 的适当位置（建议在 `Custom Utilities` 之后）添加以下样式：

```css
/* ==================== Caret Control ==================== */

/* 针对标题隐藏光标 */
h1,
h2,
h3,
.text-h1,
.text-h2,
.text-h3 {
  caret-color: transparent;
}

/* 通用隐藏光标工具类 */
.no-caret {
  caret-color: transparent;
}
```

- [ ] **Step 2: 验证样式添加成功**

由于是样式修改，手动确认文件保存。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/style.css
git commit -m "style: add h1-h3 caret-color hide and .no-caret utility"
```

### Task 2: 应用于 MainLayout 组件 (Logo & 导航)

**Files:**

- Modify: `packages/web/src/components/MainLayout.vue`

- [ ] **Step 1: 为 Logo 文本添加 .no-caret**

```vue
<!-- Logo 部分 -->
<span
  class="text-xl font-serif font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap no-caret"
>岁月史书</span>
```

- [ ] **Step 2: 为导航按钮文本添加 .no-caret**

```vue
<!-- Desktop Nav Links -->
<nav class="flex items-center space-x-1 overflow-x-auto no-scrollbar">
  <button
    ...
    class="... no-caret"
    ...
  >
    <component :is="item.icon" class="w-4 h-4 transition-transform group-hover:scale-110" />
    <span class="text-sm tracking-wide">{{ item.label }}</span>
  </button>
</nav>

<!-- Mobile Bottom Tab Bar -->
<nav ...>
  <div ...>
    <button
      ...
      class="... no-caret"
      ...
    >
      ...
      <span class="text-[10px] font-bold tracking-wider uppercase">{{ item.label }}</span>
    </button>
  </div>
</nav>
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/MainLayout.vue
git commit -m "style: apply .no-caret to logo and navigation in MainLayout"
```

### Task 3: 应用于 EmptyState 组件

**Files:**

- Modify: `packages/web/src/components/EmptyState.vue`

- [ ] **Step 1: 为标题和描述添加 .no-caret**

修改 `EmptyState.vue`，给包含标题和描述的容器或具体元素添加类。

```vue
<template>
  <div class="flex flex-col items-center justify-center p-12 text-center no-caret">
    ...
    <h3 class="text-xl font-serif font-bold text-stone-900 mb-2">{{ title }}</h3>
    <p class="text-stone-500 max-w-xs mx-auto">{{ description }}</p>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/EmptyState.vue
git commit -m "style: apply .no-caret to EmptyState component"
```

### Task 4: 应用于 EventsView 组件

**Files:**

- Modify: `packages/web/src/views/EventsView.vue`

- [ ] **Step 1: 为副标题添加 .no-caret**

```vue
<div>
  <h1 class="text-4xl font-serif font-bold text-stone-900 mb-2">事件库</h1>
  <p class="text-stone-500 font-medium no-caret">梳理历史脉络，珍藏岁月记忆</p>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/views/EventsView.vue
git commit -m "style: apply .no-caret to subtitle in EventsView"
```

### Task 5: 应用于 EventCard 组件

**Files:**

- Modify: `packages/web/src/components/EventCard.vue`

- [ ] **Step 1: 为日期标签和摘要添加 .no-caret**

```vue
<!-- 日期部分 -->
<div
  class="flex items-center space-x-4 text-xs font-bold tracking-widest text-stone-400 uppercase no-caret"
>
  ...
</div>

<!-- 摘要部分 -->
<p v-if="event.summary" class="text-stone-600 leading-relaxed line-clamp-2 max-w-2xl no-caret">
  {{ event.summary }}
</p>
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/EventCard.vue
git commit -m "style: apply .no-caret to metadata and summary in EventCard"
```
