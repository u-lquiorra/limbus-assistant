import type { CharacterData, CharacterListEntry } from "../types";
import charactersList from "./characters.json";

// すべてのキャラクター別JSONを一括読み込みし、キャラクター名 -> データ のMapを作る
const modules = import.meta.glob<CharacterData>("./*.json", { eager: true, import: "default" });

const byName = new Map<string, CharacterData>();
for (const path in modules) {
  const data = modules[path];
  if (data && typeof data === "object" && "statuses" in data) {
    byName.set((data as CharacterData).name, data as CharacterData);
  }
}

export const characterList: CharacterListEntry[] = charactersList as CharacterListEntry[];

export function getCharacter(name: string): CharacterData | undefined {
  return byName.get(name);
}
