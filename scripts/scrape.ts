// Limbus Company 攻略Wiki (https://wikiwiki.jp/lcbwiki/) からキャラクター/人格データを取得するスクレイパー。
// 日本語版(wikiwiki.jp/lcbwiki)の表記を正として、キャラクター一覧ページと各キャラクターページのみを対象にする。
import axios from "axios";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import sharp from "sharp";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { parsePersonaPage, richText } from "./persona.ts";
import type {
  PersonaStatus,
  SkillCell,
  PersonaSkills,
  PassiveEntry,
  CharacterData,
  CharacterImages,
} from "../src/types.ts";

const BASE = "https://wikiwiki.jp/lcbwiki";
const OUT_DIR = join(import.meta.dirname, "..", "src", "data");
const PUBLIC_DIR = join(import.meta.dirname, "..", "public");
const PERSONA_OUT_DIR = join(OUT_DIR, "personas");
const CACHE_DIR = join(import.meta.dirname, "..", ".cache", "wiki");
const USER_AGENT =
  "LimbusAssistant-FanApp/0.1 (non-commercial fan guide; https://github.com/u-lquiorra/limbus-assistant)";

// 12人の囚人の日本語表記(ユーザー指定: このWikiの表記で統一する)
const CHARACTERS = [
  "イサン",
  "ファウスト",
  "ドンキホーテ",
  "良秀",
  "ムルソー",
  "ホンル",
  "ヒースクリフ",
  "イシュメール",
  "ロージャ",
  "シンクレア",
  "ウーティス",
  "グレゴール",
];

// 罪悪属性の色 → 日本語名 対応 (wikiwiki.jp/lcbwiki のトップページで確認した固定配色)
const SIN_COLOR_MAP: Record<string, string> = {
  red: "憤怒",
  orange: "色欲",
  yellow: "怠惰",
  lawngreen: "暴食",
  skyblue: "憂鬱",
  royalblue: "傲慢",
  blueviolet: "嫉妬",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// wikiwiki.jp は5秒間隔でも 429 を返したため、ページ取得は12秒間隔(毎分5件)にする
const PAGE_INTERVAL_MS = 12000;
const BACKOFF_SEC = [180, 420, 900];
let lastPageFetch = 0;
let useCacheGlobal = false;

class RateLimitedError extends Error {}

async function fetchHtml(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const wait = lastPageFetch + PAGE_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastPageFetch = Date.now();
    try {
      const res = await axios.get(url, { headers: { "User-Agent": USER_AGENT }, timeout: 20000 });
      return res.data as string;
    } catch (e) {
      if (!axios.isAxiosError(e) || e.response?.status !== 429) throw e;
      if (attempt >= BACKOFF_SEC.length) break;
      const retryAfter = Number(e.response.headers["retry-after"]) || BACKOFF_SEC[attempt];
      console.warn(`  429 Too Many Requests: ${retryAfter}秒待機してから再試行します`);
      await sleep(retryAfter * 1000);
    }
  }
  throw new RateLimitedError("wikiからアクセス制限(429)を受け続けたため中断しました");
}

// --cached 指定時はHTMLを .cache/ から再利用する(中断後の再開やパーサー調整時にwikiへ再アクセスしないため)
async function fetchCached(url: string, cacheKey: string): Promise<string> {
  const cachePath = join(CACHE_DIR, `${cacheKey}.html`);
  if (useCacheGlobal && existsSync(cachePath)) return readFileSync(cachePath, "utf-8");
  const html = await fetchHtml(url);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, html, "utf-8");
  return html;
}

async function fetchPage(name: string): Promise<string> {
  return fetchCached(`${BASE}/${encodeURIComponent(name)}`, `char-${name}`);
}

interface ImageVariant {
  relPath: string;
  width?: number; // 指定時はこの幅に縮小してwebpで保存
}

// 1回の取得で複数サイズを書き出す。全サイズが既に存在すれば取得しない(wikiのCDN負荷軽減)
async function downloadImage(url: string, variants: ImageVariant[]): Promise<(string | undefined)[]> {
  const missing = variants.filter((v) => !existsSync(join(PUBLIC_DIR, v.relPath)));
  if (!missing.length) return variants.map((v) => v.relPath);
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      responseType: "arraybuffer",
      timeout: 30000,
    });
    const buf = Buffer.from(res.data);
    for (const v of missing) {
      const absPath = join(PUBLIC_DIR, v.relPath);
      mkdirSync(dirname(absPath), { recursive: true });
      if (v.width) {
        await sharp(buf).resize({ width: v.width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(absPath);
      } else {
        writeFileSync(absPath, buf);
      }
    }
    await sleep(250);
    return variants.map((v) => v.relPath);
  } catch (e) {
    console.error(`  画像取得失敗: ${url}`, (e as Error).message);
    return variants.map(() => undefined);
  }
}

