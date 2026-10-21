// 内容が変わったページの URL を IndexNow(Bing など)へ知らせる。Google は IndexNow に対応していない。
// 変わったかどうかは、各ページの HTML のハッシュを、前回公開した dist/indexnow-state.json と比べて決める
// (sitemap の lastmod は一覧ページなどで空のため使えない)。デプロイの GitHub Actions から2段階で実行する。
//   npx tsx scripts/indexnow.ts prepare <一覧の出力先>   ビルド後・公開前。送る URL の一覧と、今回の状態(dist/indexnow-state.json)を書く
//   npx tsx scripts/indexnow.ts submit <一覧のパス>      公開後。一覧を IndexNow に送る
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** src/seo.ts の SITE_URL と同じ(indexnow.test.ts が一致を確かめる) */
export const SITE_URL = "https://limbus-assistant.com";
/** public/<KEY>.txt に同じ文字列を置く。キーは公開される前提のもので、秘密情報ではない */
export const KEY = "ff60ad451449a9a60d9ab77000e0f631";
export const STATE_FILE = "indexnow-state.json";
const ENDPOINT = "https://api.indexnow.org/indexnow";
// IndexNow の1回の送信の上限
const MAX_URLS = 10_000;

const DIST = join(import.meta.dirname, "..", "dist");

export interface IndexNowState {
  /** URL → ページ内容のハッシュ */
  pages: Record<string, string>;
}

/**
 * ページ内容のハッシュ。/assets/ のファイル名はビルドごとに変わるため伏せてから計算する
 * (CSS・JS だけの変更では本文は変わらないので、送らなくてよい)
 */
export function pageHash(html: string): string {
  const normalized = html.replace(/\/assets\/[^"'\s)]+/g, "/assets/*");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/** sitemap.xml の <loc> の一覧 */
export function sitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

/** 前回から新しく増えた・内容が変わった・無くなったページの URL。前回の状態が無ければ全ページ */
export function changedUrls(previous: IndexNowState | undefined, current: IndexNowState): string[] {
  if (!previous) return Object.keys(current.pages);
  const changed = Object.entries(current.pages).filter(([url, hash]) => previous.pages[url] !== hash).map(([url]) => url);
  // 消えたページも知らせると、検索結果から早く外れる(取りに来て 404 を見る)
  const removed = Object.keys(previous.pages).filter((url) => !(url in current.pages));
  return [...changed, ...removed];
}

/** 公開中の前回の状態。初回(404)は undefined */
async function fetchPreviousState(): Promise<IndexNowState | undefined> {
  const res = await fetch(`${SITE_URL}/${STATE_FILE}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`前回の状態を取得できない: HTTP ${res.status}`);
  return (await res.json()) as IndexNowState;
}

async function prepare(outPath: string): Promise<void> {
  const urls = sitemapUrls(readFileSync(join(DIST, "sitemap.xml"), "utf-8"));
  const current: IndexNowState = { pages: {} };
  for (const url of urls) {
    // https://limbus-assistant.com/persona/1001/ → dist/persona/1001/index.html(scripts/prerender.ts と同じ配置)
    const parts = decodeURIComponent(new URL(url).pathname).split("/").filter(Boolean);
    current.pages[url] = pageHash(readFileSync(join(DIST, ...parts, "index.html"), "utf-8"));
  }

  let previous: IndexNowState | undefined;
  try {
    previous = await fetchPreviousState();
    if (!previous) console.log("前回の状態が無い(初回)ため、全ページを送る");
  } catch (e) {
    // 取得の失敗で公開を止めないよう、全ページを送る側に倒す。全件送っても害は無い
    console.error("前回の状態を読めなかったため、全ページを送る", e);
  }

  const changed = changedUrls(previous, current);
  writeFileSync(join(DIST, STATE_FILE), JSON.stringify(current));
  writeFileSync(outPath, JSON.stringify(changed, null, 2));
  console.log(`IndexNow: 送る URL ${changed.length} 件 / 全 ${urls.length} ページ`);
}

async function submit(listPath: string): Promise<void> {
  const urls = JSON.parse(readFileSync(listPath, "utf-8")) as string[];
  if (urls.length === 0) {
    console.log("IndexNow: 変わったページが無いため送らない");
    return;
  }
  // キーのファイルが公開されていないと送信が拒否されるため、先に確かめて原因を分かりやすくする
  const keyLocation = `${SITE_URL}/${KEY}.txt`;
  const keyRes = await fetch(keyLocation);
  const keyText = keyRes.ok ? (await keyRes.text()).trim() : "";
  if (keyText !== KEY) throw new Error(`キーのファイルが公開されていない、または中身が違う: ${keyLocation}(HTTP ${keyRes.status})`);

  for (let i = 0; i < urls.length; i += MAX_URLS) {
    const urlList = urls.slice(i, i + MAX_URLS);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE_URL).host, key: KEY, keyLocation, urlList }),
    });
    // 200: 受理、202: 受理(キーの確認待ち)。それ以外は失敗
    if (res.status !== 200 && res.status !== 202) {
      throw new Error(`IndexNow への送信に失敗した: HTTP ${res.status} ${await res.text()}`);
    }
    console.log(`IndexNow: ${urlList.length} 件を送った(HTTP ${res.status})`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, path] = process.argv.slice(2);
  if (!path || (command !== "prepare" && command !== "submit")) {
    console.error("使い方: tsx scripts/indexnow.ts prepare|submit <一覧のパス>");
    process.exit(1);
  }
  await (command === "prepare" ? prepare(path) : submit(path));
}
