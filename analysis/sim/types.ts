// 状態異常評価用の人格プロファイルの型。
// 画面には出さない内部データ。効果文(src/data/personas/*.json)を、シミュレーターが扱える
// 「付与・回数・振動爆発・発動・自己バフ」の単位に人手で分解したもの。値は同期化Ⅳ(表記 "a/b" の後ろ側)を採る。

export type Slot = "S1" | "S2" | "S3";

// 対象(ボス)に付く、威力と回数を持つ状態異常
export type TargetStatus = "burn" | "bleed" | "rupture" | "sinking" | "tremor";
export const TARGET_STATUSES: TargetStatus[] = ["burn", "bleed", "rupture", "sinking", "tremor"];

// 付与量のキー(burnP = 火傷威力、burnC = 火傷回数 …)
export type StatusKey = `${TargetStatus}${"P" | "C"}`;
export const STATUS_KEYS: StatusKey[] = TARGET_STATUSES.flatMap((s) => [`${s}P`, `${s}C`] as StatusKey[]);

// 振幅変換で変わる特殊振動。振動爆発時の追加ダメージが変わる
export type TremorType = "灼熱" | "大量出血" | "反響" | "保存" | "鎖" | "崩壊";

// 状態異常を「発動」させる効果(本来のタイミングを待たずにダメージを出す)
export interface Trigger {
  status: "burn" | "bleed" | "rupture" | "sinking";
  scale?: number; // 威力に掛ける倍率(既定 1)
  cap?: number; // ダメージの上限
  countLoss?: number; // 発動後に減る回数(既定 1、回数が減らない追加ダメージは 0)
  times?: number;
}

// 1回の的中(または使用)で起きること
export type Effect = Partial<Record<StatusKey, number>> & {
  convert?: TremorType; // 振幅変換
  burst?: number; // 振動爆発の回数。1回ごとに混乱区間を振動威力ぶん前進、振動回数-1、特殊振動の追加ダメージ
  trigger?: Trigger;
  deluge?: boolean; // 沈潜殺到: 沈潜回数×沈潜威力のダメージを与えて沈潜を除去
  self?: { breathP?: number; breathC?: number; charge?: number; chargeP?: number; tremorC?: number }; // 自分が得る呼吸・充電(chargeP は充電・特殊充電の威力)・自分の振動回数
  // 自分の振動回数を消耗して、その数だけ対象へ付与する(最大 max。min 未満なら起きない)
  transferSelfTremor?: { to: "tremorP" | "tremorC"; max: number; min?: number };
  consumeTarget?: Partial<Record<StatusKey, number>>; // 対象の状態異常をこれだけ消耗する(T社の振動消耗など)
  burstDmg?: { rate: number; cap?: number }; // この効果の振動爆発で、前進させた混乱区間×rate のダメージを与える
  blackFlameNext?: number; // 次のターンに黒炎(特殊火傷)を付与。ターン終了時に(黒炎×火傷威力)のダメージを与えて消える
  burnFromBlackFlame?: boolean; // 対象の黒炎の数値だけ火傷を付与
  echoNext?: number; // 次のターンに邸宅の木霊(この数値のターンだけ、沈潜の付与時に50%で沈潜回数+1)
  needEcho?: boolean; // 対象に邸宅の木霊があるときだけ起きる
  concussion?: number; // 脳震盪(この数値のターンだけ、破裂ダメージと振動爆発の混乱区間前進が1.2倍)
  // 蝶(特殊沈潜、厳粛な哀悼イサン)を付与する。live = 生きた蝶(威力)、dead = 死んだ蝶(回数)。それぞれ最大15
  butterfly?: { live?: number; dead?: number };
  butterflyDmg?: boolean; // 対象の全ての蝶(生きた蝶+死んだ蝶)だけ憂鬱ダメージ
  flatDmg?: { kind: "burn" | "bleed" | "rupture" | "sinking" | "tremor"; amount: number }; // 固定の状態異常ダメージ(特殊状態異常の近似)
  consumeCharge?: number; // 自分の充電回数をこれだけ消耗できたときだけ起きる(消耗する)
  crit?: boolean; // このコインがクリティカルのときだけ起きる(自分の呼吸で判定)
  prob?: number; // この効果が起きる確率(表的中などの近似)
  min?: Partial<Record<StatusKey, number>>; // 対象の状態異常がこれ以上のときだけ起きる
  requires?: string[]; // 編成にこの人格が全員いるときだけ起きる
};

