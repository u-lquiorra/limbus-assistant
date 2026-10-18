import type { Keyword } from "../types";
import { COIN_NUMERALS, COIN_PREFIX } from "../coins";
import { decorate } from "./decorate";

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
