// .cache/wiki/ego-<code>.html (E.G.O 個別ページ) と char-<囚人>.html (E.G.O 一覧) から、パーサーが読む表だけを抜き出してテスト用フィクスチャを作る。
//   npx tsx scripts/make-ego-fixtures.ts 0101 0209 ...
import * as cheerio from "cheerio";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CACHE_DIR = join(import.meta.dirname, "..", ".cache", "wiki");
const OUT_DIR = join(import.meta.dirname, "__fixtures__");

const codes = process.argv.slice(2);
if (!codes.length) {
  console.error("E.G.O コードを指定してください (例: npx tsx scripts/make-ego-fixtures.ts 0101)");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const code of codes) {
  const $ = cheerio.load(readFileSync(join(CACHE_DIR, `ego-${code}.html`), "utf-8"));
  // ego.ts の findTable / parseSpecialEffects と同じ手がかりで、入れ子でない表だけを残す
  const leaf = $("#body table")
    .toArray()
    .filter((t) => $(t).find("table").length === 0);
  const wanted = leaf.filter((t) => {
    const text = $(t).text();
    return text.includes("危険ランク") || text.includes("覚醒スキル");
  });
  const specialHeading = $("#body h3")
    .toArray()
    .find((h) => $(h).text().trim() === "専用効果");
  const special: string[] = [];
  if (specialHeading) {
    for (let el = specialHeading.next; el; el = el.next) {
      if (el.type !== "tag") continue;
      if (/^h[1-3]$/i.test((el as { tagName: string }).tagName)) break;
      special.push($.html(el));
    }
  }
  const html = `<html><body><div id="body">${wanted.map((t) => $.html(t)).join("\n")}\n<h3>専用効果</h3>\n${special.join("\n")}</div></body></html>`;
  writeFileSync(join(OUT_DIR, `ego-${code}.html`), html, "utf-8");
  console.log(`ego-${code}.html: 表${wanted.length}個 + 専用効果`);
}
