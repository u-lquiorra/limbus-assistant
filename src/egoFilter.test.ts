import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { egoCostSins, egoFilterPath, filterEgosBySins, formatSinFilter, parseSinFilter, SIN_IDS } from "./egoFilter.ts";
import { activeNavItem } from "./nav.ts";
import { SIN_ORDER } from "./sinColors.ts";
import type { EgoSummary } from "./types.ts";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf-8"));
const egos: EgoSummary[] = (read("./data/characters.json") as { name: string }[]).flatMap(
  (c) => (read(`./data/${c.name}.json`) as { egos?: EgoSummary[] }).egos ?? []
);

const ego = (code: string, cost: Record<string, string>): EgoSummary =>
  ({ code, name: code, character: "", rank: "ZAYIN", attackTypes: "", cost, resistance: {}, note: "" }) as EgoSummary;

test("egoFilter: 必要資源は罪悪属性の並びで、不要な属性(空文字・0)を除く", () => {
  assert.deepEqual(egoCostSins(ego("a", { 傲慢: "2", 憤怒: "1", 色欲: "", 怠惰: "0" })), ["憤怒", "傲慢"]);
});

test("egoFilter: 選んだ資源だけで使える E.G.O を返す(必要資源が選んだ属性の範囲に収まるもの)", () => {
  const list = [ego("wrath", { 憤怒: "3" }), ego("wrath-pride", { 憤怒: "1", 傲慢: "2" }), ego("wrath-lust", { 憤怒: "2", 色欲: "1" })];
  const codes = (sins: string[]) => filterEgosBySins(list, sins).map((e) => e.code);
  assert.deepEqual(codes([]), ["wrath", "wrath-pride", "wrath-lust"], "何も選ばなければ全件");
  assert.deepEqual(codes(["憤怒"]), ["wrath"], "ほかの資源も要る E.G.O は出さない");
  assert.deepEqual(codes(["憤怒", "傲慢"]), ["wrath", "wrath-pride"], "選んだ属性の一部だけを使う E.G.O も出す");
  assert.deepEqual(codes(["傲慢"]), []);
});

test("egoFilter: 実データの全 E.G.O は、自分の必要資源を全て選べば必ず出て、属性を足しても減らない", () => {
  assert(egos.length > 100, "E.G.O データを読めている");
  for (const e of egos) {
    const sins = egoCostSins(e);
    assert(sins.length > 0, `${e.code}: 必要資源がある`);
    assert(filterEgosBySins(egos, sins).includes(e), e.code);
  }
  for (const sin of SIN_ORDER) {
    const base = filterEgosBySins(egos, [sin]);
    for (const other of SIN_ORDER) {
      if (other === sin) continue;
      const wider = filterEgosBySins(egos, [sin, other]);
      assert(base.every((e) => wider.includes(e)), `${sin}＋${other}`);
    }
  }
  assert.equal(filterEgosBySins(egos, [...SIN_ORDER]).length, egos.length, "全属性を選べば全件");
});

test("egoFilter: URL パラメータは知らない ID と重複を捨て、罪悪属性の並びにそろえる", () => {
  assert.equal(new Set(Object.values(SIN_IDS)).size, SIN_ORDER.length);
  assert.deepEqual(parseSinFilter(null), []);
  assert.deepEqual(parseSinFilter("pride,wrath,pride, unknown ,<script>"), ["憤怒", "傲慢"]);
  assert.equal(formatSinFilter(["傲慢", "憤怒"]), "wrath,pride");
  assert.equal(egoFilterPath(), "/egos");
  assert.equal(egoFilterPath(["嫉妬", "憤怒"]), "/egos?sin=wrath,envy");
  assert.deepEqual(parseSinFilter(new URL(egoFilterPath(["憂鬱", "色欲"]), "https://x.test").searchParams.get("sin")), ["色欲", "憂鬱"]);
});

test("egoFilter: E.G.O 一覧は「囚人一覧」をナビの選択中にする", () => {
  assert.equal(activeNavItem("/egos"), "/");
  assert.equal(activeNavItem("/egos/"), "/");
});
