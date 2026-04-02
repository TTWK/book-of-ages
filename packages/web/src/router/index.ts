/**
 * 路由配置
 */

import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'inbox',
    component: () => import('../views/InboxView.vue'),
    meta: { title: '收件箱' },
  },
  {
    path: '/events',
    name: 'events',
    component: () => import('../views/EventsView.vue'),
    meta: { title: '事件库' },
  },
  {
    path: '/events/:id',
    name: 'event-detail',
    component: () => import('../views/EventDetailView.vue'),
    meta: { title: '事件详情' },
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('../views/TagsView.vue'),
    meta: { title: '标签' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../views/SearchView.vue'),
    meta: { title: '搜索' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: '设置' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫：设置页面标题
router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '岁月史书'} - Book of Ages`;
  next();
});

export default router;
