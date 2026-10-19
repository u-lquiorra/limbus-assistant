import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages のプロジェクトサブパス。通常のパス(/persona/1001)で配信するため、相対パスではなく絶対パスにする
  base: "/limbus-assistant/",
})
