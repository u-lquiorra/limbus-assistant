import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

// loader が import.meta.glob を使うため、Vite 経由で読み込む
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const seo = await server.ssrLoadModule("/src/seo.ts");
const { setEnglishMessages } = await server.ssrLoadModule("/src/i18n/text.ts");
const { readFile } = await import("node:fs/promises");
setEnglishMessages(JSON.parse(await readFile("src/i18n/messages.en.json", "utf8")));
await server.close();

test("英語版は日本語版と同じく検索エンジンに登録し、登録しないページの設定も引き継ぐ", () => {
  for (const path of ["/en", "/en/persona/0101", "/en/ego/0101", "/en/teams", "/en/bosses", "/en/glossary", "/en/character/yi-sang"]) {
    assert(!seo.pageMeta(path).noindex, path);
  }
  // 日本語版で登録しないページは、英語版でも登録しない
  assert(seo.pageMeta("/search").noindex);
  assert(seo.pageMeta("/en/search").noindex);
  assert(seo.pageMeta("/en/persona/9999").noindex);
});

test("英語版の静的 HTML の対象に、英語のスラッグの囚人ページが入る", () => {
  const routes: string[] = seo.prerenderRoutes();
  assert(routes.includes("/en/character/yi-sang"));
  assert(!routes.some((path) => /^\/en\/character\/%/.test(path)), "英語版に日本語名の囚人ページが残っている");
  // 日本語版の囚人ページの URL は変えない
  assert(routes.includes(`/character/${encodeURIComponent("イサン")}`));
});

test("英語版の囚人ページは、英語のタイトルと構造化データの英語版 URL を持つ", () => {
  const meta = seo.pageMeta("/en/character/yi-sang");
  assert.match(meta.title, /Yi Sang/);
  const data = JSON.stringify(seo.structuredData("/en/character/yi-sang", "https://limbus-assistant.com/og-image.png"));
  assert(data.includes("https://limbus-assistant.com/en/character/yi-sang/"), data.slice(0, 300));
  assert(!data.includes("/en/character/%"), "構造化データに日本語名の英語版 URL が残っている");
});
