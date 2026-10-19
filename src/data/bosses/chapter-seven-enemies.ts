import type { BossGuide, BossSkill } from "../../bosses";
import raw from "./chapter-seven-enemies.json";

// 数値・効果は7章の一般敵スキル表。各ボス個体のHP・耐性は攻略データ側で指定する。
type RecordData = { skills: Omit<BossSkill, "id" | "unit" | "response">[]; passives: { name: string; effect: string }[] };
const records = raw as Record<string, RecordData>;
const advice: Record<string, string> = {
  "回避": "守備で相殺してから攻める。戦闘開始時の強化は相殺だけでは取り消せない。",
  "反撃": "攻撃順と受ける囚人のHPを確認する。出血が多い味方に無理に攻撃させない。",
  "硬血式強化展開": "熱気がたまった後の強い攻撃。混乱・撃破を先に狙うか、強いマッチで止める。",
  "永久なる幸せの王国ラ・マンチャランド！": "破壊不能の2枚目が残る。マッチ勝利で被害を減らし、出血が少ない囚人で受ける。",
  "楽しいパレードに加わってください！": "2枚目は破壊不能。マッチに勝っても棘の獲得を防げるとは限らない。",
  "みんな足を揃えて踊りましょう！": "2枚目は破壊不能。出血回数と棘が増えるため、マッチ後の攻撃も含めてHPを見る。",
  "急かさないで": "破壊不能コインと回復がある強い攻撃。敵の強化とこちらの出血を見て、先に混乱させたい。",
};
export function sevenEnemySkills(unit: string, name: keyof typeof raw): BossSkill[] {
  return records[name].skills.map((skill, index) => ({ ...skill, unit, id: `${unit}-normal-${index + 1}`, response: advice[skill.name] ?? "出血・破裂の追加と条件強化を確認。マッチで止めるか、攻撃前に混乱・撃破して被害を減らそう。" }));
}
export function sevenEnemyPassives(unit: string, name: keyof typeof raw): BossGuide["passives"] {
  return records[name].passives.map((passive) => ({ ...passive, unit, condition: "効果欄の条件で発動", response: passive.name.includes("祝祭") ? "熱気が8以上になる前に混乱・撃破を狙う。長引くと強いスキルへ切り替わる。" : passive.name === "吸血" ? "出血した味方への的中は回復も許す。敵のHPが減っていても攻撃を放置しない。" : "取り巻きも出血や強化を重ねる。通常スキルへの対処と混乱・撃破を並行しよう。" }));
}
