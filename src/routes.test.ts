import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { matchPath } from "react-router-dom";

// ページは import() で遅延読み込みするため、Vite 経由で読み込む
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { APP_ROUTES, preloadPage } = await server.ssrLoadModule("/src/routes.tsx");
const { prerenderRoutes } = await server.ssrLoadModule("/src/seo.ts");

test("routes: 静的 HTML を書き出す全ページに対応するルートがあり、ページのコードを先読みできる", async () => {
  try {
    for (const path of prerenderRoutes() as string[]) {
      const route = APP_ROUTES.find((r: { path: string }) => matchPath(r.path, path));
      assert(route, `ルートが無い: ${path}`);
      // トップ以外は遅延読み込み。先読みしておかないと、静的 HTML の引き継ぎで待機表示と食い違う
      assert.equal(path === "/", !route.page, `遅延読み込みの指定: ${path}`);
    }
    await Promise.all(APP_ROUTES.map((r: { path: string }) => preloadPage(r.path.replace(/:\w+/, "x"))));
  } finally {
    await server.close();
  }
});
