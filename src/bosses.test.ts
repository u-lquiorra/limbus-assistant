import { test } from "node:test";
import assert from "node:assert/strict";
import { BOSS_SECTIONS, bossChapterId, bossChapterStageRange, bossIds, bossSummaries, bossSummary, getBossSummary, groupBossesByChapter, loadAllBossGuides, loadBossGuide } from "./bosses.ts";
import { getGlossaryTerm } from "./glossary.ts";
import { SIN_ORDER } from "./sinColors.ts";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { bossSkillEffectText } from "./bossSkillText.ts";
import { bossKeywords } from "./bossKeywords.ts";

// 詳細データはページごとに遅延読み込みするため、テストでは最初に全ボス分を読んでおく
const bossGuides = await loadAllBossGuides();
const guideById = new Map(bossGuides.map((boss) => [boss.id, boss]));
const getBossGuide = (id: string) => guideById.get(id);

test("ボスの読み込み: ID とファイルがそろい、要約(index.json)が詳細データと一致する", async () => {
  assert.equal(bossGuides.length, bossIds.length);
  assert.deepEqual(bossGuides.map((boss) => boss.id), bossIds, "読み込み先のキーとボスの ID が一致する");
  assert.deepEqual(bossSummaries, bossGuides.map(bossSummary), "要約が古い。npm run bosses:index で作り直す");
  assert.equal(getBossSummary("unknown"), undefined);
  assert.equal(getBossSummary("toString"), undefined);
  assert.equal(await loadBossGuide("toString"), null);
});

test("ボス一覧の章分け: 表示順を保って章ごとにまとめ、見出しの範囲はステージ番号だけで作る", () => {
  const chapters = groupBossesByChapter(bossSummaries);
  assert.deepEqual(chapters.flatMap((chapter) => chapter.bosses), bossSummaries.filter((boss) => !boss.projection), "ストーリー攻略が一覧の順のまま1回ずつ入る");
  assert.equal(new Set(chapters.map((chapter) => chapter.chapter)).size, chapters.length, "同じ章が2回出ない");
  assert.equal(new Set(chapters.map((chapter) => chapter.id)).size, chapters.length);
  for (const chapter of chapters) {
    assert.match(chapter.id, /^chapter-\d+(-\d+)?$/, "要素 ID に使える形");
    assert.ok(chapter.bosses.every((boss) => boss.chapter === chapter.chapter));
  }
  assert.equal(bossChapterId(5.5), "chapter-5-5");
  const ninth = chapters.find((chapter) => chapter.chapter === 9)!;
  assert.equal(bossChapterStageRange(ninth), `${ninth.bosses[0].stage}〜${ninth.bosses.at(-1)!.stage}`);
  const single = { chapter: 1, id: "chapter-1", bosses: [bossSummaries[0], bossSummaries[0]] };
  assert.equal(bossChapterStageRange(single), bossSummaries[0].stage, "同じステージだけなら範囲にしない");
});

// ボス名から取り出せない登場人物の名前(取り巻き・味方NPC・別の戦闘のボス)
const LIST_SPOILER_NAMES = ["ヴェルギリウス", "ホーエンハイム", "アリサ", "モーゼス", "エズラ", "ベスパ", "LCD", "プイ", "ズールゥ", "キャサリン", "ピップ", "スターバック", "クィークェグ", "エイハブ", "壇香梅", "ワンレグ", "フォーレグ", "司祭", "とあるシンクレア"];

// ボス名・略称から、人物や敵の名前にあたる部分を取り出す(「ロボトミーE.G.O::狐雨 - ドンベク」→ 狐雨・ドンベク)
function bossNameParts(boss: { name: string; shortName: string }): string[] {
  return [boss.name, boss.shortName]
    .map((name) => name.replace(/[（(［[][^）)］\]]*[）)］\]]/g, "").replace(/[？?]/g, ""))
    .flatMap((name) => name.split(/::| - |[・／＆\s]/))
    .map((part) => part.replace(/^(ロボトミー|開花|N社)?E\.G\.O$/, "").replace(/E\.G\.O$/, ""))
    .filter((part) => part.length >= 2 && !/\d+章|最終|再戦|たち/.test(part));
}

test("ボス一覧のリード: ボス・登場人物の名前を出さない", () => {
  assert.deepEqual(bossNameParts({ name: "ロボトミーE.G.O::狐雨 - ドンベク", shortName: "ドンベク（狐雨）" }), ["狐雨", "ドンベク", "ドンベク"]);
  assert.deepEqual(bossNameParts({ name: "ドンベクE.G.O::壇香梅", shortName: "ドンベク" }), ["ドンベク", "壇香梅", "ドンベク"]);
  for (const boss of bossSummaries) {
    for (const name of [...bossNameParts(boss), ...LIST_SPOILER_NAMES]) {
      assert.ok(!boss.listLead.includes(name), `${boss.id} の一覧用リードに「${name}」がある。listLead で伏せる`);
    }
  }
});

test("ボス用語: 専用効果・共通用語と同名の形態別パッシブを区別する", () => {
  const boss = getBossGuide("erlking-cathy")!;
  const terms = bossKeywords(boss);
  const find = (name: string) => terms.find((keyword) => keyword.term === name)!.desc;
  assert.match(find("苦痛の雷"), /マッチ勝利/);
  assert.match(find("張り裂ける心"), /3.*混乱/);
  assert.match(find("出血"), /コイン/);
  assert.match(find("保護"), /被ダメージ/);
  assert.match(find("魔王の通り道に残るは、哀しみと絶叫のみ"), /沈潜/);
  const global = find("引き裂かれた心");
  assert.match(global, /速度上限/);
  assert.match(global, /全てのキャサリン/);
  const cathy = bossKeywords(boss, "cathy-one").find((keyword) => keyword.term === "引き裂かれた心")!.desc;
  assert.match(cathy, /保護10/);
  assert.doesNotMatch(cathy, /速度上限/);
  assert.equal(new Set(terms.map((keyword) => keyword.term)).size, terms.length);
  assert(terms.every((keyword) => keyword.term && keyword.desc));
});

test("8章終盤: 担当・固定と条件付き破壊不能・強化前レベルを区別する", () => {
  const fang = getBossGuide("jia-fang-kubo")!;
  const mu = getBossGuide("jia-mu")!;
  assert.equal(fang.stage, "8-32");
  assert.equal(mu.stage, "8-33");
  assert.equal(mu.reserves, 5);
  assert.equal(fang.units.find(u => u.id === "jia-fang")!.skillLevelReduction, 7);
  assert.equal(fang.units.find(u => u.id === "kubo")!.skillLevelReduction, 2);
  const counter = fang.skills.find(s => s.name === "受け止めねばならぬであろう")!;
  assert.equal(counter.type, "反撃");
  assert.equal(counter.attackType, "貫");
  assert.match(counter.response, /掌/);
  const sacrifice = fang.skills.find(s => s.name === "戦友の血を被った弾丸")!;
  assert.equal(sacrifice.weight, 5);
  assert.match(sacrifice.label!, /対象変更不可/);
  assert.match(sacrifice.response, /キャンセル/);
  const skill = (id: string) => mu.skills.find(s => s.id === id)!;
  assert.equal(skill("mu-beast-9").unit, "mu-litter");
  assert.equal(skill("mu-beast-14").unit, "mu-litter");
  assert.deepEqual(skill("mu-beast-6").unbreakableCoins, [1]);
  assert.equal(skill("mu-beast-14").unbreakableCoins, undefined);
  for (const id of ["mu-beast-3", "mu-beast-7", "mu-beast-8"]) {
    assert.equal(skill(id).unbreakableCoins, undefined, "条件付きの破壊不能を常時表示しない");
    assert.match(skill(id).effects.join(""), /なら.*破壊不能/);
  }
  assert.equal(skill("mu-beast-13").weight, 13);
  assert.match(skill("mu-beast-13").response, /5体全員/);
  assert.equal(mu.units.find(u => u.id === "mu-beast")!.combatLevelNote, "強化前");
  const terms = bossKeywords(mu, "mu-beast");
  assert.match(terms.find(t => t.term === "足掻く")!.desc, /ホンル/);
  assert.match(terms.find(t => t.term === "喜び")!.desc, /味方/);
});

test("9章: 人数・援護・通常パターン外と未確定の威力を区別する", () => {
  const ren = getBossGuide("ren-albina")!;
  const sora = getBossGuide("sora")!;
  const yoru = getBossGuide("shiomi-yoru")!;
  assert.equal(ren.members, 4);
  assert.equal(sora.members, 4);
  assert.equal(yoru.members, 7);
  assert.equal(yoru.reserves, 5);
  assert.equal(ren.units[0].defenseLevel, 60, "レンの防御は加算差ではなく実値60");
  assert.match(ren.skills.find(s => s.id === "albina-5")!.response, /別々の攻撃スキル3本/);
  assert.match(ren.skills.find(s => s.id === "albina-7")!.response, /相殺しても解除できない/);
  assert.equal(sora.units[0].sins.傲慢, 1.2, "colspanの耐性を展開する");
  assert.equal(sora.units[1].sins.傲慢, 1.25);
  assert.equal(sora.skills.find(s => s.id === "sora-base-5")!.unit, "sora-ego");
  assert.match(sora.skills.find(s => s.id === "sora-base-4")!.label!, /通常パターン外/);
  assert.equal(sora.skills.find(s => s.id === "sora-base-2")!.unbreakableCoins, undefined, "条件付きの破壊不能を固定表示しない");
  assert.match(sora.mechanics.find(m => m.name === "援護防御")!.response, /守備を装着しない/);
  assert.match(yoru.priorities.join(""), /11ターン/);
  for (const id of ["shiomi-yoru-6", "shiomi-yoru-7"]) assert.equal(yoru.skills.find(s => s.id === id)!.powerUnknown, true);
  assert.equal(yoru.skills.find(s => s.id === "shiomi-yoru-9")!.base, 20, "精神力の条件付き+5を基礎値へ重ねない");
  assert.match(yoru.skills.find(s => s.id === "shiomi-yoru-8")!.label!, /守備発動不可/);
});

