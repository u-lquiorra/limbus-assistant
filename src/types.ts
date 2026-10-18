// LimbusCompany攻略Wiki (wikiwiki.jp/lcbwiki) から取得したデータの型定義。
// scripts/scrape.ts と src 側の両方からこの型を参照する。

export interface PersonaStatus {
  code: string;
  name: string;
  character: string;
  wikiUrl?: string;
  image?: string; // public/ からの相対パス
  affiliation?: { name: string; icon?: string };
  season: string; // "0"=恒常, 数字=シーズン, その他は記号(例: "W")
  // 罪悪属性ごとのスキル枚数 (3=S1, 2=S2, 1=S3。"防"/"反"/"避" は守備スキルもその罪悪属性)
  sinSkills: Record<string, string>;
  hp: string;
  defense: string; // 守備レベル
  speed: string; // "4-8" のような範囲
  level: string; // 攻撃レベル (複数値は "69.68.70" のようにドット区切り)
  attackTypes: string; // このキャラのスキルが使う攻撃属性の要約 (例: "斬貫")
  resistance: { 斬: string; 貫: string; 打: string }; // 各攻撃属性に対する被ダメージ倍率(固定順)
}

// wikiのセル表記 "11 斬 / 4(+7)*1" = 最大威力11, 斬撃, 基礎威力4, コイン威力+7, コイン1枚
export interface SkillCell {
  raw: string;
  sin?: string; // 最大威力の文字色から判定した罪悪属性
  type?: string; // 斬/貫/打 (守備スキルは 防御/回避/反撃 など)
  maxPower?: string;
  basePower?: string;
  coinPower?: string; // 符号付き (例: "+7", "-2")
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

// ---- 人格個別ページ (wikiwiki.jp/lcbwiki/人格/<囚人>/<人格>) から取得する詳細 ----

export interface Keyword {
  term: string;
  desc: string;
}

export interface LabeledValue {
  label: string;
  value: string; // 改行区切りは同期化段階などの段階値
}

export interface SkillDetail {
  slot: string; // "スキル1" / "スキル2" / "スキル3" / "守備スキル" など wiki の見出しそのまま
  name: string;
  copies?: string; // "×3"
  sin?: string;
  attackType?: string; // "斬撃" / "反撃-斬撃" など
  stats: LabeledValue[]; // マッチ威力・基本威力・コイン威力・コイン個数・スキルレベル・攻撃加重値
  effect: string; // 改行区切り。行頭 Ⅰ/Ⅱ/Ⅲ… はコイン効果、行頭の全角空白はその上のコインの続き
  keywords: Keyword[];
  special?: boolean; // wiki上で枠ラベルの無い特殊スキル(スキル3の変化形、特殊守備スキルなど)
  form?: string; // 形態ごとにスキル一式が変わる人格の形態名("通常状態" / "拘束解除-創作没入" など)
  unbreakableCoins?: number[]; // 元から破壊不能なコインの番号(1始まり)
  unbreakableByEffect?: string[]; // このスキル自身の効果で破壊不能コインに変わる記述
}

export interface PassiveDetail {
  kind: string; // "バトル" / "サポート"
  name: string;
  resource?: string; // "傲慢×4"
  condition?: string; // "保有" / "共鳴"
  effect: string;
  keywords: Keyword[];
  unbreakableByEffect?: string[]; // スキルのコインを破壊不能コインに変える効果の記述
}

export interface PersonaDetail {
  code: string;
  ruby?: string; // "剣契(コムゲ) 殺手(サルス)"
  info: LabeledValue[];
  skills: SkillDetail[];
  passives: PassiveDetail[];
}

export interface CharacterProfile {
  name: string;
  profileText: string;
}

export interface CharacterImages {
  poster?: string;
  posterThumb?: string;
}

export interface CharacterData {
  name: string;
  number: string; // "01"〜"12"
  images: CharacterImages;
  profile: CharacterProfile;
  statuses: PersonaStatus[];
  skills: PersonaSkills[];
  passives: PassiveEntry[];
  supportPassives: PassiveEntry[];
}

export interface CharacterListEntry {
  name: string;
  number: string;
  posterThumb?: string;
  profileText: string;
  personaCount: number;
}
