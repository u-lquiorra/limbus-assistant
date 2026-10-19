// 状態異常の推移とダメージを、ボス1体(1部位)相手にモンテカルロで追うシミュレーター。
// 計算式の根拠は docs/battle-formulas.md。
// スキルダメージは「素の威力」(基本威力+表のコイン威力、クリティカル×1.2、プロファイルで明示したダメージ量補正)だけで、
// 耐性・レベル差・人格ごとの条件付き威力補正は含めない。状態異常ダメージは固定ダメージとして数える。
import {
  STATUS_KEYS,
  TARGET_STATUSES,
  type Bonus,
  type Effect,
  type FollowUp,
  type Mod,
  type ModSource,
  type Profile,
  type Skill,
  type Slot,
  type StatusKey,
  type TargetStatus,
  type TremorType,
  type TurnWindow,
} from "./types.ts";

export interface PC {
  p: number;
  c: number;
}

export interface TargetState {
  burn: PC;
  bleed: PC;
  rupture: PC;
  sinking: PC;
  tremor: PC;
  tremorType: TremorType | null;
  blackFlame: number; // 黒炎(特殊火傷、最大7)
  blackFlameNext: number; // 次のターン開始時に付く黒炎
  echo: number; // 邸宅の木霊の残りターン
  echoNext: number;
  concussion: number; // 脳震盪の残りターン(最大2)
  butterfly: { live: number; dead: number }; // 蝶(特殊沈潜)。生きた蝶・死んだ蝶(それぞれ最大15)
}

export interface SelfState {
  breath: PC;
  charge: number;
  chargeP: number; // 充電・特殊充電(保存など)の威力。累計の消耗で育つ分は、プロファイル側で効果として与える
  tremorC: number; // 自分の振動回数(T社・ツヴァイ・ユロージヴィなどが資源として使う)
}

export interface TeamInput {
  name: string;
  members: string[]; // 出撃順(=このシミュレーターでの行動順)
  support?: { code: string; target: string }; // 裏置きと、効果を受ける味方
}

export interface SimOptions {
  turns: number;
  trials: number;
  clashWinRate: number; // 1スキルがマッチに勝つ(=全コインが的中する)確率。一方攻撃・破壊不能コインは常に的中
  headsRate?: number; // コインの表の確率(精神力 +20 相当の 0.7 が既定)
  bossCoins?: number; // ボスが1ターンに投げる攻撃コイン数(出血の発動回数)。既定 6
  seed?: number;
  // 各人格が毎ターン使うスロットの順番。S1×3・S2×2・S3×1 の山札を1周6ターンで回す近似
  rotation?: Slot[];
}

export const DEFAULT_ROTATION: Slot[] = ["S1", "S2", "S3", "S1", "S1", "S2"];

// ダメージの内訳
export const DMG_KINDS = ["skill", "burn", "bleed", "rupture", "sinking", "tremor"] as const;
export type DmgKind = (typeof DMG_KINDS)[number];
export type Dmg = Record<DmgKind, number>;

export interface Contribution {
  applied: Partial<Record<StatusKey, number>>; // 付与した威力・回数
  dmg: Dmg; // 自分の行動で出したダメージ(火傷のターン終了ダメージ・出血の被弾時ダメージは編成全体の値にだけ数える)
  stagger: number; // 振動爆発で前進させた混乱区間
  crits: number;
}

export interface TurnStat {
  turn: number;
  state: Record<StatusKey, number>; // ターン終了処理の直前の値
  dmg: Dmg;
  stagger: number;
  crits: number;
  cumStatus: number; // 状態異常ダメージの累計
  cumTotal: number; // スキル+状態異常ダメージの累計
}

export interface SimResult {
  team: string;
  turns: TurnStat[];
  contributions: Record<string, Contribution>;
}

