import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({ jsxImportSource: '@limbus/i18n' }), {
    name: 'shared-localization-runtime',
    enforce: 'post',
    config(config) {
      // Reactプラグインが追加する強制最適化も外す。excludeだけではincludeが優先される。
      if (config.optimizeDeps?.include) {
        config.optimizeDeps.include = config.optimizeDeps.include.filter(id => !id.startsWith('@limbus/i18n/'))
      }
    },
  }],
  resolve: { alias: { '@limbus/i18n': fileURLToPath(new URL('./src/i18n', import.meta.url)) } },
  // アプリと同じ翻訳データ・Contextを共有するため、翻訳用runtimeは事前バンドルしない。
  optimizeDeps: { exclude: ['@limbus/i18n/jsx-runtime', '@limbus/i18n/jsx-dev-runtime'] },
  // 独自ドメイン(limbus-assistant.com)の直下で配信する。通常のパス(/persona/1001)で配信するため、相対パスではなく絶対パスにする
  base: "/",
  // 静的 HTML の生成(scripts/prerender.ts)で、ページごとの CSS・JS のファイル名を引くために出力する
  build: { manifest: true },
})