async function downloadOne(url: string, relPath: string): Promise<string | undefined> {
  return (await downloadImage(url, [{ relPath }]))[0];
}

function imageExt(url: URL): string {
  const m = decodeURIComponent(url.pathname).match(/\.(webp|png|jpe?g|gif)$/i);
  return m ? m[1].toLowerCase() : "png";
}

// 日本語のファイル名も残す(ASCII以外を潰すと別アイコン同士が同じ名前になる)
function safeFileName(name: string): string {
  return name.replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "") || "icon";
}

function cellText($: cheerio.CheerioAPI, el: Element): string {
  // 脚注マーカー(*5 など)が値に混ざるので除去する(例: "3*5" → "3")
  const $el = $(el).clone();
  $el.find("a.note_super").remove();
  const text = $el.text().trim();
  if (text) return text;
  const alt = $el.find("img").attr("alt");
  return alt ? alt.trim() : "";
}

function findTableByHeader(
  $: cheerio.CheerioAPI,
  predicate: (headers: string[]) => boolean
): cheerio.Cheerio<Element> | null {
  const tables = $("table").toArray();
  for (const t of tables) {
    const headers = $(t)
      .find("thead th, thead td")
      .toArray()
      .map((h) => $(h).text().trim());
    if (headers.length && predicate(headers)) {
      return $(t) as unknown as cheerio.Cheerio<Element>;
    }
  }
  return null;
}

function sinFromStyle(style: string | undefined): string | undefined {
  const m = style?.match(/color:\s*([a-z]+)/i);
  return m ? SIN_COLOR_MAP[m[1].toLowerCase()] : undefined;
}

// セル構造: <span style="color:<罪悪属性色>"><strong>最大威力</strong></span> 斬<br>4(+7)*1
function parseSkillCell($: cheerio.CheerioAPI, el: Element, typeOverride?: string): SkillCell {
  // 脚注マーカー(*10 など)が数値に混ざるので取り除いてから読む
  const $el = $(el).clone();
  $el.find("a.note_super").remove();
  const raw = $el.text().replace(/\s+/g, " ").trim();
  const cell: SkillCell = { raw };
  const span = $el.find("span.wikicolor").first();
  if (span.length) {
    cell.sin = sinFromStyle(span.attr("style"));
    cell.maxPower = span.text().trim();
  }
  span.remove();
  const rest = $el.text().replace(/\s+/g, " ").trim();
  // コイン威力 "(+7)" は表記されないこともある
  const m = rest.match(/^([^\d\s(]*)\s*(\d+)(?:\(([+-]\d+)\))?\*(\d+)/);
  if (m) {
    cell.type = typeOverride ?? (m[1] || undefined);
    cell.basePower = m[2];
    cell.coinPower = m[3] ?? "+0";
    cell.coins = m[4];
  } else if (typeOverride) {
    cell.type = typeOverride;
  }
  return cell;
}

function parseStatusTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<Element>,
  characterName: string
): PersonaStatus[] {
  const headerCells = table.find("thead th, thead td").toArray();
  // ヘッダーの背景色から 列index -> 罪悪属性名 の対応を作る
  const sinColumns: Record<number, string> = {};
  headerCells.forEach((h, i) => {
    const style = $(h).attr("style") ?? "";
    for (const [color, sin] of Object.entries(SIN_COLOR_MAP)) {
      if (style.includes(`color: ${color}`) || style.includes(`color:${color}`)) {
        sinColumns[i] = sin;
      }
    }
  });

  const rows = table.find("tbody tr").toArray();
  const result: PersonaStatus[] = [];
  for (const row of rows) {
    const cells = $(row).children().toArray();
    if (cells.length < 21) continue;
    const get = (i: number) => cellText($, cells[i]);

    const sinSkills: Record<string, string> = {};
    for (const [idx, sin] of Object.entries(sinColumns)) {
      sinSkills[sin] = get(Number(idx));
    }

    const affImg = $(cells[1]).find("img");
    const href = $(cells[2]).find("a").attr("href");
    result.push({
      code: get(0),
      name: get(2),
      character: get(3) || characterName,
      wikiUrl: href ? new URL(href, "https://wikiwiki.jp").toString() : undefined,
      // icon はここでは元URL。scrapeCharacter でローカルパスに置き換える
      affiliation: affImg.length
        ? { name: affImg.attr("alt")?.trim() ?? "", icon: affImg.attr("src") }
        : undefined,
      season: get(4),
      sinSkills,
      hp: get(13),
      defense: get(14),
      speed: get(15),
      level: get(16),
      attackTypes: get(17),
      resistance: { 斬: get(18), 貫: get(19), 打: get(20) },
    });
  }
  return result;
}

function parseSkillTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<Element>,
  characterName: string
): PersonaSkills[] {
  const rows = table.find("tbody tr").toArray();
  const result: PersonaSkills[] = [];
  for (const row of rows) {
    const cells = $(row).children().toArray();
    if (cells.length < 10) continue;
    const get = (i: number) => cellText($, cells[i]);
    result.push({
      code: get(0),
      name: get(1),
      character: get(2) || characterName,
      level: get(3),
      s1: parseSkillCell($, cells[4]),
      s2: parseSkillCell($, cells[5]),
      s3: parseSkillCell($, cells[6]),
      defenseSkill: parseSkillCell($, cells[9], get(7) || undefined),
    });
  }
  return result;
}

function parsePassiveTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<Element>,
  characterName: string
): PassiveEntry[] {
  const rows = table.find("tbody tr").toArray();
  const result: PassiveEntry[] = [];
  for (const row of rows) {
    const cells = $(row).children().toArray();
    if (cells.length < 5) continue;
    const get = (i: number) => cellText($, cells[i]);
    result.push({
      code: get(0),
      name: get(1),
      character: get(2) || characterName,
      persona: get(3),
      effect: richText($, cells[4]),
      condition: get(5) ?? "",
    });
  }
  return result;
}

async function scrapeImages(
  $: cheerio.CheerioAPI,
  number: string,
  statuses: PersonaStatus[]
): Promise<CharacterImages> {
  const images: CharacterImages = {};
  const imgs = $("img").toArray().map((el) => ({ alt: $(el).attr("alt") ?? "", src: $(el).attr("src") ?? "" }));

  // 公式X告知ポスター (wiki上の "<名前>_ポート.webp")
  const poster = imgs.find((i) => /_ポート\./.test(i.alt));
  if (poster) {
    [images.poster, images.posterThumb] = await downloadImage(poster.src, [
      { relPath: `images/sinners/${number}-poster.webp`, width: 900 },
      { relPath: `images/sinners/${number}-poster-thumb.webp`, width: 420 },
    ]);
  }

  // 人格イラスト ("id0101.webp", "id0102_2.webp" など。数字4桁が人格コード)
  const personaSrc = new Map<string, string>();
  for (const i of imgs) {
    const m = i.alt.match(/^id(\d{4})/);
    if (m && !personaSrc.has(m[1])) personaSrc.set(m[1], i.src);
  }
  for (const s of statuses) {
    const src = personaSrc.get(s.code);
    const imagePath = `images/personas/${s.code}.webp`;
    if (src) {
      s.image = await downloadOne(src, imagePath);
    } else if (existsSync(join(PUBLIC_DIR, imagePath))) {
      // wiki側で画像名が変わって見つからなくても、取得済みの画像があれば参照を残す
      console.warn(`  人格画像がページ上で見つからないため既存ファイルを使用: ${s.code} ${s.name}`);
      s.image = imagePath;
    } else {
      console.warn(`  人格画像が見つかりません: ${s.code} ${s.name}`);
    }

    if (s.affiliation?.icon) {
      // アイコン1つの不備でその囚人全体の取得を止めないよう、ここで握りつぶす
      try {
        const url = new URL(s.affiliation.icon, "https://wikiwiki.jp");
        const base = decodeURIComponent(url.pathname).split("/").pop() ?? "";
        const stem = safeFileName(base.replace(/(\.(png|webp|jpe?g|gif))+$/i, ""));
        s.affiliation.icon = await downloadOne(url.toString(), `images/affiliations/${stem}.${imageExt(url)}`);
      } catch (e) {
        console.error(`  所属アイコン処理失敗: ${s.code} ${s.affiliation.icon}`, (e as Error).message);
        s.affiliation.icon = undefined;
      }
    }
  }
  return images;
}

