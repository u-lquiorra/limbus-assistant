// サポートパッシブ一覧(/support-passives)の並べ替え。
// 要約(src/data/support-passives.json)は scripts/support-passive-index.ts で人格の詳細データから作る
import { formatSinFilter } from "./egoFilter";
import { SIN_ORDER } from "./sinColors";
import type { Keyword } from "./types";

export interface SupportPassive {
  /** 人格コード */
  code: string;
  name: string;
  /** 発動に必要な資源(罪悪属性と数)。2属性以上を使うものもある */
  cost: { sin: string; count: number }[];
  /** "保有" / "共鳴" */
  condition: string;
  effect: string;
  keywords: Keyword[];
}

export interface SupportPassiveGroup {
  sin: string;
  passives: SupportPassive[];
}

/** その罪悪属性の必要数(使わなければ 0) */
export function costOf(passive: SupportPassive, sin: string): number {
  return passive.cost.find((c) => c.sin === sin)?.count ?? 0;
}

/**
 * 選んだ罪悪属性の資源だけで発動するサポートパッシブ。必要資源が全て選んだ属性の範囲に収まるものを返す。
 * E.G.O 一覧の絞り込み(filterEgosBySins)と同じ考え方。何も選んでいなければ全件
 */
export function filterSupportPassivesBySins(passives: SupportPassive[], sins: string[]): SupportPassive[] {
  if (!sins.length) return passives;
  return passives.filter((p) => p.cost.every((c) => sins.includes(c.sin)));
}

/**
 * 必要資源の罪悪属性ごとにまとめる。2属性以上を使うものは、使う属性すべての組に入れる。
 * 組の中は、その属性の必要数が少ない順 → 1属性だけで発動するもの優先 → 人格コード順
 */
export function groupSupportPassivesBySin(passives: SupportPassive[]): SupportPassiveGroup[] {
  return SIN_ORDER.map((sin) => ({
    sin,
    passives: passives
      .filter((p) => costOf(p, sin) > 0)
      .sort((a, b) => costOf(a, sin) - costOf(b, sin) || a.cost.length - b.cost.length || a.code.localeCompare(b.code)),
  })).filter((group) => group.passives.length > 0);
}

/** サポートパッシブ一覧を、指定した罪悪属性を選んだ状態で開くパス(各ページからの導線用) */
export function supportPassivesPath(sins: string[] = []): string {
  const value = formatSinFilter(sins);
  return value ? `/support-passives?sin=${value}` : "/support-passives";
}
