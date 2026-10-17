// 人格個別ページ (wikiwiki.jp/lcbwiki/人格/<囚人>/<人格>) のパーサー。
// 「基本情報」表(体力・混乱区間など)と、スキル/パッシブ表を読む。
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { Keyword, LabeledValue, PassiveDetail, PersonaDetail, SkillDetail } from "../src/types.ts";
import { SIN_ORDER } from "../src/sinColors.ts";
import { COIN_NUMERALS, COIN_PREFIX } from "../src/coins.ts";

type Row = cheerio.Cheerio<Element>;

// <br> を改行に、脚注マーカーは除去してテキスト化。
// wikiはコイン効果の続きを行頭の全角空白で字下げしているので、その1文字だけ残す
export function richText($: cheerio.CheerioAPI, el: Element): string {
  const clone = $(el).clone();
  clone.find("a.note_super").remove();
  clone.find("br").replaceWith("\n");
  return clone
    .text()
    .split("\n")
    .map((l) => {
      const indented = /^　/.test(l);
      const t = l.replace(/\s+/g, " ").trim();
      return t && indented ? `　${t}` : t;
    })
    .filter(Boolean)
    .join("\n");
}

function cellLabel($: cheerio.CheerioAPI, el: Element): string {
  return richText($, el).replace(/^　/, "").replace(/\*\d+$/, "").trim();
}

// 元から破壊不能: コイン行が "Ⅰ破壊不能コイン" で始まる。
// wikiには "Ⅰ[破壊不能コイン]" や半角の "I 破壊不能コイン" という表記揺れもある。
// 「破壊不能コインに変更」「〜として追加」「〜化」は効果による変化なので除外する
const INHERENT_LINE = new RegExp(`${COIN_PREFIX.source}\\[?破壊不能コイン\\]?(?!に|として|化)`);

export function inherentUnbreakable(effect: string): number[] {
  const out: number[] = [];
  for (const line of effect.split("\n")) {
    const m = line.match(INHERENT_LINE);
    if (m) out.push(COIN_NUMERALS[m[1]]);
  }
  return out;
}

// 効果で破壊不能になる: "破壊不能コインに変更される" "破壊不能コインとして1つ追加される" など
const BECOMES_UNBREAKABLE = /破壊不能コイン(に(変更|変わ|な)|化|として)/;

function bulletDepth(line: string): number {
  if (line.startsWith("・")) return 2;
  if (line.startsWith("-")) return 1;
  return 0;
}

function stripBullet(line: string): string {
  return line.replace(/^[-・]\s*/, "");
}

export function unbreakableByEffect(effect: string): string[] {
  const lines = effect.split("\n").map((l) => l.replace(/^　/, ""));
  const out: string[] = [];
  lines.forEach((line, i) => {
    if (!BECOMES_UNBREAKABLE.test(line)) return;
    // "- 全コインが…" のような箇条は、1段浅い直前の行("[戦闘開始時]" 等の見出し)とつなげる。
    // wikiの箇条は "-" が1段目、"・" がその下の2段目
    const depth = bulletDepth(line);
    if (depth > 0) {
      const body = stripBullet(line);
      const heading = lines.slice(0, i).findLast((l) => bulletDepth(l) < depth);
      out.push(heading ? `${stripBullet(heading)} ${body}` : body);
      return;
    }
    out.push(line);
  });
  return out;
}

// セル内の用語ツールチップ(状態異常の説明など)を集める
function keywordsIn($: cheerio.CheerioAPI, els: Element[]): Keyword[] {
  const out = new Map<string, string>();
  for (const el of els) {
    $(el)
      .find(".tooltip[data-tooltip-content]")
      .each((_, t) => {
        const term = $(t).text().trim();
        if (!term || out.has(term) || $(t).hasClass("note_super")) return;
        const $d = cheerio.load(`<div>${$(t).attr("data-tooltip-content") ?? ""}</div>`);
        $d("br").replaceWith("\n");
        $d("a").remove();
        const desc = $d("div")
          .text()
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .join("\n");
        if (desc) out.set(term, desc);
      });
  }
  return [...out].map(([term, desc]) => ({ term, desc }));
}

function cells(row: Row): Element[] {
  return row.children("td, th").toArray();
}

function firstText($: cheerio.CheerioAPI, row: Row | undefined): string {
  if (!row) return "";
  const c = cells(row);
  return c.length ? cellLabel($, c[0]) : "";
}

const PASSIVE_KINDS = ["バトル", "サポート"];

