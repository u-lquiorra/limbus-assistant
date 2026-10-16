// Limbus Company 攻略Wiki (https://wikiwiki.jp/lcbwiki/) からキャラクター/人格データを取得するスクレイパー。
// 日本語版(wikiwiki.jp/lcbwiki)の表記を正として、キャラクター一覧ページと各キャラクターページのみを対象にする。
import axios from "axios";
import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type {
  PersonaStatus,
  SkillCell,
  PersonaSkills,
  PassiveEntry,
  CharacterData,
} from "../src/types.ts";

const BASE = "https://wikiwiki.jp/lcbwiki";
const OUT_DIR = join(import.meta.dirname, "..", "src", "data");

// 12人の罪人の日本語表記(ユーザー指定: このWikiの表記で統一する)
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

// 罪属性の色 → 日本語名 対応 (wikiwiki.jp/lcbwiki のトップページで確認した固定配色)
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

async function fetchPage(name: string): Promise<string> {
  const url = `${BASE}/${encodeURIComponent(name)}`;
  const res = await axios.get(url, {
    headers: {
      "User-Agent":
        "LimbusAssistant-FanApp/0.1 (personal non-commercial guide app; contact: oriori8731@gmail.com)",
    },
    timeout: 20000,
  });
  return res.data as string;
}

function cellText($: cheerio.CheerioAPI, el: cheerio.Element): string {
  const $el = $(el);
  const text = $el.text().trim();
  if (text) return text;
  const alt = $el.find("img").attr("alt");
  return alt ? alt.trim() : "";
}

function findTableByHeader(
  $: cheerio.CheerioAPI,
  predicate: (headers: string[]) => boolean
): cheerio.Cheerio<cheerio.Element> | null {
  const tables = $("table").toArray();
  for (const t of tables) {
    const headers = $(t)
      .find("thead th, thead td")
      .toArray()
      .map((h) => $(h).text().trim());
    if (headers.length && predicate(headers)) {
      return $(t) as unknown as cheerio.Cheerio<cheerio.Element>;
    }
  }
  return null;
}

function parseSkillCell(raw: string): SkillCell {
  const cell: SkillCell = { raw };
  // 例: "11 斬4(+7)*1"  -> Lv11, 斬, 威力4, (+7), コイン1枚
  const m = raw.match(/^(\d+)\s*([斬貫打]+)?(\d+)(?:\(\+(\d+)\))?\*(\d+)$/);
  if (m) {
    cell.levelReq = m[1];
    cell.type = m[2] ?? "";
    cell.power = m[3];
    cell.bonus = m[4] ?? "";
    cell.coins = m[5];
  }
  return cell;
}

function parseDefenseCell(valueRaw: string, levelReq: string, type: string): SkillCell {
  const raw = `${type}${valueRaw}`;
  const cell: SkillCell = { raw, levelReq, type };
  // 例: "107(+3)*1" -> 威力107, (+3), コイン1枚
  const m = valueRaw.match(/^(\d+)(?:\(\+(\d+)\))?\*(\d+)$/);
  if (m) {
    cell.power = m[1];
    cell.bonus = m[2] ?? "";
    cell.coins = m[3];
  }
  return cell;
}

function parseStatusTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<cheerio.Element>,
  characterName: string
): PersonaStatus[] {
  const headerCells = table.find("thead th, thead td").toArray();
  // ヘッダーの背景色から 列index -> 罪属性名 の対応を作る
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

    const resourceCost: Record<string, string> = {};
    for (const [idx, sin] of Object.entries(sinColumns)) {
      resourceCost[sin] = get(Number(idx));
    }

    result.push({
      code: get(0),
      name: get(2),
      character: get(3) || characterName,
      season: get(4),
      resourceCost,
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
  table: cheerio.Cheerio<cheerio.Element>,
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
      s1: parseSkillCell(get(4)),
      s2: parseSkillCell(get(5)),
      s3: parseSkillCell(get(6)),
      defenseSkill: parseDefenseCell(get(9), get(8), get(7)),
    });
  }
  return result;
}

function parsePassiveTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<cheerio.Element>,
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
      effect: get(4),
      condition: get(5) ?? "",
    });
  }
  return result;
}

async function scrapeCharacter(name: string): Promise<CharacterData> {
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

  return {
    name,
    profile: { name, profileText },
    statuses: statusTable ? parseStatusTable($, statusTable, name) : [],
    skills: skillTable ? parseSkillTable($, skillTable, name) : [],
    passives: passiveTable ? parsePassiveTable($, passiveTable, name) : [],
    supportPassives: supportPassiveTable ? parsePassiveTable($, supportPassiveTable, name) : [],
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const filterArg = process.argv[2];
  const targets = filterArg ? CHARACTERS.filter((n) => n === filterArg) : CHARACTERS;
  const all: CharacterData[] = [];
  for (const name of targets) {
    try {
      const data = await scrapeCharacter(name);
      all.push(data);
      writeFileSync(join(OUT_DIR, `${name}.json`), JSON.stringify(data, null, 2), "utf-8");
      console.log(`  -> 人格 ${data.statuses.length}件 取得`);
    } catch (e) {
      console.error(`失敗: ${name}`, e);
    }
    await sleep(1000); // サーバー負荷軽減のため1秒待機
  }

  writeFileSync(
    join(OUT_DIR, "characters.json"),
    JSON.stringify(
      all.map((c) => ({ name: c.name, profileText: c.profile.profileText, personaCount: c.statuses.length })),
      null,
      2
    ),
    "utf-8"
  );
  console.log("完了");
}

main();
