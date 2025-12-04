import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  root: '.',
  // 让打包后的 index.html 使用相对路径加载资源, 方便 Electron 以 file:// 协议直接打开
  base: './',
  build: {
    outDir: 'dist-web',
  },
});
