// 人格ページパーサーのテスト。フィクスチャは scripts/make-fixtures.ts で wiki のキャッシュから作成したもの。
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join } from "path";
import {
  classifySlot,
  inherentUnbreakable,
  parsePersonaPage,
  unbreakableByEffect,
} from "./persona.ts";
import type { PersonaDetail, SkillDetail } from "../src/types.ts";

function parseFixture(code: string): PersonaDetail {
  const html = readFileSync(join(import.meta.dirname, "__fixtures__", `${code}.html`), "utf-8");
  return parsePersonaPage(html, code);
}

// スキルを「枠・特殊・名前」の要約にして比較しやすくする
function slots(d: PersonaDetail): string[] {
  return d.skills.map((s) => `${s.slot}${s.special ? "(特殊)" : ""} ${s.name.replace(/\s+/g, " ")}`);
}

function skillByName(d: PersonaDetail, name: string): SkillDetail {
  const s = d.skills.find((x) => x.name.replace(/\s+/g, " ").startsWith(name));
  assert.ok(s, `スキル「${name}」が見つからない`);
  return s;
}

const skill = (slot: string): SkillDetail => ({ slot, name: "", stats: [], effect: "", keywords: [] });

describe("classifySlot: スキル見出しの枠判定", () => {
  test("通常の枠ラベル", () => {
    assert.deepEqual(classifySlot("スキル2", "×2", false, []), { slot: "スキル2", special: false, labeled: true });
  });
  test("守備スキルの表記揺れ(守備スキル~)は守備スキルに寄せる", () => {
    assert.deepEqual(classifySlot("守備スキル~", undefined, true, []), {
      slot: "守備スキル",
      special: false,
      labeled: true,
    });
  });
  test("wikiが「特殊」と明示した見出し", () => {
    assert.deepEqual(classifySlot("特殊", "×0", false, [skill("スキル3")]), {
      slot: "特殊",
      special: true,
      labeled: true,
    });
  });
  test("ラベル無し×0は直前のスキルの変化形", () => {
    assert.deepEqual(classifySlot("Furioso-Replica", "×0", false, [skill("スキル1"), skill("スキル3")]), {
      slot: "スキル3",
      special: true,
      labeled: false,
    });
  });
  test("ラベル無しでも×1がまだ出ていない枠ならラベル抜けの通常スキル", () => {
    assert.deepEqual(classifySlot("閃弓", "×1", false, [skill("スキル1"), skill("スキル2")]), {
      slot: "スキル3",
      special: false,
      labeled: false,
    });
  });
  test("ラベル無しで×1でも、スキル3の後なら変化形", () => {
    assert.deepEqual(classifySlot("連携: 人生の終止符", "×1", false, [skill("スキル3")]), {
      slot: "スキル3",
      special: true,
      labeled: false,
    });
  });
  test("ラベル無しの守備タイプは特殊守備スキル", () => {
    assert.deepEqual(classifySlot("超速護衛", undefined, true, [skill("守備スキル")]), {
      slot: "守備スキル",
      special: true,
      labeled: false,
    });
  });
});