const MAX = 99;
const CHARGE_MAX = 20;
const BUTTERFLY_MAX = 15;

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const emptyTarget = (): TargetState => ({
  burn: { p: 0, c: 0 },
  bleed: { p: 0, c: 0 },
  rupture: { p: 0, c: 0 },
  sinking: { p: 0, c: 0 },
  tremor: { p: 0, c: 0 },
  tremorType: null,
  blackFlame: 0,
  blackFlameNext: 0,
  echo: 0,
  echoNext: 0,
  concussion: 0,
  butterfly: { live: 0, dead: 0 },
});
const emptySelf = (): SelfState => ({ breath: { p: 0, c: 0 }, charge: 0, chargeP: 0, tremorC: 0 });
const emptyDmg = (): Dmg => ({ skill: 0, burn: 0, bleed: 0, rupture: 0, sinking: 0, tremor: 0 });
const emptyContribution = (): Contribution => ({ applied: {}, dmg: emptyDmg(), stagger: 0, crits: 0 });

export function inWindow(w: TurnWindow, turn: number, team: Set<string>): boolean {
  if (w.requires && !w.requires.every((c) => team.has(c))) return false;
  if (w.turns) return w.turns.includes(turn);
  return (w.from ?? 1) <= turn && turn <= (w.until ?? Infinity);
}

// 威力か回数のどちらかが0になった状態異常は消える。上限は99
function normalize(s: PC): void {
  s.p = Math.min(s.p, MAX);
  s.c = Math.min(s.c, MAX);
  if (s.p <= 0 || s.c <= 0) s.p = s.c = 0;
}

// 状態異常を持たない対象へ威力だけ付与すると回数1、回数だけ増やすと威力1で付く(有力。docs 参照)
function addPC(s: PC, p: number, c: number): void {
  if (p <= 0 && c <= 0) return;
  s.p += p;
  s.c += c;
  if (s.p > 0 && s.c <= 0) s.c = 1;
  if (s.c > 0 && s.p <= 0) s.p = 1;
  normalize(s);
}

export interface Ctx {
  team: Set<string>;
  profiles: Map<string, Profile>;
  target: TargetState;
  selves: Map<string, SelfState>;
  rng: () => number;
  dmg: Dmg;
  stagger: { v: number };
  crits: { v: number };
  contrib: Record<string, Contribution>;
  bonuses: Map<string, { bonus: Bonus; used: number }[]>; // このターン有効な付与量加算(人格コード別)
}

export function makeCtx(target = emptyTarget(), team: string[] = [], profiles = new Map<string, Profile>()): Ctx {
  return {
    team: new Set(team),
    profiles,
    target,
    selves: new Map(),
    rng: makeRng(1),
    dmg: emptyDmg(),
    stagger: { v: 0 },
    crits: { v: 0 },
    contrib: {},
    bonuses: new Map(),
  };
}

function selfOf(ctx: Ctx, code: string): SelfState {
  let s = ctx.selves.get(code);
  if (!s) ctx.selves.set(code, (s = emptySelf()));
  return s;
}

function addDmg(ctx: Ctx, con: Contribution, kind: DmgKind, d: number): void {
  ctx.dmg[kind] += d;
  con.dmg[kind] += d;
}

