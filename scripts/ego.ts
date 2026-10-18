// E.G.O のパーサー。
// - 囚人ページ (wikiwiki.jp/lcbwiki/<囚人>) の「E.G.O一覧」表 → EgoSummary[]
// - E.G.O 個別ページ (wikiwiki.jp/lcbwiki/E.G.O/<囚人>/<E.G.O>) の「基本情報」「専用効果」→ EgoDetail
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { EgoDetail, EgoPassiveDetail, EgoSkillDetail, EgoSummary, Keyword, LabeledValue } from "../src/types.ts";
import { SIN_ORDER } from "../src/sinColors.ts";
import { stripStageMarks } from "../src/egoStage.ts";
import { inherentUnbreakable, keywordsIn, normalizeLines, richText } from "./persona.ts";

const RANKS: Record<string, string> = { Z: "ZAYIN", T: "TETH", H: "HE", W: "WAW", A: "ALEPH" };

// wiki は「解析段階 Ⅱ / Ⅲ / Ⅳ で表示」とし、解析Ⅲで変わる部分を crimson、解析Ⅳで変わる部分を mediumspringgreen で塗る。
// 属性耐性の「脆弱」も crimson なので、この判定は効果文・スキル数値のセルにだけ使う
const STAGE_COLORS: [RegExp, string][] = [
  [/color:\s*crimson/i, "Ⅲ"],
  [/color:\s*mediumspringgreen/i, "Ⅳ"],
];

function stageOf(node: AnyNode, root: AnyNode): string | undefined {
  for (let p = node.parent; p && p !== root; p = p.parent) {
    if (p.type !== "tag") continue;
    const el = p as Element;
    if (el.name !== "span" || !/\bwikicolor\b/.test(el.attribs.class ?? "")) continue;
    const style = el.attribs.style ?? "";
    // 一番内側の色指定を採用する(罪悪属性色の span の中に段階色がある場合など)
    for (const [re, stage] of STAGE_COLORS) if (re.test(style)) return stage;
    return undefined;
  }
  return undefined;
}

// 行頭のコイン番号・字下げの全角空白は印の外に出す(EffectText がコイン行・続き行として判定できるように)
const LEADING_IN_MARK = /^〘(Ⅲ|Ⅳ):(　?)([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]?)/;

// richText と同じ整形に、解析段階の印 〘Ⅲ:…〙 / 〘Ⅳ:…〙 を加えたテキスト化
export function stagedText($: cheerio.CheerioAPI, el: Element): string {
  const clone = $(el).clone();
  clone.find("a.note_super").remove();
  const root = clone.get(0);
  if (!root) return "";
  // <br> を改行にする前に包む。改行をまたぐ印を作らないため、テキストノード単位で囲む
  const walk = (n: AnyNode) => {
    if (n.type === "text") {
      const stage = stageOf(n, root);
      const t = n as unknown as { data: string };
      if (stage) {
        t.data = t.data
          .split("\n")
          .map((seg) => (seg.trim() ? `〘${stage}:${seg}〙` : seg))
          .join("\n");
      }
      return;
    }
    if ("children" in n) for (const c of n.children) walk(c);
  };
  walk(root);
  clone.find("br").replaceWith("\n");

  let text = clone.text();
  // ツールチップなどでテキストノードが分かれた隣り合う同じ段階の印をつなぐ
  for (let prev = ""; prev !== text; ) {
    prev = text;
    text = text.replace(/〘(Ⅲ|Ⅳ):([^〘〙\n]*)〙([ \t]*)〘\1:/g, "〘$1:$2$3");
  }
  const lines = text.split("\n").map((l) =>
    l
      .replace(/^[ \t\r]+/, "")
      .replace(LEADING_IN_MARK, (m, stage: string, indent: string, coin: string) =>
        indent || coin ? `${indent}${coin}〘${stage}:` : m
      )
      .replace(/〘(Ⅲ|Ⅳ):\s*〙/g, "")
  );
  return normalizeLines(lines.join("\n"));
}

type Row = cheerio.Cheerio<Element>;

function cells(row: Row): Element[] {
  return row.children("td, th").toArray();
}

function plain($: cheerio.CheerioAPI, el: Element | undefined): string {
  if (!el) return "";
  return richText($, el).replace(/\n/g, " ").trim();
}

