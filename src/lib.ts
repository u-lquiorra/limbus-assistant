import type { PersonaStatus, PersonaSkills } from "./types";

// データ内の画像パスは public/ からの相対パス
export function asset(path?: string): string | undefined {
  return path ? `${import.meta.env.BASE_URL}${path}` : undefined;
}

export function seasonLabel(season: string): string {
  if (season === "0") return "恒常";
  if (/^\d+$/.test(season)) return `シーズン${season}`;
  if (season === "W") return "ヴァルプルギス";
  return season;
}

export type ResistanceTone = "weak" | "resist" | "normal";

export function resistanceTone(value: string): ResistanceTone {
  const n = Number.parseFloat(value || "1");
  if (Number.isNaN(n) || n === 1) return "normal";
  return n > 1 ? "weak" : "resist";
}

export const ATTACK_TYPES = ["斬", "貫", "打"] as const;

export const ATTACK_TYPE_ICON: Record<string, string> = {
  斬: "images/icons/slash.png",
  貫: "images/icons/pierce.png",
  打: "images/icons/blunt.png",
};

// sinSkills の値("3" / "2防" / "1反" / "反" / "特")を表示用に変換する。
// 数字はその罪悪属性の攻撃スキル枚数(6枚1セット中)、防/反/避 は守備スキルもその罪悪属性であること、特 は特殊スキル
const DEFENSE_TYPE: Record<string, string> = { 防: "防御", 反: "反撃", 避: "回避" };

export function describeSinSkill(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  if (v === "特") return "特殊スキル";
  const m = v.match(/^(\d*)(防|反|避)?$/);
  if (!m) return v;
  const parts = [];
  if (m[1]) parts.push(`${m[1]}枚`);
  if (m[2]) parts.push(DEFENSE_TYPE[m[2]]);
  return parts.join("+");
}

export function personaSins(skills?: PersonaSkills): string[] {
  if (!skills) return [];
  const sins = [skills.s1.sin, skills.s2.sin, skills.s3.sin].filter((s): s is string => !!s);
  return [...new Set(sins)];
}

export function personaAttackTypes(status: PersonaStatus): string[] {
  return ATTACK_TYPES.filter((t) => status.attackTypes.includes(t));
}
