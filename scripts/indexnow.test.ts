import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { KEY, SITE_URL, changedUrls, pageHash, sitemapUrls } from "./indexnow.ts";

test("IndexNow: サイトの URL が seo.ts と一致し、キーのファイルが public/ にある", () => {
  // seo.ts は Vite 専用の import.meta.glob を使い Node から読み込めないため、定義の行を文字列で比べる
  const seo = readFileSync(new URL("../src/seo.ts", import.meta.url), "utf-8");
  assert.equal(seo.match(/export const SITE_URL = "([^"]+)"/)?.[1], SITE_URL);
  assert.match(KEY, /^[0-9a-f]{32}$/);
  assert.equal(readFileSync(new URL(`../public/${KEY}.txt`, import.meta.url), "utf-8").trim(), KEY);
});

test("pageHash: /assets/ のファイル名の違いは無視し、本文の違いは区別する", () => {
  const page = (asset: string, body: string) => `<link href="/assets/${asset}.css"><script src="/assets/${asset}.js"></script><main>${body}</main>`;
  assert.equal(pageHash(page("index-AAA", "本文")), pageHash(page("index-BBB", "本文")));
  assert.notEqual(pageHash(page("index-AAA", "本文")), pageHash(page("index-AAA", "本文を更新")));
});

test("sitemapUrls: <loc> を順に取り出し、&amp; を戻す", () => {
  const xml = "<urlset><url><loc>https://x.test/</loc></url><url><loc>https://x.test/a/?q=1&amp;b=2</loc><lastmod>2026-10-21</lastmod></url></urlset>";
  assert.deepEqual(sitemapUrls(xml), ["https://x.test/", "https://x.test/a/?q=1&b=2"]);
});

test("changedUrls: 増えた・変わった・消えたページだけを返し、前回が無ければ全件", () => {
  const previous = { pages: { "/same/": "1", "/edit/": "2", "/gone/": "3" } };
  const current = { pages: { "/same/": "1", "/edit/": "9", "/new/": "4" } };
  assert.deepEqual(changedUrls(previous, current), ["/edit/", "/new/", "/gone/"]);
  assert.deepEqual(changedUrls(undefined, current), ["/same/", "/edit/", "/new/"]);
  assert.deepEqual(changedUrls(current, current), []);
});
