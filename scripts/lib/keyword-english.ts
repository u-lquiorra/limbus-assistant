import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { guideSummary, parseGuide } from "../../src/guide";
import { KEYWORD_PAGES } from "../../src/keywordPages";

export const keywordSourceHash = (text: string) => createHash("sha256").update(text).digest("hex");

/** 一覧に実際に使う要約と優先枠の説明だけを原文から取得する。 */
export async function keywordCopySources(): Promise<Record<string, string>> {
  const keywords: Record<string, { keywords: string[] }> = JSON.parse(await readFile("src/data/persona-keywords.json", "utf8"));
  const sources: Record<string, string> = {};
  for (const code of Object.keys(keywords).sort()) {
    if (!keywords[code].keywords.length) continue;
    const text = guideSummary(parseGuide(await readFile(`src/data/guides/${code}.md`, "utf8")));
    if (text) sources[`summary:${code}`] = text;
  }
  const teams: { id: string; core: { code: string; note?: string }[] }[] = JSON.parse(await readFile("src/data/teams.json", "utf8"));
  for (const team of teams.filter(team => KEYWORD_PAGES.some(page => page.id === team.id))) {
    for (const member of team.core) if (member.note) sources[`core:${team.id}:${member.code}`] = member.note;
  }
  return sources;
}

export function bindKeywordCopy(sources: Record<string, string>, entries: Record<string, { sourceHash: string; text: string }>, label = "キーワード一覧"): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const [key, entry] of Object.entries(entries)) {
    const source = sources[key];
    if (!source || keywordSourceHash(source) !== entry.sourceHash) throw new Error(`${label}の原文が更新されている: ${key}`);
    if (!entry.text?.trim()) throw new Error(`${label}の英訳が空: ${key}`);
    if (messages[source] && messages[source] !== entry.text) throw new Error(`同じ原文の英訳が一致しない: ${key}`);
    messages[source] = entry.text;
  }
  return messages;
}
