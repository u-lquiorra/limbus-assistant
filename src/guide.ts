// 攻略ガイド(src/data/guides/*.md)の簡易パーサー。
// ガイドは決まった書式(frontmatter / "## 見出し" / "- 箇条書き" / 段落 / **強調**)だけで書くため、
// Markdown ライブラリは入れずに必要な分だけ解釈する。HTML は生成せず、描画側でテキストとして出す(XSS 対策)

import type { EgoDetail, Keyword, PersonaDetail } from "./types";
import { stripStageMarks } from "./egoStage";

// persona: 人格詳細ページへのリンク。本文に [表示名](persona:0112) と書く(E.G.O ガイドの「編成・相性」で使う)
export type InlineSegment = { text: string; strong: boolean; persona?: string };

export type GuideBlock = { type: "p"; text: InlineSegment[] } | { type: "ul"; items: InlineSegment[][] };

export interface GuideSection {
  heading: string;
  blocks: GuideBlock[];
}

export interface Guide {
  meta: Record<string, string>;
  sections: GuideSection[];
}

const PERSONA_LINK = /\[([^\]]+)\]\(persona:(\d{4})\)/g;

// リンク記法を取り出して分割する。リンクの無い断片は { text, strong } のまま
function splitLinks(text: string, strong: boolean): InlineSegment[] {
  const out: InlineSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(PERSONA_LINK)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), strong });
    out.push({ text: m[1], strong, persona: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), strong });
  return out;
}

export function parseInline(text: string): InlineSegment[] {
  // "**" で区切ると奇数番目が強調部分になる
  const parts = text.split("**");
  // 閉じ忘れた "**" は強調せず、文字のまま直前の通常部分に戻す
  if (parts.length % 2 === 0) {
    const tail = parts.pop() ?? "";
    parts[parts.length - 1] += `**${tail}`;
  }
  return parts.flatMap((part, i) => (part ? splitLinks(part, i % 2 === 1) : []));
}

function parseFrontmatter(lines: string[]): { meta: Record<string, string>; body: string[] } {
  if (lines[0]?.trim() !== "---") return { meta: {}, body: lines };
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) return { meta: {}, body: lines };
  const meta: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return { meta, body: lines.slice(end + 1) };
}

export function parseGuide(markdown: string): Guide {
  const { meta, body } = parseFrontmatter(markdown.replace(/\r\n?/g, "\n").split("\n"));
  const sections: GuideSection[] = [];
  let current: GuideSection | undefined;
  let paragraph: string[] = [];
  let list: InlineSegment[][] | undefined;

  const flush = () => {
    if (!current) return;
    if (paragraph.length) current.blocks.push({ type: "p", text: parseInline(paragraph.join("")) });
    if (list) current.blocks.push({ type: "ul", items: list });
    paragraph = [];
    list = undefined;
  };

  for (const raw of body) {
    const line = raw.trim();
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flush();
      current = { heading: heading[1], blocks: [] };
      sections.push(current);
      continue;
    }
    // 最初の見出しより前の本文は表示対象にしない
    if (!current) continue;
    if (!line) {
      flush();
      continue;
    }
    const item = line.match(/^-\s+(.+)$/);
    if (item) {
      if (paragraph.length) flush();
      (list ??= []).push(parseInline(item[1]));
      continue;
    }
    if (list) flush();
    paragraph.push(line);
  }
  flush();
  return { meta, sections };
}

// ガイド本文でツールチップを付ける固有名詞の一覧。
// - 用語: 人格データの keywords をそのまま使う
// - スキル名・パッシブ名: 「ガード」「回避」のような汎用名の誤爆を避けるため、「」で囲んだ形だけを対象にする
export function guideKeywords(detail: PersonaDetail): Keyword[] {
  const map = new Map<string, string>();
  for (const k of [...detail.skills, ...detail.passives].flatMap((x) => x.keywords)) {
    if (!map.has(k.term)) map.set(k.term, k.desc);
  }
  for (const s of detail.skills) {
    const slot = s.slot.replace(/^スキル/, "S").replace(/^守備スキル$/, "守備");
    const head = [
      s.special && s.slot !== "特殊" ? `${slot}(特殊)` : slot,
      s.form && `[${s.form}]`,
      [s.sin, s.attackType].filter(Boolean).join("・"),
    ]
      .filter(Boolean)
      .join(" ");
    const term = `「${s.name.replace(/\n/g, "")}」`;
    if (!map.has(term)) map.set(term, `${head}\n${s.effect || "効果なし"}`);
  }
  for (const p of detail.passives) {
    const head = [`${p.kind}パッシブ`, p.resource?.replace(/\n/g, " "), p.condition].filter(Boolean).join(" ");
    // パッシブ名にも wiki 由来の改行が入ることがあるため、スキル名と同様に除去して照合する
    const term = `「${p.name.replace(/\n/g, "")}」`;
    if (!map.has(term)) map.set(term, `${head}\n${p.effect}`);
  }
  return [...map].map(([term, desc]) => ({ term, desc }));
}

// E.G.O ガイド本文のツールチップ用。用語は覚醒/侵蝕スキル・パッシブ・専用効果から、スキル名・パッシブ名は「」付きだけを対象にする
export function egoGuideKeywords(detail: EgoDetail, egoName: string): Keyword[] {
  const map = new Map<string, string>();
  for (const k of [...detail.skills, ...detail.passives].flatMap((x) => x.keywords)) {
    if (!map.has(k.term)) map.set(k.term, k.desc);
  }
  for (const k of detail.specialEffects) if (!map.has(k.term)) map.set(k.term, k.desc);
  for (const s of detail.skills) {
    // 名前付き(複数スキル)はその名前、無ければ覚醒スキルは E.G.O 名そのまま、侵蝕スキルは「(侵蝕)」を付けた形で呼ぶ
    const term = s.name ? `「${s.name}」` : s.kind === "覚醒" ? `「${egoName}」` : `「${egoName}(${s.kind})」`;
    if (!map.has(term)) map.set(term, `${s.kind}スキル${s.attackType ? ` ${s.attackType}` : ""}\n${stripStageMarks(s.effect) || "効果なし"}`);
  }
  for (const p of detail.passives) {
    const term = `「${p.name.replace(/\n/g, "")}」`;
    if (!map.has(term)) map.set(term, `E.G.Oパッシブ\n${stripStageMarks(p.effect)}`);
  }
  return [...map].map(([term, desc]) => ({ term, desc }));
}
