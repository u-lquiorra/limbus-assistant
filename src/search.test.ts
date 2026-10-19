import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchText, searchEntries, type SearchEntry } from "./search.ts";

const entries: SearchEntry[] = [
  { kind: "persona", title: "LCB囚人", sub: "イサン・リンバスカンパニー", to: "/persona/1001", terms: ["1001", "破裂"] },
  { kind: "persona", title: "南部ツヴァイ協会6課", sub: "ホンル", to: "/persona/1002", terms: ["1002", "振動"] },
  { kind: "persona", title: "鴻園の君主", sub: "ホンル", to: "/persona/1003", terms: ["1003", "呼吸", "火傷"] },
  { kind: "team", title: "火傷編成", sub: "状態異常", to: "/teams/burn", terms: ["火傷", "振動"] },
  { kind: "glossary", title: "火傷", sub: "ターン終了時にダメージ", to: "/glossary/burn", terms: ["かしょう"] },
  { kind: "boss", title: "クローマー", sub: "3-22 最終戦", to: "/bosses/kromer", terms: ["K-02支部"] },
];

test("normalizeSearchText: 全角半角・大小文字・カタカナひらがなをそろえる", () => {
  assert.equal(normalizeSearchText("ＬＣＢ"), "lcb");
  assert.equal(normalizeSearchText("クローマー"), "くろーまー");
  assert.equal(normalizeSearchText("E.G.O"), "e.g.o");
});

test("searchEntries: 空の検索語は結果なし", () => {
  assert.deepEqual(searchEntries(entries, "  "), []);
});

test("searchEntries: タイトル完全一致のグループを先頭にし、補足語だけの一致は後ろに回す", () => {
  const groups = searchEntries(entries, "火傷");
  assert.deepEqual(groups.map((g) => g.kind), ["glossary", "team", "persona"]);
  assert.equal(groups[0].hits[0].score, 0);
  assert.equal(groups[1].hits[0].score, 1);
  assert.equal(groups[2].hits[0].entry.to, "/persona/1003");
  assert.equal(groups[2].hits[0].score, 3);
});

test("searchEntries: 複数語は AND で、補足(囚人名)とタイトルをまたいで一致する", () => {
  const groups = searchEntries(entries, "ホンル 君主");
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].hits.map((h) => h.entry.to), ["/persona/1003"]);
});

test("searchEntries: ひらがな・小文字でもカタカナ・英大文字のタイトルに一致する", () => {
  assert.equal(searchEntries(entries, "くろーまー")[0].hits[0].entry.to, "/bosses/kromer");
  assert.equal(searchEntries(entries, "lcb")[0].hits[0].entry.to, "/persona/1001");
});

test("searchEntries: 同じ一致度ではデータの並びを保つ", () => {
  const groups = searchEntries(entries, "振動");
  const persona = groups.find((g) => g.kind === "persona");
  assert.deepEqual(persona?.hits.map((h) => h.entry.to), ["/persona/1002"]);
  assert.deepEqual(groups.find((g) => g.kind === "team")?.hits.map((h) => h.entry.to), ["/teams/burn"]);
});
