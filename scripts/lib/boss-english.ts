import type { BossGuide } from "../../src/bosses";
import { bossCopySources } from "../../src/i18n/bosses";
import { keywordSourceHash } from "./keyword-english";

interface EnglishBossCopy {
  id: string;
  entries: Record<string, { sourceHash: string; text: string }>;
  scopedTerms?: string[];
  scopedPaths?: string[];
}

/** 同じ日本語名でも、パッシブと状態効果で異なる公式英語名を持てる。 */
export function bindBossCopy(boss: BossGuide, copy: EnglishBossCopy): Record<string, string> {
  const sources = bossCopySources(boss);
  if (copy.id !== boss.id || Object.keys(copy.entries).length !== Object.keys(sources).length) throw new Error(`ボス攻略の英訳件数が一致しない: ${copy.id}`);
  const scopedTerms = new Set(copy.scopedTerms ?? []);
  const scopedPaths = new Set(copy.scopedPaths ?? []);
  for (const path of scopedPaths) if (!Object.hasOwn(sources, path)) throw new Error(`ボス攻略の個別訳の項目が無い: ${copy.id}:${path}`);
  const messages: Record<string, string> = {};
  for (const [path, text] of Object.entries(sources)) {
    const entry = copy.entries[path];
    if (!entry || entry.sourceHash !== keywordSourceHash(text)) throw new Error(`ボス攻略の原文が更新されている: ${copy.id}:${path}`);
    if (!entry.text?.trim()) throw new Error(`ボス攻略の英訳が空: ${copy.id}:${path}`);
    const key = scopedTerms.has(text) || scopedPaths.has(path) ? `boss-copy:${copy.id}:${path}` : text;
    if (messages[key] && messages[key] !== entry.text) throw new Error(`ボス攻略の英訳が衝突している: ${copy.id}:${path}`);
    messages[key] = entry.text;
  }
  return messages;
}
