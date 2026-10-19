import type {
  CharacterData,
  CharacterListEntry,
  EgoDetail,
  EgoSummary,
  PersonaDetail,
  PersonaSkills,
  PersonaStatus,
  TeamData,
} from "../types";
import { egoItemsForPersona, parseGuide, type Guide, type InlineSegment } from "../guide";
import charactersList from "./characters.json";
import teamsList from "./teams.json";

const modules = import.meta.glob<CharacterData>("./*.json", { eager: true, import: "default" });

// 人格詳細は人格ごとの別ファイル。ページを開いたときだけ読み込む
const detailModules = import.meta.glob<PersonaDetail>("./personas/*.json", { import: "default" });

// 攻略ガイドは一部の人格にしか無い。こちらも詳細と同じく遅延読み込み
const guideModules = import.meta.glob<string>("./guides/*.md", { query: "?raw", import: "default" });

// E.G.O も人格と同様に詳細・ガイドを遅延読み込みする。ガイドは guides/ego/ に置き、人格ガイド(guides/*.md)と混ざらないようにする
const egoDetailModules = import.meta.glob<EgoDetail>("./egos/*.json", { import: "default" });
const egoGuideModules = import.meta.glob<string>("./guides/ego/*.md", { query: "?raw", import: "default" });
const teamGuideModules = import.meta.glob<string>("./team-guides/*.md", { query: "?raw", import: "default" });

const byName = new Map<string, CharacterData>();
for (const path in modules) {
  const data = modules[path];
  if (data && typeof data === "object" && "statuses" in data) {
    byName.set(data.name, data);
  }
}

export const characterList: CharacterListEntry[] = charactersList as CharacterListEntry[];

export function getCharacter(name: string): CharacterData | undefined {
  return byName.get(name);
}

export function getNeighbors(name: string): { prev?: CharacterListEntry; next?: CharacterListEntry } {
  const i = characterList.findIndex((c) => c.name === name);
  if (i < 0) return {};
  const n = characterList.length;
  return { prev: characterList[(i - 1 + n) % n], next: characterList[(i + 1) % n] };
}

export interface PersonaIndexEntry {
  status: PersonaStatus;
  skills?: PersonaSkills;
}

export const allPersonas: PersonaIndexEntry[] = characterList.flatMap((c) => {
  const data = byName.get(c.name);
  if (!data) return [];
  const skillsByCode = new Map(data.skills.map((s) => [s.code, s]));
  return data.statuses.map((status) => ({ status, skills: skillsByCode.get(status.code) }));
});

export interface PersonaContext {
  character: CharacterData;
  status: PersonaStatus;
  skills?: PersonaSkills;
  prev?: PersonaStatus;
  next?: PersonaStatus;
}

export function getPersona(code: string): PersonaContext | undefined {
  for (const character of byName.values()) {
    const i = character.statuses.findIndex((s) => s.code === code);
    if (i < 0) continue;
    const list = character.statuses;
    return {
      character,
      status: list[i],
      skills: character.skills.find((s) => s.code === code),
      prev: i > 0 ? list[i - 1] : undefined,
      next: i < list.length - 1 ? list[i + 1] : undefined,
    };
  }
  return undefined;
}

export async function loadPersonaDetail(code: string): Promise<PersonaDetail | null> {
  const load = detailModules[`./personas/${code}.json`];
  return load ? load() : null;
}

export async function loadGuide(code: string): Promise<Guide | null> {
  const load = guideModules[`./guides/${code}.md`];
  return load ? parseGuide(await load()) : null;
}

export interface EgoContext {
  character: CharacterData;
  ego: EgoSummary;
  prev?: EgoSummary;
  next?: EgoSummary;
}

export function getEgo(code: string): EgoContext | undefined {
  for (const character of byName.values()) {
    const list = character.egos ?? [];
    const i = list.findIndex((e) => e.code === code);
    if (i < 0) continue;
    return { character, ego: list[i], prev: i > 0 ? list[i - 1] : undefined, next: i < list.length - 1 ? list[i + 1] : undefined };
  }
  return undefined;
}

export async function loadEgoDetail(code: string): Promise<EgoDetail | null> {
  const load = egoDetailModules[`./egos/${code}.json`];
  return load ? load() : null;
}

export async function loadEgoGuide(code: string): Promise<Guide | null> {
  const load = egoGuideModules[`./guides/ego/${code}.md`];
  return load ? parseGuide(await load()) : null;
}

// 人格ページの「おすすめE.G.O」。E.G.O は同じ囚人しか装備できないので、その囚人の E.G.O ガイドだけを読み、
// 「編成・相性」でこの人格を挙げている箇条書きを集める。並びはゲーム内の E.G.O の並び順
export async function loadEgoRecommendations(personaCode: string, heading: string): Promise<InlineSegment[][]> {
  const character = getPersona(personaCode)?.character;
  if (!character) return [];
  const perEgo = await Promise.all(
    (character.egos ?? []).map(async (ego) => {
      const guide = await loadEgoGuide(ego.code);
      return guide ? egoItemsForPersona(guide, heading, personaCode, ego) : [];
    })
  );
  return perEgo.flat();
}

// ---- おすすめ編成 ----

// 適性の軸が編成ごとに違う(通常・短期・長期/周回・深層)ため、JSON の推論型からは直接キャストできない。
// 中身の整合性は teams.test.ts で検査している
export const teams: TeamData[] = teamsList as unknown as TeamData[];

export function getTeam(id: string): TeamData | undefined {
  return teams.find((t) => t.id === id);
}

// 人格・E.G.O ページの逆引き用。優先枠〜裏置きのどこかに入っている編成を返す
export function teamsForPersona(code: string): TeamData[] {
  return teams.filter((t) =>
    [...t.core, ...t.flex, ...t.alternatives, ...t.support].some((m) => m.code === code)
  );
}

export function teamsForEgo(code: string): TeamData[] {
  return teams.filter((t) => t.egos.some((m) => m.code === code));
}

export async function loadTeamGuide(id: string): Promise<Guide | null> {
  const load = teamGuideModules[`./team-guides/${id}.md`];
  return load ? parseGuide(await load()) : null;
}
