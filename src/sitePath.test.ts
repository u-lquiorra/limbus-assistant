import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { findSlashlessLinks, withTrailingSlash } from "./sitePath.ts";

test("withTrailingSlash: サイト内のパスの末尾に / を付ける", () => {
  assert.equal(withTrailingSlash("/teams"), "/teams/");
  assert.equal(withTrailingSlash("/persona/1001"), "/persona/1001/");
  assert.equal(withTrailingSlash("/character/%E3%82%A4%E3%82%B5%E3%83%B3"), "/character/%E3%82%A4%E3%82%B5%E3%83%B3/");
});

test("withTrailingSlash: ?query と #hash は / の後ろに残す", () => {
  assert.equal(withTrailingSlash("/reroll#candidates"), "/reroll/#candidates");
  assert.equal(withTrailingSlash("/reroll?tab=walpurgis#candidates"), "/reroll/?tab=walpurgis#candidates");
  assert.equal(withTrailingSlash("/search?q=a/b"), "/search/?q=a/b");
});

test("withTrailingSlash: トップ・付与済み・外部・相対・ファイルは変えない", () => {
  for (const to of ["/", "/teams/", "/teams/#x", "https://x.com/limbus_assist", "//example.com/a", "#stuck", "?q=1", "/images/personas/0101.webp", "/favicon.ico"]) {
    assert.equal(withTrailingSlash(to), to);
  }
});

test("findSlashlessLinks: <a> の / なしのサイト内リンクだけを拾う", () => {
  const html = [
    '<a href="/teams">',
    '<a class="x" href="/teams/">',
    '<a href="/reroll#candidates">',
    '<a href="https://example.com/a">',
    '<link rel="stylesheet" href="/assets/index.css">',
  ].join("");
  assert.deepEqual(findSlashlessLinks(html), ["/teams", "/reroll#candidates"]);
});

test("サイト内リンクは react-router-dom の Link を直接使わず、components/Link を使う", async () => {
  const src = new URL("./", import.meta.url);
  const files = (await readdir(src, { recursive: true })).filter((f) => f.endsWith(".tsx") && !f.replace(/\\/g, "/").endsWith("components/Link.tsx"));
  const offenders: string[] = [];
  for (const file of files) {
    const text = await readFile(new URL(file.replace(/\\/g, "/"), src), "utf8");
    // NavLink も同じく / なしのリンクを出すため対象にする
    if (/import\s*\{[^}]*\b(Link|NavLink)\b[^}]*\}\s*from\s*"react-router-dom"/.test(text)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});
