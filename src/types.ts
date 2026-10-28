// LimbusCompany攻略Wiki (wikiwiki.jp/lcbwiki) から取得したデータの型定義。
// scripts/scrape.ts と src 側の両方からこの型を参照する。

export interface PersonaStatus {
  code: string;
  name: string;
  character: string;
  wikiUrl?: string;
  image?: string; // public/ からの相対パス
  affiliation?: { name: string };
  season: string; // "0"=恒常, 数字=シーズン, その他は記号(例: "W")
  // 罪悪属性ごとのスキル枚数 (3=S1, 2=S2, 1=S3。"防"/"反"/"避" は守備スキルもその罪悪属性)
  sinSkills: Record<string, string>;
  hp: string;
  defense: string; // 守備レベル
  speed: string; // "4-8" のような範囲
  level: string; // 攻撃レベル (複数値は "69.68.70" のようにドット区切り)
  attackTypes: string; // このキャラのスキルが使う攻撃属性の要約 (例: "斬貫")
  resistance: { 斬: string; 貫: string; 打: string }; // 各攻撃属性に対する被ダメージ倍率(固定順)
  // 実装前の公式予告だけで載せた人格。予告に無い数値(体力・速度など)は "?" にしている。
  // wiki に人格ページができたら npm run scrape で取り直し、この印も消える
  preview?: boolean;
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

// ---- E.G.O (囚人ページの「E.G.O一覧」と E.G.O 個別ページ wikiwiki.jp/lcbwiki/E.G.O/<囚人>/<E.G.O>) ----
// E.G.O のコード(例 "0101")は人格コードと同じ4桁で重なるため、ファイル名・キャッシュでは "ego-" を付けて区別する

export interface EgoSummary {
  code: string;
  name: string;
  character: string;
  wikiUrl?: string;
  image?: string; // public/ からの相対パス
  rank: string; // 危険ランク "ZAYIN" / "TETH" / "HE" / "WAW" / "ALEPH"
  sin?: string; // E.G.O の罪悪属性
  attackTypes: string; // "貫" / "貫斬"(覚醒・侵蝕で異なる場合)
  cost: Record<string, string>; // 罪悪属性 → 必要資源数(不要な属性は "")
  resistance: Record<string, string>; // 罪悪属性 → 被ダメージ倍率
  note: string; // 入手方法など(例 "S1有償パスLv30")
}

// E.G.O 本文の解析段階の表記。wiki は「解析段階 Ⅱ / Ⅲ / Ⅳ」で変わる部分を文字色で示すため、
// 色付き部分を 〘Ⅲ:…〙(解析Ⅲで変化・追加) / 〘Ⅳ:…〙(解析Ⅳで変化・追加) で囲んで残す。
// 印の無い部分は解析Ⅱ以前からの値。"火傷1/〘Ⅲ:2〙/〘Ⅳ:3〙" = Ⅱで1、Ⅲで2、Ⅳで3
export interface EgoSkillDetail {
  kind: "覚醒" | "侵蝕";
  name?: string; // スキルが複数あるE.G.Oの個別名("汚血泣涙-始" など)。1つだけなら E.G.O 名と同じなので省略
  attackType?: string; // "貫通" など。覚醒・侵蝕で異なる E.G.O のみ個別の値が入る
  stats: LabeledValue[]; // マッチ威力・基本威力・コイン威力・コイン個数・スキルレベル・攻撃加重値(改行区切りは段階値)
  effect: string; // SkillDetail.effect と同じ書式 + 解析段階の印
  keywords: Keyword[];
  unbreakableCoins?: number[];
}

export interface EgoPassiveDetail {
  name: string;
  effect: string; // 末尾の "※解析段階Ⅱで取得…" は wiki の注記そのまま
  keywords: Keyword[];
}

export interface EgoDetail {
  code: string;
  ruby?: string; // "オガムド"
  origin?: string; // 元になった幻想体・コラボ元 (例 "羅生蝶" / "ケルシー(アークナイツ)")
  info: LabeledValue[]; // 囚人・シーズン実装日・危険ランク・精神消耗量・攻撃タイプ・罪悪属性
  cost: { sin: string; count: number }[];
  resistance: { sin: string; value: string }[]; // "普通" / "脆弱[×2]" など wiki の表記
  skills: EgoSkillDetail[];
  passives: EgoPassiveDetail[];
  // 解析Ⅴが実装された E.G.O のみ。skills/passives が解析Ⅴの状態で、こちらが解析Ⅰ〜Ⅳの状態(〘Ⅲ〙〘Ⅳ〙の印付き)
  earlier?: { skills: EgoSkillDetail[]; passives: EgoPassiveDetail[] };
  specialEffects: Keyword[]; // 「専用効果」表(この E.G.O 固有の状態効果)
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
  egos?: EgoSummary[]; // E.G.O 対応前に取得した JSON には無い
}

export interface CharacterListEntry {
  name: string;
  number: string;
  posterThumb?: string;
  profileText: string;
  personaCount: number;
}

// ---- おすすめ編成 (src/data/teams.json と src/data/team-guides/<id>.md) ----

export interface TeamMember {
  code: string; // 人格コード(egos では E.G.O コード)
  note?: string; // この編成での役割(1文)
  // 編成のキーワードを持たない人格をあえて入れるときに true。入る理由を note に書く
  // (例: 呼吸編成の黒獣-卯 筆頭。呼吸人格ではないが鴻園の君主と相性がよい)
  offKeyword?: boolean;
}

// コンビ・トリオ運用。同じ所属などで組み合わせて使うと強い人格のまとまり(囚人は重複しない)
export interface TeamCombo {
  name: string; // 例 "夜明組(トリオ)"
  note: string; // 組みで使う理由・注意
  members: TeamMember[];
}

// 編成例。出撃する人格を7人以上決めて示す(囚人は重複しない)
export interface TeamExample {
  name: string; // 例 "物理火傷型(基本形)"
  note: string; // どんな形か・向く場面
  members: TeamMember[]; // 出撃する人格(7人以上)
  support: TeamMember[]; // 裏置き
  egos: TeamMember[];
}

export interface TeamData {
  id: string; // URL と解説ファイル名に使う英小文字の ID (例 "burn")
  name: string;
  category: "状態異常" | "所属" | "その他" | "鏡ダンジョン";
  keywords: string[]; // 軸になるキーワード(例 ["火傷"])
  difficulty: "初心者" | "中上級";
  // 適性(◎ / 〇 / △ / ✖)。表示はキーの並び順。通常の編成は 通常・短期・長期、鏡ダンジョンの編成は 周回・深層
  aptitude: Record<string, string>;
  source?: string; // 参考にした wiki 編成ガイドの見出し(.cache/commentary/teams/<見出し>.md)
  examples?: TeamExample[]; // 編成例: 優先枠をどう組み合わせて何人出すか
  core: TeamMember[]; // 優先枠: 編成の軸。囚人は重複させない
  combos?: TeamCombo[]; // コンビ・トリオ運用(優先枠と重なる人格を含んでよい)
  flex: TeamMember[]; // 自由枠: 残りの枠を埋める候補
  alternatives: TeamMember[]; // 代替枠: 手持ちが無いときの代わり
  support: TeamMember[]; // 裏置き: サポートパッシブのために控えに置く
  egos: TeamMember[]; // 相性の良い E.G.O
}

// ---- 鏡ダンジョン(scripts/mirror.ts が wiki から生成する src/data/mirror/*.json) ----

// E.G.Oギフト。効果文の強化段階は 〘+:…〙 / 〘++:…〙 の印で示す(wiki の「3/4/5」表記はそのまま残る)
export interface MirrorGift {
  no: string; // wiki の一覧の番号(例 "001"、"NB3"、"EXG5")
  id: string; // wiki の画像名(例 "HellterflysDream")。パック・合成の表との照合に使う
  name: string;
  sin: string; // 罪悪属性
  tier: string; // ランク Ⅰ〜Ⅴ / EX
  price: number | null; // ショップ価格。合成専用・売却不可などは null で priceNote に表記を残す
  priceNote?: string; // "合成" / "売却不可" など
  upgradeCost: [number, number] | null; // +・++ への強化費。強化不可は null
  effect: string;
  events: string[]; // 獲得できるイベント
  keyword: string | null; // 分類(火傷・斬撃・資源・回復など)。"-" は null
  notes?: string[]; // wiki の脚注
}

export interface MirrorPack {
  name: string;
  id: string | null; // wiki の画像名(Pack_ を除く)。画像が未掲載のパックは null
  category: string; // ストーリーカードパック / 鏡屈折鉄道カードパック / EXTREME限定カードパック など
  gifts: string[]; // 出現するギフトの id(グループ共通の分。限定・属性別を除く)
  limitedGifts: string[] | null; // 限定ギフト・属性別ギフトの id。wiki 未記載は null
}

export interface MirrorFusion {
  result: string; // 合成ギフトの id
  materials: string[]; // 素材ギフトの id
}