// 効果を適用する。crit はそのコインがクリティカルだったか
export function applyEffect(
  eff: Effect,
  owner: string,
  ctx: Ctx,
  opts: { useBonus?: boolean; crit?: boolean; noRupture?: boolean } = {},
): void {
  const t = ctx.target;
  if (eff.requires && !eff.requires.every((c) => ctx.team.has(c))) return;
  if (eff.crit && !opts.crit) return;
  if (eff.needEcho && t.echo <= 0) return;
  if (eff.prob !== undefined && ctx.rng() >= eff.prob) return;
  if (eff.min) {
    for (const [k, v] of Object.entries(eff.min) as [StatusKey, number][]) {
      const st = t[k.slice(0, -1) as TargetStatus];
      if ((k.endsWith("P") ? st.p : st.c) < v) return;
    }
  }
  const self = selfOf(ctx, owner);
  if (eff.consumeCharge !== undefined) {
    if (self.charge < eff.consumeCharge) return;
    self.charge -= eff.consumeCharge;
  }
  const con = (ctx.contrib[owner] ??= emptyContribution());

  const add: Partial<Record<StatusKey, number>> = {};
  for (const k of STATUS_KEYS) if ((eff[k] ?? 0) > 0) add[k] = eff[k];
  if (opts.noRupture) {
    delete add.ruptureP;
    delete add.ruptureC;
  }
  if (opts.useBonus !== false) {
    for (const entry of ctx.bonuses.get(owner) ?? []) {
      const b = entry.bonus;
      if (b.limit !== undefined && entry.used >= b.limit) continue;
      let applied = false;
      for (const k of STATUS_KEYS) {
        if ((add[k] ?? 0) > 0 && (b[k] ?? 0) > 0) {
          add[k] = (add[k] ?? 0) + (b[k] ?? 0);
          applied = true;
        }
      }
      if (applied) entry.used++;
    }
  }
  // 邸宅の木霊: 沈潜威力・回数を付与するとき、50%で沈潜回数+1
  if (t.echo > 0 && ((add.sinkingP ?? 0) > 0 || (add.sinkingC ?? 0) > 0) && ctx.rng() < 0.5) add.sinkingC = (add.sinkingC ?? 0) + 1;
  for (const s of TARGET_STATUSES) {
    const p = add[`${s}P`] ?? 0;
    const c = add[`${s}C`] ?? 0;
    addPC(t[s], p, c);
    if (s === "tremor" && t.tremor.c <= 0) t.tremorType = null;
  }
  for (const k of STATUS_KEYS) if (add[k]) con.applied[k] = (con.applied[k] ?? 0) + (add[k] ?? 0);

  if (eff.self) {
    const up = (ctx.bonuses.get(owner) ?? []).reduce((a, e) => a + (e.bonus.selfBreathUp ?? 0), 0);
    const bp = eff.self.breathP ?? 0;
    const bc = eff.self.breathC ?? 0;
    addPC(self.breath, bp > 0 ? bp + up : 0, bc > 0 ? bc + up : 0);
    self.charge = Math.min(CHARGE_MAX, self.charge + (eff.self.charge ?? 0));
    self.chargeP = Math.min(CHARGE_MAX, self.chargeP + (eff.self.chargeP ?? 0));
    self.tremorC = Math.max(0, Math.min(MAX, self.tremorC + (eff.self.tremorC ?? 0))); // 負の値は消耗
  }

  if (eff.transferSelfTremor && self.tremorC >= (eff.transferSelfTremor.min ?? 1)) {
    const n = Math.min(self.tremorC, eff.transferSelfTremor.max);
    self.tremorC -= n;
    const p = eff.transferSelfTremor.to === "tremorP" ? n : 0;
    const c = eff.transferSelfTremor.to === "tremorC" ? n : 0;
    addPC(t.tremor, p, c);
    con.applied[eff.transferSelfTremor.to] = (con.applied[eff.transferSelfTremor.to] ?? 0) + n;
  }

  if (eff.consumeTarget) {
    for (const [k, v] of Object.entries(eff.consumeTarget) as [StatusKey, number][]) {
      const st = t[k.slice(0, -1) as TargetStatus];
      if (k.endsWith("P")) st.p = Math.max(0, st.p - v);
      else st.c = Math.max(0, st.c - v);
      normalize(st);
    }
    if (t.tremor.c <= 0) t.tremorType = null;
  }

  if (eff.convert && t.tremor.c > 0) t.tremorType = eff.convert;
  if (eff.blackFlameNext) t.blackFlameNext = Math.min(7, t.blackFlameNext + eff.blackFlameNext);
  if (eff.echoNext) t.echoNext = Math.max(t.echoNext, eff.echoNext);
  if (eff.concussion) t.concussion = Math.min(2, Math.max(t.concussion, eff.concussion));
  if (eff.butterfly) {
    t.butterfly.live = Math.min(BUTTERFLY_MAX, t.butterfly.live + (eff.butterfly.live ?? 0));
    t.butterfly.dead = Math.min(BUTTERFLY_MAX, t.butterfly.dead + (eff.butterfly.dead ?? 0));
  }
  if (eff.burnFromBlackFlame && t.blackFlame > 0) {
    addPC(t.burn, t.blackFlame, 0);
    con.applied.burnP = (con.applied.burnP ?? 0) + t.blackFlame;
  }

  const burstRate = (ctx.bonuses.get(owner) ?? []).reduce((a, e) => a + (e.bonus.burstDmgRate ?? 0), 0);
  for (let i = 0; i < (eff.burst ?? 0); i++) {
    if (t.tremor.c <= 0) break;
    const tp = t.tremor.p;
    const advance = t.concussion > 0 ? Math.floor(tp * 1.2) : tp; // 脳震盪で混乱区間前進量1.2倍
    ctx.stagger.v += advance;
    con.stagger += advance;
    // 混乱区間の前進量に比例するダメージ(後悔の「解かれた暴力性」、奥歯事務所の「武勇伝」など)
    if (burstRate > 0) addDmg(ctx, con, "tremor", Math.floor(tp * burstRate));
    if (eff.burstDmg) addDmg(ctx, con, "tremor", Math.min(Math.floor(tp * eff.burstDmg.rate), eff.burstDmg.cap ?? Infinity));
    let keepCount = false;
    switch (t.tremorType) {
      case "灼熱":
        addDmg(ctx, con, "tremor", Math.floor((tp + t.burn.p) / 2));
        if (t.burn.c > 0) t.burn.c -= 1;
        normalize(t.burn);
        break;
      case "大量出血":
        addDmg(ctx, con, "tremor", Math.floor((tp + t.bleed.p) / 2));
        if (t.bleed.c > 0) t.bleed.c -= 1;
        normalize(t.bleed);
        break;
      case "反響":
        addDmg(ctx, con, "tremor", tp);
        break;
      case "保存": {
        // 振動威力の(60+攻撃者の充電威力または特殊充電の威力×8)%、最大120%。ル・ノワールの振動爆発では回数が減らない
        // 参照するのは回数ではなく威力(回数だと序盤から上限に張り付き、過大になる)
        const rate = Math.min(1.2, 0.6 + 0.08 * self.chargeP);
        addDmg(ctx, con, "tremor", Math.floor(tp * rate));
        keepCount = ctx.profiles.get(owner)?.tags?.includes("ル・ノワール") ?? false;
        break;
      }
    }
    if (!keepCount) t.tremor.c -= 1;
    normalize(t.tremor);
    if (t.tremor.c <= 0) t.tremorType = null;
  }

  if (eff.trigger) {
    const tr = eff.trigger;
    const st = t[tr.status];
    for (let i = 0; i < (tr.times ?? 1); i++) {
      if (st.c <= 0) break;
      addDmg(ctx, con, tr.status, Math.min(Math.floor(st.p * (tr.scale ?? 1)), tr.cap ?? Infinity));
      st.c -= tr.countLoss ?? 1;
      normalize(st);
    }
  }

  if (eff.flatDmg) addDmg(ctx, con, eff.flatDmg.kind, eff.flatDmg.amount);
  if (eff.butterflyDmg) addDmg(ctx, con, "sinking", t.butterfly.live + t.butterfly.dead);

  if (eff.deluge && t.sinking.c > 0) {
    addDmg(ctx, con, "sinking", t.sinking.p * t.sinking.c);
    t.sinking = { p: 0, c: 0 };
  }
}

