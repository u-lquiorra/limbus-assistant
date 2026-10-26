import type { ReactNode } from "react";
import type { Keyword } from "../types";
import KeywordTerm from "./KeywordTerm";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// [使用時] などのタイミング表記と、用語(押すと説明が開く)を装飾する。
// timing=false ではタイミング表記を装飾しない(ガイド本文の「代行 [ヘルメス]」などを誤って拾わないため)
export function decorate(text: string, keywords: Keyword[], timing = true): ReactNode[] {
  // 長い用語を先に試し、「解禁 - III」が「解禁」で切れないようにする
  const terms = keywords.map((k) => k.term).sort((a, b) => b.length - a.length);
  if (!timing && !terms.length) return [text];
  // グループ番号(m[1]=タイミング, m[2]=用語)を固定するため、タイミング無効時も決して一致しない (?!) で枠を残す
  // 固有名の [Hermes] や [黑風馬脚月斬] は分割せず、発動タイミングだけを装飾する。
  const timingPattern = timing
    ? "\\[(?:[^\\]]*(?:時|開始|終了|マッチ|敵味方|専用)[^\\]]*|(?:On\\b|Before\\b|After\\b|Combat Start|Turn Start|Turn End|Clashable|Indiscriminate|Always-active|Effect exclusive)[^\\]]*)\\]"
    : "(?!)";
  const pattern = new RegExp(
    `(${timingPattern})${terms.length ? `|(${terms.map(escapeRegExp).join("|")})` : ""}`,
    "g"
  );
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      out.push(
        <span key={m.index} className="fx-timing">
          {m[1].slice(1, -1)}
        </span>
      );
    } else {
      const desc = keywords.find((k) => k.term === m[2])?.desc;
      out.push(<KeywordTerm key={m.index} term={m[2]} desc={desc} />);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
