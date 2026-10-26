import type { Keyword } from "../types";
import { COIN_NUMERALS, COIN_PREFIX } from "../coins";
import { splitStageMarks } from "../egoStage";
import { decorate } from "./decorate";
import { useContext } from "react";
import { LanguageContext, translateKeywordName, translateText } from "../i18n/text";

// E.G.O の解析段階の印(〘Ⅲ:…〙)は段階ごとに色分けして描画する。人格の効果文には印が無いので素通りする
function renderBody(body: string, keywords: Keyword[]) {
  return splitStageMarks(body).map((seg, i) =>
    seg.stage ? (
      <span key={i} className={`stage stage-${seg.stage === "Ⅲ" ? 3 : 4}`} title={`解析${seg.stage}で追加・変化`}>
        {decorate(seg.text, keywords)}
      </span>
    ) : (
      <span key={i}>{decorate(seg.text, keywords)}</span>
    )
  );
}

interface Props {
  text: string;
  keywords?: Keyword[];
  // 元から破壊不能なコインの番号。判定はスクレイパー側(scripts/persona.ts)で済ませた結果を使う
  unbreakableCoins?: number[];
}

export default function EffectText({ text, keywords = [], unbreakableCoins = [] }: Props) {
  const language = useContext(LanguageContext);
  const localized = translateText(text, language);
  const localizedKeywords = localized !== text
    ? keywords.map(({ term, desc }) => ({ term: translateKeywordName(term, desc, language), desc: translateText(desc, language) }))
    : keywords;
  if (!text) return <p className="fx-empty">効果なし</p>;
  return (
    <div className="fx">
      {localized.split("\n").map((line, i) => {
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
            <span>{renderBody(body, localizedKeywords)}</span>
          </p>
        );
      })}
    </div>
  );
}