test("9章親方戦: NPC支援・通常個体・不明耐性を区別する", () => {
  const ac = getBossGuide("albina-callisto")!;
  const km = getBossGuide("kira-matthias")!;
  const lv = getBossGuide("lucio-valentina")!;
  assert.equal(ac.stage, "9-37");
  assert.equal(km.stage, "9-38");
  assert.equal(lv.stage, "9-42");
  for (const boss of [ac, km, lv]) assert.equal(boss.members, 3);
  assert.equal(ac.units.find(u => u.id === "callisto")!.skillLevelReduction, 20);
  assert.match(ac.mechanics.find(m => m.name === "眺望")!.effect, /保護7/);
  assert.doesNotMatch(ac.mechanics.find(m => m.name === "眺望")!.effect, /70%/);
  const captive = ac.units.find(u => u.id === "body-theatre")!;
  assert.equal(captive.physical.貫, null, "未記載の耐性を等倍で埋めない");
  assert.equal(captive.sins.色欲, null);
  assert.equal(captive.sins.憤怒, 2);
  assert.equal(ac.skills.find(s => s.id === "ac-researcher-4")!.powerUnknown, true);
  assert.equal(ac.skills.find(s => s.id === "callisto-7")!.type, "反撃", "属性欄の順序が異なっても反撃と判定する");
  assert.equal(ac.skills.find(s => s.id === "callisto-7")!.attackType, "斬");
  assert.equal(km.units.find(u => u.id === "matthias")!.defenseLevel, 100);
  assert(!km.passives.some(p => p.name === "???"), "未記入のパッシブを効果として捏造しない");
  assert.equal(km.skills.find(s => s.id === "matthias-5")!.type, "反撃");
  assert.doesNotMatch(km.skills.find(s => s.id === "matthias-5")!.effects.join(""), /マッチ可能反撃/);
  assert.match(lv.priorities.join(""), /予知眼を残したままルチオを倒して/);
  assert.match(lv.skills.find(s => s.id === "valentina-7")!.label!, /対象変更不可/);
  assert.deepEqual(lv.skills.find(s => s.id === "valentina-7")!.unbreakableCoins, [1, 2, 3, 4, 5]);
  assert.equal(lv.skills.find(s => s.id === "lucio-3")!.unbreakableCoins, undefined, "決闘高潮の条件付き破壊不能を常時表示しない");
  const terms = bossKeywords(ac, "callisto");
  assert(terms.some(t => t.term === "生体材料(骨)"));
  assert(!terms.some(t => t.term === "生体材料"), "アルビナの最大2の蓄積をカリストへ混ぜない");
});

test("9章終盤: 再戦・一騎打ち・形態ごとの指令と条件付き破壊不能を分ける", () => {
  const rematch = getBossGuide("kira-matthias-rematch")!;
  const little = getBossGuide("little-finger-master")!;
  const lian = getBossGuide("lian")!;
  for (const [boss, stage, skills, passives] of [[rematch, "9-44", 20, 14], [little, "9-48", 14, 8], [lian, "9-50", 22, 13]] as const) {
    assert.equal(boss.stage, stage);
    assert.equal(boss.skills.length, skills);
    assert.equal(boss.passives.length, passives);
  }
  assert.equal(rematch.units.find(u => u.id === "kira")!.stagger, "10%（141）", "9-38の混乱区間を流用しない");
  assert.match(rematch.troubleshooting!.find(t => t.symptom.includes("3ターン"))!.advice, /蓄積が戻る/);
  assert.equal(rematch.skills.find(s => s.id === "matthias-14")!.type, "反撃");
  assert.equal(rematch.skills.find(s => s.id === "matthias-14")!.attackType, "斬");
  assert.equal(little.units[0].skillLevelReduction, 15);
  assert.equal(little.skills.find(s => s.id === "little-master-1")!.unbreakableCoins, undefined, "後半の赤い糸を前半へ固定適用しない");
  assert.equal(little.skills.find(s => s.id === "little-master-5")!.powerUnknown, true);
  assert.match(little.mechanics.find(m => m.name === "赤い糸")!.effect, /良秀の同名効果/);
  assert.match(little.statNote!, /3ターン目終了までHP210/);
  assert.equal(lian.members, 7);
  assert.equal(lian.reserves, 4);
  assert.match(lian.units[1].hp, /引き継ぐ/);
  assert.equal(lian.skills.find(s => s.id === "lian-masked-7")!.unbreakableCoins, undefined, "解禁による変化は常時の破壊不能にしない");
  assert.deepEqual(lian.skills.find(s => s.id === "lian-unmasked-7")!.unbreakableCoins, [3, 4], "耽溺中の全コイン化と基本の3・4枚目を区別する");
  assert.match(lian.skills.find(s => s.id === "lian-unmasked-10")!.response, /良秀以外はマッチ不可/);
  assert.match(lian.skills.find(s => s.id === "lian-unmasked-12")!.response, /基本E.G.O.*20/);
  const weapon = "ハンマーで後頭部を潰すべきときは…";
  assert.match(bossKeywords(lian, "lian-masked").find(k => k.term === weapon)!.desc, /混乱区間3前進/);
  const laterWeapon = bossKeywords(lian, "lian-unmasked").find(k => k.term === weapon)!.desc;
  assert.match(laterWeapon, /混乱区間5前進/);
  assert.doesNotMatch(laterWeapon, /混乱区間3前進/);
  assert.match(lian.mechanics.find(m => m.name === "れんけつえん")!.effect, /ほかの味方生存中/);
});

test("9章再戦の補完: 摘出・指定対象・NPCへの置換を前哨戦と混同しない", () => {
  const emperor = getBossGuide("roach-emperor")!;
  const yoru = getBossGuide("shiomi-yoru-rematch")!;
  const ac = getBossGuide("albina-callisto-rematch")!;
  for (const [boss, stage, count] of [[emperor, "9-45", 10], [yoru, "9-41", 10], [ac, "9-43", 12]] as const) {
    assert.equal(boss.stage, stage);
    assert.equal(boss.skills.length, count);
  }
  for (const id of ["roach-emperor-3", "roach-emperor-7", "roach-emperor-8"]) {
    const skill = emperor.skills.find(s => s.id === id)!;
    assert.equal(skill.sin, "暴食");
    assert.match(skill.label!, /摘出コイン/);
    assert.equal(skill.unbreakableCoins, undefined, "摘出を普通の破壊不能の表記へ置き換えない");
    assert.match(skill.response, /通常コイン/);
  }
  assert.match(emperor.skills.find(s => s.id === "roach-emperor-9")!.response, /NPC.*任せ/);
  assert.equal(emperor.skills.find(s => s.id === "roach-emperor-10")!.weight, null, "記載のない加重値を1で埋めない");
  assert.equal(yoru.members, 3, "9-33の7名を流用しない");
  assert.equal(yoru.skills.find(s => s.id === "yoru-rematch-5")!.powerUnknown, undefined, "別戦闘の不整合を持ち込まない");
  assert.equal(yoru.skills.find(s => s.id === "yoru-rematch-5")!.base, 4);
  assert.equal(yoru.units[0].skillLevelReduction, undefined, "9-48の天殺星傷を持ち込まない");
  assert.match(yoru.skills.find(s => s.id === "yoru-rematch-9")!.effects.join(""), /対応するバフ.*のみマッチ可能/);
  assert.match(ac.statNote!, /助力者へ置き換わり/);
  assert.match(ac.statNote!, /アンプルはない/);
  assert.equal(ac.units.find(u => u.id === "callisto-rematch")!.level, 83);
  assert(!ac.units.some(u => u.id === "body-theatre"), "NPCが処理する個体に別戦闘のステータスを付けない");
});

test("5章幻想体: 部位と本体HP・耐性の状態差・減算コインを保持する", () => {
  const pearl = getBossGuide("walking-pearl")!;
  const prophet = getBossGuide("skin-prophet")!;
  const silt = getBossGuide("dream-devouring-siltcurrent")!;
  assert.match(pearl.units.find(u => u.id === "pearl")!.hp, /1229.*774/);
  assert.equal(pearl.units.find(u => u.id === "pearl-shell")!.physical.貫, 0.7);
  assert(pearl.skills.some(s => s.id === "pearl-7") && pearl.skills.some(s => s.id === "pearl-shell-7"), "共通の回避を片方の部位だけへ紐付けない");
  assert.match(pearl.skills.find(s => s.id === "pearl-shell-6")!.label!, /マッチ不可.*対象変更不可/);
  assert(!pearl.skills.some(s => s.unit === "green-slime"), "行動しない召喚個体に攻撃を作らない");
  assert.equal(prophet.units.find(u => u.id === "prophet-dark")!.sins.憂鬱, 0.5);
  assert.equal(prophet.units.find(u => u.id === "prophet-lit")!.sins.憂鬱, 2);
  assert.match(prophet.units.find(u => u.id === "prophet-lit")!.hp, /引き継ぐ/);
  for (const id of ["prophet-lit-3", "prophet-lit-4"]) {
    const skill = prophet.skills.find(s => s.id === id)!;
    assert.equal(skill.base, 20, "減算技は威力範囲の小さい値を基本威力にしない");
    assert.equal(skill.coinPower, -4);
    assert.equal(skill.coins, 2);
    assert.equal(skill.powerUnknown, undefined, "20から2枚−4は12〜20と整合する");
  }
  assert.equal(prophet.skills.find(s => s.id === "candle-2")!.type, "反撃");
  assert.equal(prophet.skills.find(s => s.id === "candle-2")!.attackType, "貫");
  assert.match(silt.units.find(u => u.id === "silt-body")!.hp, /1102.*882/);
  assert.equal(silt.units.find(u => u.id === "silt-light")!.physical.貫, 1.5);
  assert.equal(silt.units.find(u => u.id === "silt-body")!.physical.貫, 1);
  for (const n of [4, 6, 7, 8]) {
    const body = silt.skills.find(s => s.id === `silt-body-${n}`)!;
    const light = silt.skills.find(s => s.id === `silt-light-${n}`)!;
    assert(body && light, "両部位に割り当てられる技を残す");
    assert.equal(body.name, light.name);
    assert.deepEqual(body.effects, light.effects);
  }
  assert.match(silt.skills.find(s => s.id === "silt-body-6")!.effects.join(""), /34%/);
  assert.match(silt.passives.find(p => p.name === "堅牢")!.effect, /12未満/);
  assert.match(silt.mechanics.find(m => m.name === "蛍光灯の破片")!.response, /全て防ぐ効果ではない/);
});