export interface Coin {
  hit?: Effect | Effect[];
  unbreakable?: boolean; // 破壊不能コイン(マッチに負けても的中する)
  times?: number; // 再使用を含めた的中回数(既定 1)
  noDamage?: boolean; // ダメージを与えないコイン(味方へのバフ用など)
}

// スキルの素の威力。人格データの数値から自動で埋める(profiles/index.ts)
export interface Power {
  base: number;
  coin: number;
  coins: number;
}

// スキルの威力・ダメージ量の補正(「対象の火傷6につきコイン威力+1(最大2)」など)。スキル使用時に判定する
export type ModSource = StatusKey | "self.breathP" | "self.breathC" | "self.charge" | "self.tremorC" | "butterfly"; // butterfly = 対象の全ての蝶
export interface Mod extends TurnWindow {
  coin?: number; // コイン威力(表が出たコインに加算)
  base?: number; // 基本威力
  final?: number; // 最終威力(各コインの威力に加算)
  dmg?: number; // ダメージ量(0.1 = +10%)
  critDmg?: number; // クリティカルダメージ量(0.1 = +10%)
  per?: { of: ModSource[]; step: number; max?: number }; // 合計 step につき1回分(最大 max 回分)
  atLeast?: { of: ModSource[]; value: number }; // 合計が value 以上のときだけ
  prob?: number; // 条件を満たす確率の近似(速度差など、シミュレーターで追わない条件)
  consumeCharge?: number; // 自分の充電回数をこれだけ消耗できたときだけ(消耗する)
}

export interface Skill {
  name: string; // src/data/personas/<code>.json のスキル名と一致させる(空白・改行は無視して照合)
  onUse?: Effect; // 的中に関係なく使用時・マッチ開始時に起きる効果
  coins: Coin[];
  unbreakable?: boolean; // 全コインが破壊不能
  // 対象の破裂が15以上・回数3以上なら、このスキルは破裂を付与しない代わりに的中時に破裂回数を消耗しない(センク・ヂェーヴィチ)
  sustainRupture?: boolean;
  mods?: Mod[];
  power?: Power;
}

// ターン範囲。from〜until(両端含む)。省略時は全ターン
export interface TurnWindow {
  from?: number;
  until?: number;
  turns?: number[]; // 指定したターンだけ(from/until より優先)
  requires?: string[]; // 編成にこの人格が全員いるときだけ
}

// スキルの形態。同じスロットに複数あるときは、条件に合う最後のものを使う
export interface SkillVariant extends TurnWindow {
  skill: Skill;
}

// 付与量の加算(暁の火・作品名・シン(心)系など)
export type Bonus = TurnWindow &
  Partial<Record<StatusKey, number>> & {
    label: string;
    limit?: number; // 1ターンの発動上限
    perHit?: Effect; // 攻撃が的中するたびに追加で起きる効果
    chance?: number; // このターンに有効である確率(条件を満たす頻度の近似)
    dmgUp?: number; // スキルダメージの倍率加算(0.1 = +10%)。状態異常ダメージには掛からない
    selfBreathUp?: number; // 自分が得る呼吸威力・回数の加算(追慕など)
    burstDmgRate?: number; // 自分の振動爆発で、前進させた混乱区間×この割合のダメージを与える(武勇伝など)
    mods?: Mod[]; // 自分の全スキルに掛かる威力・ダメージ量の補正(パッシブ・自己バフ)
  };

// 追撃(夜明事務所の連携、親指の子方のパレルモ・スパーダなど)
export interface FollowUp extends TurnWindow {
  label: string;
  skill: Skill;
  trigger: { code: string; slots?: Slot[] } | "self-hit" | "turn"; // 誰のどのスキルで出るか
  prob?: number; // 出る確率の近似
  unopposed?: boolean; // 一方攻撃(全コイン的中)
}

export interface Profile {
  code: string;
  name: string;
  tags?: string[]; // 所属など、他の効果の条件に使う("ル・ノワール" など)
  skills: Record<Slot, SkillVariant[]>;
  overrides?: (SkillVariant & { turns: number[] })[]; // 指定ターンにスロットを問わず置き換えるスキル(処分など)
  bonuses?: Bonus[];
  followUps?: FollowUp[];
  turnStart?: (TurnWindow & { effect: Effect })[]; // ターン開始時に起きる効果(自分の呼吸獲得など)
  turnEnd?: (TurnWindow & { effect: Effect })[]; // ターン終了時に対象へ起きる効果(胞子など)
  support?: { label: string; bonus: Bonus; effectPerTurn?: Effect }; // 裏置き時の効果
  notes: string[]; // 近似の内容。評価を読むときの前提
}
