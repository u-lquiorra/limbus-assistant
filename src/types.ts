// LimbusCompany攻略Wiki (wikiwiki.jp/lcbwiki) から取得したデータの型定義。
// scripts/scrape.ts と src 側の両方からこの型を参照する。

export interface PersonaStatus {
  code: string;
  name: string;
  character: string;
  season: string;
  resourceCost: Record<string, string>; // 憤怒/色欲/怠惰/暴食/憂鬱/傲慢/嫉妬 -> 生テキスト
  hp: string;
  defense: string;
  speed: string;
  level: string;
  attackTypes: string; // このキャラのスキルが使う攻撃属性の要約 (例: "斬貫")
  resistance: { 斬: string; 貫: string; 打: string }; // 各攻撃属性に対する被ダメージ倍率(固定順)
}

export interface SkillCell {
  raw: string;
  levelReq?: string;
  type?: string;
  power?: string;
  bonus?: string;
  coins?: string;
}

export interface PersonaSkills {
  code: string;
  name: string;
  character: string;
  level: string;
  s1: SkillCell;
  s2: SkillCell;
  s3: SkillCell;
  defenseSkill: SkillCell;
}

export interface PassiveEntry {
  code: string;
  name: string;
  character: string;
  persona: string;
  effect: string;
  condition: string;
}

export interface CharacterProfile {
  name: string;
  profileText: string;
}

export interface CharacterData {
  name: string;
  profile: CharacterProfile;
  statuses: PersonaStatus[];
  skills: PersonaSkills[];
  passives: PassiveEntry[];
  supportPassives: PassiveEntry[];
}

export interface CharacterListEntry {
  name: string;
  profileText: string;
  personaCount: number;
}
