import { test } from "node:test";
import assert from "node:assert/strict";
import { cellsToPath, layoutLine } from "./logo.ts";

test("layoutLine: 文字幅は字形ごと、字間1マス、空白は字間込みで4マス空ける", () => {
  assert.equal(layoutLine("L").width, 7);
  assert.equal(layoutLine("LI").width, 7 + 1 + 6);
  assert.equal(layoutLine("L I").width, 7 + 4 + 6);
  // L は縦棒(2列×6行)+下の2行(7列×2行)
  assert.equal(layoutLine("L").cells.length, 12 + 14);
});

test("layoutLine: 小文字も大文字として扱い、未定義の文字は例外", () => {
  assert.deepEqual(layoutLine("limbus"), layoutLine("LIMBUS"));
  assert.throws(() => layoutLine("X"), /未定義/);
});

test("layoutLine: 全字形の行数と各行の長さがそろっている", () => {
  for (const ch of "ABILMNSTU") {
    const { cells } = layoutLine(ch);
    assert.ok(cells.every(([, y]) => y >= 0 && y < 8), ch);
  }
});

test("cellsToPath: マスごとに正方形を描く", () => {
  assert.equal(cellsToPath([[1, 2]], 10, 4, 6), "M14 26h10v10h-10z");
});
