import type { BossGuide } from "./bosses";
import type { Keyword } from "./types";
import { glossaryTerms } from "./glossary";
import statusKeywords from "./data/bosses/common-keywords.json";

const commonKeywords: Keyword[] = glossaryTerms.flatMap((entry) => [
  { term: entry.name, desc: entry.summary },
  ...(entry.linkNames ?? []).map((term) => ({ term, desc: entry.summary })),
  ...(entry.sections ?? []).map((section) => ({ term: section.name, desc: section.summary })),
]);
const cache = new WeakMap<BossGuide, Map<string, Keyword[]>>();
const genericNames = new Set(["防御", "回避", "反撃", "ガード", "攻撃", "破壊", "期待", "名称"]);

// 人格詳細と同じ decorate 用の辞書。検索用の aliases は同義語とは限らないので使わない。
// 使用者の指定がある効果文では、その形態の同名スキル・パッシブを優先する。
export function bossKeywords(boss: BossGuide, unitId?: string): Keyword[] {
  const scopes = cache.get(boss) ?? new Map<string, Keyword[]>();
  const cached = scopes.get(unitId ?? "");
  if (cached) return cached;
  const map = new Map([...commonKeywords, ...statusKeywords].map(({ term, desc }) => [term, desc]));
  const names = new Map<string, Map<string, Set<string>>>();
  const scopedPassives = boss.passives.filter((passive) => !unitId || passive.unit === unitId);
  function add(name: string, desc: string, owner: string) {
    // フランス語などを括弧で併記した名前は、本文の日本語名からも参照できる。
    const japaneseName = name.match(/^(.+?)\([A-Za-zÀ-ÿ][^()]*\)(?:【[^】]+】)?$/)?.[1].trim();
    for (const term of new Set([name, ...(japaneseName ? [japaneseName] : [])])) {
      const variants = names.get(term) ?? new Map<string, Set<string>>();
      const owners = variants.get(desc) ?? new Set<string>();
      owners.add(owner);
      variants.set(desc, owners);
      names.set(term, variants);
    }
  }
  for (const mechanic of boss.mechanics) {
    if (unitId && mechanic.units && !mechanic.units.includes(unitId)) continue;
    for (const name of new Set([mechanic.name, ...mechanic.name.split("・")])) {
      add(name, mechanic.effect, "専用効果");
    }
  }
  for (const skill of boss.skills) {
    if (unitId && skill.unit !== unitId) continue;
    const owner = boss.units.find((unit) => unit.id === skill.unit)!.name;
    const desc = ["スキル", [skill.sin, skill.type].filter(Boolean).join("・"), ...(skill.label ? [skill.label] : []), ...skill.effects].join("\n");
    add(skill.name, desc, owner);
  }
  for (const passive of scopedPassives) {
    const owner = boss.units.find((unit) => unit.id === passive.unit)!.name;
    add(passive.name, `パッシブ／条件：${passive.condition}\n${passive.effect}`, owner);
  }
  const mechanicNames = new Set(boss.mechanics.flatMap((mechanic) => [mechanic.name, ...mechanic.name.split("・")]));
  for (const [name, variants] of names) {
    const desc = [...variants].map(([body, owners]) => `${[...owners].join("／")}\n${body}`).join("\n\n");
    map.set(`「${name}」`, desc);
    // 汎用名や「･･･」だけの名前で本文を誤装飾しない。
    // ボス原稿は括弧なしの「播種」なども使うため、固有名は短くても拾う。
    if (mechanicNames.has(name) || (name.length >= 2 && !genericNames.has(name) && /[一-龠ぁ-んァ-ヶa-zA-Z]/.test(name) && !map.has(name))) map.set(name, desc);
  }
  const keywords = [...map].map(([term, desc]) => ({ term, desc }));
  scopes.set(unitId ?? "", keywords);
  cache.set(boss, scopes);
  return keywords;
}