test("10章Cジャンヌ: ワルツの番号指定・非対象の本体・設計図への技を分ける", () => {
  const boss = getBossGuide("jeanne")!;
  const skill = (id: string) => boss.skills.find(s => s.id === id)!;
  assert.equal(boss.skills.length, 32);
  assert.equal(boss.passives.length, 16);
  assert.equal(new Set(boss.skills.map(s => s.id)).size, 32, "捕捉の重複番号をIDへ持ち込まない");
  assert.match(skill("jeanne-two-1").effects.join(""), /スキル1でなければ/);
  assert.match(skill("jeanne-two-2").effects.join(""), /スキル2でなければ/);
  assert.match(skill("jeanne-two-3").effects.join(""), /スキル3またはE.G.Oスキル/);
  assert.equal(skill("jeanne-two-6").powerUnknown, true);
  assert.equal(skill("jeanne-one-1").levelUnknown, true);
  assert.equal(skill("jeanne-three-1").levelUnknown, true, "設計図へ付与した際の攻撃レベルを推定しない");
  const third = boss.units.find(u => u.id === "jeanne-three")!;
  assert(third.offField);
  assert.equal(third.defenseLevel, null);
  assert(Object.values(third.physical).every(v => v === null));
  assert(Object.values(third.sins).every(v => v === null));
  const second = boss.units.find(u => u.id === "jeanne-two")!;
  assert.equal(second.sins.暴食, null);
  assert.equal(second.sins.傲慢, null);
  assert.equal(skill("blueprint-rouge-2").coins, 1);
  assert.match(skill("blueprint-rouge-2").label!, /コイン番号未確定/);
  for (const unit of ["blueprint-noir", "blueprint-rouge"]) {
    assert.match(skill(`${unit}-tailor-1`).response, /ムルソー/);
    assert.match(skill(`${unit}-tailor-1`).response, /脆弱5/);
  }
  const terms = bossKeywords(boss);
  assert.match(terms.find(t => t.term === "デゼスポワール")!.desc, /100%/);
  assert.match(terms.find(t => t.term === "パトス")!.desc, /100で次段階/);
  assert.match(boss.phases.find(p => p.id === "waltz")!.steps.join(""), /ダメージ無効ではない/);
});

test("10章C看守・司祭: 段階差・鼓動の一時バリア・摘出と未確定値を保持する", () => {
  const boss = getBossGuide("warden-chaplain")!;
  const skill = (id: string) => boss.skills.find(s => s.id === id)!;
  assert.equal(boss.skills.length, 24);
  assert.equal(boss.passives.length, 20);
  assert.equal(boss.units[0].hp, "最大3660／開始1830");
  assert.equal(boss.units.find(u => u.id === "penalty-candle")!.level, 1);
  assert(boss.units.filter(u => u.id !== "penalty-candle").every(u => u.level === 90 && u.defenseLevel === 80));
  assert.equal(skill("warden-one-2").powerUnknown, true);
  assert.equal(skill("warden-two-8").powerUnknown, true);
  assert.equal(skill("warden-two-1").base, 2, "同名の第1段階の技と混ぜない");
  assert.equal(skill("warden-two-7").unbreakableCoins, undefined, "権能による全コイン変化を固定表示しない");
  assert.deepEqual(skill("warden-two-10").unbreakableCoins, [1]);
  assert.equal(skill("chaplain-8").unbreakableCoins, undefined, "摘出を通常の破壊不能アイコンにしない");
  assert.match(skill("chaplain-8").label!, /摘出コイン/);
  assert.equal(skill("chaplain-9").coins, 3);
  assert.match(skill("chaplain-9").response, /ほかの味方.*生存/);
  assert.match(skill("warden-two-9").effects.join(""), /-75%/);
  assert.match(skill("chaplain-7").effects.join(""), /-90%/);
  assert.match(bossKeywords(boss).find(k => k.term === "鼓動")!.desc, /250%/);
  assert.match(bossKeywords(boss).find(k => k.term === "異邦人")!.desc, /ほかの味方が1人以上生存/);
  const perfection = boss.passives.find(p => p.unit === "chaplain" && p.name === "完璧保存")!;
  assert.match(perfection.effect, /保存威力が10未満/);
  assert.match(boss.warnings.join(""), /勝率オート/);
  assert.match(boss.phases.find(p => p.id === "reset")!.steps.join(""), /全快せずに続行/);
});

test("10章C完熟: 調整後の追撃制限・段階差・記憶と経験の区別を保持する", () => {
  const boss = getBossGuide("red-god-ripe")!;
  const skill = (id: string) => boss.skills.find(s => s.id === id)!;
  assert.equal(boss.stage, "10-04");
  assert.equal(boss.units[0].hp, "最大6000／開始3000");
  assert.equal(boss.units[0].level, 90);
  assert.equal(skill("red-god-ripe-6").unbreakableCoins, undefined, "記憶5未満の条件付き破壊不能を固定表示しない");
  assert.match(skill("red-god-ripe-6").effects.join(""), /95%/);
  assert.equal(skill("red-god-ripe-7").type, "反撃");
  assert.equal(skill("red-god-ripe-7").attackType, "貫");
  assert.deepEqual(skill("red-god-ripe-7").unbreakableCoins, [1, 2, 3]);
  assert.deepEqual(skill("red-god-ripe-5").unbreakableCoins, [1], "全コインの破壊不能化には暴走が必要");
  assert.match(skill("red-god-ripe-10").effects.join(""), /精神力が20減少/);
  const second = skill("red-god-ripe-10-phase-two");
  assert.match(second.effects.join(""), /スタッフ1名につき/);
  assert.equal(second.effects.filter(e => e === "[的中時]出血1を付与").length, 2, "10/08調整後の第2・3コインの付与量");
  assert.match(boss.passives.find(p => p.name.startsWith("ラ・モワソン"))!.effect, /1ターンにつき1回/);
  assert.match(boss.passives.find(p => p.name.startsWith("ラ・ジュイサンス・オートル"))!.effect, /出血ダメージ/);
  assert.equal(skill("rouge-senior-1").coins, 1, "効果番号の不一致からコインを増やさない");
  assert.match(skill("rouge-senior-1").label!, /コイン番号未確定/);
  const terms = bossKeywords(boss);
  assert.match(terms.find(t => t.term === "デガジェ")!.desc, /出血がなければ/);
  assert.match(terms.find(t => t.term === "ル・モワ")!.desc, /パニック変更不可/);
  assert.match(terms.find(t => t.term === "ラ・ジュイサンス")!.desc, /第1段階/);
  assert.match(terms.find(t => t.term === "ラ・ジュイサンス")!.desc, /第2段階/);
  assert.match(terms.find(t => t.term === "プイとの経験")!.desc, /75%/);
  assert.match(terms.find(t => t.term === "プイの記憶")!.desc, /基本攻撃・防御レベル/);
  assert.match(boss.phases.find(p => p.id === "finish")!.steps.join(""), /次のターン.*終了で勝利/);
});

test("10章Aスーシェフ: 初戦の終了条件と二種の広域・条件付き破壊不能を分ける", () => {
  const boss = getBossGuide("sous-chef")!;
  assert.deepEqual(boss.units.map(u => [u.level, u.hp, u.defenseLevel]), [[35, "1523", 46], [35, "93", 47]]);
  assert(!boss.passives.some(p => p.name.includes("陽射し")), "Bルート限定の強化を混ぜない");
  assert.match(boss.passives.find(p => p.name === "逃げるんですよ！")!.effect, /30%未満/);
  const signature = boss.skills.find(s => s.id === "sous-chef-4")!;
  const hunger = boss.skills.find(s => s.id === "sous-chef-9")!;
  assert.deepEqual(signature.unbreakableCoins, [1, 2, 3, 4]);
  assert.deepEqual(hunger.unbreakableCoins, [1, 2, 3]);
  assert(signature.effects.some(e => e.includes("80%減少")));
  assert(!hunger.effects.some(e => e.includes("80%減少")));
  assert.match(boss.skills.find(s => s.id === "sous-chef-5")!.label!, /マッチ不可/);
  assert.equal(boss.skills.find(s => s.id === "leather-wallet-3")!.unbreakableCoins, undefined, "元気3以上の条件を固定アイコンにしない");
  assert.match(bossKeywords(boss).find(k => k.term === "釘刺す者")!.desc, /ターン開始時にほかの味方/);
});

test("10章A: 接客条件・連戦・条件付き覚醒とBルートの強化を区別する", () => {
  const gustave = getBossGuide("gustave")!;
  const fourleg = getBossGuide("fourleg")!;
  const oneleg = getBossGuide("oneleg")!;
  for (const boss of [gustave, fourleg, oneleg]) {
    assert.equal(boss.chapter, 10);
    assert.equal(boss.stage, "10-04");
    assert.match(boss.statNote!, /顧客レベル/);
    assert(!boss.passives.some(p => p.name.includes("陽射し")), "Bルート限定パッシブをAルートへ混ぜない");
  }
  assert.equal(gustave.units[0].hp, "590", "イベント前の先制攻撃個体641と区別する");
  assert.match(gustave.skills.find(s => s.id === "gustave-3")!.response, /守備.*キャンセル/);
  assert.match(gustave.skills.find(s => s.id === "gustave-4")!.response, /守備.*破壊不能/);
  assert.equal(gustave.skills.find(s => s.id === "gustave-4")!.unbreakableCoins, undefined);
  assert.equal(gustave.skills.find(s => s.id === "gustave-5")!.unbreakableCoins, undefined);
  assert.deepEqual(gustave.skills.find(s => s.id === "gustave-6")!.unbreakableCoins, [1]);
  assert.match(fourleg.warnings.join(""), /敗北.*フォーレグ.*やり直し/);
  assert.equal(fourleg.skills.find(s => s.id === "fourleg-3")!.unbreakableCoins, undefined);
  assert.deepEqual(fourleg.skills.find(s => s.id === "fourleg-4")!.unbreakableCoins, [1, 2, 3]);
  assert.match(fourleg.skills.find(s => s.id === "fourleg-4")!.response, /ダメージ−50%/);
  assert.equal(oneleg.units[0].hp, "849");
  assert.match(oneleg.statNote!, /HP196.*戦闘終了/);
  assert.equal(oneleg.skills.find(s => s.id === "oneleg-1")!.unbreakableCoins, undefined, "覚醒中だけの破壊不能を固定表示しない");
  assert(oneleg.skills.filter(s => s.id === "oneleg-4" || s.id === "oneleg-5").every(s => s.weight === 1 && s.response.includes("−75%")));
  assert.match(bossKeywords(oneleg).find(k => k.term === "アルミュール・エヴェイエ")!.desc, /全ての基本攻撃/);
  assert.match(bossKeywords(gustave).find(k => k.term === "案内不履行")!.desc, /最大3/);
});

