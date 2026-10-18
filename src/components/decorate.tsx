import type { ReactNode } from "react";
import type { Keyword } from "../types";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// [使用時] などのタイミング表記と、用語(ツールチップ付き)を装飾する。
// timing=false ではタイミング表記を装飾しない(ガイド本文の「代行 [ヘルメス]」などを誤って拾わないため)
export function decorate(text: string, keywords: Keyword[], timing = true): ReactNode[] {
  // 長い用語を先に試し、「解禁 - III」が「解禁」で切れないようにする
  const terms = keywords.map((k) => k.term).sort((a, b) => b.length - a.length);
  if (!timing && !terms.length) return [text];
  // グループ番号(m[1]=タイミング, m[2]=用語)を固定するため、タイミング無効時も決して一致しない (?!) で枠を残す
  const timingPattern = timing ? "\\[[^\\]]+\\]" : "(?!)";
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
      out.push(
        <abbr key={m.index} className="fx-keyword" title={desc}>
          {m[2]}
        </abbr>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
