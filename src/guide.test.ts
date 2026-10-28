import { test } from "node:test";
import assert from "node:assert/strict";
import { blockSegments, egoItemsForPersona, guideKeywords, parseGuide, parseInline } from "./guide.ts";
import type { PersonaDetail } from "./types.ts";

test("parseInline: **強調** を分割する", () => {
  assert.deepEqual(parseInline("**S1**: 沈潜を付与"), [
    { text: "S1", strong: true },
    { text: ": 沈潜を付与", strong: false },
  ]);
  assert.deepEqual(parseInline("強調なし"), [{ text: "強調なし", strong: false }]);
});

test("parseInline: 閉じていない ** は文字のまま残す", () => {
  assert.deepEqual(parseInline("a **b** c **d"), [
    { text: "a ", strong: false },
    { text: "b", strong: true },
    { text: " c **d", strong: false },
  ]);
});

test("parseInline: [表示名](persona:コード) を人格へのリンクにする", () => {
  assert.deepEqual(parseInline("**[南部リウ協会3課](persona:0112)**: 火傷を付与 [的中時]"), [
    { text: "南部リウ協会3課", strong: true, persona: "0112" },
    { text: ": 火傷を付与 [的中時]", strong: false },
  ]);
  // コードが4桁でなければリンクにせず、文字のまま残す
  assert.deepEqual(parseInline("[a](persona:12)"), [{ text: "[a](persona:12)", strong: false }]);
});

test("parseInline: [表示名](ego:コード) を E.G.O へのリンクにする", () => {
  assert.deepEqual(parseInline("相性は[三千大世界](ego:0108)。"), [
    { text: "相性は", strong: false },
    { text: "三千大世界", strong: false, ego: "0108" },
    { text: "。", strong: false },
  ]);
});

test("parseGuide: frontmatter・見出し・段落・箇条書きを解釈する", () => {
  const md = [
    "---",
    'code: "0101"',
    "persona: LCB囚人",
    "---",
    "",
    "見出し前の本文は無視",
    "",
    "## ひとことで",
    "沈潜を撒く人格。",
    "",
    "## 主要ギミック",
    "- **沈潜**: S1で付与",
    "- S3で脆弱",
    "続く段落",
  ].join("\r\n");
  const guide = parseGuide(md);
  assert.deepEqual(guide.meta, { code: "0101", persona: "LCB囚人" });
  assert.equal(guide.sections.length, 2);
  assert.deepEqual(guide.sections[0], {
    heading: "ひとことで",
    blocks: [{ type: "p", text: [{ text: "沈潜を撒く人格。", strong: false }] }],
  });
  assert.deepEqual(guide.sections[1].blocks, [
    {
      type: "ul",
      items: [
        [
          { text: "沈潜", strong: true },
          { text: ": S1で付与", strong: false },
        ],
        [{ text: "S3で脆弱", strong: false }],
      ],
    },
    { type: "p", text: [{ text: "続く段落", strong: false }] },
  ]);
});

test("parseGuide: 小見出しと、字下げした子の箇条書きを解釈する", () => {
  const md = [
    "## 進め方",
    "### 第一層",
    "- 経験記憶",
    "  - 白磁の硯滴",
    "\t- 無文の鍔",
    "- 教本",
    "",
    "  - 親の無い字下げ",
  ].join("\n");
  const blocks = parseGuide(md).sections[0].blocks;
  assert.deepEqual(blocks, [
    { type: "h", text: [{ text: "第一層", strong: false }] },
    {
      type: "ul",
      items: [
        [{ text: "経験記憶", strong: false }],
        [{ text: "白磁の硯滴", strong: false }],
        [{ text: "無文の鍔", strong: false }],
        [{ text: "教本", strong: false }],
      ],
      depths: [0, 1, 1, 0],
    },
    // リストの先頭にある字下げは、親が無いので通常の項目になる(depths も付かない)
    { type: "ul", items: [[{ text: "親の無い字下げ", strong: false }]] },
  ]);
  // 読み取り側は、小見出しも子の項目も表示順に平らに受け取る
  assert.deepEqual(
    blocks.flatMap(blockSegments).map((segments) => segments.map((s) => s.text).join("")),
    ["第一層", "経験記憶", "白磁の硯滴", "無文の鍔", "教本", "親の無い字下げ"]
  );
});

