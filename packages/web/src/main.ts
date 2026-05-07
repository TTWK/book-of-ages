import { createApp } from 'vue';
import { createPinia } from 'pinia';
import naive from 'naive-ui';
import App from './App.vue';
import router from './router';
import './style.css';

// Workaround: Edge 浏览器在页面隐藏时调用 history.replaceState 会触发窗口激活，
// 导致最小化后立即弹回。Vue Router 4.6+ 在 visibilitychange 中保存滚动位置时会
// 调用 replaceState，此处在页面不可见时跳过该调用以规避 Edge 的 bug。
const originalReplaceState = history.replaceState.bind(history);
history.replaceState = function (state: any, title: string, url?: string | URL | null) {
  if (document.visibilityState === 'hidden') return;
  originalReplaceState(state, title, url);
};

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(naive);

app.mount('#app');