function pickSkill(p: Profile, slot: Slot, turn: number, team: Set<string>): Skill {
  const ov = p.overrides?.find((o) => inWindow(o, turn, team));
  if (ov) return ov.skill;
  const variants = p.skills[slot].filter((v) => inWindow(v, turn, team));
  if (variants.length === 0) throw new Error(`${p.code} ${slot}: ターン${turn}で使えるスキルがない`);
  return variants[variants.length - 1].skill;
}

// 補正の値を集計する(スキル使用時点の対象・自分の状態で判定)
export interface ModTotal {
  coin: number;
  base: number;
  final: number;
  dmg: number;
  critDmg: number;
}
export function evalMods(mods: Mod[], owner: string, ctx: Ctx, turn: number): ModTotal {
  const t = ctx.target;
  const self = selfOf(ctx, owner);
  const value = (src: ModSource): number => {
    switch (src) {
      case "self.breathP":
        return self.breath.p;
      case "self.breathC":
        return self.breath.c;
      case "self.charge":
        return self.charge;
      case "self.tremorC":
        return self.tremorC;
      case "butterfly":
        return t.butterfly.live + t.butterfly.dead;
      default: {
        const st = t[src.slice(0, -1) as TargetStatus];
        return src.endsWith("P") ? st.p : st.c;
      }
    }
  };
  const sum = (of: ModSource[]) => of.reduce((a, k) => a + value(k), 0);
  const total: ModTotal = { coin: 0, base: 0, final: 0, dmg: 0, critDmg: 0 };
  for (const m of mods) {
    if (!inWindow(m, turn, ctx.team)) continue;
    if (m.atLeast && sum(m.atLeast.of) < m.atLeast.value) continue;
    if (m.prob !== undefined && ctx.rng() >= m.prob) continue;
    let k = 1;
    if (m.per) k = Math.min(Math.floor(sum(m.per.of) / m.per.step), m.per.max ?? Infinity);
    if (k <= 0) continue;
    if (m.consumeCharge !== undefined) {
      if (self.charge < m.consumeCharge) continue;
      self.charge -= m.consumeCharge;
    }
    total.coin += (m.coin ?? 0) * k;
    total.base += (m.base ?? 0) * k;
    total.final += (m.final ?? 0) * k;
    total.dmg += (m.dmg ?? 0) * k;
    total.critDmg += (m.critDmg ?? 0) * k;
  }
  return total;
}