test("parseGuide: frontmatter が無くても本文を読める", () => {
  const guide = parseGuide("## 使い方\n本文");
  assert.deepEqual(guide.meta, {});
  assert.equal(guide.sections[0].heading, "使い方");
});

test("guideKeywords: 用語と「」付きのスキル名・パッシブ名を集める", () => {
  const detail: PersonaDetail = {
    code: "0101",
    info: [],
    skills: [
      {
        slot: "スキル1",
        name: "弾く",
        sin: "憂鬱",
        attackType: "斬撃",
        stats: [],
        effect: "沈潜1を付与",
        keywords: [{ term: "沈潜", desc: "精神力ダメージ" }],
      },
      { slot: "スキル3", name: "強化\n版", special: true, stats: [], effect: "", keywords: [] },
    ],
    passives: [
      {
        kind: "バトル",
        name: "情報\n伝達",
        resource: "憂鬱×4",
        condition: "共鳴",
        effect: "ダメージ量増加1を付与",
        keywords: [{ term: "沈潜", desc: "重複は無視" }],
      },
    ],
  };
  assert.deepEqual(guideKeywords(detail), [
    { term: "沈潜", desc: "精神力ダメージ" },
    { term: "「弾く」", desc: "S1 憂鬱・斬撃\n沈潜1を付与" },
    { term: "「強化版」", desc: "S3(特殊)\n効果なし" },
    { term: "「情報伝達」", desc: "バトルパッシブ 憂鬱×4 共鳴\nダメージ量増加1を付与" },
  ]);
});

test("guideKeywords: 形態のある人格はスキルの形態名も添える", () => {
  const detail: PersonaDetail = {
    code: "0314",
    info: [],
    skills: [
      { slot: "スキル1", name: "頭を潰す", form: "通常状態", sin: "色欲", attackType: "打撃", stats: [], effect: "a", keywords: [] },
    ],
    passives: [],
  };
  assert.deepEqual(guideKeywords(detail), [{ term: "「頭を潰す」", desc: "S1 [通常状態] 色欲・打撃\na" }]);
});

test("egoItemsForPersona: 指定した人格を先頭に挙げた箇条書きだけを、E.G.O リンクに差し替えて返す", () => {
  const guide = parseGuide(
    [
      "## 使い方",
      "- **[奥歯事務所フィクサー](persona:0105)**: 本文側の箇条書きは対象外。",
      "## 編成・相性",
      "- **[奥歯事務所フィクサー](persona:0105)**: S2が怠惰で、必要資源を出せる。",
      "- **[南部リウ協会3課](persona:0112)**: 別の人格。",
      "- 前置きの文で[奥歯事務所フィクサー](persona:0105)に触れるだけの行。",
    ].join("\n")
  );
  const items = egoItemsForPersona(guide, "編成・相性", "0105", { code: "0101", name: "烏瞰刀" });
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], [
    { text: "烏瞰刀", strong: true, ego: "0101" },
    { text: ": S2が怠惰で、必要資源を出せる。", strong: false },
  ]);
  // 先頭以外のリンクでも、最初のリンクがその人格なら対象にする
  assert.equal(items[1].find((seg) => seg.ego)?.ego, "0101");
  assert.deepEqual(egoItemsForPersona(guide, "編成・相性", "0999", { code: "0101", name: "烏瞰刀" }), []);
  assert.deepEqual(egoItemsForPersona(guide, "存在しない見出し", "0105", { code: "0101", name: "烏瞰刀" }), []);
});
