import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTraitIndex, parseTraits } from "./trait-index.ts";

const index = JSON.parse(readFileSync(new URL("../src/data/persona-traits.json", import.meta.url), "utf-8")) as Record<string, string[]>;

test("特性キーワードの索引: 人格の詳細データと一致する(古ければ npm run traits:index で作り直す)", () => {
  assert.deepEqual(index, buildTraitIndex(), "索引が古い。npm run traits:index で作り直す");
  assert(Object.keys(index).length > 150, "全人格分を読めている");
  // 実データ: 剣契の人格(1002)と、蜘蛛の巣の人格(1015)
  assert(index["1002"].includes("剣契"));
  assert(index["1015"].includes("蜘蛛の巣"));
});

test("特性キーワードの索引: 半角カンマと読点の両方で区切り、空白・空要素・重複を除く", () => {
  assert.deepEqual(parseTraits("技術解放連合,E.G.O装備"), ["技術解放連合", "E.G.O装備"]);
  assert.deepEqual(parseTraits(" 組織、剣契 ,,剣契"), ["組織", "剣契"]);
  assert.deepEqual(parseTraits(""), []);
  assert.deepEqual(parseTraits(undefined), []);
});