// スキルを1回使う。戻り値は1枚でも的中したか
export function castSkill(
  owner: string,
  skill: Skill,
  ctx: Ctx,
  opts: SimOptions,
  unopposed: boolean,
  turn = 1,
): boolean {
  // 威力・ダメージ量の補正は使用時の状態で判定する(使用時効果の付与より前)
  const ownerBonuses = ctx.bonuses.get(owner) ?? [];
  const mod = evalMods([...(skill.mods ?? []), ...ownerBonuses.flatMap((e) => e.bonus.mods ?? [])], owner, ctx, turn);
  if (skill.onUse) applyEffect(skill.onUse, owner, ctx);
  const won = unopposed || ctx.rng() < opts.clashWinRate;
  const bonuses = ctx.bonuses.get(owner) ?? [];
  const perHit = bonuses.flatMap((e) => (e.bonus.perHit ? [e.bonus.perHit] : []));
  const dmgUp = bonuses.reduce((a, e) => a + (e.bonus.dmgUp ?? 0), 0) + mod.dmg;
  const self = selfOf(ctx, owner);
  const con = (ctx.contrib[owner] ??= emptyContribution());
  const t = ctx.target;
  const heads = opts.headsRate ?? 0.7;
  let power = (skill.power?.base ?? 0) + mod.base;
  let anyHit = false;
  // 破裂の維持(センク・ヂェーヴィチ): 使用時に条件を判定する
  const sustain = !!skill.sustainRupture && t.rupture.p >= 15 && t.rupture.c >= 3;

  skill.coins.forEach((coin) => {
    // マッチに負けると通常コインは破壊され、破壊不能コインだけが的中する
    if (!won && !coin.unbreakable && !skill.unbreakable) return;
    for (let k = 0; k < (coin.times ?? 1); k++) {
      anyHit = true;
      if (skill.power && k === 0 && ctx.rng() < heads) power += skill.power.coin + Math.sign(skill.power.coin) * mod.coin;
      // クリティカル: 自分の呼吸(威力×5%)。発生すると呼吸回数-1
      let crit = false;
      if (self.breath.c > 0 && ctx.rng() < Math.min(1, self.breath.p * 0.05)) {
        crit = true;
        self.breath.c -= 1;
        normalize(self.breath);
        ctx.crits.v++;
        con.crits++;
      }
      if (!coin.noDamage) {
        // 破裂・沈潜は攻撃を受けたときに発動し、回数が1減る
        for (const s of ["rupture", "sinking"] as const) {
          if (t[s].c > 0) {
            addDmg(ctx, con, s, s === "rupture" && t.concussion > 0 ? Math.floor(t[s].p * 1.2) : t[s].p);
            if (!(s === "rupture" && sustain)) t[s].c -= 1;
            normalize(t[s]);
          }
        }
        // 蝶: 被ダメージ時、死んだ蝶1につき(沈潜威力÷5)の憂鬱ダメージ(最大30)。
        // 精神力の無いボスとして扱うので、半減して適用する(破裂・沈潜の処理より後に判定する)
        if (t.butterfly.dead > 0 && t.sinking.p > 0) {
          addDmg(ctx, con, "sinking", Math.floor(Math.min(30, Math.floor((t.butterfly.dead * t.sinking.p) / 5)) / 2));
        }
        // ダメージ = 威力 ×(1+クリティカル)×(1+ダメージ量)。静的・動的補正の掛け合わせ(docs 参照)
        if (skill.power) {
          const p = Math.max(1, power + mod.final);
          addDmg(ctx, con, "skill", p * (1 + (crit ? 0.2 + mod.critDmg : 0)) * (1 + dmgUp));
        }
      }
      const hits = coin.hit === undefined ? [] : Array.isArray(coin.hit) ? coin.hit : [coin.hit];
      for (const e of hits) applyEffect(e, owner, ctx, { crit, noRupture: sustain });
      for (const e of perHit) applyEffect(e, owner, ctx, { useBonus: false, crit, noRupture: sustain });
    }
  });
  return anyHit;
}

