// 鏡ダンジョンのデータを wiki (wikiwiki.jp/lcbwiki) から取得し、src/data/mirror/ に JSON で書き出す。
// - 鏡ダンジョン/E.G.Oギフト                     → gifts.json(全ギフトの性能)
// - 鏡ダンジョン/各種パック獲得可能ギフト一覧    → packs.json(パックごとの出現ギフト)
// - 鏡ダンジョン/E.G.Oギフト/簡易合成ギフト一覧 → fusions.json(合成レシピ)
// 攻略の参考ページ(星の加護・苦難・出現敵・攻略編成など)は .cache/mirror/ に HTML で保存するだけで、JSON にはしない。
//
// 使い方: npm run mirror            (キャッシュがあれば wiki へアクセスしない)
//         npm run mirror -- --refresh (全ページを取り直す)
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { MirrorFusion, MirrorGift, MirrorPack } from "../src/types.ts";
import { normalizeLines } from "./persona.ts";

const BASE = "https://wikiwiki.jp/lcbwiki";
const CACHE_DIR = join(import.meta.dirname, "..", ".cache", "mirror");
const OUT_DIR = join(import.meta.dirname, "..", "src", "data", "mirror");
const USER_AGENT =
  "LimbusAssistant-FanApp/0.1 (non-commercial fan guide; https://github.com/u-lquiorra/limbus-assistant)";
// scrape.ts と同じく、wikiwiki.jp の 429 を避けるため12秒間隔で取得する
const PAGE_INTERVAL_MS = 12000;

export const GIFT_PAGE = "鏡ダンジョン/E.G.Oギフト";
export const PACK_PAGE = "鏡ダンジョン/各種パック獲得可能ギフト一覧";
export const FUSION_PAGE = "鏡ダンジョン/E.G.Oギフト/簡易合成ギフト一覧";
// 攻略を書くときに読む参考ページ。MD8(シーシュポスの鏡)は MD7 から仕様の変更が無く、
// wiki でも出現敵・攻略編成は MD7 のページを参照しているので、MD7 のページも取る
const REFERENCE_PAGES = [
  "鏡ダンジョン",
  "鏡ダンジョン/08シーシュポスの鏡",
  "鏡ダンジョン/07名と蜘蛛の鏡",
  "鏡ダンジョン/07名と蜘蛛の鏡/出現敵詳細一覧(1)",
  "鏡ダンジョン/07名と蜘蛛の鏡/出現敵詳細一覧(2)",
  "鏡ダンジョン/07名と蜘蛛の鏡/攻略・編成",
  "鏡ダンジョン/E.G.Oギフト/汎用ギフト",
  "鏡ダンジョン/E.G.Oギフト/ギフト優先度",
  "鏡ダンジョン/E.G.Oギフト/ハブ",
  "鏡ダンジョン/イベント",
  "鏡ダンジョン/イベント/イベント詳細",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastFetch = 0;

export const cacheFile = (page: string) => join(CACHE_DIR, `${page.replaceAll("/", "__")}.html`);

async function loadPage(page: string, refresh: boolean): Promise<string> {
  const file = cacheFile(page);
  if (!refresh && existsSync(file)) return readFileSync(file, "utf-8");
  const wait = lastFetch + PAGE_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  const url = `${BASE}/${encodeURIComponent(page).replaceAll("%2F", "/")}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${page} の取得に失敗した(HTTP ${res.status})`);
  const html = await res.text();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, html, "utf-8");
  console.log(`  取得: ${page}`);
  return html;
}

// ---- テキスト化 ----

// 強化段階の色。wiki の一覧では + の値を cornflowerblue、++ の値を crimson で塗る
const LEVEL_COLORS: [RegExp, string][] = [
  [/color:\s*cornflowerblue/i, "+"],
  [/color:\s*crimson/i, "++"],
];

