// 静的 HTML の生成用の入口。scripts/prerender.ts が SSR ビルドした結果を読み込んで使う
import { StrictMode } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import App from "./App";
import SiteLogo from "./components/SiteLogo";
import { preloadRoute } from "./preload";
import { peekEgoGuide, peekGuide, peekTeamGuide } from "./data/loader";
import { structuredData } from "./seo";
import { jsonLdScript } from "./jsonLd";

export { canonicalUrl, lastModified, pageImage, pageMeta, prerenderRoutes, SITE_URL } from "./seo";

/** ページの構造化データを <script> タグの文字列で返す。render の後に呼ぶ(ガイドの更新日を先読み結果から取るため) */
export function structuredDataTags(pathname: string, ogImage: string): string {
  const [, kind, raw] = pathname.split("/");
  const id = raw ? decodeURIComponent(raw) : "";
  const guide = kind === "persona" ? peekGuide(id) : kind === "ego" ? peekEgoGuide(id) : kind === "teams" ? peekTeamGuide(id) : undefined;
  return structuredData(pathname, ogImage, guide?.meta.updated).map(jsonLdScript).join("\n    ");
}

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

/** OGP 画像用に、トップと同じ2行のロゴを SVG 文字列で返す(PNG への変換は prerender 側で行う) */
export function logoSvg(): string {
  return renderToStaticMarkup(<SiteLogo lines={["LIMBUS", "ASSISTANT"]} />);
}
