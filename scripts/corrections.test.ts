// wiki誤記補正のテスト
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { applyCorrections, correctHtml, unusedCorrections, type Correction } from "./corrections.ts";

describe("correctHtml: 人格ページHTMLの置換", () => {
  const list = [{ code: "1015", from: "月下月刀", to: "月下青刀", reason: "誤記" }];

  test("対象コードのページだけ全箇所を置換する", () => {
    const r = correctHtml("<p>月下月刀が20</p><b>月下月刀</b>", "1015", list);
    assert.equal(r.html, "<p>月下青刀が20</p><b>月下青刀</b>");
    assert.deepEqual(r.unused, []);
    assert.equal(correctHtml("<p>月下月刀</p>", "1016", list).html, "<p>月下月刀</p>");
  });

  test("対象ページに誤記が無ければ未適用として返す(wiki側で修正済み)", () => {
    assert.deepEqual(correctHtml("<p>月下青刀</p>", "1015", list).unused, list);
  });
});

describe("applyCorrections: 囚人データの置換", () => {
  const byName: Correction = { code: "1004", name: "遊興", field: "condition", from: "保有", to: "共鳴", reason: "" };

  test("code・名前・項目が一致する要素だけを置換する", () => {
    const data = {
      passives: [
        { code: "1004", name: "遊興", condition: "保有", effect: "保有" },
        { code: "1004", name: "別のパッシブ", condition: "保有" },
        { code: "1005", name: "遊興", condition: "保有" },
      ],
    };
    const applied = applyCorrections(data, [byName]);
    assert.deepEqual(data.passives, [
      { code: "1004", name: "遊興", condition: "共鳴", effect: "保有" },
      { code: "1004", name: "別のパッシブ", condition: "保有" },
      { code: "1005", name: "遊興", condition: "保有" },
    ]);
    assert.equal(applied.get(byName), 1);
  });

  test("名前の改行は無視して照合し、子要素は親の code を引き継ぐ", () => {
    const c: Correction = { code: "0301", name: "正義の成敗", field: "effect", from: "終了", to: "勝利", reason: "" };
    const data = { code: "0301", passives: [{ name: "正義の\n成敗", effect: "マッチ終了時" }] };
    applyCorrections(data, [c]);
    assert.equal(data.passives[0].effect, "マッチ勝利時");
  });

  test("対象コードがあるのに当たらなかった補正だけを未適用とする", () => {
    const other: Correction = { ...byName, code: "0301" };
    const applied = applyCorrections({ passives: [{ code: "1004", name: "遊興", condition: "共鳴" }] }, [byName, other]);
    assert.deepEqual(unusedCorrections(applied, ["1004"]), [byName]);
  });
});
