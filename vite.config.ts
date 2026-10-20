import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 独自ドメイン(limbus-assistant.com)の直下で配信する。通常のパス(/persona/1001)で配信するため、相対パスではなく絶対パスにする
  base: "/",
})