// ---- 囚人ページの E.G.O 一覧 ----
// 列: # | E.G.O | 囚人 | ★ | 罪 | 攻 | 必要資源(憤怒〜嫉妬の7列) | 属性耐性(7列) | 備考
export function parseEgoList(html: string, characterName: string): EgoSummary[] {
  const $ = cheerio.load(html);
  const out = new Map<string, EgoSummary>();
  const tables = $("table")
    .toArray()
    .filter((t) => {
      const head = $(t).find("thead").text();
      return head.includes("E.G.O") && head.includes("備考") && head.includes("罪");
    });
  for (const t of tables) {
    for (const r of $(t).find("tbody tr").toArray()) {
      const c = cells($(r));
      if (c.length < 21) continue;
      const code = plain($, c[0]);
      if (!/^\d{4}$/.test(code) || out.has(code)) continue;
      const href = $(c[1]).find("a").attr("href");
      const cost: Record<string, string> = {};
      const resistance: Record<string, string> = {};
      SIN_ORDER.forEach((sin, i) => {
        cost[sin] = plain($, c[6 + i]);
        resistance[sin] = plain($, c[13 + i]) || "1";
      });
      const rankLetter = plain($, c[3]);
      const sinText = plain($, c[4]);
      out.set(code, {
        code,
        name: plain($, c[1]),
        character: plain($, c[2]) || characterName,
        wikiUrl: href ? new URL(href, "https://wikiwiki.jp").toString() : undefined,
        rank: RANKS[rankLetter] ?? rankLetter,
        sin: SIN_ORDER.find((s) => sinText.includes(s)),
        attackTypes: plain($, c[5]),
        cost,
        resistance,
        note: plain($, c[20]),
      });
    }
  }
  return [...out.values()];
}

// ---- E.G.O 個別ページ ----

// ページ上部のタブ枠も表で組まれていて内側の表の行を含むため、入れ子の表を持たない表だけを見る
function findTables($: cheerio.CheerioAPI, pred: (firstCells: string[]) => boolean): Element[] {
  return $("#body table")
    .toArray()
    .filter((t) => $(t).find("table").length === 0)
    .filter((t) =>
      $(t)
        .find("tr")
        .toArray()
        .some((r) => pred(cells($(r)).map((c) => plain($, c))))
    );
}

function parseInfo(
  $: cheerio.CheerioAPI,
  table: Element | undefined
): { ruby?: string; origin?: string; info: LabeledValue[]; imageSrc?: string } {
  if (!table) return { info: [] };
  const rows = $(table).find("tr").toArray().map((r) => $(r));
  const ruby = rows[0]?.find("rt").first().text().trim() || undefined;
  // 2行目が全幅の1セルなら、元になった幻想体・コラボ元の表記
  const second = rows[1] ? cells(rows[1]) : [];
  const origin =
    second.length === 1 && Number($(second[0]).attr("colspan") ?? 1) >= 5 ? plain($, second[0]) || undefined : undefined;
  const info: LabeledValue[] = [];
  for (const row of rows) {
    const c = cells(row).filter((el) => plain($, el));
    if (c.length < 2) continue;
    const [labelEl, valueEl] = c.slice(-2);
    const label = richText($, labelEl).replace(/\n/g, "");
    const value = richText($, valueEl).replace(/\n/g, " ");
    if (label && value && label.length <= 20) info.push({ label, value });
  }
  const imageSrc = $(table).find("img").first().attr("src");
  return { ruby, origin, info, imageSrc };
}

function infoValue(info: LabeledValue[], label: string): string | undefined {
  return info.find((i) => i.label === label)?.value;
}

