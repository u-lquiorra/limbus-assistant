// プロファイルを書くための短縮関数
import type { Coin, Effect, Skill } from "../types.ts";

export const coin = (hit?: Effect | Effect[], o: Omit<Coin, "hit"> = {}): Coin => ({ hit, ...o });
export const skill = (name: string, coins: Coin[], o: Omit<Skill, "name" | "coins"> = {}): Skill => ({
  name,
  coins,
  ...o,
});

// 「火傷、出血、振動、破裂、沈潜のうちランダムに1つ」を5種へ等確率で分ける
export const randomStatus = (kind: "P" | "C", amount: number, prob = 1): Effect[] =>
  (["burn", "bleed", "tremor", "rupture", "sinking"] as const).map((s) => ({ [`${s}${kind}`]: amount, prob: prob / 5 }));
