import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";

// loader が import.meta.glob を使うため、Vite 経由で読み込む
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const tf = await server.ssrLoadModule("/src/traitFilters.ts");
const loader = await server.ssrLoadModule("/src/data/loader.ts");
const { siteSearchEntries } = await server.ssrLoadModule("/src/siteSearch.ts");
const { searchEntries } = await server.ssrLoadModule("/src/search.ts");
await server.close();

const traits = JSON.parse(readFileSync(new URL("./data/persona-traits.json", import.meta.url), "utf-8")) as Record<string, string[]>;
const codes = (list: { code: string }[]) => list.map((s) => s.code).sort();

test("traitFilters: 選べる所属は、どれも実在する人格の特性キーワードで、重複しない", () => {
  assert.equal(new Set(tf.TRAIT_FILTERS).size, tf.TRAIT_FILTERS.length);
  for (const trait of tf.TRAIT_FILTERS) {
    assert(Object.values(traits).some((list) => list.includes(trait)), `${trait}: その特性キーワードを持つ人格がいない(表記ゆれ?)`);
  }
  // 範囲が広く条件に使われないものは選べない
  for (const broad of ["フィクサー", "E.G.O装備", "組織", "指"]) assert(!tf.TRAIT_FILTERS.includes(broad), broad);
});

test("traitFilters: 所属だけで絞ると、その特性キーワードを持つ人格を全て返す", () => {
  assert.deepEqual(tf.personasMatching([], []), [], "何も選んでいなければ空");
  for (const trait of tf.TRAIT_FILTERS) {
    const expected = Object.entries(traits)
      .filter(([, list]) => list.includes(trait))
      .map(([code]) => code)
      .sort();
    assert.deepEqual(codes(tf.personasMatching([], [trait])), expected, trait);
  }
  // 実データ: 蜘蛛の巣は10人格前後。所属(affiliation)の「(蜘蛛の巣)」1人格だけにならない
  assert(tf.personasMatching([], ["蜘蛛の巣"]).length >= 10);
});

test("traitFilters: キーワードと所属を組み合わせると、両方を全て持つ人格だけを返す(AND)", () => {
  for (const keyword of ["火傷", "出血", "呼吸"]) {
    const byKeyword = codes(loader.personasWithAllKeywords([keyword]));
    for (const trait of tf.TRAIT_FILTERS) {
      const both = codes(tf.personasMatching([keyword], [trait]));
      const expected = byKeyword.filter((c) => traits[c]?.includes(trait));
      assert.deepEqual(both, expected, `${keyword}＋${trait}`);
    }
  }
  const two = codes(tf.personasMatching([], ["中指", "薬指"]));
  assert(two.every((c) => traits[c].includes("中指") && traits[c].includes("薬指")), "所属同士も AND");
});

test("traitFilters: URL パラメータは選べない所属と重複を捨て、一覧の並びにそろえる", () => {
  assert.deepEqual(tf.parseTraitFilter(null), []);
  assert.deepEqual(tf.parseTraitFilter(""), []);
  assert.deepEqual(tf.parseTraitFilter("剣契,黒雲会,剣契, フィクサー ,<script>"), ["黒雲会", "剣契"]);
  assert.equal(tf.formatTraitFilter(["剣契", "親指"]), "親指,剣契");
  assert.equal(tf.formatTraitFilter([]), "");
});

test("traitFilters: 導線のパスを開くと、その所属を選んだ状態になる", () => {
  assert.equal(tf.traitFilterPath([]), "/keywords");
  assert.equal(tf.traitFilterPath(["フィクサー"]), "/keywords");
  for (const trait of tf.TRAIT_FILTERS) {
    const url = new URL(tf.traitFilterPath([trait]), "https://x.test");
    assert.equal(url.pathname, "/keywords");
    assert.deepEqual(tf.parseTraitFilter(url.searchParams.get("trait")), [trait], trait);
  }
});

test("サイト内検索: 所属名で、その所属を選んだ絞り込みが見つかる", () => {
  const entries = siteSearchEntries();
  const found = (query: string, to: string) =>
    searchEntries(entries, query).some((g: { hits: { entry: { to: string } }[] }) => g.hits.some((h) => h.entry.to === to));
  for (const trait of ["蜘蛛の巣", "剣契", "ル・ルージュ"]) assert(found(trait, tf.traitFilterPath([trait])), trait);
  assert(found("所属", "/keywords"), "「所属」でキーワード別人格一覧");
});
