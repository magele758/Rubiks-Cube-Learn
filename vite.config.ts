import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base 指向项目站点子路径，使资源在 magele758.github.io/Rubiks-Cube-Learn/ 下正确加载
export default defineConfig({
  base: '/Rubiks-Cube-Learn/',
  plugins: [react()],
})