test("7-26: 固定編成・イベント終了と不明値を区別する", () => {
  const boss = getBossGuide("white-moon-knight")!;
  assert.equal(boss.stage, "7-26");
  assert.equal(boss.members, 1);
  assert.equal(boss.reserves, undefined);
  assert.match(boss.priorities.join(""), /Lv50・同期Ⅳ・解析Ⅳ/);
  assert.match(boss.phases.at(-1)!.steps.join(""), /戦闘開始後.*演出.*戦闘終了/);
  assert.equal(boss.units[0].level, "不明");
  assert.equal(boss.units[0].defenseLevel, null);
  assert(Object.values(boss.units[0].physical).every(v => v === null));
  assert(Object.values(boss.units[0].sins).every(v => v === null), "推定の等倍を確定値として保存しない");
  assert.equal(boss.skills.length, 9);
  assert.deepEqual(boss.skills.filter(s => s.unbreakableCoins).map(s => s.id), ["moon-faint", "moon-pale", "moon-mirror"]);
  for (const id of ["moon-mirror", "moon-rail", "moon-arrow"]) {
    const skill = boss.skills.find(s => s.id === id)!;
    assert.equal(skill.powerUnknown, true);
    assert.equal(skill.coinPowerUnknown, true, "未知のコイン威力を+0と表示しない");
  }
  const arrow = boss.skills.find(s => s.id === "moon-arrow")!;
  assert.equal(arrow.levelUnknown, true);
  assert.equal(arrow.level, undefined);
  assert.equal(arrow.sin, undefined, "罪悪属性なしの技へ属性を補わない");
  assert.match(boss.mechanics.find(m => m.name === "名誉ある決闘（ドンキホーテ）")!.effect, /1605.*最終威力\+15/);
  assert.doesNotMatch(boss.mechanics.find(m => m.name === "名誉ある決闘")!.effect, /1605|\+15/);
});

test("7-06: 通常の敗北とイベント進行を分け、固定編成の制限を保持する", () => {
  const boss = getBossGuide("camille")!;
  const later = getBossGuide("white-moon-knight")!;
  assert.equal(boss.stage, "7-06");
  assert.equal(boss.members, 1);
  assert.equal(boss.reserves, undefined);
  assert.match(boss.priorities.join(""), /Lv45・同期Ⅳ・解析Ⅳ/);
  assert.match(boss.priorities.join(""), /HPは10未満.*混乱または4ターン/);
  assert.match(boss.priorities.join(""), /1→3→4→4.*手札配置も固定/);
  assert.match(boss.priorities.join(""), /傲慢資源.*使用できない/);
  assert.doesNotMatch(boss.phases.map(p => p.steps.join("")).join(""), /Lv50|6ターン目/, "7-26の専用進行を混ぜない");
  assert.equal(boss.units[0].physical.貫, 0.5);
  assert.equal(boss.units[0].physical.斬, null);
  assert.equal(boss.units[0].sins.色欲, 1);
  assert.equal(boss.units[0].sins.憤怒, null);
  assert.equal(boss.skills.length, 6);
  assert.equal(boss.passives.length, 6);
  const salut = boss.skills.find(s => s.id === "camille-salut")!;
  assert.equal(salut.levelOffset, 5);
  assert.match(salut.label!, /通常手順外/);
  assert.match(salut.effects.at(-1)!, /対象の破裂1.*最大50%/, "誤植の呼吸ではなく破裂による増加");
  assert.match(boss.passives.find(p => p.name === "一騎打ち")!.effect, /イベント.*終了/);
  assert(boss.skills.every(s => !s.unbreakableCoins), "通常コインの技へ7-26の破壊不能を持ち込まない");
  assert.match(boss.mechanics.find(m => m.name === "決闘宣布 - カミーユ")!.effect, /攻撃的中時.*クイック1/);
  assert.match(later.priorities.join(""), /Lv50/, "前回追加したイベント戦の調整も保持する");
});

test("1章の3戦: 部位破壊・段階移行・判定の代償を区別する", () => {
  const ebony = getBossGuide("ebony-queen-apple")!;
  const calendar = getBossGuide("doomsday-calendar")!;
  const golden = getBossGuide("golden-apple")!;
  assert.deepEqual(bossIds.slice(0, 3), [ebony.id, calendar.id, golden.id]);
  for (const boss of [ebony, calendar, golden]) {
    assert.equal(boss.chapter, 1);
    assert.equal(boss.stage, "1-11");
    assert.equal(boss.members, 5);
  }
  assert.match(ebony.priorities.join(""), /最初の2ターン.*HP.*1未満/);
  assert.equal(ebony.units.find(u => u.id === "ebony-right")!.stagger, "40%（43）");
  assert.equal(ebony.units.find(u => u.id === "ebony-left")!.stagger, "なし");
  assert.match(ebony.units.find(u => u.id === "ebony-left")!.notes.join(""), /追撃不可/);
  assert.match(ebony.units.find(u => u.id === "ebony-fruit")!.notes.join(""), /追撃可能/);
  assert.equal(ebony.units.find(u => u.id === "ebony-fruit")!.physical.打, 2);
  assert.equal(ebony.units.find(u => u.id === "ebony-root")!.physical.貫, 0.5);
  assert.match(bossSkillEffectText(ebony.skills.find(s => s.id === "ebony-left-5")!), /^Ⅰ\[表面的中時\]/);
  assert.match(calendar.priorities.join(""), /本体HP70%以下.*HP25%以下/);
  assert.match(calendar.phases.find(p => p.id === "final")!.steps.join(""), /担当HP−100.*全囚人精神力−30/);
  assert.match(calendar.units.find(u => u.id === "doomsday-idol")!.notes.join(""), /HP0.*死亡しない/);
  assert.equal(calendar.units.find(u => u.id === "doomsday-idol")!.hp, "40", "道中Lv5やイベントLv7個体を流用しない");
  assert.equal(calendar.units.find(u => u.id === "doomsday-idol")!.level, 6);
  assert.equal(calendar.units.find(u => u.id === "calendar-face")!.sins.傲慢, 0.75);
  const ritual = calendar.skills.find(s => s.id === "calendar-left-4")!;
  assert.deepEqual([ritual.base, ritual.coinPower, ritual.coins], [10, -6, 1]);
  const humans = calendar.skills.find(s => s.id === "calendar-universe-sinners")!;
  const allies = calendar.skills.find(s => s.id === "calendar-universe-allies")!;
  assert.deepEqual([humans.base, humans.coinPower, humans.weight], [45, -10, 10]);
  assert.equal(allies.weight, 4);
  assert.match(allies.label!, /マッチ不可/);
  assert.doesNotMatch(humans.label!, /マッチ不可/);
  assert.match(golden.phases.find(p => p.id === "event")!.steps.join(""), /グレゴール.*\+4/);
  assert.match(golden.priorities.join(""), /成功・失敗.*第2形態/);
  assert.match(golden.priorities.join(""), /翌ターン.*破壊したターン.*マッチを外さない/);
  assert.equal(golden.units.find(u => u.id === "golden-body")!.physical.斬, 0.5);
  assert.equal(golden.units.find(u => u.id === "false-body")!.physical.斬, 2);
  assert.equal(golden.units.find(u => u.id === "false-head")!.sins.憂鬱, 0.75);
  assert.deepEqual([ebony.skills.length, calendar.skills.length, golden.skills.length], [8, 14, 6]);
  assert.equal(golden.skills.find(s => s.id === "golden-body-1")!.base, 2, "強化個体の5を使わない");
});

test("2章の3戦: 通常戦闘・復活停止・ウェーブごとの期限を区別する", () => {
  const aido = getBossGuide("aido")!;
  const factory = getBossGuide("you-want-to-get-beat")!;
  const baba = getBossGuide("baba-yaga")!;
  assert.equal(aido.stage, "2-18");
  assert.match(aido.statNote!, /通常戦闘/);
  assert.match(aido.statNote!, /最初は取り巻き4名.*増援は取り巻き6名/);
  assert.equal(aido.units[0].physical.斬, 2);
  assert.equal(aido.units[0].physical.打, 0.5);
  assert.equal(aido.units[0].defenseLevel, 11);
  assert.match(aido.passives.find(p => p.name === "パーティーお開き")!.effect, /45/);
  assert.match(aido.skillNote!, /攻撃威力減少量は未記載/);
  const cheerful = aido.skills.find(s => s.id === "mariachi-cheerful-2")!;
  const light = aido.skills.find(s => s.id === "mariachi-light-2")!;
  assert.match(cheerful.effects.join(""), /全味方/);
  assert.doesNotMatch(light.effects.join(""), /全味方/);
  assert.equal(factory.stage, "2-19");
  assert.match(factory.units[0].hp, /未確定.*152.*120/);
  assert.match(factory.units[1].hp, /未確定.*51.*52/);
  assert.equal(factory.units[0].defenseLevel, 15);
  assert.equal(factory.units[1].defenseLevel, 11);
  const punishment = factory.skills.find(s => s.id === "you-want-to-get-beat-4")!;
  assert.deepEqual([punishment.base, punishment.coinPower, punishment.coins], [3, 6, 2]);
  assert.match(punishment.effects.join(""), /使用時.*スキル威力\+2/);
  assert.match(factory.phases.find(p => p.id === "stop")!.steps.join(""), /「そうでない。」.*3回/);
  assert.match(factory.troubleshooting!.find(t => t.symptom.includes("次の予告"))!.advice, /死亡状態.*発生しない/);
  assert.equal(factory.passives.filter(p => p.name === "強化工場稼働").length, 3);
  assert.equal(baba.stage, "2-19");
  assert(baba.units.every(u => u.level === 15 && u.hp === "41"));
  assert.equal(baba.units.find(u => u.id === "freezing-slave")!.defenseLevel, 12);
  assert.equal(baba.units[0].defenseLevel, 13);
  assert.match(baba.priorities[0], /第1ウェーブには制限時間がない/);
  assert.match(baba.priorities[1], /それぞれ4ターン.*5ターン目開始時.*強制敗北/);
  assert.match(baba.mechanics.find(m => m.name === "近寄るバーバヤーガ")!.effect, /待機・サポート人員.*除かれる/);
  assert.deepEqual([aido.skills.length, factory.skills.length, baba.skills.length], [14, 14, 12]);
  assert.deepEqual(baba.skills.filter(s => s.name === "足蹴").map(s => [s.base, s.coinPower]), [[11, -9], [11, -9]]);
});