export function simulate(team: TeamInput, profiles: Map<string, Profile>, opts: SimOptions): SimResult {
  const rotation = opts.rotation ?? DEFAULT_ROTATION;
  const members = team.members.map((c) => {
    const p = profiles.get(c);
    if (!p) throw new Error(`プロファイルが無い人格: ${c}`);
    return p;
  });
  const teamSet = new Set(team.members);
  const support = team.support ? profiles.get(team.support.code)?.support : undefined;

  const sums: TurnStat[] = Array.from({ length: opts.turns }, (_, i) => ({
    turn: i + 1,
    state: Object.fromEntries(STATUS_KEYS.map((k) => [k, 0])) as Record<StatusKey, number>,
    dmg: emptyDmg(),
    stagger: 0,
    crits: 0,
    cumStatus: 0,
    cumTotal: 0,
  }));
  const contrib: Record<string, Contribution> = {};
  const rng = makeRng(opts.seed ?? 1);

  for (let trial = 0; trial < opts.trials; trial++) {
    const target = emptyTarget();
    const selves = new Map<string, SelfState>();
    let cumStatus = 0;
    let cumTotal = 0;
    for (let turn = 1; turn <= opts.turns; turn++) {
      // このターン有効な付与量加算を決める(chance はターンごとに1回判定)
      const bonuses: Ctx["bonuses"] = new Map();
      const addBonus = (code: string, b: Bonus) => {
        if (!inWindow(b, turn, teamSet)) return;
        if (b.chance !== undefined && rng() >= b.chance) return;
        const list = bonuses.get(code) ?? [];
        list.push({ bonus: b, used: 0 });
        bonuses.set(code, list);
      };
      for (const m of members) for (const b of m.bonuses ?? []) addBonus(m.code, b);
      if (support && team.support) addBonus(team.support.target, support.bonus);

      const ctx: Ctx = {
        team: teamSet,
        profiles,
        target,
        selves,
        rng,
        dmg: emptyDmg(),
        stagger: { v: 0 },
        crits: { v: 0 },
        contrib,
        bonuses,
      };
      // 前のターンに予約された黒炎が付く
      target.blackFlame = Math.min(7, target.blackFlame + target.blackFlameNext);
      target.blackFlameNext = 0;
      target.echo = Math.max(target.echo, target.echoNext);
      target.echoNext = 0;
      for (const m of members) {
        for (const ts of m.turnStart ?? []) if (inWindow(ts, turn, teamSet)) applyEffect(ts.effect, m.code, ctx, { useBonus: false });
      }

      const slot = rotation[(turn - 1) % rotation.length];
      const fired = new Set<string>(); // 追撃は「追撃する人格×きっかけの人格」ごとに1ターン1回
      const runFollowUp = (f: FollowUp, owner: Profile, key: string) => {
        if (fired.has(key) || !inWindow(f, turn, teamSet)) return;
        if (f.prob !== undefined && rng() >= f.prob) return;
        fired.add(key);
        castSkill(owner.code, f.skill, ctx, opts, f.unopposed ?? false, turn);
      };

      for (const m of members) {
        const hit = castSkill(m.code, pickSkill(m, slot, turn, teamSet), ctx, opts, false, turn);
        if (!hit) continue;
        for (const owner of members) {
          for (const f of owner.followUps ?? []) {
            if (f.trigger === "turn") continue;
            if (f.trigger === "self-hit") {
              if (owner === m) runFollowUp(f, owner, `${owner.code}:${f.label}`);
            } else if (f.trigger.code === m.code && (!f.trigger.slots || f.trigger.slots.includes(slot))) {
              runFollowUp(f, owner, `${owner.code}:${f.label}:${m.code}`);
            }
          }
        }
      }
      for (const owner of members) {
        for (const f of owner.followUps ?? []) if (f.trigger === "turn") runFollowUp(f, owner, `${owner.code}:${f.label}`);
      }

      // ボスの攻撃: 攻撃コインを投げるたびに出血が発動する
      for (let i = 0; i < (opts.bossCoins ?? 6); i++) {
        if (target.bleed.c <= 0) break;
        ctx.dmg.bleed += target.bleed.p;
        target.bleed.c -= 1;
        normalize(target.bleed);
      }

      for (const m of members) {
        for (const te of m.turnEnd ?? []) if (inWindow(te, turn, teamSet)) applyEffect(te.effect, m.code, ctx, { useBonus: false });
      }
      if (support?.effectPerTurn && team.support) applyEffect(support.effectPerTurn, team.support.code, ctx, { useBonus: false });

      const stat = sums[turn - 1];
      for (const s of TARGET_STATUSES) {
        stat.state[`${s}P`] += target[s].p;
        stat.state[`${s}C`] += target[s].c;
      }

      // ターン終了: 黒炎(黒炎×火傷威力のダメージで消滅)→ 火傷ダメージ → 火傷回数-1、振動回数-1。自分の呼吸回数・充電回数-1
      if (target.echo > 0) target.echo -= 1;
      if (target.concussion > 0) target.concussion -= 1;
      // 蝶: 死んだ蝶を0にし、生きた蝶だけ沈潜を付与してから、生きた蝶を死んだ蝶へ変える
      if (target.butterfly.live > 0 || target.butterfly.dead > 0) {
        const live = target.butterfly.live;
        addPC(target.sinking, live, 0);
        target.butterfly = { live: 0, dead: live };
      }
      if (target.blackFlame > 0) {
        ctx.dmg.burn += target.blackFlame * target.burn.p;
        target.blackFlame = 0;
      }
      if (target.burn.c > 0) {
        ctx.dmg.burn += target.burn.p;
        target.burn.c -= 1;
      }
      if (target.tremor.c > 0) target.tremor.c -= 1;
      normalize(target.burn);
      normalize(target.tremor);
      if (target.tremor.c <= 0) target.tremorType = null;
      for (const s of selves.values()) {
        if (s.breath.c > 0) s.breath.c -= 1;
        normalize(s.breath);
        s.charge = Math.max(0, s.charge - 1);
        s.tremorC = Math.max(0, s.tremorC - 1);
      }

      const statusDmg = DMG_KINDS.filter((k) => k !== "skill").reduce((a, k) => a + ctx.dmg[k], 0);
      cumStatus += statusDmg;
      cumTotal += statusDmg + ctx.dmg.skill;
      for (const k of DMG_KINDS) stat.dmg[k] += ctx.dmg[k];
      stat.stagger += ctx.stagger.v;
      stat.crits += ctx.crits.v;
      stat.cumStatus += cumStatus;
      stat.cumTotal += cumTotal;
    }
  }

  const n = opts.trials;
  const avg = (x: number) => Math.round((x / n) * 10) / 10;
  const avgDmg = (d: Dmg) => Object.fromEntries(DMG_KINDS.map((k) => [k, avg(d[k])])) as Dmg;
  return {
    team: team.name,
    turns: sums.map((s) => ({
      turn: s.turn,
      state: Object.fromEntries(STATUS_KEYS.map((k) => [k, avg(s.state[k])])) as Record<StatusKey, number>,
      dmg: avgDmg(s.dmg),
      stagger: avg(s.stagger),
      crits: avg(s.crits),
      cumStatus: avg(s.cumStatus),
      cumTotal: avg(s.cumTotal),
    })),
    contributions: Object.fromEntries(
      Object.entries(contrib).map(([k, c]) => [
        k,
        {
          applied: Object.fromEntries(Object.entries(c.applied).map(([kk, v]) => [kk, avg(v ?? 0)])),
          dmg: avgDmg(c.dmg),
          stagger: avg(c.stagger),
          crits: avg(c.crits),
        },
      ]),
    ),
  };
}
