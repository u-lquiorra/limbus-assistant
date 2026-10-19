import data from "./data/glossary.json";
import systems from "./data/glossary-systems.json";

export interface GlossaryTerm {
  id: string;
  name: string;
  reading: string;
  aliases: string[];
  linkNames?: string[];
  category: string;
  summary: string;
  explanation: string[];
  example: {
    title: string;
    steps: string[];
    note: string;
    diagram?: { type: string; values: number[]; labels?: string[] };
  };
  cautions: string[];
  related: string[];
  sources: string[];
  checkedAt: string;
  sections?: GlossarySection[];
}

export type GlossarySection = Pick<GlossaryTerm, "id" | "name" | "reading" | "summary" | "explanation" | "cautions" | "example">;

export const GLOSSARY_CATEGORIES: Record<string, string> = {
  battle: "戦闘の基本",
  attributes: "属性・耐性",
  status: "状態異常",
  advanced: "特殊ルール",
  ego: "E.G.O",
  growth: "育成",
  sapling: "光の苗木",
};

export const glossaryTerms: GlossaryTerm[] = [...data.terms, ...systems.terms];
export const glossarySources: Record<string, { title: string; url: string }> = { ...data.sources, ...systems.sources };
const byId = new Map(glossaryTerms.map((term) => [term.id, term]));
const sectionParents = new Map(glossaryTerms.flatMap((term) =>
  (term.sections ?? []).map((section) => [section.id, `/glossary/${term.id}#${section.id}`] as const)
));

export function glossarySectionRedirect(id: string): string | undefined {
  return sectionParents.get(id);
}

export function getGlossaryTerm(id: string): GlossaryTerm | undefined {
  return byId.get(id);
}

// 検索用の関連語は同義語とは限らない。リンクは正式名と確認済みの表記だけに限定する。
export function glossaryTermForName(name: string): GlossaryTerm | undefined {
  return glossaryTerms.find((term) => term.name === name || term.linkNames?.includes(name)
    || term.sections?.some((section) => section.name === name));
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

export function filterGlossary(query: string, category = ""): GlossaryTerm[] {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return glossaryTerms.filter((term) => {
    if (category && term.category !== category) return false;
    const text = normalize([
      term.name, term.reading, ...term.aliases, term.summary,
      ...(term.sections ?? []).flatMap((section) => [section.name, section.reading]),
    ].join(" "));
    return words.every((word) => text.includes(word));
  });
}