// スキル見出し行の1列目からスキル枠を決める。wikiの見出しは次の4通り:
//   [スキル1 | 名前 | ×3]       通常
//   [特殊 | 名前 | ×0]          wikiが「特殊」と明示
//   [名前 | ×0]                 枠ラベル無し = 直前のスキルの変化形 (例: Furioso-Replica はスキル3の下)
//   [名前 | ×1]                 枠ラベル無し だが ×3/×2/×1 がまだ出ていない枠なら、ラベルが抜けている通常スキル
// 守備タイプ列を持つラベル無しは特殊守備スキル (例: 超速護衛)。"守備スキル~" のような表記揺れも守備スキルに寄せる
export function classifySlot(
  label: string,
  copies: string | undefined,
  isDefense: boolean,
  previous: SkillDetail[]
): { slot: string; special: boolean; labeled: boolean } {
  const numbered = label.match(/^スキル\s*(\d+)/);
  if (numbered) return { slot: `スキル${numbered[1]}`, special: false, labeled: true };
  if (/^守備スキル/.test(label)) return { slot: "守備スキル", special: false, labeled: true };
  if (label === "特殊") return { slot: "特殊", special: true, labeled: true };

  if (isDefense) return { slot: "守備スキル", special: true, labeled: false };
  const prevSlot = previous.findLast((s) => /^スキル\d+$/.test(s.slot))?.slot;
  const prevNum = prevSlot ? Number(prevSlot.replace("スキル", "")) : 0;
  const n = Number(copies?.replace("×", "") ?? 0);
  const expected = n >= 1 && n <= 3 ? 4 - n : 0; // ×3→スキル1, ×2→スキル2, ×1→スキル3
  if (expected && expected > prevNum) return { slot: `スキル${expected}`, special: false, labeled: false };
  return { slot: prevSlot ?? "特殊", special: true, labeled: false };
}

function sinOf($: cheerio.CheerioAPI, el: Element): string | undefined {
  const alt = $(el).find("img").attr("alt") ?? "";
  const text = richText($, el);
  return SIN_ORDER.find((s) => alt.includes(s) || text.includes(s));
}

// パッシブ表のヘッダー行 [必要資源 | 条件 | パッシブ効果]。
// wiki側で1列目が誤記されているページがあるため、2列目以降で判定する
function isPassiveHeader($: cheerio.CheerioAPI, row: Row | undefined): boolean {
  if (!row) return false;
  const labels = cells(row).map((c) => cellLabel($, c));
  return labels.includes("条件") && labels.some((l) => l.includes("効果"));
}

