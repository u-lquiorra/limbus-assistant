import { test } from "node:test";
import assert from "node:assert/strict";
import React, { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// テストを動かす tsx はルートの tsconfig.json を読み、JSX を React.createElement に変換する(アプリは react-jsx)。
// そのため React をグローバルに置いてから、JSX を含むモジュールを読み込む
(globalThis as { React?: typeof React }).React = React;
const { decorate } = await import("./decorate.tsx");

const render = (text: string, keywords: { term: string; desc: string }[], timing = true) =>
  renderToStaticMarkup(createElement(Fragment, null, ...decorate(text, keywords, timing)));

test("decorate: 説明のある用語は押して開けるボタンになり、説明は読み上げ用の属性にだけ持つ", () => {
  const html = render("[使用時] 火傷 3 を付与", [{ term: "火傷", desc: "ターン終了時にダメージを受ける" }]);
  assert.match(html, /<span class="fx-timing">使用時<\/span>/);
  assert.match(html, /<button type="button" class="fx-keyword" aria-expanded="false" aria-description="ターン終了時にダメージを受ける">火傷<\/button>/);
  // 説明の表示は開いたときだけ body 直下に描画する
  assert.doesNotMatch(html, /fx-popover/);
  assert.doesNotMatch(html, /title=/, "スマホで出ない title ツールチップには頼らない");
});

test("decorate: 説明の無い用語はボタンにしない", () => {
  const html = render("火傷 3", [{ term: "火傷", desc: "" }]);
  assert.equal(html, '<span class="fx-keyword">火傷</span> 3');
});

test("decorate: 長い用語を優先し、timing=false ではタイミング表記を装飾しない", () => {
  const html = render("代行 [ヘルメス] 解禁 - III", [{ term: "解禁", desc: "a" }, { term: "解禁 - III", desc: "b" }], false);
  assert.match(html, /代行 \[ヘルメス\] <button[^>]*>解禁 - III<\/button>/);
});
