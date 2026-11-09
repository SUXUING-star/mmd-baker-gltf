import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/mmd-motion-baker-gltf/',
  build: {
    // 1. 3D 引擎项目（Three.js 本身压缩后约 650kB），将警告阈值提升至 1500kB (1.5MB)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 2. 统一将 3D 引擎及 VRM 依赖抽离为独立的 3D Chunk (利用浏览器长效缓存)
          if (id.includes('node_modules/three') || id.includes('node_modules/@pixiv')) {
            return 'three-vendor'
          }
          // 3. 将 React 框架抽出独立 Chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
        }
      }
    }
  }
})