test("3章の3戦: 本能の増減・模倣反撃・腕再生の実際の条件を分ける", () => {
  const quad = getBossGuide("quadruped-beast")!;
  const mimic = getBossGuide("inquisitor-with-everything")!;
  const wriggle = getBossGuide("wriggling-beast")!;
  for (const boss of [quad, mimic, wriggle]) {
    assert.equal(boss.stage, "3-22");
    assert.equal(boss.members, 5);
  }
  assert.equal(quad.units[0].level, 25);
  assert.equal(quad.units[0].hp, "361");
  assert.match(quad.statNote!, /2体.*這い回る異端審問官は含まない/);
  assert.match(quad.priorities.join(""), /的中ごとに本能1.*4以上/);
  assert.match(quad.priorities.join(""), /HP50%以下.*毎ターン狂乱/);
  assert.equal(quad.skills.find(s => s.id === "quadruped-beast-5")!.powerUnknown, true);
  assert.match(quad.units[0].stagger, /HP値は未確定/);
  assert.deepEqual(mimic.units.map(u => [u.level, u.defenseLevel]), [[26, 30], [26, 28]]);
  assert.match(mimic.units[0].notes.join(""), /本能4/);
  assert.match(mimic.units[1].notes.join(""), /本能2/);
  const copies = mimic.skills.filter(s => s.name === "中途半端な模倣");
  assert.equal(copies.length, 2);
  for (const skill of copies) {
    assert.equal(skill.type, "反撃");
    assert.equal(skill.attackType, "斬");
    assert.equal(skill.sin, "色欲");
    assert.equal(skill.levelOffset, -5);
    assert(skill.powerUnknown && skill.coinPowerUnknown && skill.coinsUnknown);
    assert.match(skill.response, /最初.*弱い.*広域.*相殺.*できない/);
  }
  assert.match(mimic.passives.find(p => p.name === "傷付けられた腕")!.condition, /1以上/);
  assert.match(mimic.passives.find(p => p.name === "殻の回復")!.effect, /5%.*本能1/);
  assert.match(wriggle.units[0].hp, /677.*237/);
  assert.equal(wriggle.units[2].hp, "203");
  assert(wriggle.units.every(u => u.defenseLevel === 30));
  assert.match(wriggle.priorities.join(""), /本能0.*4まで戻る/);
  assert.match(wriggle.mechanics.find(m => m.name === "腕の再生")!.effect, /2ターン後.*現在HP/);
  assert.match(wriggle.passives.find(p => p.name === "腐りゆく皮膚")!.condition, /部位HP.*50%未満/);
  assert.match(wriggle.units[0].notes.join(""), /追撃不可/);
  assert.deepEqual([quad.skills.length, mimic.skills.length, wriggle.skills.length], [5, 8, 11]);
});

test("ボスデータ: 固定ID・部位参照・用語リンクと掲載情報が揃う", () => {
  assert(bossGuides.length > 0);
  assert.equal(new Set(bossGuides.map((boss) => boss.id)).size, bossGuides.length);
  assert.equal(new Set(BOSS_SECTIONS.map((section) => section.id)).size, BOSS_SECTIONS.length);
  for (const boss of bossGuides) {
    assert.match(boss.id, /^[a-z]+(?:-[a-z]+)*$/);
    if (boss.projection) assert.equal(boss.stage, `射影 ${boss.projection.difficulty}`);
    else assert.match(boss.stage, /^\d+(?:\.5)?-\d+$/);
    assert(boss.name && boss.stageName && boss.lead);
    assert.equal(getBossSummary(boss.id)?.name, boss.name);
    assert.equal(new Date(`${boss.checkedAt}T00:00:00Z`).toISOString().slice(0, 10), boss.checkedAt);
    const units = new Set(boss.units.map((unit) => unit.id));
    assert.equal(units.size, boss.units.length);
    assert(boss.units.length && boss.skills.length && boss.passives.length && boss.phases.length);
    assert.equal(new Set(boss.skills.map((skill) => skill.id)).size, boss.skills.length);
    for (const unit of boss.units) {
      assert(unit.hp && unit.part && unit.speed && unit.stagger);
      assert(typeof unit.level === "number" ? Number.isInteger(unit.level) && unit.level > 0 : unit.level.startsWith("不明"));
      for (const key of ["斬", "貫", "打"] as const) {
        const value = unit.physical[key];
        assert(value === null || (Number.isFinite(value) && value >= 0));
      }
      for (const sin of SIN_ORDER) {
        const value = unit.sins[sin];
        assert(value === null || (Number.isFinite(value) && value >= 0));
      }
    }
    for (const skill of boss.skills) {
      assert(units.has(skill.unit), `${boss.id}/${skill.id}: スキルの使用者が存在しない`);
      assert(skill.name && skill.effects.length && skill.effects.every(Boolean) && skill.response);
      assert(Number.isInteger(skill.coins) && skill.coins >= 1 && skill.coins <= 12);
      assert(Number.isFinite(skill.base) && Number.isFinite(skill.coinPower));
      if (skill.coinPowerUnknown) assert.equal(skill.powerUnknown, true, "コイン威力不明なら表示威力も計算しない");
      if (skill.coinsUnknown) assert.equal(skill.powerUnknown, true, "枚数を固定できないなら表示威力も固定しない");
      assert(skill.weight === null || (Number.isInteger(skill.weight) && skill.weight > 0));
      assert(Number.isInteger(skill.levelOffset));
      const unit = boss.units.find((unit) => unit.id === skill.unit)!;
      if (typeof unit.level !== "number" && !skill.levelUnknown) assert(Number.isInteger(skill.level) && skill.level! > 0, "敵Lv不明のスキルには資料のレベルかレベル不明を指定する");
      if (skill.type === "反撃") assert(skill.attackType || skill.label?.includes("攻撃タイプ未記載"), "反撃の攻撃タイプか、資料に記載のないことを明示する");
      if (skill.unbreakableCoins) assert(skill.unbreakableCoins.every((coin) => Number.isInteger(coin) && coin >= 1 && coin <= skill.coins), `${boss.id}/${skill.id}: 破壊不能コインの番号が範囲内`);
      if (skill.sin) assert(SIN_ORDER.some((sin) => sin === skill.sin));
    }
    for (const passive of boss.passives) {
      assert(units.has(passive.unit), `${boss.id}/${passive.name}: パッシブの所有者が存在しない`);
      assert(passive.name && passive.condition && passive.effect && passive.response);
    }
    for (const mechanic of boss.mechanics) assert(mechanic.units?.every((id) => units.has(id)) ?? true);
    assert(boss.relatedTerms.length && boss.relatedTerms.every((id) => getGlossaryTerm(id)));
    assert(boss.sources.length && boss.sources.every((source) => source.title && new URL(source.url).protocol === "https:"));
  }
});

test("射影リカルド: 難易度別の数値・苦難とストーリー攻略の入口を分離する", () => {
  const normal = getBossGuide("ricardo-projection-normal")!;
  const hard = getBossGuide("ricardo-projection-hard")!;
  assert.equal(normal.units[0].hp, "7500");
  assert.equal(hard.units[0].hp, "9375");
  assert.equal(normal.projection?.targetTurns, 24);
  assert.equal(hard.projection?.targetTurns, 18);
  assert(!normal.mechanics.some(m => m.name === "苦難"));
  assert(hard.mechanics.some(m => m.name === "苦難"));
  assert.deepEqual(groupBossesByChapter([bossSummary(normal), bossSummary(hard)]), [], "射影版は章別のストーリー一覧へ入れない");
  for (const boss of [normal, hard]) {
    assert.equal(getBossGuide(boss.projection!.counterpartId)?.projection?.counterpartId, boss.id);
    assert.equal(getBossGuide(boss.projection!.storyId)?.stage, "5-30");
    const pain = boss.skills.find(s => s.name === "苦痛を刻む")!;
    assert.match(pain.effects.join(""), /3以上/);
    assert.equal(pain.unbreakableCoins, undefined, "条件付きの全コイン化を常時表示しない");
    assert.deepEqual(boss.skills.find(s => s.name === "全員、処刑だ！！！")!.unbreakableCoins, [1]);
    for (const skill of boss.skills.filter(s => s.name === "即決処刑だ！")) {
      assert(skill.effects.every(effect => effect.includes("破壊されずに的中時")), "割合ダメージを単なる的中効果にしない");
    }
  }
});

test("射影攻略の編成: 12人の囚人が重複せず、人格・E.G.Oの参照先が実在する", async () => {
  for (const boss of bossGuides.filter(b => b.projection)) {
    const team = boss.projection!.team;
    assert.equal(team.members.length, boss.members);
    assert.equal(team.support.length, boss.reserves);
    const allMembers = [...team.members, ...team.support];
    assert.equal(new Set(allMembers.map(m => m.code.slice(0, 2))).size, 12);
    for (const member of allMembers) {
      const data = JSON.parse(await readFile(new URL(`./data/personas/${member.code}.json`, import.meta.url), "utf8"));
      assert.equal(data.code, member.code);
    }
    for (const entry of team.egos) {
      const data = JSON.parse(await readFile(new URL(`./data/egos/${entry.code}.json`, import.meta.url), "utf8"));
      assert.equal(data.code, entry.code);
      assert(team.members.some(m => m.code.slice(0, 2) === entry.code.slice(0, 2)), "E.G.Oの使用者を先発に含める");
    }
  }
});

test("章間ボスと7章サンチョ: 減算・回避の不明値・開始時補正を区別する", () => {
  const kim = getBossGuide("kim-satgat")!;
  const cassetti = getBossGuide("cassetti-sasha")!;
  const sancho = getBossGuide("sancho")!;
  assert.equal(kim.stage, "5.5-24");
  assert.equal(cassetti.stage, "6.5-28");
  assert.equal(sancho.stage, "7-36");
  assert.equal(kim.skills.length, 16);
  assert.deepEqual(["kim-before-5", "kim-final-5", "kim-final-9"].map((id) => {
    const skill = kim.skills.find((skill) => skill.id === id)!;
    return [skill.base, skill.coinPower, skill.coins, skill.weight];
  }), [[25, -8, 3, 3], [28, -8, 3, 6], [29, -5, 3, 1]]);
  const shikori = bossKeywords(kim, "kim-final").find((keyword) => keyword.term === "結ばれゆくしこり")!.desc;
  assert.match(shikori, /固定ダメージ/);
  assert.match(shikori, /沈潜/);
  assert.equal(cassetti.reserves, 6);
  assert.equal(cassetti.skills.length, 26);
  assert.equal(cassetti.skills.find((skill) => skill.id === "cassetti-6")!.levelUnknown, true);
  assert.match(cassetti.skills.find((skill) => skill.id === "cassetti-7")!.label!, /マッチ不可/);
  assert(!cassetti.passives.some((passive) => passive.name === "ラ・マンチャランドの悪夢"), "Hard限定効果を混ぜない");
  assert.equal(sancho.reserves, 5);
  assert.equal(sancho.units[0].skillLevelReduction, 35);
  assert.equal(sancho.units[0].defenseLevelReduction, 34);
  assert.deepEqual(sancho.skills.find((skill) => skill.id === "sancho-7")!.unbreakableCoins, [1, 2, 3, 4]);
  assert.equal(sancho.skills.length, 11);
});

