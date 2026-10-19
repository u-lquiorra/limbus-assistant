// 状態異常シミュレーターの処理と、プロファイルと人格データの対応を確かめる
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { PersonaDetail } from "../../src/types.ts";
import { PROFILES, PROFILE_MAP, allSkills, norm } from "./profiles/index.ts";
import { PASSIVE_MODS, SKILL_MODS } from "./profiles/mods.ts";
import { applyEffect, castSkill, emptyTarget, makeCtx, simulate, type SimOptions } from "./simulate.ts";
import type { Profile, Skill } from "./types.ts";

const target = (o: Partial<ReturnType<typeof emptyTarget>> = {}) => ({ ...emptyTarget(), ...o });
const OPTS: SimOptions = { turns: 1, trials: 1, clashWinRate: 1 };
const one = (code: string, s: Skill, extra: Partial<Profile> = {}): Profile => ({
  code,
  name: code,
  skills: { S1: [{ skill: s }], S2: [], S3: [] },
  notes: [],
  ...extra,
});

test("状態異常の無い対象へ威力だけ付与すると回数1で付き、回数だけ増やすと威力1で付く", () => {
  const a = makeCtx();
  applyEffect({ burnP: 3 }, "x", a);
  assert.deepEqual(a.target.burn, { p: 3, c: 1 });
  const b = makeCtx();
  applyEffect({ bleedC: 2 }, "x", b);
  assert.deepEqual(b.target.bleed, { p: 1, c: 2 });
});

test("振動-灼熱の振動爆発は (振動威力+火傷威力)÷2 の切り捨てで、火傷回数と振動回数を1ずつ減らす", () => {
  const c = makeCtx(target({ burn: { p: 9, c: 3 }, tremor: { p: 4, c: 2 } }));
  applyEffect({ convert: "灼熱", burst: 1 }, "x", c);
  assert.equal(c.dmg.tremor, 6);
  assert.equal(c.stagger.v, 4);
  assert.deepEqual([c.target.burn.c, c.target.tremor.c], [2, 1]);
});

test("振動-大量出血は出血、振動-反響は振動威力そのもののダメージ。素の振動はダメージなし", () => {
  const a = makeCtx(target({ bleed: { p: 6, c: 2 }, tremor: { p: 4, c: 3 }, tremorType: "大量出血" }));
  applyEffect({ burst: 1 }, "x", a);
  assert.equal(a.dmg.tremor, 5);
  assert.equal(a.target.bleed.c, 1);
  const b = makeCtx(target({ tremor: { p: 7, c: 3 }, tremorType: "反響" }));
  applyEffect({ burst: 1 }, "x", b);
  assert.equal(b.dmg.tremor, 7);
  const c = makeCtx(target({ burn: { p: 9, c: 3 }, tremor: { p: 4, c: 2 } }));
  applyEffect({ burst: 1 }, "x", c);
  assert.equal(c.dmg.tremor, 0);
  assert.deepEqual([c.target.burn.c, c.target.tremor.c], [3, 1]);
});

test("蝶: 被弾ごとに 死んだ蝶×沈潜威力÷5(最大30)を半減した憂鬱ダメージ。蝶ダメージは全ての蝶ぶん", () => {
  // 沈潜10/5、死んだ蝶6 → 被弾で沈潜10 + 蝶 floor(min(30, 12)/2)=6
  const c = makeCtx(target({ sinking: { p: 10, c: 5 }, butterfly: { live: 4, dead: 6 } }));
  castSkill("x", { name: "t", coins: [{}] }, c, OPTS, true);
  assert.equal(c.dmg.sinking, 16);
  // 上限30を半減して15
  const d = makeCtx(target({ sinking: { p: 40, c: 5 }, butterfly: { live: 0, dead: 15 } }));
  castSkill("x", { name: "t", coins: [{}] }, d, OPTS, true);
  assert.equal(d.dmg.sinking, 40 + 15);
  // 蝶ダメージ: 生きた蝶+死んだ蝶
  const e = makeCtx(target({ butterfly: { live: 4, dead: 6 } }));
  applyEffect({ butterflyDmg: true }, "x", e);
  assert.equal(e.dmg.sinking, 10);
  // 付与は種類ごとに最大15
  applyEffect({ butterfly: { live: 20, dead: 20 } }, "x", e);
  assert.deepEqual(e.target.butterfly, { live: 15, dead: 15 });
});

