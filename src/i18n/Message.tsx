import { Fragment, useContext, type ReactNode } from "react";
import { LanguageContext, translateText } from "./text";

/** 語順の違う文章も、件数の強調や個々の検索条件を保ったまま翻訳する。 */
export function Message({ text, values }: { text: string; values: Record<string, ReactNode> }) {
  const language = useContext(LanguageContext);
  return translateText(text, language).split(/(\{[a-zA-Z]+\})/).map((part, index) => (
    <Fragment key={index}>{/^\{[a-zA-Z]+\}$/.test(part) && Object.hasOwn(values, part.slice(1, -1)) ? values[part.slice(1, -1)] : part}</Fragment>
  ));
}

export function TranslatedList({ items, separator = "・" }: { items: string[]; separator?: string }) {
  const language = useContext(LanguageContext);
  return items.map(item => translateText(item, language)).join(language === "en" ? ", " : separator);
}