test("ネリーと血鬼: 捕縛・再戦の条件、反撃と可変広域を保持する", () => {
  const nelly = getBossGuide("nelly")!;
  const barber = getBossGuide("barber")!;
  const trio = getBossGuide("bloodfiend-trio")!;
  assert.equal(nelly.skills.find(s => s.id === "nelly-7")!.coins, 1, "効果番号の誤記からコインを増やさない");
  assert.match(nelly.skills.find(s => s.id === "nelly-7")!.response, /マッチ勝利/);
  assert.match(nelly.skills.find(s => s.id === "nelly-7")!.response, /本人/);
  assert.match(nelly.skills.find(s => s.id === "nelly-8")!.response, /捕縛されていない/);
  assert.equal(nelly.skills.find(s => s.type === "回避")!.levelOffset, -6);
  assert.equal(barber.reserves, 6);
  assert.equal(trio.reserves, 5);
  assert.equal(barber.skills.find(s => s.type === "反撃")!.attackType, "斬");
  assert.equal(trio.skills.find(s => s.type === "反撃")!.attackType, "貫");
  assert.equal(barber.skills.find(s => s.id === "barber-6")!.levelUnknown, true);
  assert.equal(trio.skills.find(s => s.id === "trio-barber-5")!.levelUnknown, true);
  assert.equal(barber.units[0].hp, "2419");
  assert.equal(trio.units[0].hp, "748", "単体戦のHPを再戦へ流用しない");
  assert.equal(trio.units.find(u => u.id === "priest")!.defenseLevel, 75);
  assert.deepEqual(trio.skills.find(s => s.name === "フィナーレ")!.unbreakableCoins, [1, 2, 3]);
  assert.match(trio.priorities.join(""), /撃破|倒す/);
  assert.match(trio.priorities.join(""), /HPが高くても/);
  assert.match(bossKeywords(barber).find(k => k.term === "深く斬られた傷")!.desc, /マッチ敗北/);
  assert.match(bossKeywords(barber).find(k => k.term === "血の涙を呑み、吾が適任を負おう。")!.desc, /室長/);
  assert(!bossKeywords(trio, "priest").some(k => k.term === "裁縫対象"), "理髪師専用状態を神父へ混ぜない");
});

test("4章幻想体: 通常個体・部位別耐性と資料の表記差を保持する", () => {
  const bull = getBossGuide("brazen-bull")!;
  const fox = getBossGuide("wayward-fox")!;
  const centipede = getBossGuide("shock-centipede")!;
  assert.equal(bull.stage, "4-6");
  assert.equal(bull.members, 5);
  assert.equal(fox.members, 7);
  assert.equal(centipede.members, 7);
  assert.equal(bull.units[0].hp, "523", "採光や4-3のHPと混ぜない");
  assert.equal(bull.units[0].physical.貫, 0.5);
  assert.equal(bull.units[1].physical.貫, 2, "胴体の耐性を頭へ流用しない");
  assert.deepEqual(bull.skills.filter(s => s.name.startsWith("突進")).map(s => s.coins), [2, 3]);
  assert(bull.skills.find(s => s.id === "brazen-bull-body-1")!.effects.some(e => e.startsWith("Ⅱ[表面的中時]")), "脚注で示された条件の違いを反映する");
  assert.equal(fox.units[0].physical.斬, 1.5);
  assert.equal(fox.units[1].physical.貫, 1.5);
  assert(fox.skills.filter(s => s.name === "待ちわびる").every(s => s.effects.some(e => e.includes("戦闘開始時"))));
  assert.match(fox.warnings.join(""), /破壊後も行動/);
  assert.match(bossKeywords(fox).find(k => k.term === "傘の破片")!.desc, /数値×5/);
  assert.equal(centipede.skills.find(s => s.name === "超高圧電気放出")!.weight, 5);
  assert(centipede.skills.filter(s => s.name.startsWith("蠢く")).every(s => s.effects.some(e => e.includes("使用時") && e.includes("2消耗")) && s.effects.some(e => e.includes("マッチ敗北") && e.includes("3消耗"))));
  assert.match(bossKeywords(centipede).find(k => k.term === "自家発電")!.desc, /体HPを1/);
  assert(!centipede.skills.some(s => s.unbreakableCoins?.length), "9章の破壊不能を4章へ持ち込まない");
});

test("4章の狐雨・妖精・お札: 減算・マッチ可否と状態の違いを保持する", () => {
  const sun = getBossGuide("dongbaek-sunshower")!;
  const fairy = getBossGuide("fairy-gentleman")!;
  const doll = getBossGuide("talisman-doll")!;
  assert.equal(sun.stage, "4-47");
  assert.deepEqual(sun.skills.filter(s => s.coinPower < 0).map(s => [s.base, s.coinPower, s.coins]), [[10, -5, 1], [13, -4, 2], [26, -10, 1], [8, -5, 1], [20, -5, 1]]);
  assert.equal(sun.skills.find(s => s.name === "全て沈んでしまえ")!.weight, 7);
  assert.match(sun.statNote!, /各50%/);
  assert(!sun.skills.some(s => s.unit.endsWith("-umbrella")), "行動なしの古傘へ架空のスキルを追加しない");
  assert.equal(sun.units.find(u => u.id.endsWith("-umbrella"))!.hp, "9");
  const bites = fairy.skills.filter(s => s.name.startsWith("これ食べちゃうぞ！"));
  assert.deepEqual(bites.map(s => [s.coinPower, s.label]), [[8, "マッチ不可・対象変更不可"], [10, undefined]]);
  assert.equal(fairy.skills.find(s => s.unit.endsWith("-wine"))!.coinPower, 0);
  assert.match(bossKeywords(fairy).find(k => k.term === "酔い")!.desc, /5以上.*混乱/);
  assert.match(bossKeywords(fairy).find(k => k.term === "高揚")!.desc, /捕食の被害/);
  assert.equal(doll.skills.find(s => s.name === "誰も泣かぬように")!.coins, 5);
  assert(!doll.skills.some(s => s.unbreakableCoins?.length), "鏡や鉄道の強化コインを混ぜない");
  assert.match(bossKeywords(doll).find(k => k.term === "貼り直された呪いの札")!.desc, /12以上.*攻撃威力減少5/);
  assert(doll.passives.some(p => p.name === "燃え移る火種"), "ストーリー個体が持つ火傷の例外を残す");
});

test("8章: 生存条件と補正・問答・条件付き破壊不能を区別する", () => {
  const guest = getBossGuide("drunken-nightguest")!;
  const qiu = getBossGuide("jia-qiu")!;
  const lei = getBossGuide("lei-heng")!;
  assert.equal(guest.stage, "8-17");
  assert.equal(qiu.stage, "8-20");
  assert.equal(lei.stage, "8-30");
  for (const boss of [guest, qiu, lei]) assert.deepEqual([boss.members, boss.reserves], [7, 5]);
  assert.match(guest.lead, /倒れても即敗北ではない/);
  assert.match(qiu.priorities[0], /ホンル死亡で即敗北/);
  assert.deepEqual(qiu.units.map(u => u.skillLevelReduction), [35, 20, 35, 5, 5]);
  assert.equal(qiu.skills.find(s => s.id === "qiu-one-7")!.levelUnknown, true);
  const duel = qiu.skills.find(s => s.id === "qiu-two-9")!;
  assert.equal(duel.base + (duel.coinPower - 2 * 3) * duel.coins, 13, "問答3の条件下の威力を素の37と区別");
  assert.deepEqual(duel.unbreakableCoins, [1, 2, 3, 4]);
  assert.match(qiu.skills.find(s => s.id === "qiu-two-8")!.label!, /対象変更不可/);
  assert.equal(lei.units[0].combatLevelNote, "平均化前");
  assert.equal(lei.units[0].skillLevelReduction, undefined, "ケセドの平均化を固定の低下量で代用しない");
  assert.equal(lei.skills.find(s => s.id === "lei-heng-8")!.type, "反撃");
  assert.equal(lei.skills.find(s => s.id === "lei-heng-7")!.levelUnknown, true);
  assert.deepEqual(lei.skills.find(s => s.id === "lei-heng-7")!.unbreakableCoins, [1, 2, 3, 4, 5, 6]);
  assert.match(bossKeywords(lei).find(k => k.term === "獲物")!.desc, /75%/);
});

test("7章とクローマー: 連続戦闘・固有ユニット・不明値を区別する", () => {
  const dulcinea = getBossGuide("dulcinea")!;
  const don = getBossGuide("don-quixote")!;
  const kromer = getBossGuide("kromer")!;
  assert.equal(dulcinea.stage, "7-34");
  assert.equal(don.stage, "7-36");
  assert.equal(kromer.stage, "3-22");
  for (const boss of [dulcinea, don]) {
    assert.equal(boss.members, 6);
    assert.equal(boss.reserves, 6);
    assert(boss.skills.some((skill) => skill.unbreakableCoins?.length));
  }
  assert.deepEqual(dulcinea.skills.find((skill) => skill.id === "finale")!.unbreakableCoins, [1, 2, 3]);
  assert.equal(dulcinea.units.find((unit) => unit.id === "dulcinea")!.skillLevelReduction, 35);
  assert.equal(don.units.find((unit) => unit.id === "don-main")!.skillLevelReduction, 40);
  assert(don.units.some((unit) => unit.id === "blood-spear") && don.units.some((unit) => unit.id === "congealed-dream"));
  assert.equal(kromer.skills.find((skill) => skill.id === "perfect-flesh")!.levelUnknown, true);
  assert.equal(kromer.units.length, 4);
});

test("章末ボス: 形態ごとの違い・本体と部位HP・未記載値を保持する", () => {
  const gas = getBossGuide("gas-harpoon")!;
  const cathy = getBossGuide("erlking-cathy")!;
  const dongrang = getBossGuide("dongrang")!;
  assert.equal(gas.stage, "5-36");
  assert.equal(gas.members, 6);
  assert.equal(gas.units.length, 3);
  assert.equal(gas.skills.length, 15);
  assert.equal(gas.skills.find((skill) => skill.id === "starbuck-5")!.coins, 5, "再使用を基本枚数に含めない");
  assert.equal(gas.skills.find((skill) => skill.id === "queeqeg-5")!.type, "反撃");
  assert.equal(cathy.stage, "6-48");
  assert.equal(cathy.members, 6);
  assert.equal(cathy.phases.length, 6, "準備と戦闘5段階を案内する");
  assert.equal(cathy.skills.length, 63);
  assert.equal(cathy.skills.find((skill) => skill.id === "erlking-one-5")!.weight, null);
  assert.equal(cathy.skills.find((skill) => skill.id === "erlking-two-3")!.weight, 1);
  assert(cathy.passives.some((passive) => passive.unit === "right-one" && passive.name === "不幸を断ち切る手"));
  assert(!cathy.passives.some((passive) => passive.unit === "right-two" && passive.name === "不幸を断ち切る手"));
  assert(!cathy.skills.some((skill) => skill.name === "名称"), "未記入ひな形をスキルとして扱わない");
  assert(cathy.mechanics.find((mechanic) => mechanic.name === "近づく勇気")!.effect.includes("ほかの味方が1名以上生存中"), "終盤の生存効果にも条件がある");
  assert.equal(dongrang.stage, "4-54");
  assert.equal(dongrang.members, 7);
  assert.equal(dongrang.skills.length, 18);
  assert(dongrang.units.find((unit) => unit.id === "farm")!.hp.includes("2094／胴体2052"));
  assert(dongrang.units.some((unit) => unit.id === "absorbing-tree"));
  assert(!dongrang.skills.some((skill) => skill.unit === "absorbing-tree"));
  assert.deepEqual(dongrang.passives.filter((passive) => passive.name === "自己救済").map((passive) => passive.unit), ["deny-three"], "第三形態のみの効果をほかへ広げない");
  for (const boss of [gas, cathy, dongrang]) {
    assert.equal(boss.priorities.length, 3);
    assert(boss.troubleshooting && boss.troubleshooting.length >= 3);
  }
});

