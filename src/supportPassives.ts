// サポートパッシブ一覧(/support-passives)の並べ替え。
// 要約(src/data/support-passives.json)は scripts/support-passive-index.ts で人格の詳細データから作る
import { formatSinFilter } from "./egoFilter";
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
  /** 囚人名 */
  character: string;
  passives: SupportPassive[];
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
 * 囚人ごとにまとめる。要約は囚人一覧の順・囚人の中は人格の順で作ってあるため、その並びをそのまま保つ。
 * 必要資源で並べるより、人格を探しやすい並びにする。囚人が分からない人格は載せずに止める
 */
export function groupSupportPassivesByCharacter(passives: SupportPassive[], characterOf: (code: string) => string | undefined): SupportPassiveGroup[] {
  const groups: SupportPassiveGroup[] = [];
  for (const passive of passives) {
    const character = characterOf(passive.code);
    if (!character) throw new Error(`${passive.code}: 囚人が分からない`);
    const last = groups[groups.length - 1];
    if (last?.character === character) last.passives.push(passive);
    else groups.push({ character, passives: [passive] });
  }
  return groups;
}

/** サポートパッシブ一覧を、指定した罪悪属性を選んだ状態で開くパス(各ページからの導線用) */
export function supportPassivesPath(sins: string[] = []): string {
  const value = formatSinFilter(sins);
  return value ? `/support-passives?sin=${value}` : "/support-passives";
}