test("蝶: ターン終了時に死んだ蝶が0になり、生きた蝶ぶん沈潜を付与して、生きた蝶が死んだ蝶に変わる", () => {
  // 1ターン目だけ蝶(生きた5・死んだ3)を付与し、2ターン目は何もしない。状態はターン終了処理の前に記録されるので、
  // 2ターン目の記録に1ターン目終了時の変換結果(沈潜5/1)が出る
  const noop = { skill: { name: "t", coins: [{ noDamage: true }] } };
  const give = { skill: { name: "t", coins: [{ hit: { butterfly: { live: 5, dead: 3 } }, noDamage: true }] }, turns: [1] };
  const p: Profile = { code: "x", name: "x", skills: { S1: [noop, give], S2: [noop], S3: [noop] }, notes: [] };
  const r = simulate({ name: "t", members: ["x"] }, new Map([["x", p]]), { turns: 2, trials: 1, clashWinRate: 1 });
  assert.equal(r.turns[1].state.sinkingP, 5);
  assert.equal(r.turns[1].state.sinkingC, 1);
});

test("振動-保存は (60+攻撃者の充電威力×8)% のダメージ。充電回数は参照せず、ル・ノワールの爆発では回数が減らない", () => {
  // 充電回数20・充電威力0なら60%
  const a = makeCtx(target({ tremor: { p: 10, c: 3 }, tremorType: "保存" }));
  applyEffect({ self: { charge: 20 } }, "x", a);
  applyEffect({ burst: 1 }, "x", a);
  assert.equal(a.dmg.tremor, 6);
  assert.equal(a.target.tremor.c, 2);
  // 充電威力3なら84%、ル・ノワール所属の爆発は回数が減らない
  const profiles = new Map([["n", one("n", { name: "t", coins: [] }, { tags: ["ル・ノワール"] })]]);
  const b = makeCtx(target({ tremor: { p: 10, c: 3 }, tremorType: "保存" }), ["n"], profiles);
  applyEffect({ self: { chargeP: 3 } }, "n", b);
  applyEffect({ burst: 1 }, "n", b);
  assert.equal(b.dmg.tremor, 8);
  assert.equal(b.target.tremor.c, 3);
});

test("状態異常の発動は上限と回数減少を守る", () => {
  const c = makeCtx(target({ burn: { p: 40, c: 3 } }));
  applyEffect({ trigger: { status: "burn", cap: 30, countLoss: 2 } }, "x", c);
  assert.equal(c.dmg.burn, 30);
  assert.equal(c.target.burn.c, 1);
});

test("沈潜殺到は回数×威力のダメージで沈潜を消す", () => {
  const c = makeCtx(target({ sinking: { p: 5, c: 4 } }));
  applyEffect({ deluge: true }, "x", c);
  assert.equal(c.dmg.sinking, 20);
  assert.deepEqual(c.target.sinking, { p: 0, c: 0 });
});

test("編成条件・対象の状態異常の条件を満たさない効果は起きない", () => {
  const c = makeCtx(target({ burn: { p: 5, c: 2 } }), ["0216"]);
  applyEffect({ trigger: { status: "burn" }, requires: ["1009"] }, "x", c);
  applyEffect({ burnC: 3, min: { burnP: 6 } }, "x", c);
  assert.equal(c.dmg.burn, 0);
  assert.equal(c.target.burn.c, 2);
});

