import type { BossGuide } from "../bosses";
import { translateText } from "./text";

const structural = new Set(["sources", "relatedTerms", "image", "id", "unit", "sin", "type", "attackType", "checkedAt"]);
const englishBosses = new WeakSet<BossGuide>();
export const isEnglishBoss = (boss: BossGuide) => englishBosses.has(boss);

export function bossCopySources(boss: BossGuide): Record<string, string> {
  const sources: Record<string, string> = {};
  visit(boss, (text, path) => {
    if (/[\u3040-\u30ff\u3400-\u9fff]/.test(text)) sources[path] = text;
    return text;
  });
  return sources;
}

function visit(value: unknown, translate: (text: string, path: string) => string, path = ""): unknown {
  if (typeof value === "string") return translate(value, path);
  if (Array.isArray(value)) return value.map((entry, i) => visit(entry, translate, `${path}.${i}`));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, structural.has(key) ? entry : visit(entry, translate, path ? `${path}.${key}` : key)]));
  return value;
}

/** スキルの種別・罪悪属性・参照IDは判定用に保ち、本文を装飾する前に翻訳する。 */
export function localizeBossGuide(boss: BossGuide, language: "ja" | "en"): BossGuide {
  const marker = `boss-copy:${boss.id}`;
  if (language === "ja" || translateText(marker, language) !== "complete") return boss;
  const translated = visit(boss, (text, path) => {
    const key = `boss-copy:${boss.id}:${path}`;
    const scoped = translateText(key, language);
    return scoped === key ? translateText(text, language) : scoped;
  }) as BossGuide;
  englishBosses.add(translated);
  return translated;
}
