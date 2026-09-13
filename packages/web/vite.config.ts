import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // naive-ui 组件按需自动导入（模板中的 n-* 组件），替代全量注册以减小包体
    Components({ resolvers: [NaiveUiResolver()], dts: 'src/components.d.ts' }),
  ],
  server: {
    proxy: {
      // 开发环境同源代理：前端请求 /api、/uploads 时转发到本地后端
      // 生产环境由 nginx 承担同样的反代职责
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