test("破裂・沈潜は的中のたびに発動して回数が減る。コイン効果の付与はその後", () => {
  const ctx = makeCtx(target({ rupture: { p: 3, c: 2 }, sinking: { p: 2, c: 1 } }));
  castSkill("x", { name: "t", coins: [{ hit: { ruptureP: 1 } }, {}] }, ctx, OPTS, true);
  assert.equal(ctx.dmg.rupture, 3 + 4); // 1枚目は威力3、付与後の2枚目は威力4
  assert.equal(ctx.dmg.sinking, 2);
  assert.deepEqual(ctx.target.rupture, { p: 0, c: 0 });
});

test("破裂の維持: 破裂15以上・回数3以上なら付与せず回数も減らさない", () => {
  const ctx = makeCtx(target({ rupture: { p: 15, c: 3 } }));
  castSkill("x", { name: "t", coins: [{ hit: { ruptureP: 5 } }], sustainRupture: true }, ctx, OPTS, true);
  assert.deepEqual(ctx.target.rupture, { p: 15, c: 3 });
  assert.equal(ctx.dmg.rupture, 15);
});

test("クリティカル限定の効果は、呼吸が無ければ起きず、呼吸20(100%)なら必ず起きる", () => {
  const s: Skill = { name: "t", coins: [{ hit: { bleedP: 2, crit: true } }] };
  const a = makeCtx();
  castSkill("x", s, a, OPTS, true);
  assert.equal(a.target.bleed.p, 0);
  const b = makeCtx();
  applyEffect({ self: { breathP: 20, breathC: 2 } }, "x", b);
  castSkill("x", s, b, OPTS, true);
  assert.equal(b.target.bleed.p, 2);
  assert.equal(b.crits.v, 1);
});

test("自分の振動回数を消耗して対象に移す", () => {
  const c = makeCtx();
  applyEffect({ self: { tremorC: 12 } }, "x", c);
  applyEffect({ transferSelfTremor: { to: "tremorC", max: 99, min: 10 } }, "x", c);
  assert.deepEqual(c.target.tremor, { p: 1, c: 12 });
  assert.equal(c.selves.get("x")?.tremorC, 0);
});

test("充電を消耗できないときは、充電を条件にした効果は起きない", () => {
  const c = makeCtx();
  applyEffect({ ruptureP: 3, consumeCharge: 5 }, "x", c);
  assert.equal(c.target.rupture.p, 0);
  applyEffect({ self: { charge: 6 } }, "x", c);
  applyEffect({ ruptureP: 3, consumeCharge: 5 }, "x", c);
  assert.equal(c.target.rupture.p, 3);
  assert.equal(c.selves.get("x")?.charge, 1);
});

test("付与量の加算は1ターンの上限まで", () => {
  const p = one("t", { name: "t", coins: [{ hit: { burnP: 1 }, times: 5 }] }, { bonuses: [{ label: "b", burnP: 1, limit: 2 }] });
  const r = simulate({ name: "t", members: ["t"] }, new Map([["t", p]]), { ...OPTS, rotation: ["S1"] });
  assert.equal(r.turns[0].state.burnP, 7); // 1×5 + 加算2回
  assert.equal(r.turns[0].dmg.burn, 7);
});

test("ターン終了時に火傷威力ぶんのダメージを受け、回数が1減る。出血はボスのコインごとに発動する", () => {
  const p = one("t", { name: "t", coins: [{ hit: { burnP: 4, burnC: 2, bleedP: 3, bleedC: 2 } }] });
  const r = simulate({ name: "t", members: ["t"] }, new Map([["t", p]]), {
    ...OPTS,
    turns: 2,
    rotation: ["S1"],
    bossCoins: 6,
  });
  assert.deepEqual(
    r.turns.map((t) => [t.state.burnP, t.state.burnC, t.dmg.burn, t.dmg.bleed]),
    [
      [4, 2, 4, 6], // 出血3×2回で回数が尽きる
      [8, 3, 8, 6],
    ],
  );
});

// ---- プロファイルとデータの対応 ----

const DATA = join(import.meta.dirname, "../../src/data");

