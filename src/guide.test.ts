import { test } from "node:test";
import assert from "node:assert/strict";
import { guideKeywords, parseGuide, parseInline } from "./guide.ts";
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
