// .cache/wiki/ に保存済みの人格ページから、パーサーが読む表だけを抜き出してテスト用フィクスチャを作る。
// wiki側のレイアウト変更でパーサーを直したときに、該当ページを追加・更新するために使う。
//   npx tsx scripts/make-fixtures.ts 0103 0115 ...
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CACHE_DIR = join(import.meta.dirname, "..", ".cache", "wiki");
const OUT_DIR = join(import.meta.dirname, "__fixtures__");

const codes = process.argv.slice(2);
if (!codes.length) {
  console.error("人格コードを指定してください (例: npx tsx scripts/make-fixtures.ts 0103)");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const code of codes) {
  const $ = cheerio.load(readFileSync(join(CACHE_DIR, `${code}.html`), "utf-8"));
  const firstCells = (t: Element) =>
    $(t)
      .find("tr")
      .toArray()
      .map((r) => $(r).children().first().text().trim());
  // 基本情報表 + スキル/パッシブ表(persona.ts の判定と同じ手がかり)
  const tables = $("table")
    .toArray()
    .filter((t) => {
      const cells = firstCells(t);
      const text = $(t).text();
      return (
        cells.some((c) => ["特性キーワード", "パニックタイプ", "罪悪属性"].includes(c)) ||
        (text.includes("条件") && text.includes("効果") && text.includes("バトル"))
      );
    });
  const html = `<!doctype html><html><body>\n${tables.map((t) => $.html(t)).join("\n")}\n</body></html>\n`;
  writeFileSync(join(OUT_DIR, `${code}.html`), html, "utf-8");
  console.log(`${code}: 表${tables.length}個, ${html.length}文字`);
}
