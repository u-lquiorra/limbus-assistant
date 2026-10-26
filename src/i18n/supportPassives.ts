import type { SupportPassive } from "../supportPassives";
import { translateText } from "./text";

/** 効果文を装飾で分割する前に全文を翻訳し、説明を同じ言語で結び付ける。 */
export function localizeSupportPassive(passive: SupportPassive, language: "ja" | "en"): SupportPassive {
  if (language === "ja") return passive;
  const scoped = (key: string, fallback: string) => {
    const translated = translateText(key, language);
    return translated === key ? fallback : translated;
  };
  return {
    ...passive,
    name: scoped(`support-passive:${passive.code}:name`, passive.name),
    effect: scoped(`support-passive:${passive.code}:effect`, passive.effect),
    keywords: passive.keywords.map(keyword => ({
      term: scoped(`support-keyword:${keyword.term}:term`, keyword.term),
      desc: scoped(`support-keyword:${keyword.term}:desc`, keyword.desc),
    })),
  };
}
