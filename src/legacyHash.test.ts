import { test } from "node:test";
import assert from "node:assert/strict";
import { legacyHashPath } from "./legacyHash.ts";

test("legacyHashPath: 旧形式の #/パス を通常のパスにする", () => {
  assert.equal(legacyHashPath("#/persona/1001"), "/persona/1001");
  assert.equal(legacyHashPath("#/"), "/");
  assert.equal(legacyHashPath("#/search?q=%E7%81%AB"), "/search?q=%E7%81%AB");
});

test("legacyHashPath: 旧形式内のページ内リンクは残す", () => {
  assert.equal(legacyHashPath("#/bosses/ricardo#strategy"), "/bosses/ricardo#strategy");
});

test("legacyHashPath: ページ内リンクだけの hash や空は対象外", () => {
  assert.equal(legacyHashPath("#strategy"), undefined);
  assert.equal(legacyHashPath(""), undefined);
});
