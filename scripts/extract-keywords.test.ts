// 人格ページ「対応キーワード表」からの公式キーワード抽出テスト
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractKeywords } from "./extract-keywords.ts";

// 実際のページと同じ並び: 番号・アイコン・人格・囚人・実装年月日・キーワード7列(火傷〜充電)・数
const row = (code: string, marks: string[]) =>
  `<tr><td>${code}</td><td></td><td>人格</td><td>囚人</td><td>26/06/25</td>${marks.map((m) => `<td>${m}</td>`).join("")}<td>2</td></tr>`;
const page = (rows: string) =>
  `<html><body><table><thead><tr><td colspan="7">対応キーワード*21</td></tr></thead>${rows}</table></body></html>`;

test("extractKeywords: ★の列をキーワードとして返す", () => {
  const html = page(row("0916", ["★", "", "★", "", "", "", ""]));
  assert.deepEqual(extractKeywords(html, "0916"), { keywords: ["火傷", "振動"] });
});

test("extractKeywords: 「特」の列は E.G.O 由来として分けて返す", () => {
  const html = page(row("0508", ["", "特*28", "", "", "", "★", ""]));
  assert.deepEqual(extractKeywords(html, "0508"), { keywords: ["呼吸"], viaEgo: ["出血"] });
});

test("extractKeywords: 表や該当行が無ければ null", () => {
  assert.equal(extractKeywords("<html><body><table><tr><td>0616</td></tr></table></body></html>", "0616"), null);
  assert.equal(extractKeywords(page(row("0916", ["★", "", "", "", "", "", ""])), "0101"), null);
});