function parseSkillsAndPassives($: cheerio.CheerioAPI): { skills: SkillDetail[]; passives: PassiveDetail[] } {
  const skills: SkillDetail[] = [];
  const passives: PassiveDetail[] = [];

  const tables = $("table")
    .toArray()
    .filter((t) =>
      $(t)
        .find("tr")
        .toArray()
        .some((r) => firstText($, $(r)) === "罪悪属性" || isPassiveHeader($, $(r)))
    );

  for (const t of tables) {
    const rows = $(t).find("tr").toArray().map((r) => $(r));
    let current: { effectRows: Element[]; skill?: SkillDetail } | null = null;

    const flush = () => {
      if (current?.skill) {
        const s = current.skill;
        s.effect = current.effectRows.map((e) => richText($, e)).filter(Boolean).join("\n");
        s.keywords = keywordsIn($, current.effectRows);
        const inherent = inherentUnbreakable(s.effect);
        if (inherent.length) s.unbreakableCoins = inherent;
        const byEffect = unbreakableByEffect(s.effect);
        if (byEffect.length) s.unbreakableByEffect = byEffect;
        skills.push(s);
      }
      current = null;
    };

    for (let i = 0; i < rows.length; i++) {
      const next = firstText($, rows[i + 1]);

      if (next === "罪悪属性") {
        // 見出し行: [スキル1 | 撃勢 | ×3]
        flush();
        const title = cells(rows[i]).map((c) => cellLabel($, c));
        const header = cells(rows[i + 1]).map((c) => cellLabel($, c));
        const valueCells = rows[i + 2] ? cells(rows[i + 2]) : [];
        const isDefense = header.some((h) => h.startsWith("守備"));
        const copies = title.find((v) => /^×\d+$/.test(v));
        const { slot, special, labeled } = classifySlot(title[0] ?? "", copies, isDefense, skills);
        const skill: SkillDetail = {
          slot,
          name: (labeled ? title[1] : title[0]) ?? "",
          copies,
          stats: [],
          effect: "",
          keywords: [],
          ...(special ? { special: true } : {}),
        };
        header.forEach((label, idx) => {
          const el = valueCells[idx];
          if (!el || !label) return;
          if (label === "罪悪属性") skill.sin = sinOf($, el);
          else if (/タイプ$/.test(label)) skill.attackType = richText($, el);
          else skill.stats.push({ label, value: richText($, el) });
        });
        current = { effectRows: [], skill };
        i += 2;
        continue;
      }

      // 別レイアウト: [バトル | 名前 | パッシブ効果] / [必要資源 | 条件 | 効果本文(縦結合)] / [憂鬱×2 | 共鳴]
      const titleCells = cells(rows[i]);
      const titleLabels = titleCells.map((c) => cellLabel($, c));
      const nextLabels = rows[i + 1] ? cells(rows[i + 1]).map((c) => cellLabel($, c)) : [];
      if (
        PASSIVE_KINDS.includes(titleLabels[0] ?? "") &&
        titleLabels.at(-1)?.includes("効果") &&
        nextLabels[0] === "必要資源" &&
        nextLabels[1] === "条件"
      ) {
        flush();
        const effectCell = cells(rows[i + 1])[2];
        const valueCells = rows[i + 2] ? cells(rows[i + 2]) : [];
        passives.push({
          kind: titleLabels[0],
          name: titleLabels[1] ?? "",
          resource: valueCells[0] ? richText($, valueCells[0]) : undefined,
          condition: valueCells[1] ? richText($, valueCells[1]) : undefined,
          effect: effectCell ? richText($, effectCell) : "",
          keywords: keywordsIn($, effectCell ? [effectCell] : []),
        });
        i += 2;
        continue;
      }

      if (isPassiveHeader($, rows[i + 1])) {
        // パッシブ: [バトル | 冷静] / [必要資源 | 条件 | パッシブ効果] / 値
        flush();
        const title = cells(rows[i]).map((c) => cellLabel($, c));
        const header = cells(rows[i + 1]).map((c) => cellLabel($, c));
        const valueCells = rows[i + 2] ? cells(rows[i + 2]) : [];
        const valueAt = (idx: number) => (idx >= 0 && valueCells[idx] ? richText($, valueCells[idx]) : undefined);
        const effectIdx = header.findIndex((h) => h.includes("効果"));
        const conditionIdx = header.indexOf("条件");
        // 通常は [バトル | 名前]。同じ種類のパッシブが続く場合は [名前] だけの見出しになる
        const hasKind = PASSIVE_KINDS.includes(title[0] ?? "");
        const kind = hasKind ? title[0] : (passives.at(-1)?.kind ?? "バトル");
        passives.push({
          kind,
          name: (hasKind ? title[1] : title[0]) ?? "",
          resource: valueAt(conditionIdx - 1),
          condition: valueAt(conditionIdx),
          effect: effectIdx >= 0 && valueCells[effectIdx] ? richText($, valueCells[effectIdx]) : "",
          keywords: keywordsIn($, valueCells),
        });
        i += 2;
        continue;
      }

      // スキル値行の後に続く行は効果テキスト
      if (current) {
        const c = cells(rows[i]);
        const text = c.map((e) => richText($, e)).join("");
        if (text) current.effectRows.push(...c);
      }
    }
    flush();
  }
  for (const p of passives) {
    const lines = unbreakableByEffect(p.effect);
    if (lines.length) p.unbreakableByEffect = lines;
  }
  return { skills, passives };
}

function parseInfo($: cheerio.CheerioAPI): { ruby?: string; info: LabeledValue[] } {
  const table = $("table")
    .toArray()
    .find((t) =>
      $(t)
        .find("tr")
        .toArray()
        .some((r) => ["特性キーワード", "パニックタイプ"].includes(firstText($, $(r))))
    );
  if (!table) return { info: [] };

  const rows = $(table).find("tr").toArray().map((r) => $(r));
  const ruby = rows[0] ? richText($, cells(rows[0])[0]).replace(/\n/g, " ") : undefined;
  const info: LabeledValue[] = [];
  for (const row of rows) {
    const c = cells(row).filter((el) => richText($, el));
    if (c.length < 2) continue;
    const [labelEl, valueEl] = c.slice(-2);
    const label = cellLabel($, labelEl).replace(/\n/g, "・");
    const value = richText($, valueEl);
    if (!label || !value || label.length > 12) continue;
    if (["斬撃", "貫通", "打撃"].includes(label)) continue; // 耐性は一覧データ側にある
    info.push({ label, value });
  }
  return { ruby, info };
}

export function parsePersonaPage(html: string, code: string): PersonaDetail {
  const $ = cheerio.load(html);
  const { ruby, info } = parseInfo($);
  const { skills, passives } = parseSkillsAndPassives($);
  return { code, ruby, info, skills, passives };
}