function levelOf(node: AnyNode, root: AnyNode): string | undefined {
  for (let p = node.parent; p && p !== root; p = p.parent) {
    if (p.type !== "tag") continue;
    const el = p as Element;
    if (el.name !== "span" || !/\bwikicolor\b/.test(el.attribs.class ?? "")) continue;
    for (const [re, level] of LEVEL_COLORS) if (re.test(el.attribs.style ?? "")) return level;
    // 罪悪属性名などの色は段階ではないので、さらに外側を見る
  }
  return undefined;
}

// 効果文のテキスト化。強化段階で変わる部分を 〘+:…〙 / 〘++:…〙 で囲む(ego.ts の stagedText と同じ考え方)
export function leveledText($: cheerio.CheerioAPI, el: Element): string {
  const clone = $(el).clone();
  clone.find("a.note_super").remove();
  const root = clone.get(0);
  if (!root) return "";
  const walk = (n: AnyNode) => {
    if (n.type === "text") {
      const level = levelOf(n, root);
      const t = n as unknown as { data: string };
      if (level) t.data = t.data.split("\n").map((s) => (s.trim() ? `〘${level}:${s}〙` : s)).join("\n");
      return;
    }
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(root);
  clone.find("br").replaceWith("\n");
  let text = clone.text();
  // ツールチップで分かれた隣り合う同じ段階の印をつなぐ
  for (let prev = ""; prev !== text; ) {
    prev = text;
    text = text.replace(/〘(\+\+|\+):([^〘〙\n]*)〙([ \t]*)〘\1:/g, "〘$1:$2$3");
  }
  return normalizeLines(text.replace(/〘(\+\+|\+):\s*〙/g, ""));
}

function plain($: cheerio.CheerioAPI, el: Element | undefined): string {
  if (!el) return "";
  const clone = $(el).clone();
  clone.find("a.note_super").remove();
  clone.find("br").replaceWith(" ");
  return clone.text().replace(/\s+/g, " ").trim();
}

// 脚注(*1 など)の本文は a.note_super の data-tooltip-content に入っている
function footnotes($: cheerio.CheerioAPI, el: Element): string[] {
  return $(el)
    .find("a.note_super")
    .toArray()
    .map((a) => {
      const $n = cheerio.load($(a).attr("data-tooltip-content") ?? "");
      $n("div").remove();
      return $n.root().text().replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}

// 画像名から ID を作る("HellterflysDream.webp" → "HellterflysDream"、"Pack_LakeWorld.png" → "LakeWorld")
export function imageId(alt: string): string {
  return alt.replace(/\.(png|webp|jpe?g|gif)$/i, "").replace(/^Pack_/, "");
}

// 一部のランクが半角の I で書かれている
const TIER_FIX: Record<string, string> = { I: "Ⅰ", II: "Ⅱ", III: "Ⅲ", IV: "Ⅳ", V: "Ⅴ" };

// ---- ギフト一覧 ----
// 列: 番号 | 画像+名前 | 罪悪属性 | ランク | 価格 | 強化費(+ / ++) | 効果 | 獲得イベント | 分類
export function parseGifts(html: string): MirrorGift[] {
  const $ = cheerio.load(html);
  const table = $("#body table")
    .toArray()
    .find((t) => /獲得イベント/.test($(t).find("tr").first().text()));
  if (!table) throw new Error("ギフト一覧の表が見つからない");
  const gifts: MirrorGift[] = [];
  for (const row of $(table).find("tr").toArray().slice(1)) {
    const c = $(row).children("td").toArray();
    if (c.length !== 9) throw new Error(`ギフト一覧の列数が想定と違う(${c.length}列): ${plain($, row).slice(0, 60)}`);
    // ID は画像ファイル名から取る。アンカー名は綴りが揺れていて(StickyMuck と StickyResin.webp など)、
    // パック・合成の表は画像ファイル名で書かれているため
    const src = $(c[1]).find("img").attr("src") ?? "";
    const id = imageId(decodeURIComponent(src.split("?")[0].split("/").pop() ?? ""));
    if (!id) throw new Error(`ギフトの画像が無い行: ${plain($, row).slice(0, 60)}`);
    const tier = plain($, c[3]);
    const priceText = plain($, c[4]);
    const upgrade = plain($, c[5]).match(/^(\d+) (\d+)$/);
    const keyword = plain($, c[8]);
    const notes = c.flatMap((cell) => footnotes($, cell));
    gifts.push({
      no: plain($, c[0]),
      id,
      name: plain($, c[1]),
      sin: plain($, c[2]),
      tier: TIER_FIX[tier] ?? tier,
      price: /^\d+$/.test(priceText) ? Number(priceText) : null,
      ...(/^\d+$/.test(priceText) ? {} : { priceNote: priceText }),
      upgradeCost: upgrade ? [Number(upgrade[1]), Number(upgrade[2])] : null,
      effect: leveledText($, c[6]),
      events: $(c[7])
        .find("a")
        .toArray()
        .map((a) => plain($, a))
        .filter(Boolean),
      keyword: keyword && keyword !== "-" ? keyword : null,
      ...(notes.length ? { notes } : {}),
    });
  }
  return gifts;
}

// ---- パック別の出現ギフト ----
// 表は「パック画像の行 → パック名の行 → 出現E.G.Oギフト → 限定E.G.Oギフト(パックごと)」を1グループとして繰り返す。
// 物理・罪悪・状態異常のパックは「出現(共通) → 出現(各種〜限定): 見出し行 + ギフト行」で、列 k の属性別ギフトは各パック名行の列 k のパックに入る。
// 折りたたみ「変更前」の中の「嵐の鏡までの内容」の表は古いので読まない。
export function parsePacks(html: string): MirrorPack[] {
  const $ = cheerio.load(html);
  const packs: MirrorPack[] = [];
  for (const table of $("#body table").toArray()) {
    const summaries = $(table)
      .parents(".fold-container")
      .toArray()
      .map((f) => $(f).children(".fold-summary").first().text().trim());
    if (summaries.some((s) => /までの内容|変更前/.test(s))) continue;
    if (!/^パック/.test($(table).find("tr").first().text().trim())) continue;
    const category = summaries[0] ?? "";

    let ids: (string | null)[] = []; // 直前のパック画像の行
    let nameRows: MirrorPack[][] = []; // 今のグループのパック名の行
    let expect: "common" | "limited" | "split-label" | "split" | null = null;
    let labelCount = 0;
    let groupDone = false;

    // colspan を展開して、列ごとのセルの配列にする
    const columns = (row: Element) =>
      $(row)
        .children("td, th")
        .toArray()
        .flatMap((c) => Array<Element>(Number($(c).attr("colspan") ?? 1)).fill(c));
    const giftIds = (c: Element | undefined): string[] =>
      !c ? [] :
      $(c)
        .find("img")
        .toArray()
        .map((i) => imageId($(i).attr("alt") ?? ""))
        .filter(Boolean);

    for (const row of $(table).find("tr").toArray()) {
      const cols = columns(row);
      // 見出し行は画像が無く、文字列が見出しと一致する行(colspan や空セルの付き方は表ごとに違う)
      const single = !$(row).find("img").length;
      const label = plain($, row).replace(/\s+/g, "");
      const packImages = cols.map((c) => $(c).find("img").attr("alt") ?? "");
      if (packImages.some((a) => a.startsWith("Pack_"))) {
        if (groupDone) {
          nameRows = [];
          groupDone = false;
        }
        ids = packImages.map((a) => (a.startsWith("Pack_") ? imageId(a) : null));
        continue;
      }
      if (single && label === "パック") {
        nameRows = [];
        groupDone = false;
        continue;
      }
      if (single && /^出現E\.G\.Oギフト(\(共通\))?$/.test(label)) {
        expect = "common";
        continue;
      }
      if (single && /^出現E\.G\.Oギフト\(各/.test(label)) {
        expect = "split-label";
        continue;
      }
      if (single && label === "限定E.G.Oギフト") {
        expect = "limited";
        continue;
      }
      if (expect === "common") {
        const gifts = giftIds(cols[0]);
        for (const p of nameRows.flat()) p.gifts = gifts;
        expect = null;
        continue;
      }
      if (expect === "split-label") {
        labelCount = cols.filter((c) => plain($, c)).length;
        expect = "split";
        continue;
      }
      if (expect === "split") {
        for (const r of nameRows)
          for (let k = 0; k < labelCount; k++) if (r[k]) r[k].limitedGifts = giftIds(cols[k]);
        expect = null;
        groupDone = true;
        continue;
      }
      if (expect === "limited") {
        const last = nameRows.at(-1) ?? [];
        last.forEach((p, k) => {
          const c = cols[k];
          if (!c || !$(c).text().trim() && !$(c).find("img").length) return; // wiki 未記載
          p.limitedGifts = plain($, c) === "なし" ? [] : giftIds(c);
        });
        expect = null;
        groupDone = true;
        continue;
      }
      // パック名の行
      const names = cols.map((c) => plain($, c).replace(/\s+/g, "")).filter(Boolean);
      if (!names.length) continue;
      const rowPacks = names.map((name, k) => ({ name, id: ids[k] ?? null, category, gifts: [], limitedGifts: null }));
      nameRows.push(rowPacks);
      packs.push(...rowPacks);
      ids = [];
    }
  }
  return packs;
}

// ---- 合成レシピ ----
// 行: 素材1 | + | 素材2 | + | (素材3) | → | 合成ギフト。素材は「Ⅰ融解したパラフィン」のようにランク付きの名前で書かれている
export function parseFusions(html: string, gifts: MirrorGift[]): { fusions: MirrorFusion[]; unknown: string[] } {
  const $ = cheerio.load(html);
  const byName = new Map(gifts.map((g) => [g.name, g.id]));
  const ids = new Set(gifts.map((g) => g.id));
  const unknown: string[] = [];
  // 画像名が ID と一致すればそれを使い、無ければ名前で引く(画像の alt が名前になっている行がある)
  const resolve = (c: Element): string | undefined => {
    const fromImage = $(c)
      .find("img")
      .toArray()
      .map((i) => imageId($(i).attr("alt") ?? ""))
      .find((a) => ids.has(a));
    if (fromImage) return fromImage;
    const name = plain($, c).replace(/^(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|EX)/, "").trim();
    const id = byName.get(name);
    if (!id) unknown.push(name);
    return id;
  };
  const fusions: MirrorFusion[] = [];
  for (const row of $("#body table tr").toArray()) {
    const c = $(row).children("td, th").toArray();
    const arrow = c.findIndex((cell) => plain($, cell) === "→");
    if (arrow < 0 || !c[arrow + 1]) continue;
    const result = resolve(c[arrow + 1]);
    const materials = c
      .slice(0, arrow)
      .filter((cell) => !["+", ""].includes(plain($, cell)))
      .map(resolve);
    if (!result || materials.some((m) => !m)) continue;
    fusions.push({ result, materials: materials as string[] });
  }
  return { fusions, unknown };
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const gifts = parseGifts(await loadPage(GIFT_PAGE, refresh));
  const packs = parsePacks(await loadPage(PACK_PAGE, refresh));
  const { fusions, unknown } = parseFusions(await loadPage(FUSION_PAGE, refresh), gifts);
  for (const page of REFERENCE_PAGES) await loadPage(page, refresh);

  // パック表の画像名がギフト一覧に無いものは、表記揺れか wiki の更新漏れ。黙って捨てずに報告する
  const ids = new Set(gifts.map((g) => g.id));
  const missing = [...new Set(packs.flatMap((p) => [...p.gifts, ...(p.limitedGifts ?? [])]).filter((id) => !ids.has(id)))];

  mkdirSync(OUT_DIR, { recursive: true });
  const write = (name: string, data: unknown) =>
    writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 2) + "\n", "utf-8");
  write("gifts.json", gifts);
  write("packs.json", packs);
  write("fusions.json", fusions);

  console.log(`ギフト ${gifts.length}件 / パック ${packs.length}件 / 合成レシピ ${fusions.length}件`);
  if (missing.length) console.warn(`ギフト一覧に無い画像名(パック表): ${missing.join(", ")}`);
  if (unknown.length) console.warn(`ギフト一覧に無い名前(合成表): ${[...new Set(unknown)].join(", ")}`);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) await main();