describe("破壊不能コインの判定", () => {
  test("元から破壊不能: 全角・括弧付き・半角の表記揺れ", () => {
    assert.deepEqual(inherentUnbreakable("Ⅰ破壊不能コイン\n　[的中時] 破裂1を付与\nⅡ破壊不能コイン"), [1, 2]);
    assert.deepEqual(inherentUnbreakable("Ⅰ[破壊不能コイン]"), [1]);
    assert.deepEqual(inherentUnbreakable("I 破壊不能コイン"), [1]);
  });
  test("効果による変化は「元から」に含めない", () => {
    assert.deepEqual(inherentUnbreakable("Ⅰ破壊不能コインに変更される"), []);
    assert.deepEqual(inherentUnbreakable("[使用時] 全コインが破壊不能コインに変更される"), []);
  });
  test("効果で破壊不能化: 変更・〜になる・〜として追加", () => {
    assert.deepEqual(unbreakableByEffect("[使用時] 最終コインから破壊不能コインに変更される"), [
      "[使用時] 最終コインから破壊不能コインに変更される",
    ]);
    assert.deepEqual(unbreakableByEffect("[使用時]このスキルのすべてのコインが破壊不能コインになる"), [
      "[使用時]このスキルのすべてのコインが破壊不能コインになる",
    ]);
    assert.equal(unbreakableByEffect("[使用時]スキルの2コインが破壊不能コインとして1つ追加される").length, 1);
  });
  test("箇条の行は直前の見出し行とつなげる", () => {
    assert.deepEqual(unbreakableByEffect("[戦闘開始時]\n- 全コインが破壊不能コインに変更される"), [
      "[戦闘開始時] 全コインが破壊不能コインに変更される",
    ]);
  });
  test("「・」の箇条も記号を外して見出し行とつなげる", () => {
    assert.deepEqual(unbreakableByEffect("[使用時]\n・当該スキルコインが全て破壊不能コインに変更される"), [
      "[使用時] 当該スキルコインが全て破壊不能コインに変更される",
    ]);
    assert.deepEqual(unbreakableByEffect("・全コインが破壊不能コインに変更される"), ["全コインが破壊不能コインに変更される"]);
  });
  test("2段目の「・」は1段目の「-」の行とつなげる", () => {
    const effect = "ターン開始時、残影を付与\n-戦闘開始時、残影の敵を狙ったなら\n・当該スキルコインが全て破壊不能コインに変更される";
    assert.deepEqual(unbreakableByEffect(effect), [
      "戦闘開始時、残影の敵を狙ったなら 当該スキルコインが全て破壊不能コインに変更される",
    ]);
  });
  test("「破壊不能コインが的中時」のような条件文は変化扱いしない", () => {
    assert.deepEqual(unbreakableByEffect("基本攻撃スキルの破壊不能コインが的中時、代行を得る"), []);
  });
});

