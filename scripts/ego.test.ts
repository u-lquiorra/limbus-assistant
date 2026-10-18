// E.G.O パーサーのテスト。フィクスチャは scripts/make-ego-fixtures.ts で wiki のキャッシュから作成したもの。
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join } from "path";
import { parseEgoList, parseEgoPage } from "./ego.ts";
import { splitStageMarks, stripStageMarks } from "../src/egoStage.ts";

const fixture = (name: string) => readFileSync(join(import.meta.dirname, "__fixtures__", name), "utf-8");
const page = (code: string) => parseEgoPage(fixture(`ego-${code}.html`), code).detail;

describe("parseEgoPage: 基本情報", () => {
  test("初期E.G.O: ルビ・ランク・コスト・耐性を読む(元の幻想体の行は無い)", () => {
    const d = page("0101");
    assert.equal(d.ruby, "オガムド");
    assert.equal(d.origin, undefined);
    assert.equal(d.info.find((i) => i.label === "危険ランク")?.value, "ZAYIN");
    assert.deepEqual(d.cost, [
      { sin: "憤怒", count: 1 },
      { sin: "怠惰", count: 3 },
    ]);
    assert.equal(d.resistance.length, 7);
    assert.equal(d.resistance.find((r) => r.sin === "憂鬱")?.value, "脆弱 [×2]");
  });

  test("元になった幻想体・コラボ元を読む", () => {
    assert.equal(page("0108").origin, "羅生蝶");
    assert.equal(page("0209").origin, "ケルシー(アークナイツ)");
  });

  test("覚醒と侵蝕で攻撃タイプが違うE.G.Oはスキルごとに持つ", () => {
    const d = page("0209");
    assert.equal(d.skills.find((s) => s.kind === "覚醒")?.attackType, "貫通");
    assert.equal(d.skills.find((s) => s.kind === "侵蝕")?.attackType, "斬撃");
  });
});

describe("parseEgoPage: スキル", () => {
  test("侵蝕スキルが無いE.G.Oは覚醒スキルだけ", () => {
    assert.deepEqual(page("0101").skills.map((s) => s.kind), ["覚醒"]);
    assert.deepEqual(page("0209").skills.map((s) => s.kind), ["覚醒", "侵蝕"]);
  });

  test("威力などの数値を6項目読み、解析段階で変わる値は印付きで残す", () => {
    const s = page("0101").skills[0];
    assert.deepEqual(s.stats.map((x) => x.label), ["マッチ威力", "基本威力", "コイン威力", "コイン個数", "スキルレベル", "攻撃加重値"]);
    assert.equal(s.stats[1].value, "14\n〘Ⅲ:18〙");
  });

  test("効果文の解析段階の印: Ⅲ=crimson, Ⅳ=mediumspringgreen", () => {
    const s = page("0209").skills[0];
    assert.match(s.effect, /最終威力\+1\/〘Ⅲ:2〙\/〘Ⅳ:3〙/);
  });

  test("コイン行の番号・字下げは印の外に出す", () => {
    const lines = page("0209").skills[0].effect.split("\n");
    assert.ok(lines.some((l) => l.startsWith("Ⅰ[的中時]破裂1/")));
    assert.ok(lines.some((l) => l.startsWith("　[的中時]火傷1/")));
    assert.ok(lines.every((l) => !/^〘(Ⅲ|Ⅳ):[ⅠⅡⅢⅣ]/.test(l)));
  });

  test("元から破壊不能なコインを印を除いて判定する", () => {
    assert.deepEqual(page("0108").skills[0].unbreakableCoins, [1, 2, 3, 4]);
    assert.deepEqual(page("0209").skills[1].unbreakableCoins, [3, 4]);
    assert.equal(page("0101").skills[0].unbreakableCoins, undefined);
  });

  test("覚醒スキルが複数あるE.G.Oは、名前付きのスキルとして全部読む", () => {
    const d = page("0608");
    assert.deepEqual(d.skills.map((s) => `${s.kind}:${s.name ?? ""}`), ["覚醒:汚血泣涙-始", "覚醒:汚血泣涙-終", "侵蝕:"]);
    assert.ok(d.skills.every((s) => s.stats.length === 6 && s.effect));
    assert.equal(d.resistance.length, 7);
    assert.equal(d.passives[0].name, "泣涙");
  });

  test("用語ツールチップを集める", () => {
    const terms = page("0101").skills[0].keywords.map((k) => k.term);
    assert.ok(terms.includes("クイック"));
  });
});

describe("parseEgoPage: パッシブ・専用効果", () => {
  test("パッシブ名・効果・取得段階の注記", () => {
    const p = page("0101").passives[0];
    assert.equal(p.name, "沈黙");
    assert.match(p.effect, /※解析段階Ⅱで取得/);
  });

  test("専用効果表の用語を読む", () => {
    assert.deepEqual(page("0108").specialEffects.map((k) => k.term), ["割れた世界"]);
    assert.deepEqual(page("0209").specialEffects.map((k) => k.term), ["硬化バリア"]);
  });
});

describe("parseEgoList: 囚人ページの E.G.O 一覧", () => {
  const list = parseEgoList(fixture("ego-list-ファウスト.html"), "ファウスト");

  test("全件を読み、コード順の重複はない", () => {
    assert.equal(list.length, 11);
    assert.equal(new Set(list.map((e) => e.code)).size, 11);
  });

  test("ランク・罪悪属性・攻撃タイプ・個別ページURL・備考", () => {
    const e = list.find((x) => x.code === "0209");
    assert.ok(e);
    assert.equal(e.name, "指令：メルトダウン");
    assert.equal(e.rank, "HE");
    assert.equal(e.sin, "暴食");
    assert.equal(e.attackTypes, "貫斬");
    assert.equal(e.note, "コラボイベント限定");
    assert.match(decodeURIComponent(e.wikiUrl ?? ""), /\/lcbwiki\/E\.G\.O\/ファウスト\/指令：メルトダウン$/);
  });

  test("必要資源は罪悪属性ごと、耐性は倍率", () => {
    const e = list.find((x) => x.code === "0209");
    assert.equal(e?.cost["暴食"], "5");
    assert.equal(e?.cost["憤怒"], "");
    assert.equal(e?.resistance["色欲"], "2.0");
    assert.equal(e?.resistance["暴食"], "0.5");
  });
});

test("stripStageMarks: 印を外して元の文にする", () => {
  assert.equal(stripStageMarks("火傷1/〘Ⅲ:2〙/〘Ⅳ:3〙を付与"), "火傷1/2/3を付与");
});

test("splitStageMarks: 印の内外を段階付きの断片に分ける", () => {
  assert.deepEqual(splitStageMarks("火傷1/〘Ⅲ:2〙/〘Ⅳ:3〙を付与"), [
    { text: "火傷1/" },
    { text: "2", stage: "Ⅲ" },
    { text: "/" },
    { text: "3", stage: "Ⅳ" },
    { text: "を付与" },
  ]);
});
