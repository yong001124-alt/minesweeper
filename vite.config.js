import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 相对 base：兼容 GitHub Pages 子路径（/minesweeper/）与本地根路径调试
  base: './',
  plugins: [react()],
  server: {
    host: true,   // 监听 0.0.0.0，局域网可访问
    port: 5175,
  },
})