describe("parsePersonaPage: wikiのレイアウト別", () => {
  test("0103 通常レイアウト(スキル・パッシブ・用語)", () => {
    const d = parseFixture("0103");
    assert.deepEqual(slots(d), ["スキル1 撃勢", "スキル2 ひんねじる", "スキル3 異面賛刺", "守備スキル 反撃"]);
    assert.deepEqual(
      d.skills.map((s) => s.sin),
      ["傲慢", "憤怒", "嫉妬", "傲慢"]
    );
    assert.equal(d.skills[0].copies, "×3");
    assert.ok(d.skills[0].effect.includes("Ⅰ[表面的中時/的中時]"));
    assert.ok(d.skills[0].keywords.some((k) => k.term === "呼吸"));
    assert.deepEqual(
      d.passives.map((p) => [p.kind, p.name, p.resource, p.condition]),
      [
        ["バトル", "冷静", "傲慢×4", "保有"],
        ["サポート", "師事", "傲慢×3", "保有"],
      ]
    );
    assert.equal(d.ruby, "剣契(コムゲ) 殺手(サルス)");
    assert.ok(d.info.some((i) => i.label === "混乱区間"));
  });

  test("0102 パッシブ表の1列目がwiki側で誤記されていても読める", () => {
    const d = parseFixture("0102");
    assert.deepEqual(
      d.passives.map((p) => [p.kind, p.name, p.resource]),
      [
        ["バトル", "観察", "暴食×4"],
        ["サポート", "分析", "暴食×3"],
      ]
    );
  });

  test("0510 パッシブ効果が縦結合された別レイアウト", () => {
    const d = parseFixture("0510");
    assert.deepEqual(
      d.passives.map((p) => [p.kind, p.name, p.resource, p.condition]),
      [
        ["バトル", "自律学習指示", "憂鬱×2", "共鳴"],
        ["サポート", "誠実な学び", "憂鬱×5", "保有"],
      ]
    );
    assert.ok(d.passives[0].effect.startsWith("自分を除く味方のスキルを捨てる度"));
  });

  test("0115 ラベル無しの特殊スキルと、名前だけの見出しで続くパッシブ", () => {
    const d = parseFixture("0115");
    assert.deepEqual(slots(d), [
      "スキル1 凍りついた血を 三百三十巻きつけて",
      "スキル2 音のしない手を拍き愉しみ、 声を出さず憂く貫き",
      "スキル3 刃を立て刀を笑いたまえ、落葉の匂のように滝を泣きたまえ",
      "スキル3(特殊) Furioso-Replica",
      "守備スキル 予測できぬ気まぐれで",
    ]);
    assert.deepEqual(skillByName(d, "Furioso-Replica").unbreakableByEffect, [
      "[戦闘開始時] 全コインが破壊不能コインに変更される",
    ]);
    assert.deepEqual(
      d.passives.map((p) => `${p.kind}:${p.name}`),
      [
        "バトル:端末機で伝達された指令",
        "バトル:神託代行者/解禁",
        "バトル:人差し指の親方",
        "バトル:神託端末機[カドゥケウス]",
        "バトル:模造された生",
        "サポート:神の加護",
      ]
    );
    assert.ok(d.passives.every((p) => p.effect.length > 0));
  });

  test("0212 特殊スキルと特殊守備スキル(枠ラベル無し)", () => {
    const d = parseFixture("0212");
    assert.deepEqual(slots(d).slice(3), [
      "スキル3(特殊) 黒獣 卯 奥義-雲解顕現",
      "守備スキル 尊命。",
      "守備スキル(特殊) 超速護衛",
    ]);
    assert.deepEqual(skillByName(d, "超速護衛").unbreakableCoins, [1]);
  });

  test("0213 wiki側でヘッダー行が抜けたスキル3と、その変化形", () => {
    const d = parseFixture("0213");
    assert.deepEqual(slots(d), [
      "スキル1 刈り取る",
      "スキル2 間合いを取る",
      "スキル3 弓閃",
      "スキル3(特殊) 閃弓",
      "守備スキル 弓刀展開",
      "守備スキル(特殊) 回避",
    ]);
    const s3 = skillByName(d, "弓閃");
    assert.equal(s3.sin, "色欲");
    assert.equal(s3.attackType, "斬撃");
    assert.deepEqual(
      s3.stats.find((x) => x.label === "コイン個数"),
      { label: "コイン個数", value: "4" }
    );
    // S2の効果文にS3の値・効果が混ざらない
    assert.ok(!skillByName(d, "間合いを取る").effect.includes("弓閃"));
  });

  test("0314 2形態を持つ人格と「守備スキル~」の表記揺れ", () => {
    const d = parseFixture("0314");
    assert.deepEqual(
      d.skills.map((s) => s.slot),
      ["スキル1", "スキル2", "スキル3", "守備スキル", "スキル1", "スキル2", "スキル3", "守備スキル"]
    );
    assert.equal(d.skills[7].name, "強制解禁");
    assert.deepEqual(skillByName(d, "代行：抹殺").unbreakableCoins, [1, 2, 3, 4]);
    // 形態名の行を各スキルの form として持つ
    assert.deepEqual(
      d.skills.map((s) => s.form),
      [...Array(4).fill("通常状態"), ...Array(4).fill("開花E.G.O::代行")]
    );
  });

  test("1006 ページ下部に埋め込まれた別ページのスキル表は読まない", () => {
    const d = parseFixture("1006");
    assert.deepEqual(slots(d), ["スキル1 傷口浮彫", "スキル2 増殖するお札", "スキル3 破裂符", "守備スキル ガード"]);
    assert.deepEqual(
      d.passives.map((p) => `${p.kind} ${p.name} ${p.condition}`),
      ["バトル お札を剥がす 共鳴", "サポート 祈願符 保有"]
    );
    assert.ok(d.skills.every((s) => s.form === undefined));
  });

  test("0412 wikiが「特殊」と明示した見出し", () => {
    const d = parseFixture("0412");
    const s = skillByName(d, "撃ち放たん/いつでも");
    assert.equal(s.slot, "特殊");
    assert.equal(s.special, true);
    assert.deepEqual(s.unbreakableCoins, [1, 2]);
  });

  test("0815 括弧付きの「Ⅰ[破壊不能コイン]」", () => {
    const d = parseFixture("0815");
    assert.deepEqual(skillByName(d, "形勢判断").unbreakableCoins, [1]);
    assert.equal(skillByName(d, "骨断").slot, "スキル2");
  });

  test("1016 半角の「I 破壊不能コイン」", () => {
    const d = parseFixture("1016");
    assert.deepEqual(skillByName(d, "ラ・ガルド").unbreakableCoins, [1]);
    assert.deepEqual(skillByName(d, "ラ・カストラシオン").unbreakableCoins, [1, 2, 3, 4, 5]);
  });

  test("1216 「破壊不能コインとして追加」は効果による変化", () => {
    const d = parseFixture("1216");
    assert.equal(skillByName(d, "黎明の閃光").unbreakableByEffect?.length, 1);
    assert.equal(skillByName(d, "黎明の閃光").unbreakableCoins, undefined);
    assert.deepEqual(skillByName(d, "明け方").unbreakableCoins, [1, 2, 3, 4]);
  });
});
