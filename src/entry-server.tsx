// 静的 HTML の生成用の入口。scripts/prerender.ts が SSR ビルドした結果を読み込んで使う
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import App from "./App";
import { preloadRoute } from "./preload";

export { canonicalUrl, pageMeta, prerenderRoutes, SITE_URL } from "./seo";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

/** パス(basename を除く)のページを、遅延データを読み込んでから HTML 文字列にする */
export async function render(pathname: string): Promise<string> {
  await preloadRoute(pathname);
  return renderToString(
    <StrictMode>
      <StaticRouter basename={basename} location={basename + pathname}>
        <App />
      </StaticRouter>
    </StrictMode>
  );
}
