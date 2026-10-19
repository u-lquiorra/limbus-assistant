import type { BossSkill } from "./bosses";

// まとめて記したコイン効果を、共通のEffectTextでコイン別に表示する。
export function bossSkillEffectText(skill: Pick<BossSkill, "effects" | "unbreakableCoins">): string {
  const lines = skill.effects.flatMap((effect) => {
    const shared = effect.match(/^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ](?:・[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ])+)：(.*)$/);
    if (shared) return shared[1].split("・").map((coin) => `${coin}${shared[2].replace("それぞれ", "")}`);
    return effect.replace(/([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ])：/g, "\n$1").trim();
  });
  for (const coin of skill.unbreakableCoins ?? []) {
    const numeral = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ"][coin - 1];
    if (!lines.some((line) => line.split("\n").some((part) => part.trimStart().startsWith(numeral)))) lines.push(`${numeral}破壊不能コイン。`);
  }
  return lines.join("\n");
}