test("プロファイルの人格コードが実在し、スキル名が人格データのスキル名と一致して、威力が埋まる", () => {
  for (const p of PROFILES) {
    const path = join(DATA, "personas", `${p.code}.json`);
    assert.ok(existsSync(path), `${p.code} の人格データが無い`);
    const detail = JSON.parse(readFileSync(path, "utf-8")) as PersonaDetail;
    const names = new Set(detail.skills.map((s) => norm(s.name)));
    for (const s of allSkills(p)) {
      assert.ok(names.has(norm(s.name)), `${p.code}: スキル「${s.name}」が人格データに無い`);
      assert.ok(s.power, `${p.code}: スキル「${s.name}」の威力が埋まらない`);
    }
  }
});

// 状態異常を軸にした編成だけを対象にする(whistle・spider・envy などは対象外)
const STATUS_TEAMS = ["burn", "breath", "sinking", "tremor", "charge", "bleed", "rupture"];

test("teams.json の状態異常編成の出撃・裏置き人格には、すべてプロファイルがある", () => {
  const teams = JSON.parse(readFileSync(join(DATA, "teams.json"), "utf-8")) as {
    id: string;
    examples: { members: { code: string }[]; support: { code: string }[] }[];
  }[];
  for (const t of teams.filter((x) => STATUS_TEAMS.includes(x.id))) {
    for (const ex of t.examples) {
      for (const m of [...ex.members, ...ex.support]) {
        assert.ok(PROFILE_MAP.has(m.code), `${t.id}: ${m.code} のプロファイルが無い`);
      }
    }
  }
});

test("威力・ダメージ量の補正(mods.ts)の人格とスキル名が、プロファイルに実在する", () => {
  for (const [code, skills] of Object.entries(SKILL_MODS)) {
    const p = PROFILE_MAP.get(code);
    assert.ok(p, `${code} のプロファイルが無い`);
    const names = new Set(allSkills(p).map((s) => norm(s.name)));
    for (const n of Object.keys(skills)) assert.ok(names.has(norm(n)), `${code}: 補正のスキル「${n}」がプロファイルに無い`);
  }
  for (const code of Object.keys(PASSIVE_MODS)) assert.ok(PROFILE_MAP.has(code), `${code} のプロファイルが無い`);
});

test("補正: 対象の状態異常に応じたコイン威力・ダメージ量がスキルダメージに乗る", () => {
  const skill: Skill = {
    name: "t",
    coins: [{}],
    power: { base: 10, coin: 0, coins: 1 },
    mods: [{ final: 1, per: { of: ["burnP"], step: 3, max: 2 } }, { dmg: 0.5, atLeast: { of: ["burnC"], value: 2 } }],
  };
  const ctx = makeCtx(target({ burn: { p: 9, c: 2 } }));
  castSkill("x", skill, ctx, OPTS, true);
  assert.equal(ctx.dmg.skill, (10 + 2) * 1.5);
});

test("邸宅の木霊がある間は、沈潜の付与時に一定確率で沈潜回数が1増える", () => {
  const c = makeCtx(target({ echo: 2 }));
  let extra = 0;
  for (let i = 0; i < 200; i++) {
    c.target.sinking = { p: 1, c: 1 };
    applyEffect({ sinkingP: 1 }, "x", c);
    extra += c.target.sinking.c - 1;
  }
  assert.ok(extra > 60 && extra < 140, `増加回数 ${extra}`); // 50%前後
});

test("脳震盪の間は、破裂ダメージと振動爆発の混乱区間前進が1.2倍(切り捨て)", () => {
  const c = makeCtx(target({ rupture: { p: 10, c: 2 }, tremor: { p: 6, c: 2 }, concussion: 1 }));
  castSkill("x", { name: "t", coins: [{ hit: { burst: 1 } }] }, c, OPTS, true);
  assert.equal(c.dmg.rupture, 12);
  assert.equal(c.stagger.v, 7);
});
