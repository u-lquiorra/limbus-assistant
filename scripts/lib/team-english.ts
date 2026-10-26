import { readFile } from "node:fs/promises";
import { parseGuide } from "../../src/guide";
import { bindKeywordCopy } from "./keyword-english";

/** 編成詳細に表示する名前・注記とガイド本文を原文から取得する。 */
export async function teamCopySources(id: string): Promise<Record<string, string>> {
  const teams: { id: string }[] = JSON.parse(await readFile("src/data/teams.json", "utf8"));
  const team = teams.find(team => team.id === id);
  if (!team) throw new Error(`英訳する編成が無い: ${id}`);
  const sources: Record<string, string> = {};
  const visit = (value: unknown, path: string) => {
    if (Array.isArray(value)) value.forEach((item, i) => visit(item, `${path}:${i}`));
    else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) {
      if ((key === "name" || key === "note") && typeof item === "string") sources[`${path}:${key}`] = item;
      else if (typeof item === "object") visit(item, `${path}:${key}`);
    }
  };
  visit(team, "data");
  const guide = parseGuide(await readFile(`src/data/team-guides/${id}.md`, "utf8"));
  guide.sections.forEach((section, i) => {
    sources[`guide:${i}:heading`] = section.heading;
    section.blocks.forEach((block, j) => {
      (block.type === "p" ? [block.text] : block.items).forEach((segments, k) => {
        sources[`guide:${i}:${j}:${k}`] = segments.map(segment => segment.text).join("");
      });
    });
  });
  return sources;
}

export const bindTeamCopy = (sources: Record<string, string>, entries: Record<string, { sourceHash: string; text: string }>) => bindKeywordCopy(sources, entries, "編成詳細");
