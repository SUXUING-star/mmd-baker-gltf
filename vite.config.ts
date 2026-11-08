import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // 替换为你的仓库名称
  base: '/mmd-motion-baker-gltf/'
})
