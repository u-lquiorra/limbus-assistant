import { createContext } from "react";

export const LanguageContext = createContext<"ja" | "en">("ja");
let messages: Record<string, string> = {};
let names: Record<string, string> = {};
let numericTemplates = new Map<string, string>();
let collector: ((text: string) => void) | undefined;
const listeners = new Set<() => void>();
let loaded = false;
export const englishLoaded = () => loaded;
export const subscribeTranslations = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const setTranslationCollector = (callback?: (text: string) => void) => { collector = callback; };
export function setEnglishMessages(data: { messages: Record<string, string>; names: Record<string, string> }) {
  if (messages === data.messages && loaded) return;
  messages = data.messages;
  names = data.names;
  numericTemplates = new Map();
  for (const [source, translation] of Object.entries(messages)) {
    const originalNumbers = source.match(/\d+/g);
    const translatedNumbers = translation.match(/\d+/g);
    if (!originalNumbers || JSON.stringify(originalNumbers) !== JSON.stringify(translatedNumbers)) continue;
    let index = 0;
    numericTemplates.set(source.replace(/\d+/g, "{#}"), translation.replace(/\d+/g, () => `{#${index++}}`));
  }
  loaded = true;
  listeners.forEach((listener) => listener());
}
export const hasJapanese = (text: string) => /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
export const searchableText = (text: string) => `${text} ${translateText(text, "en")}`;
export const translateOfficialName = (text: string, language: "ja" | "en") => language === "en" ? names[text] ?? translateText(text, language) : text;
export function translateKeywordName(term: string, desc: string | undefined, language: "ja" | "en") {
  const key = `keyword-name:${term}:${desc ?? ""}`;
  const scoped = translateText(key, language);
  return scoped === key ? translateText(term, language) : scoped;
}
export function translateText(text: string, language: "ja" | "en"): string {
  if (hasJapanese(text)) collector?.(text);
  if (language !== "en") return text;
  if (messages[text] !== undefined) return messages[text];
  if (names[text] !== undefined) return names[text];
  const numbers = text.match(/\d+/g);
  const template = numericTemplates.get(text.replace(/\d+/g, "{#}"));
  if (numbers && template) return template.replace(/\{#(\d+)\}/g, (_, index) => numbers[Number(index)]);
  const noResults = text.match(/^「(.+)」に一致するページは見つからない。$/);
  if (noResults) return `No pages match “${noResults[1]}”.`;
  return text;
}
