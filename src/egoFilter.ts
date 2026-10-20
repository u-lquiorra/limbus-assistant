// E.G.O 一覧(/egos)の、必要資源(罪悪属性)による絞り込み。
// 画面から切り離した純粋な関数にして、Node のテストから直接確かめられるようにする
import { SIN_ORDER } from "./sinColors";
import type { EgoSummary } from "./types";

/** URL に使う罪悪属性の ID(?sin=wrath,pride) */
export const SIN_IDS: Record<string, string> = {
  憤怒: "wrath",
  色欲: "lust",
  怠惰: "sloth",
  暴食: "gluttony",
  憂鬱: "gloom",
  傲慢: "pride",
  嫉妬: "envy",
};

/** E.G.O の使用に必要な罪悪属性(罪悪属性の並び順)。cost は不要な属性が "" */
export function egoCostSins(ego: EgoSummary): string[] {
  return SIN_ORDER.filter((sin) => Number(ego.cost[sin] || 0) > 0);
}

/**
 * 選んだ罪悪属性の資源だけで使える E.G.O。必要資源が全て選んだ属性の範囲に収まるものを返す。
 * 「憤怒と傲慢がたまる編成で、ほかの資源なしに使える E.G.O」を探す用途。何も選んでいなければ全件
 */
export function filterEgosBySins(egos: EgoSummary[], sins: string[]): EgoSummary[] {
  if (!sins.length) return egos;
  return egos.filter((ego) => egoCostSins(ego).every((sin) => sins.includes(sin)));
}

/** URL パラメータ(?sin=pride,wrath)を罪悪属性の並びで解釈する。外部から来る値なので、知らない ID と重複は捨てる */
export function parseSinFilter(param: string | null): string[] {
  const ids = new Set((param ?? "").split(",").map((s) => s.trim()));
  return SIN_ORDER.filter((sin) => ids.has(SIN_IDS[sin]));
}

/** 選んだ罪悪属性を URL パラメータの値にする。何も選んでいなければ空文字 */
export function formatSinFilter(sins: string[]): string {
  return SIN_ORDER.filter((sin) => sins.includes(sin))
    .map((sin) => SIN_IDS[sin])
    .join(",");
}

/** E.G.O 一覧を、指定した罪悪属性を選んだ状態で開くパス(各ページからの導線用) */
export function egoFilterPath(sins: string[] = []): string {
  const value = formatSinFilter(sins);
  return value ? `/egos?sin=${value}` : "/egos";
}