async function scrapeCharacter(name: string, number: string): Promise<CharacterData> {
  console.log(`取得中: ${name}`);
  const html = await fetchPage(name);
  const $ = cheerio.load(html);

  const profileText =
    $("h3:contains('プロフィール')").next().text().trim() ||
    $("table")
      .filter((_, t) => $(t).text().includes("プロフィール"))
      .first()
      .find("td")
      .last()
      .text()
      .trim();

  const statusTable = findTableByHeader($, (h) => h.includes("人格") && h.includes("体") && h.includes("速"));
  const skillTable = findTableByHeader($, (h) => h.includes("S1") && h.includes("S2") && h.includes("S3"));
  const passiveTable = findTableByHeader($, (h) => h.includes("パッシブ") && !h.includes("サポートパッシブ"));
  const supportPassiveTable = findTableByHeader($, (h) => h.includes("サポートパッシブ"));

  const statuses = statusTable ? parseStatusTable($, statusTable, name) : [];
  const images = await scrapeImages($, number, statuses);

  return {
    name,
    number,
    images,
    profile: { name, profileText },
    statuses,
    skills: skillTable ? parseSkillTable($, skillTable, name) : [],
    passives: passiveTable ? parsePassiveTable($, passiveTable, name) : [],
    supportPassives: supportPassiveTable ? parsePassiveTable($, supportPassiveTable, name) : [],
  };
}

async function scrapePersonaDetails(data: CharacterData) {
  mkdirSync(PERSONA_OUT_DIR, { recursive: true });
  for (const s of data.statuses) {
    if (!s.wikiUrl) continue;
    try {
      const html = await fetchCached(s.wikiUrl, s.code);
      const detail = parsePersonaPage(html, s.code);
      writeFileSync(join(PERSONA_OUT_DIR, `${s.code}.json`), JSON.stringify(detail, null, 2), "utf-8");
      const warn = detail.skills.length < 4 || detail.passives.length < 2 ? "  ⚠ 要確認" : "";
      console.log(`    ${s.code} ${s.name}: スキル${detail.skills.length} パッシブ${detail.passives.length}${warn}`);
    } catch (e) {
      if (e instanceof RateLimitedError) throw e;
      console.error(`    人格ページ取得失敗: ${s.code} ${s.name}`, (e as Error).message);
    }
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  useCacheGlobal = args.includes("--cached");
  const skipDetails = args.includes("--no-details");
  const filterArg = args.find((a) => !a.startsWith("--"));
  const targets = filterArg ? CHARACTERS.filter((n) => n === filterArg) : CHARACTERS;
  const iconBase = "https://cdn.wikiwiki.jp/to/w/lcbwiki/%E7%94%BB%E5%83%8F/::ref";
  for (const [file, out] of [
    ["SlashIcon.png", "slash"],
    ["PierceIcon.png", "pierce"],
    ["BluntIcon.png", "blunt"],
  ]) {
    await downloadOne(`${iconBase}/${file}`, `images/icons/${out}.png`);
  }

  let aborted = false;
  for (const name of targets) {
    try {
      const number = String(CHARACTERS.indexOf(name) + 1).padStart(2, "0");
      const data = await scrapeCharacter(name, number);
      writeFileSync(join(OUT_DIR, `${name}.json`), JSON.stringify(data, null, 2), "utf-8");
      console.log(`  -> 人格 ${data.statuses.length}件 取得`);
      if (!skipDetails) await scrapePersonaDetails(data);
    } catch (e) {
      if (e instanceof RateLimitedError) {
        console.error(e.message);
        aborted = true;
        break;
      }
      console.error(`失敗: ${name}`, e);
    }
  }

  writeCharacterList();
  console.log(aborted ? "中断しました。時間をおいて --cached 付きで再実行すると続きから取得します" : "完了");
}

// 一覧は今回の取得結果ではなくディスク上の全キャラJSONから作る(一部失敗しても欠けないように)
function writeCharacterList() {
  const list = CHARACTERS.flatMap((name) => {
    const path = join(OUT_DIR, `${name}.json`);
    if (!existsSync(path)) return [];
    const c = JSON.parse(readFileSync(path, "utf-8")) as CharacterData;
    // 中断などで旧形式(number/images なし)のJSONが残っていると画面が壊れるため、一覧に載せず警告する
    if (!c.number || !c.images) {
      console.warn(`  ${name}.json が旧形式のため一覧から除外しました。--cached 付きで再実行してください`);
      return [];
    }
    return [
      {
        name: c.name,
        number: c.number,
        posterThumb: c.images?.posterThumb,
        profileText: c.profile.profileText,
        personaCount: c.statuses.length,
      },
    ];
  });
  writeFileSync(join(OUT_DIR, "characters.json"), JSON.stringify(list, null, 2), "utf-8");
}

main();