test("追加ボス: 別形態を分け、全使用者のスキル・パッシブと敗北時の案内を掲載する", () => {
  for (const [id, stage, skills, passives] of [
    ["ricardo", "5-30", 21, 13], ["ahab-trio", "5-36", 24, 18], ["heathcliff-mirror", "6-34", 7, 9],
  ] as const) {
    const boss = getBossGuide(id)!;
    assert.equal(boss.stage, stage);
    assert.equal(boss.skills.length, skills);
    assert.equal(boss.passives.length, passives);
    assert.equal(boss.priorities.length, 3);
    assert(boss.troubleshooting && boss.troubleshooting.length >= 3);
    for (const unit of boss.units) {
      assert(unit.image && boss.skills.some((skill) => skill.unit === unit.id) && boss.passives.some((passive) => passive.unit === unit.id));
    }
  }
  const ricardo = getBossGuide("ricardo")!;
  assert.equal(typeof ricardo.units[0].level, "string", "不明の敵レベルを確定値にしない");
  assert(ricardo.skills.filter((skill) => skill.unit === "ricardo").every((skill) => skill.level !== undefined));
});

test("裁縫の王: Aルートの個体と針っ子を区別し、条件付き破壊不能を固定表示しない", () => {
  const boss = getBossGuide("sewing-king")!;
  assert.equal(boss.units[0].hp, "1812");
  assert(boss.units.slice(1).every(unit => unit.hp === "85" && unit.level === 35));
  assert(!boss.passives.some(passive => /Bルート|陽射し|聞こえる/.test(passive.name)));
  assert(boss.passives.some(passive => passive.unit === "weft-needle" && passive.name === "裁縫"));
  assert(!boss.passives.some(passive => passive.unit === "sewing-king" && passive.name === "裁縫"));
  assert.equal(boss.skills.find(skill => skill.id === "weft-needle-1")!.unbreakableCoins, undefined);
  assert.deepEqual(boss.skills.find(skill => skill.id === "sewing-king-3")!.unbreakableCoins, [1, 2, 3, 4]);
  assert(boss.skills.find(skill => skill.id === "sewing-king-6")!.effects.join(" ").includes("攻撃レベル増加1"));
  assert(!boss.skills.find(skill => skill.id === "sewing-king-6")!.effects.join(" ").includes("守備スキルを発動させない"));
  assert(boss.warnings.some(warning => warning.includes("HP1087")));
});

test("リナモヴィブル: 減算の基本威力・条件付き破壊不能・マッチ可能反撃を区別する", () => {
  const boss = getBossGuide("linamovible")!;
  assert(boss.skills.every(skill => skill.coinPower < 0));
  const normal = boss.skills.find(skill => skill.id === "linamovible-1")!;
  assert.equal(normal.base, 8);
  assert.equal(normal.base + normal.coins * normal.coinPower, 0);
  const conditional = boss.skills.find(skill => skill.id === "linamovible-4")!;
  assert.equal(conditional.unbreakableCoins, undefined);
  assert.match(conditional.effects.join(" "), /戦闘開始時.*50%未満/);
  const counter = boss.skills.find(skill => skill.id === "linamovible-7")!;
  assert.equal(counter.type, "反撃");
  assert.equal(counter.attackType, "打");
  assert.equal(counter.coins, 1, "再使用を基本枚数に足さない");
  assert.deepEqual(counter.unbreakableCoins, [1]);
  assert.match(boss.skills.find(skill => skill.id === "linamovible-6")!.effects.join(" "), /一方攻撃時.*-80%/);
  assert.match(boss.passives[0].effect, /新作服パターン中に体力が10未満/);
  assert(boss.mechanics.some(mechanic => mechanic.name === "迫害"));
});

test("赤き神未生: 完熟と部位を分け、条件付き破壊不能と洗礼・肉片の寿命を保持する", () => {
  const boss = getBossGuide("red-god-unborn")!;
  assert.notEqual(boss, getBossGuide("red-god-ripe"));
  assert.match(boss.units[0].hp, /本体4494／胴体2439/);
  assert.equal(boss.units.find(unit => unit.id === "unborn-lifeline")!.hp, "2023");
  assert.equal(boss.skills.filter(skill => skill.unit === "unborn-lifeline").length, 6);
  assert(boss.skills.filter(skill => skill.id.startsWith("unborn-lifeline-")).slice(0, 3).every(skill => skill.unbreakableCoins === undefined));
  assert.deepEqual(boss.skills.find(skill => skill.id === "unborn-lifeline-6")!.unbreakableCoins, [1, 2, 3, 4]);
  assert.match(boss.skills.find(skill => skill.id === "unborn-lifeline-6")!.effects.join(" "), /マッチ敗北.*-95%/);
  const support = boss.skills.find(skill => skill.id === "red-god-unborn-11")!;
  assert.equal(support.type, "防御");
  assert.equal(support.sin, undefined);
  assert.match(support.label!, /援護防御専用/);
  assert.match(boss.mechanics.find(mechanic => mechanic.name === "洗礼[赤]")!.effect, /E.G.O・守備スキル使用時に数値が3減る/);
  assert.match(boss.mechanics.find(mechanic => mechanic.name === "生の本能")!.effect, /スキルごとに2回/);
  assert(boss.warnings.some(warning => warning.includes("命綱未破壊") && warning.includes("50%未満")));
});

test("アルリウネ: 月桂冠の付与条件・精神力低下・即死技の取消条件を保持する", () => {
  const boss = getBossGuide("alriune")!;
  const crown = boss.skills.find(skill => skill.id === "alriune-5")!;
  assert.match(crown.effects.join(" "), /攻撃後.*贖罪の月桂冠を付与/);
  assert.match(crown.label!, /速度に関係なく/);
  const instant = boss.skills.find(skill => skill.id === "alriune-7")!;
  assert.match(instant.effects.join(" "), /パニックまたは侵蝕状態でなければ、攻撃がキャンセル/);
  assert.match(instant.label!, /マッチ不可.*対象変更不可.*守備発動不可/);
  assert.match(boss.skills.find(skill => skill.id === "alriune-4")!.effects.join(" "), /このコインは全攻撃対象に命中/);
  assert(boss.skills.filter(skill => skill.unit === "earthborn").every(skill => skill.effects.includes("このスキルのダメージは0に固定される")));
  assert.match(boss.passives.find(passive => passive.name === "土より")!.effect, /混乱すると死亡/);
  assert(boss.warnings.some(warning => warning.includes("プイ") && warning.includes("敗北")));
});

test("フランネル: 3F個体・固有パッシブ・条件付き破壊不能と未記入枠を区別する", () => {
  const boss = getBossGuide("flannel")!;
  assert.equal(boss.units[1].hp, "266");
  assert(boss.skills.every(skill => skill.name !== "名称" && skill.unbreakableCoins === undefined));
  assert(boss.passives.filter(passive => passive.name === "品質保存").every(passive => passive.unit === "flannel"));
  assert(boss.passives.filter(passive => passive.name === "検品保存").every(passive => passive.unit === "noir-maison"));
  assert.equal(boss.skills.find(skill => skill.id === "noir-maison-4")!.type, "防御");
  assert.equal(boss.skills.find(skill => skill.id === "noir-maison-4")!.weight, null);
  assert.match(boss.skills.find(skill => skill.id === "flannel-3")!.effects.join(" "), /10以上消耗.*全てのコインが破壊不能/);
  assert.match(boss.skills.find(skill => skill.id === "flannel-5")!.label!, /敵陣への支援/);
  assert(boss.passives.filter(passive => passive.name === "生地密度の格差").every(passive => passive.effect.includes("増加量不明")));
});

test("アネット: お直し対象の守備・常時と条件付き破壊不能・混乱で消える効果を保持する", () => {
  const boss = getBossGuide("annette")!;
  assert.equal(boss.skills.find(skill => skill.id === "annette-1")!.unbreakableCoins, undefined);
  assert.deepEqual(boss.skills.find(skill => skill.id === "annette-2")!.unbreakableCoins, [3]);
  assert.deepEqual(boss.skills.find(skill => skill.id === "annette-6")!.unbreakableCoins, [1, 2, 3, 4]);
  assert.match(boss.skills.find(skill => skill.id === "annette-6")!.label!, /対象変更不可/);
  const target = boss.mechanics.find(mechanic => mechanic.name === "お直し対象")!;
  assert.match(target.effect, /前ターン最大与ダメージ/);
  assert.match(target.effect, /守備をセット.*80%/);
  assert.match(target.effect, /威力増加3.*最大9/);
  assert.match(boss.skills.find(skill => skill.id === "annette-3")!.effects.join(" "), /ダメージ量-75%/);
  assert.match(boss.skills.find(skill => skill.id === "annette-4")!.effects.join(" "), /ダメージ量-90%/);
  assert(boss.warnings.some(warning => warning.includes("漂流慣性は残る")));
  assert(boss.warnings.some(warning => warning.includes("自動発動攻撃")));
});

