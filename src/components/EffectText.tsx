import type { ReactNode } from "react";
import type { Keyword } from "../types";
import { COIN_NUMERALS, COIN_PREFIX } from "../coins";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// [使用時] などのタイミング表記と、用語(ツールチップ付き)を装飾する
function decorate(text: string, keywords: Keyword[]): ReactNode[] {
  const terms = keywords.map((k) => k.term).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `(\\[[^\\]]+\\])${terms.length ? `|(${terms.map(escapeRegExp).join("|")})` : ""}`,
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

interface Props {
  text: string;
  keywords?: Keyword[];
  // 元から破壊不能なコインの番号。判定はスクレイパー側(scripts/persona.ts)で済ませた結果を使う
  unbreakableCoins?: number[];
}

export default function EffectText({ text, keywords = [], unbreakableCoins = [] }: Props) {
  if (!text) return <p className="fx-empty">効果なし</p>;
  return (
    <div className="fx">
      {text.split("\n").map((line, i) => {
        // 行頭の全角空白 = 直前のコインの効果の続き
        const indented = line.startsWith("　");
        const content = indented ? line.slice(1) : line;
        const coin = content.match(COIN_PREFIX);
        const body = coin ? content.slice(coin[0].length) : content;
        const unbreakable = !!coin && unbreakableCoins.includes(COIN_NUMERALS[coin[1]]);
        const classes = ["fx-line", coin && "fx-coin-line", indented && "fx-indent", content.startsWith("※") && "fx-note"];
        return (
          <p key={i} className={classes.filter(Boolean).join(" ")}>
            {coin && (
              <span
                className={`fx-coin${unbreakable ? " fx-coin-unbreakable" : ""}`}
                aria-label={`コイン${coin[1]}${unbreakable ? "(破壊不能)" : ""}`}
              >
                {coin[1]}
              </span>
            )}
            <span>{decorate(body, keywords)}</span>
          </p>
        );
      })}
    </div>
  );
}
