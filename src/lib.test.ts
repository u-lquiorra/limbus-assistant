import { test } from "node:test";
import assert from "node:assert/strict";
import { describeSinSkill, resistanceTone } from "./lib.ts";

test("describeSinSkill: 罪悪属性ごとのスキル枚数の表記", () => {
  assert.equal(describeSinSkill("3"), "3枚");
  assert.equal(describeSinSkill("5"), "5枚");
  assert.equal(describeSinSkill("2防"), "2枚+防御");
  assert.equal(describeSinSkill("1反"), "1枚+反撃");
  assert.equal(describeSinSkill("3避"), "3枚+回避");
  assert.equal(describeSinSkill("反"), "反撃");
  assert.equal(describeSinSkill("特"), "特殊スキル");
  assert.equal(describeSinSkill(""), undefined);
  assert.equal(describeSinSkill("想定外"), "想定外");
});

test("resistanceTone: 倍率から弱点/耐性を判定", () => {
  assert.equal(resistanceTone("2.0"), "weak");
  assert.equal(resistanceTone("0.5"), "resist");
  assert.equal(resistanceTone("1"), "normal");
  assert.equal(resistanceTone(""), "normal");
});