test("統制者: 最大HPと開始HP、規則の例外、通常召喚だけの停止条件を分ける", () => {
  const boss = getBossGuide("controller")!;
  assert.equal(boss.units[0].hp, "5000（開始4500）");
  assert.equal(boss.units[1].defenseLevel, 59);
  const normal = boss.skills.find(skill => skill.id === "controller-4")!;
  const massive = boss.skills.find(skill => skill.id === "controller-5")!;
  assert.match(normal.effects.join(" "), /メインターゲット.*2つ以上/);
  assert.doesNotMatch(massive.effects.join(" "), /2つ以上/);
  const punish = boss.skills.find(skill => skill.id === "controller-7")!;
  assert.match(punish.label!, /マッチ不可.*守備発動不可/);
  assert.equal(boss.skills.find(skill => skill.id === "tanned-sinner-1")!.levelOffset, 0);
  assert.deepEqual(boss.skills.find(skill => skill.id === "tanned-sinner-3")!.unbreakableCoins, [2]);
  assert.match(boss.mechanics.find(mechanic => mechanic.name === "攻撃的態度禁止")!.effect, /E.G.Oスキルは例外/);
  for (const name of ["原皮損傷禁止", "なめしの催促禁止"]) assert.doesNotMatch(boss.mechanics.find(mechanic => mechanic.name === name)!.effect, /例外/);
  assert(boss.warnings.some(warning => warning.includes("HP2500")));
});

test("古き海の黒い糸: 減算威力・条件付き破壊不能・絡まり解除と水たまりの単位を保持する", () => {
  const boss = getBossGuide("old-sea-thread")!;
  assert.equal(boss.units.length, 3);
  assert(boss.units.every(unit => unit.stagger.includes("未確定")));
  assert(boss.skills.every(skill => skill.coinPower < 0 && skill.unbreakableCoins === undefined));
  const jaw = boss.skills.find(skill => skill.name === "奈落の顎門")!;
  assert.equal(jaw.base, 18);
  assert.equal(jaw.coinPower, -6);
  assert.match(jaw.effects.join(" "), /最大体力の150%/);
  assert.match(jaw.response, /混乱中または絡まり20以上/);
  const washes = boss.skills.filter(skill => skill.name === "洗い流す");
  assert.deepEqual(new Set(washes.map(skill => skill.unit)), new Set(boss.units.map(unit => unit.id)));
  assert(washes.every(skill => skill.type === "反撃" && skill.attackType === "打"));
  assert(washes.every(skill => skill.response.includes("こちらが勝つと") && skill.response.includes("切り上げ")));
  assert.match(boss.mechanics.find(mechanic => mechanic.name === "絡まり")!.effect, /守備使用時.*減少量切り捨て/);
  assert.match(boss.mechanics.find(mechanic => mechanic.name === "黒い水たまり")!.effect, /スキルごと1回/);
  assert(boss.warnings.some(warning => warning.includes("即座にターン終了")));
});

test("6章中編: 一度だけの混乱解除・HP下限・取り巻き撃破の不利を区別する", () => {
  const josephine = getBossGuide("josephine")!;
  const hindley = getBossGuide("crying-hindley")!;
  const rabbits = getBossGuide("dead-rabbits-boss")!;
  assert.deepEqual([josephine.stage, hindley.stage, rabbits.stage], ["6-15", "6-32", "6-33"]);
  assert.deepEqual([josephine.skills.length, hindley.skills.length, rabbits.skills.length], [13, 9, 13]);
  assert.equal(josephine.units[0].level, 42, "敵LvとHPを逆転させない");
  assert.equal(josephine.units[0].hp, "654");
  const recovery = josephine.passives.find(p => p.name === "きちんと片付けてやろう…")!;
  assert.match(recovery.condition, /そのターン中.*最大1回/);
  assert(josephine.skills.filter(s => s.name === "ガード").every(s => s.weight === null));
  const mark = hindley.skills.find(s => s.name === "てめぇだけは･･･")!;
  assert.match(mark.effects.join(""), /使用時.*次のターンに獲物の目印/);
  assert.match(hindley.skills.find(s => s.name === "返せ･･･！！")!.label!, /マッチ不可/);
  assert.equal(hindley.skills.find(s => s.name === "クソ野郎")!.coins, 2, "条件付き再使用を常時3枚にしない");
  assert.match(hindley.passives.find(p => p.name === "俺が立つべき場所")!.effect, /1ターン.*40%以下にならず/);
  assert.match(rabbits.passives.find(p => p.name === "デッドラビッツ ボス？")!.effect, /死亡.*スロット/);
  assert.match(rabbits.mechanics.find(m => m.name === "混乱後の反撃")!.effect, /60%以下/);
  const counter = rabbits.skills.find(s => s.id === "dead-rabbits-boss-5")!;
  assert.equal(counter.type, "反撃");
  assert.equal(counter.attackType, "打");
  assert.match(counter.response, /相殺できない/);
  assert.match(rabbits.passives.find(p => p.name === "敵意")!.condition, /現在HP/);
  assert(rabbits.priorities.some(p => p.includes("取り巻きは倒さず")));
});

test("序盤の追加戦: 口笛・任意戦闘・取り巻き死亡の効果と画像なし要約を保持する", () => {
  const guido = getBossGuide("guido")!;
  const bull = getBossGuide("brazen-bull-dungeon")!;
  const hindley = getBossGuide("hindley")!;
  assert.deepEqual([guido.stage, bull.stage, hindley.stage], ["3-18", "4-54", "6-31"]);
  assert.deepEqual([guido.skills.length, bull.skills.length, hindley.skills.length], [34, 6, 13]);
  assert.match(guido.mechanics.find(m => m.name === "クローマーの口笛")!.effect, /3ターン.*15回復.*精神力が30減少/);
  assert.match(guido.skills.find(s => s.name === "罪を…洗い流さん！")!.effects.join(""), /表面的中時.*釘5/);
  assert.equal(guido.skills.find(s => s.name === "異端抹殺")!.base, 11);
  assert.equal(guido.skills.find(s => s.name === "異端抹殺")!.coinPower, -4);
  assert.match(guido.passives.find(p => p.name === "執念")!.condition, /50%未満/);
  assert.match(bull.priorities[0], /走る、走る、走らない/);
  assert.deepEqual(bull.units.map(u => [u.level, u.hp, u.defenseLevel]), [[33, "549", 40], [33, "179", 29]]);
  assert.equal(bull.skills.find(s => s.name === "熱い悲鳴")!.levelOffset, 2);
  assert.match(bull.passives.find(p => p.name === "抜け出せぬ哀しみ")!.condition, /頭が破壊済み/);
  assert.match(hindley.passives.find(p => p.name === "戦力補強")!.effect, /次のターン.*スロット/);
  assert.match(hindley.passives.find(p => p.name === "こんなはずは")!.effect, /人数.*攻撃レベル減少2/);
  assert.equal(hindley.skills.find(s => s.name === "邪魔す…な")!.type, "打");
  assert.equal(hindley.skills.find(s => s.name === "片･･･付･･･")!.type, "打");
  assert(hindley.units.slice(0, 2).every(u => u.stagger.includes("未確定")));
  const summary = bossSummary(hindley);
  assert.equal(summary.image, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(summary)), summary, "画像なしの要約もJSON保存で変わらない");
});

test("章間の3戦: 一時スロット・出撃制限・時間消耗と予告対象を区別する", () => {
  const jun = getBossGuide("jun")!;
  const captain = getBossGuide("yurodivy-captain")!;
  const ripper = getBossGuide("time-ripper-first")!;
  assert.deepEqual([jun.stage, captain.stage, ripper.stage], ["5.5-22", "6.5-10", "6.5-14"]);
  assert.deepEqual([jun.skills.length, captain.skills.length, ripper.skills.length], [6, 7, 8]);
  const slots = jun.passives.find(p => p.name === "後始末")!;
  assert.match(slots.condition, /1ターン1回/);
  assert.match(slots.effect, /次のターン.*持続しない/);
  const counter = jun.skills.find(s => s.name === "裏路地の掟")!;
  assert.equal(counter.type, "反撃");
  assert.equal(counter.coins, 1, "条件付き追加枚数を常時の枚数にしない");
  assert.match(counter.effects.join(""), /コインを1つ追加.*最大3/);
  assert.equal(captain.members, 3);
  assert.equal(captain.units[0].hp, "582", "ダンジョン道中の633を流用しない");
  assert.match(captain.units[0].stagger, /未確定/);
  assert.match(captain.mechanics.find(m => m.name === "3名限定・初期2スロット")!.effect, /良秀・ホンル・ロージャ/);
  assert.match(captain.skills.find(s => s.name === "大義のための収集")!.label!, /マッチ不可/);
  assert.equal(ripper.members, 6);
  assert.equal(ripper.units.length, 1, "最終戦の脳部位を混ぜない");
  assert.equal(ripper.units[0].defenseLevel, 48, "動的な時間補正を基礎値へ加算しない");
  assert.match(ripper.skills.find(s => s.name === "救済する時間")!.effects.join(""), /次のターンに時間救済対象/);
  assert.match(ripper.phases.find(p => p.id === "finish")!.steps.join(""), /3行動/);
  assert(!ripper.passives.some(p => ["定刻", "残された時間"].includes(p.name)), "Hard限定を混ぜない");
});

test("ボス画像: 参照画像がローカルに存在し、寸法と取得元の記録が一致する", async () => {
  const root = new URL("../public/", import.meta.url);
  const sources = JSON.parse(await readFile(new URL("images/bosses/sources.json", root), "utf8")) as {
    images: { path: string; width: number; height: number; sourceUrl: string }[];
  };
  for (const unit of bossGuides.flatMap((boss) => boss.units)) {
    if (!unit.image) continue;
    const image = unit.image;
    const metadata = await sharp(await readFile(new URL(image.path, root))).metadata();
    assert.equal(metadata.width, image.width, `${unit.id}: 画像の幅`);
    assert.equal(metadata.height, image.height, `${unit.id}: 画像の高さ`);
    assert(sources.images.some((source) => source.path === image.path && source.width === image.width && source.height === image.height && new URL(source.sourceUrl).hostname === "cdn.wikiwiki.jp"));
  }
});

test("ボスの効果表示: 複数コイン共通の効果と、同じ段落の別コイン効果を保持する", () => {
  assert.equal(bossSkillEffectText({ effects: ["Ⅰ・Ⅱ：[的中時] それぞれ開花1を付与。"] }), "Ⅰ[的中時] 開花1を付与。\nⅡ[的中時] 開花1を付与。");
  assert.equal(bossSkillEffectText({ effects: ["Ⅱ：[的中時] 脆弱2を付与。Ⅲ：[的中時] 破裂5を付与。"] }), "Ⅱ[的中時] 脆弱2を付与。\nⅢ[的中時] 破裂5を付与。");
  assert.equal(bossSkillEffectText({ effects: ["[使用時] 開花3を付与。"] }), "[使用時] 開花3を付与。");
  assert.equal(bossSkillEffectText({ effects: ["[使用時] 精神力を回復。"], unbreakableCoins: [1] }), "[使用時] 精神力を回復。\nⅠ破壊不能コイン。");
});
