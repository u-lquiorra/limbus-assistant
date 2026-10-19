// .cache/wiki/ に保存済みの人格ページから「性能解説」節(本文・各種スキル・パッシブ・シナジー等)をテキストで抜き出す。
// 攻略ガイド執筆とファクトチェックで、wiki 編集者の立ち回り解説(勝ち筋・ループ・運用)を参照するために使う。
// wiki の文章そのものなので、出力は .cache/ 配下に置き、アプリのデータやリポジトリには含めない。
//   npx tsx scripts/extract-commentary.ts            全人格
//   npx tsx scripts/extract-commentary.ts 0212 0415  指定した人格だけ
//   npx tsx scripts/extract-commentary.ts ego-0108   E.G.O (キャッシュ名 ego-<code>)。引数なしの全件には E.G.O も含む
//   npx tsx scripts/extract-commentary.ts --teams    wiki の編成ガイド(sys-teams)を編成ごとに .cache/commentary/teams/<見出し>.md へ
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { richText } from "./persona.ts";

const CACHE_DIR = join(import.meta.dirname, "..", ".cache", "wiki");
const OUT_DIR = join(import.meta.dirname, "..", ".cache", "commentary");

// 表は行ごとにセルを " | " でつなぐ。スキル表のような大きな表は解説として冗長なので行数を絞る
function tableText($: cheerio.CheerioAPI, t: Element): string {
  return $(t)
    .find("tr")
    .toArray()
    .map((r) =>
      $(r)
        .children("td, th")
        .toArray()
        .map((c) => richText($, c).replace(/\n/g, " "))
        .filter(Boolean)
        .join(" | ")
    )
    .filter(Boolean)
    .join("\n");
}

function blockText($: cheerio.CheerioAPI, el: Element): string {
  const $el = $(el);
  if (/^h[2-6]$/i.test(el.tagName)) return `\n${"#".repeat(Number(el.tagName[1]))} ${$el.text().trim()}`;
  if (el.tagName === "table") return tableText($, el);
  // 折りたたみ・ポップアウト内の表も拾うため、表を含む要素は表とそれ以外に分けて出力する
  const tables = $el.find("table").toArray();
  if (tables.length) {
    const clone = $el.clone();
    clone.find("table").remove();
    const rest = richText($, clone.get(0) as Element);
    return [rest, ...tables.map((t) => tableText($, t))].filter(Boolean).join("\n");
  }
  return richText($, el);
}

export function extractCommentary(html: string): string {
  const $ = cheerio.load(html);
  const body = $("#body").length ? $("#body") : $("body");
  const start = body
    .find("h2")
    .toArray()
    .find((h) => $(h).text().trim() === "性能解説");
  if (!start) return "";
  const out: string[] = [];
  // h2「性能解説」の次から、次の h2 までの兄弟要素を順に読む
  for (let el = start.next; el; el = el.next) {
    if (el.type !== "tag") continue;
    if (/^h2$/i.test(el.tagName)) break;
    const text = blockText($, el).trim();
    if (text) out.push(text);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// 編成ガイドのページから、h3(編成名)ごとに次の h2/h3 までを抜き出す
export function extractTeams(html: string): Map<string, string> {
  const $ = cheerio.load(html);
  const body = $("#body").length ? $("#body") : $("body");
  const out = new Map<string, string>();
  for (const h of body.find("h3").toArray()) {
    const name = $(h).text().trim();
    const parts: string[] = [];
    for (let el = h.next; el; el = el.next) {
      if (el.type !== "tag") continue;
      if (/^h[23]$/i.test(el.tagName)) break;
      const text = blockText($, el).trim();
      if (text) parts.push(text);
    }
    const text = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (name && text) out.set(name, text);
  }
  return out;
}

function mainTeams() {
  const src = join(CACHE_DIR, "sys-teams.html");
  if (!existsSync(src)) {
    console.warn("sys-teams.html のキャッシュがありません");
    return;
  }
  const dir = join(OUT_DIR, "teams");
  mkdirSync(dir, { recursive: true });
  const teams = extractTeams(readFileSync(src, "utf-8"));
  for (const [name, text] of teams) writeFileSync(join(dir, `${name.replace(/[\\/:*?"<>|]/g, "_")}.md`), `${text}\n`, "utf-8");
  console.log(`${teams.size}件の編成を出力 -> ${dir}`);
}

function main() {
  if (process.argv.includes("--teams")) return mainTeams();
  mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const codes = args.length
    ? args
    : readdirSync(CACHE_DIR)
        .filter((f) => /^(ego-)?\d{4}\.html$/.test(f))
        .map((f) => f.slice(0, -5));
  let empty = 0;
  for (const code of codes) {
    const src = join(CACHE_DIR, `${code}.html`);
    if (!existsSync(src)) {
      console.warn(`${code}: キャッシュがありません`);
      continue;
    }
    const text = extractCommentary(readFileSync(src, "utf-8"));
    if (!text) empty++;
    writeFileSync(join(OUT_DIR, `${code}.md`), text ? `${text}\n` : "", "utf-8");
  }
  console.log(`${codes.length}件を出力 (性能解説なし: ${empty}件) -> ${OUT_DIR}`);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
