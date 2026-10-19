import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { legacyHashPath } from './legacyHash.ts'
import { preloadRoute } from './preload.ts'

// basename は末尾の / を除いた公開先のパス(例: /limbus-assistant)
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

// 末尾の / と URL エンコードの違いを無視してパスを比べる
function samePath(a: string | undefined, b: string): boolean {
  const norm = (p: string) => decodeURIComponent(p).replace(/\/+$/, '') || '/'
  return a !== undefined && norm(a) === norm(b)
}

async function start() {
  const container = document.getElementById('root')!

  // 以前の URL(#/persona/1001)で開かれたら、通常のパスへ置き換える。外部に貼られた古いリンクを壊さないため
  const legacy = legacyHashPath(window.location.hash)
  if (legacy) window.history.replaceState(null, '', basename + legacy)

  const app = (
    <StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </StrictMode>
  )

  // 静的 HTML が今のパスのものなら引き継ぐ(hydrate)。古い URL から来たとき、検索語(?q=)付きのとき、
  // 別ページの HTML が返ったとき(配信側の転送など)は中身が食い違うので作り直す
  const path = window.location.pathname.slice(basename.length) || '/'
  if (container.hasChildNodes() && !legacy && !window.location.search && samePath(container.dataset.path, path)) {
    // 静的 HTML と同じ内容を描くため、ページの遅延データを先に読み込んでから引き継ぐ
    await preloadRoute(path)
    hydrateRoot(container, app)
  } else {
    container.replaceChildren()
    createRoot(container).render(app)
  }
}

start().catch((e: unknown) => console.error('画面の初期化に失敗しました', e))
