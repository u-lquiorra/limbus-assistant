import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";

// loader が import.meta.glob を使うため、Vite 経由で読み込む
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const kp = await server.ssrLoadModule("/src/keywordPages.ts");
const loader = await server.ssrLoadModule("/src/data/loader.ts");
const seo = await server.ssrLoadModule("/src/seo.ts");
const { getGlossaryTerm } = await server.ssrLoadModule("/src/glossary.ts");
await server.close();

const personaKeywords = JSON.parse(readFileSync(new URL("./data/persona-keywords.json", import.meta.url), "utf-8")) as Record<
  string,
  { keywords: string[] }
>;

test("keywordPages: 7キーワードすべてにページがあり、同じキーワードの編成と用語がある", () => {
  assert.deepEqual(
    kp.KEYWORD_PAGES.map((p: { keyword: string }) => p.keyword),
    ["火傷", "出血", "振動", "破裂", "沈潜", "呼吸", "充電"]
  );
  for (const page of kp.KEYWORD_PAGES) {
    const team = loader.getTeam(page.id);
    assert(team, `${page.keyword}: 編成 ${page.id} が無い`);
    assert(team.keywords.includes(page.keyword), `${page.keyword}: 編成 ${page.id} のキーワードが違う`);
    assert.equal(getGlossaryTerm(page.glossaryId)?.name, page.keyword, `${page.keyword}: 用語 ${page.glossaryId} が違う`);
    assert.equal(kp.keywordPageForGlossary(page.glossaryId), page);
  }
});

test("keywordPages: 一覧の人格は対応キーワード表で★の付いた人格と一致する", () => {
  for (const page of kp.KEYWORD_PAGES) {
    const listed = loader.keywordPersonas(page.keyword).map((s: { code: string }) => s.code).sort();
    const expected = Object.entries(personaKeywords)
      .filter(([, v]) => v.keywords.includes(page.keyword))
      .map(([code]) => code)
      .sort();
    assert.deepEqual(listed, expected, page.keyword);
  }
});

test("keywordPages: 静的 HTML の対象に入り、検索結果に載るページ情報を持つ", () => {
  const routes: string[] = seo.prerenderRoutes();
  assert(routes.includes("/keywords"));
  for (const page of kp.KEYWORD_PAGES) {
    const path = `/keywords/${page.id}`;
    assert(routes.includes(path), path);
    const meta = seo.pageMeta(path);
    assert(!meta.noindex, path);
    assert(meta.title.includes(`${page.keyword}人格一覧`), path);
    assert.deepEqual(
      seo.breadcrumbs(path).map((c: { path: string }) => c.path),
      ["/", "/keywords", path]
    );
  }
  assert(seo.pageMeta("/keywords/unknown").noindex);
});
