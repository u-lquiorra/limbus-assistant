import type {
  CharacterData,
  CharacterListEntry,
  PersonaDetail,
  PersonaSkills,
  PersonaStatus,
} from "../types";
import { parseGuide, type Guide } from "../guide";
import charactersList from "./characters.json";

const modules = import.meta.glob<CharacterData>("./*.json", { eager: true, import: "default" });

// 人格詳細は人格ごとの別ファイル。ページを開いたときだけ読み込む
const detailModules = import.meta.glob<PersonaDetail>("./personas/*.json", { import: "default" });

// 攻略ガイドは一部の人格にしか無い。こちらも詳細と同じく遅延読み込み
const guideModules = import.meta.glob<string>("./guides/*.md", { query: "?raw", import: "default" });

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
