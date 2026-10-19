import { test } from "node:test";
import assert from "node:assert/strict";
import { BOSS_SECTIONS, bossGuides, getBossGuide } from "./bosses.ts";
import { getGlossaryTerm } from "./glossary.ts";
import { SIN_ORDER } from "./sinColors.ts";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { bossSkillEffectText } from "./bossSkillText.ts";
import { bossKeywords } from "./bossKeywords.ts";

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

test("ボスデータ: 固定ID・部位参照・用語リンクと掲載情報が揃う", () => {
  assert(bossGuides.length > 0);
  assert.equal(new Set(bossGuides.map((boss) => boss.id)).size, bossGuides.length);
  assert.equal(new Set(BOSS_SECTIONS.map((section) => section.id)).size, BOSS_SECTIONS.length);
  for (const boss of bossGuides) {
    assert.match(boss.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.match(boss.stage, /^\d+(?:\.5)?-\d+$/);
    assert(boss.name && boss.stageName && boss.lead);
    assert.equal(getBossGuide(boss.id), boss);
    assert.equal(new Date(`${boss.checkedAt}T00:00:00Z`).toISOString().slice(0, 10), boss.checkedAt);
    const units = new Set(boss.units.map((unit) => unit.id));
    assert.equal(units.size, boss.units.length);
    assert(boss.units.length && boss.skills.length && boss.passives.length && boss.phases.length);
    assert.equal(new Set(boss.skills.map((skill) => skill.id)).size, boss.skills.length);
    for (const unit of boss.units) {
      assert(unit.hp && unit.part && unit.speed && unit.stagger);
      assert(typeof unit.level === "number" ? Number.isInteger(unit.level) && unit.level > 0 : unit.level.startsWith("不明"));
      for (const key of ["斬", "貫", "打"] as const) assert(Number.isFinite(unit.physical[key]) && unit.physical[key] >= 0);
      for (const sin of SIN_ORDER) assert(Number.isFinite(unit.sins[sin]) && unit.sins[sin] >= 0);
    }
    for (const skill of boss.skills) {
      assert(units.has(skill.unit), `${boss.id}/${skill.id}: スキルの使用者が存在しない`);
      assert(skill.name && skill.effects.length && skill.effects.every(Boolean) && skill.response);
      assert(Number.isInteger(skill.coins) && skill.coins >= 1 && skill.coins <= 12);
      assert(Number.isFinite(skill.base) && Number.isFinite(skill.coinPower));
      assert(skill.weight === null || (Number.isInteger(skill.weight) && skill.weight > 0));
      assert(Number.isInteger(skill.levelOffset));
      const unit = boss.units.find((unit) => unit.id === skill.unit)!;
      if (typeof unit.level !== "number") assert(Number.isInteger(skill.level) && skill.level! > 0, "敵Lv不明のスキルには資料のレベルを指定する");
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
  assert.equal(getBossGuide("unknown"), undefined);
  assert.equal(getBossGuide("toString"), undefined);
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
