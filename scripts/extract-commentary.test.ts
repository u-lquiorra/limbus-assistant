// wiki「性能解説」節の抽出テスト
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCommentary } from "./extract-commentary.ts";

const page = (body: string) => `<html><body><div id="body">${body}</div></body></html>`;

test("extractCommentary: 「性能解説」から次の h2 までを見出し付きで抜き出す", () => {
  const html = page(`
    <h2>テキスト</h2><p>台詞は含めない</p>
    <h2>性能解説</h2>
    <p>総評の1行目<br>2行目</p>
    <h3>各種スキル・パッシブ</h3>
    <div class="fold"><p>折りたたみ内の解説</p><table><tr><th>条件</th><td>効果</td></tr></table></div>
    <h2>小ネタ</h2><p>小ネタは含めない</p>`);
  assert.equal(
    extractCommentary(html),
    ["総評の1行目\n2行目", "### 各種スキル・パッシブ", "折りたたみ内の解説\n条件 | 効果"].join("\n")
  );
});

test("extractCommentary: 性能解説節が無ければ空文字", () => {
  assert.equal(extractCommentary(page("<h2>テキスト</h2><p>本文</p>")), "");
});