function parseSkillTable(
  $: cheerio.CheerioAPI,
  table: Element | undefined,
  info: LabeledValue[]
): Pick<EgoDetail, "cost" | "resistance" | "skills" | "passives"> {
  const result: Pick<EgoDetail, "cost" | "resistance" | "skills" | "passives"> = {
    cost: [],
    resistance: [],
    skills: [],
    passives: [],
  };
  if (!table) return result;
  const rows = $(table).find("tr").toArray().map((r) => $(r));
  for (let i = 0; i < rows.length; i++) {
    const c = cells(rows[i]);
    const first = plain($, c[0]);

    if (first === "コスト" && rows[i + 1]) {
      const text = plain($, cells(rows[i + 1])[0]);
      for (const m of text.matchAll(new RegExp(`(${SIN_ORDER.join("|")})\\s*[x×]\\s*(\\d+)`, "g"))) {
        result.cost.push({ sin: m[1], count: Number(m[2]) });
      }
      i += 1;
      continue;
    }

    if (first === "属性耐性" && rows[i + 2]) {
      const labels = cells(rows[i + 1]).map((el) => plain($, el));
      const values = cells(rows[i + 2]).map((el) => plain($, el));
      labels.forEach((sin, idx) => {
        if ((SIN_ORDER as readonly string[]).includes(sin)) result.resistance.push({ sin, value: values[idx] ?? "" });
      });
      i += 2;
      continue;
    }

    // 覚醒スキルが複数あるE.G.Oは見出しが「覚醒スキル 汚血泣涙-始」のように名前入りになる
    const kindMatch = first.match(/^(覚醒|侵蝕)スキル(?:\s*(.+))?$/);
    if (kindMatch) {
      const kind = kindMatch[1] as EgoSkillDetail["kind"];
      const header = c.slice(1).map((el) => plain($, el));
      // 値行の1列目は効果行まで縦結合された空セル
      const valueCells = rows[i + 1] ? cells(rows[i + 1]).slice(1) : [];
      const effectCells = rows[i + 2] ? cells(rows[i + 2]) : [];
      const stats: LabeledValue[] = [];
      header.forEach((label, idx) => {
        const el = valueCells[idx];
        if (label && el) stats.push({ label, value: stagedText($, el) });
      });
      const effect = effectCells.map((el) => stagedText($, el)).filter(Boolean).join("\n");
      const skill: EgoSkillDetail = {
        kind,
        ...(kindMatch[2] ? { name: kindMatch[2] } : {}),
        attackType: infoValue(info, `攻撃タイプ(${kind})`) ?? infoValue(info, "攻撃タイプ"),
        stats,
        effect,
        keywords: keywordsIn($, effectCells),
      };
      const inherent = inherentUnbreakable(stripStageMarks(effect));
      if (inherent.length) skill.unbreakableCoins = inherent;
      result.skills.push(skill);
      i += 2;
      continue;
    }

    if (first === "パッシブ") {
      const effectCells = rows[i + 1] ? cells(rows[i + 1]) : [];
      const effectEl = effectCells.at(-1);
      const passive: EgoPassiveDetail = {
        name: plain($, c[1]),
        effect: effectEl ? stagedText($, effectEl) : "",
        keywords: keywordsIn($, effectEl ? [effectEl] : []),
      };
      result.passives.push(passive);
      i += 1;
    }
  }
  return result;
}

// 「専用効果」見出し(h3)から次の見出しまでにある表の [アイコン | 名前 | 説明 | …] 行
function parseSpecialEffects($: cheerio.CheerioAPI): Keyword[] {
  const start = $("#body h3")
    .toArray()
    .find((h) => $(h).text().trim() === "専用効果");
  if (!start) return [];
  const out: Keyword[] = [];
  for (let el = start.next; el; el = el.next) {
    if (el.type !== "tag") continue;
    if (/^h[1-3]$/i.test((el as Element).tagName)) break;
    const tables = $(el).is("table") ? [el as Element] : $(el).find("table").toArray();
    for (const t of tables) {
      for (const r of $(t).find("tr").toArray()) {
        const c = cells($(r));
        if (c.length < 3) continue;
        const term = plain($, c[1]);
        const desc = richText($, c[2]);
        if (term && desc && !out.some((k) => k.term === term)) out.push({ term, desc });
      }
    }
  }
  return out;
}

export function parseEgoPage(html: string, code: string): { detail: EgoDetail; imageSrc?: string } {
  const $ = cheerio.load(html);
  const infoTable = findTables($, (c) => c.includes("危険ランク"))[0];
  const { ruby, origin, info, imageSrc } = parseInfo($, infoTable);
  // 解析Ⅴが実装された E.G.O は、スキル表がタブで2つ(解析Ⅴ → 解析Ⅰ〜Ⅳ の順)ある。1つ目を本体、2つ目を earlier に持つ
  const [skillTable, earlierTable] = findTables($, (c) => /^覚醒スキル/.test(c[0] ?? ""));
  const { cost, resistance, skills, passives } = parseSkillTable($, skillTable, info);
  // 2つ目の表は、解析Ⅴの記載が無いページでは別ページの旧版などの埋め込みなので、解析Ⅴがあるときだけ採用する
  const hasStageV = info.some((i) => i.label.startsWith("解析Ⅴ"));
  const earlier = hasStageV && earlierTable ? parseSkillTable($, earlierTable, info) : undefined;
  return {
    detail: {
      code,
      ruby,
      origin,
      info,
      cost,
      resistance,
      skills,
      passives,
      ...(earlier ? { earlier: { skills: earlier.skills, passives: earlier.passives } } : {}),
      specialEffects: parseSpecialEffects($),
    },
    imageSrc,
  };
}
