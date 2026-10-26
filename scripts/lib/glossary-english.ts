import { createHash } from "node:crypto";
import type { GlossaryTerm, GlossarySection } from "../../src/glossary";

// 表示本文だけを固定順に取り出す。ID・出典・確認日・図の数値は翻訳しない。
export function glossaryTextFields(term: GlossaryTerm | GlossarySection): string[] {
  const fields = [term.name, term.summary, ...term.explanation, ...term.cautions,
    term.example.title, ...term.example.steps, term.example.note, ...(term.example.diagram?.labels ?? [])];
  if ("sections" in term) for (const section of term.sections ?? []) fields.push(...glossaryTextFields(section));
  return fields;
}
export function glossaryTextHash(term: GlossaryTerm): string {
  return createHash("sha256").update(JSON.stringify({ fields: glossaryTextFields(term), aliases: term.aliases })).digest("hex");
}

export interface EnglishGlossaryTerm {
  sourceHash: string;
  text: string[];
  aliases: string[];
}

export function bindGlossaryTranslation(term: GlossaryTerm, english: EnglishGlossaryTerm): Record<string, string> {
  const fields = glossaryTextFields(term);
  if (glossaryTextHash(term) !== english.sourceHash || fields.length !== english.text.length) {
    throw new Error(`用語辞典の原文と英訳が一致しない: ${term.id}`);
  }
  if (english.text.some((text) => typeof text !== "string" || !text.trim())) throw new Error(`用語辞典の英訳が空: ${term.id}`);
  const messages: Record<string, string> = {};
  const set = (source: string, target: string) => {
    if (messages[source] !== undefined && messages[source] !== target) throw new Error(`用語辞典内の英訳が衝突: ${term.id}: ${source}`);
    messages[source] = target;
  };
  fields.forEach((field, index) => set(field, english.text[index]));
  set(`【リンバス】${term.name}とは｜用語辞典｜Limbus Assistant`, `${english.text[0]} Explained | Limbus Company Glossary | Limbus Assistant`);
  set(`リンバス(Limbus Company)の用語「${term.name}」の解説。${term.summary}`, `${english.text[0]} in Limbus Company. ${english.text[1]}`);
  if (term.aliases.length) set(`glossary-aliases:${term.id}`, english.aliases.join(", "));
  set(`${term.name}の項目`, `${english.text[0]} sections`);
  const captions = (entry: GlossaryTerm | GlossarySection) => {
    set(entry.example.steps.join(" ／ "), entry.example.steps.map((step) => messages[step]).join(" / "));
    if ("sections" in entry) (entry.sections ?? []).forEach(captions);
  };
  captions(term);
  return messages;
}
