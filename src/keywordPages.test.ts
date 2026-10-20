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

test("keywordPages: 複数キーワードの絞り込みは、選んだキーワードを全て持つ人格だけを返す(AND)", () => {
  const codesWith = (keywords: string[]) =>
    Object.entries(personaKeywords)
      .filter(([, v]) => keywords.every((k) => v.keywords.includes(k)))
      .map(([code]) => code)
      .sort();
  const listed = (keywords: string[]) => loader.personasWithAllKeywords(keywords).map((s: { code: string }) => s.code).sort();
  assert.deepEqual(loader.personasWithAllKeywords([]), [], "何も選んでいなければ空");
  for (const a of kp.KEYWORD_PAGES) {
    assert.deepEqual(listed([a.keyword]), codesWith([a.keyword]), a.keyword);
    for (const b of kp.KEYWORD_PAGES) {
      if (a === b) continue;
      const both = listed([a.keyword, b.keyword]);
      assert.deepEqual(both, codesWith([a.keyword, b.keyword]), `${a.keyword}＋${b.keyword}`);
      assert(both.length <= listed([a.keyword]).length, "条件を足すと増えない");
    }
  }
  // 実データに2キーワードの組み合わせがある(出血＋呼吸の 1002 など)
  assert(listed(["出血", "呼吸"]).includes("1002"));
});

test("keywordPages: 絞り込みの URL パラメータは知らない ID と重複を捨て、表の列順にそろえる", () => {
  const ids = (param: string | null) => kp.parseKeywordFilter(param).map((p: { id: string }) => p.id);
  assert.deepEqual(ids(null), []);
  assert.deepEqual(ids(""), []);
  assert.deepEqual(ids("bleed,burn,bleed, unknown ,<script>"), ["burn", "bleed"]);
  assert.equal(kp.formatKeywordFilter(kp.parseKeywordFilter("charge,burn")), "burn,charge");
  assert.equal(kp.formatKeywordFilter([]), "");
});

test("keywordPages: 各ページからの導線は、キーワードを選んだ状態の絞り込みを開く", () => {
  assert.equal(kp.keywordFilterPath(), "/keywords");
  assert.equal(kp.keywordFilterPath([]), "/keywords");
  assert.equal(kp.keywordFilterPath(["呼吸", "出血"]), "/keywords?kw=bleed,breath");
  assert.equal(kp.keywordFilterPath(["未知"]), "/keywords");
  // 人格ページの導線: 公式キーワードをそのまま渡すと、その人格自身が絞り込み結果に入る
  for (const [code, { keywords }] of Object.entries(personaKeywords)) {
    assert.deepEqual(loader.keywordsOfPersona(code), keywords);
    const selected = kp.parseKeywordFilter(new URL(kp.keywordFilterPath(keywords), "https://x.test").searchParams.get("kw"));
    if (!keywords.length) continue;
    assert(
      loader.personasWithAllKeywords(selected.map((p: { keyword: string }) => p.keyword)).some((s: { code: string }) => s.code === code),
      code
    );
  }
});
