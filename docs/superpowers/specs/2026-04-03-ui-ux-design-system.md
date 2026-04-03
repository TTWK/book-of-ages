# UI/UX Design System: 岁月史书 (Book of Ages)

**文档日期**: 2026-04-03
**项目定位**: 个人热点时事记录工具，纯净数据底座。强调“极简”、“高效收录（一键入库）”、“阅读友好”和“脉络清晰（时间线）”。

本项目通过引入 `ui-ux-pro-max` 设计指导系统，确立了以下 UI/UX 风格规范，涵盖 Web 端与移动端（Mobile-First），用于指导后续的界面开发。

---

## 1. 核心设计理念 (Core Philosophy)

- **极简主义 (Minimalist Single Column)**：去除无关的导航干扰，使用大量的留白，提供专注的单列式阅读体验。
- **效率优先 (Efficiency-Driven)**：一切设计以提升“收录”与“检索”效率为目标。大号的排版、高对比度的 CTA（行动呼唤）按钮。
- **微交互体验 (Micro-interactions)**：在用户操作（如点击收录、划动归档、加载解析 URL）时，提供短暂（150-300ms）且流畅的视觉反馈，增加软件的“呼吸感”与“确定感”。

## 2. 色彩系统 (Color Strategy)

基于高效、克制、且带有一定科技感（适合数据底座）的理念，系统采用 **深青色 (Teal)** 为主色调，配以高对比度的 **橙色 (Orange)** 作为核心操作色。

| 角色 (Role) | 颜色值 (Hex) | 用途说明 |
|------|-----|-----|
| **Primary (主色)** | `#0D9488` (Teal 600) | 用于选中的标签、激活的菜单项、高亮文字 |
| **Secondary (次级色)** | `#14B8A6` (Teal 500) | 用于次级按钮、边框高亮、Timeline 的轴线 |
| **CTA (行动色)** | `#F97316` (Orange 500) | **仅用于最核心的操作**：如“一键收录 (Confirm)”、“保存事件” |
| **Background (背景)** | `#F0FDFA` (Teal 50) 或 纯白 | 用于应用的主背景，营造干净透气的环境 |
| **Text (文本)** | `#134E4A` (Teal 900) 或 深灰 | 用于正文、标题，确保阅读对比度 |

*备注：深色模式 (Dark Mode) 下，背景应转为 `#0F172A` (Slate 900)，文字转为近乎纯白 `#F8FAFC`，以保证极佳的护眼阅读体验。*

## 3. 字体排版 (Typography)

全站使用现代、中性、高度易读的无衬线字体体系，带来专业且克制的氛围。

- **全局字体 (Heading & Body)**: `Inter`
- **氛围词**: minimal, clean, swiss, functional, neutral, professional
- **字重配置**: 
  - `300` (辅助信息、日期)
  - `400` (标准正文)
  - `500` (小标题、按钮文本)
  - `600`/`700` (页面主标题、强调数据)

**CSS 引入**:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```
```css
/* TailwindCSS 配置 */
font-family: 'Inter', sans-serif;
```

## 4. 关键交互与视觉特效 (Key Effects & Interactions)

- **按钮与卡片悬停 (Hover)**: 提供小幅度的阴影增加或颜色加深（50-100ms 过渡），但**切忌**使用会导致排版位移的 Scale 缩放。
- **状态反馈 (Feedback)**: 
  - 表单提交（如 URL 抓取解析中）必须有明确的 Loading 状态（微型 Spinner）。
  - 成功/失败状态必须有短暂的成功动画或 Toast 提示。
- **手势交互 (Mobile 优先)**:
  - 针对“收件箱 (Inbox)”的卡片，推荐在移动端实现**左滑归档 (Archive)** / **右滑收录 (Confirm)** 的手势操作。
- **Cursor 规范**: 所有可点击的元素、卡片必须带有 `cursor-pointer`。

## 5. Web 端界面布局 (Web UI Layout)

- **布局结构**: 顶部吸顶导航（带全局搜索） + 中间单列主内容区（最大宽度限制为 `max-w-4xl`，保证长文本阅读体验）。
- **正式事件库 (Events List)**: 
  - 瀑布流或宽卡片列表。
  - 顶部显眼位置放置 `#F97316` 颜色的 **“+ 新建事件”** 按钮。
- **收件箱 (Inbox)**: 
  - 紧凑型列表，着重展示“标题”与“抓取来源”。
  - 每条记录侧边直接暴露 “收录” 与 “归档” 按钮，避免二次点击。
- **详情与时间线 (Detail & Timeline)**:
  - 左侧 70% 宽度展示正文与 Markdown 内容。
  - 右侧 30% 宽度展示 Timeline (竖向轴线) 与 Materials 附件区。

## 6. 移动端界面布局 (Mobile UX)

- **底部导航栏 (Bottom Tab Bar)**: 将核心路由（事件库、收件箱、搜索）下置，方便单手操作。
- **FAB 悬浮按钮**: 在“事件库”页面右下角常驻醒目的 FAB (Floating Action Button) 用于快速新建事件。
- **抽屉式详情**: 点击事件列表后，可采用平滑的 Push 动画进入详情页，或者使用底部弹出的半层 Drawer 快速预览，减少页面完全跳转带来的割裂感。
- **防遮挡设计**: 确保长列表在滚动到最底部时，不会被浮动的 Tab Bar 或 FAB 遮挡最后一条内容（增加 Bottom Padding）。

## 7. 反模式与防错清单 (Anti-patterns & Checklist)

**开发时必须避免的常见错误（Anti-patterns）：**
- ❌ **复杂的表单与入职流程**：“岁月史书”核心在于“快”，新建表单直接暴露输入框，避免多步 Wizard。
- ❌ **点击无反馈**：解析 URL 或保存时没有任何 Loading 提示，导致用户重复点击。
- ❌ **糟糕的文字对比度**：在 Light Mode 下使用了过浅的灰色（如 text-gray-400）作为正文。
- ❌ **把 Emoji 当作标准图标**：系统中所有的功能图标（如添加、时间、链接等）禁止使用表情符号，必须使用统一风格的 SVG 图标库（推荐 **Heroicons** 或 **Lucide**）。

**交付前走查清单 (Pre-Delivery Checklist)：**
- [ ] 所有交互元素已添加 `cursor-pointer` 和 150-300ms 的平滑 Hover 态。
- [ ] 图标完全使用 SVG (Heroicons/Lucide)，尺寸统一（如 `w-5 h-5`）。
- [ ] 浅色模式下文字对比度满足 4.5:1 (WCAG 标准)。
- [ ] 表单输入框具备关联的 `<label>`（而非仅仅依赖 placeholder）。
- [ ] 响应式适配验证通过：375px (Mobile), 768px (Tablet), 1024px (Desktop)。
- [ ] 收件箱的“一键收录”按钮面积足够大，且为高对比度色。