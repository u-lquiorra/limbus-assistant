// キーワード別人格一覧の絞り込みで選べる特性キーワード(所属・組織)と、その絞り込み。
// 人格ごとの特性キーワードは scripts/trait-index.ts が作る persona-traits.json から引く
import { allPersonas, personasWithAllKeywords } from "./data/loader";
import personaTraits from "./data/persona-traits.json";
import type { PersonaStatus } from "./types";

const traitsByCode = personaTraits as Record<string, string[]>;

// 選べるのは、パッシブ・スキル効果で「〇〇所属」「〇〇人格」として条件に使われる特性キーワードだけにする。
// 「フィクサー」「E.G.O装備」のように範囲が広く、条件に使われないものは絞り込みの役に立たないため出さない。
// 「指」も単独では条件に使われず、親指・人差し指などの個別の指で指定されるため出さない。
// 鏡ダンジョンのギフトはデータを持っていないので照合できていない。ギフトの条件で使われるものが分かったら、ここに足す。
// 所属の系統(指・協会など)での分類は、分類の誤りを生みやすいため付けない。並びは関連するものを近くに置いただけ
export const TRAIT_FILTERS: string[] = [
  "親指",
  "人差し指",
  "中指",
  "薬指",
  "野獣派",
  "スチューデント",
  "黒雲会",
  "剣契",
  "蜘蛛の巣",
  "黒獣",
  "黒獣筆頭",
  "ジア家",
  "センク協会",
  "夜明事務所",
  "終止符事務所",
  "ラ・マンチャランド",
  "ル・ノワール",
  "ル・ルージュ",
  "ピークォド号",
  "エドガー家",
  "ワザリング・ハイツ",
  "LCA",
];

/** 人格の特性キーワード(所属・組織など)。無ければ空配列 */
export function traitsOfPersona(code: string): string[] {
  return traitsByCode[code] ?? [];
}

/**
 * 絞り込みの URL パラメータ(?trait=蜘蛛の巣,剣契)を、TRAIT_FILTERS の並びにそろえて解釈する。
 * 外部から来る値なので、選べない特性キーワードと重複は捨てる
 */
export function parseTraitFilter(param: string | null): string[] {
  const names = new Set((param ?? "").split(",").map((s) => s.trim()));
  return TRAIT_FILTERS.filter((t) => names.has(t));
}

/** 絞り込みの選択を URL パラメータの値にする。何も選んでいなければ空文字 */
export function formatTraitFilter(traits: string[]): string {
  return TRAIT_FILTERS.filter((t) => traits.includes(t)).join(",");
}

/** 絞り込みを、指定した特性キーワードを選んだ状態で開くパス(人格ページからの導線用)。選べないものは無視する */
export function traitFilterPath(traits: string[]): string {
  const value = formatTraitFilter(traits);
  return value ? `/keywords?trait=${encodeURIComponent(value)}` : "/keywords";
}

/**
 * 指定したキーワード(火傷など)と特性キーワード(蜘蛛の巣など)を全て持つ人格(AND)。並びは囚人一覧と同じ。
 * どちらも空なら空配列
 */
export function personasMatching(keywords: string[], traits: string[]): PersonaStatus[] {
  if (!keywords.length && !traits.length) return [];
  const base = keywords.length ? personasWithAllKeywords(keywords) : allPersonas.map((p) => p.status);
  return base.filter((s) => {
    const own = traitsOfPersona(s.code);
    return traits.every((t) => own.includes(t));
  });
}
