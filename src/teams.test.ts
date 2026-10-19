// おすすめ編成データ(src/data/teams.json)の整合性チェック
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { CharacterListEntry, CharacterData, TeamData } from "./types.ts";

const DATA = join(import.meta.dirname, "data");
const teams = JSON.parse(readFileSync(join(DATA, "teams.json"), "utf-8")) as TeamData[];
const characters = JSON.parse(readFileSync(join(DATA, "characters.json"), "utf-8")) as CharacterListEntry[];

// 人格コード → 囚人名、E.G.O コード → 囚人名
const personaOwner = new Map<string, string>();
const egoOwner = new Map<string, string>();
for (const c of characters) {
  const data = JSON.parse(readFileSync(join(DATA, `${c.name}.json`), "utf-8")) as CharacterData;
  for (const s of data.statuses) personaOwner.set(s.code, c.name);
  for (const e of data.egos ?? []) egoOwner.set(e.code, c.name);
}
const egoCodes = new Set(egoOwner.keys());

const APTITUDE = new Set(["◎", "〇", "△", "✖"]);

// 人格の公式キーワード(scripts/extract-keywords.ts が wiki の対応キーワード表から作る)
const personaKeywords = JSON.parse(readFileSync(join(DATA, "persona-keywords.json"), "utf-8")) as Record<
  string,
  { keywords: string[]; viaEgo?: string[] }
>;

test("teams: ID は英小文字・数字・ハイフンで、重複しない", () => {
  const ids = teams.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});

test("teams: 各編成に解説ファイル(team-guides/<id>.md)がある", () => {
  for (const t of teams) assert.ok(existsSync(join(DATA, "team-guides", `${t.id}.md`)), `${t.id}.md が無い`);
});

test("teams: 人格・E.G.O のコードがすべて存在する", () => {
  for (const t of teams) {
    for (const m of [...t.core, ...t.flex, ...t.alternatives, ...t.support]) {
      assert.ok(personaOwner.has(m.code), `${t.id}: 人格 ${m.code} が無い`);
    }
    for (const m of t.egos) assert.ok(egoCodes.has(m.code), `${t.id}: E.G.O ${m.code} が無い`);
    // 自由枠以降とE.G.Oには、簡単な解説(note)を必ず付ける
    for (const m of [...t.flex, ...t.alternatives, ...t.support, ...t.egos]) assert.ok(m.note, `${t.id}: ${m.code} に note が無い`);
    for (const m of [...t.core, ...(t.combos ?? []).flatMap((c) => c.members)]) assert.ok(m.note, `${t.id}: ${m.code} に note が無い`);
  }
});

test("teams: コンビ・トリオ運用の人格は存在し、同じ組の中で囚人が重複しない", () => {
  for (const t of teams) {
    for (const c of t.combos ?? []) {
      for (const m of c.members) assert.ok(personaOwner.has(m.code), `${t.id}/${c.name}: 人格 ${m.code} が無い`);
      const owners = c.members.map((m) => personaOwner.get(m.code));
      assert.equal(new Set(owners).size, owners.length, `${t.id}/${c.name}: 囚人が重複`);
    }
  }
});

test("teams: 優先枠は囚人が重複せず、同じ人格を複数の枠に入れない", () => {
  for (const t of teams) {
    const owners = t.core.map((m) => personaOwner.get(m.code));
    assert.equal(new Set(owners).size, owners.length, `${t.id}: 優先枠の囚人が重複`);
    const codes = [...t.core, ...t.flex, ...t.alternatives, ...t.support].map((m) => m.code);
    assert.equal(new Set(codes).size, codes.length, `${t.id}: 同じ人格が複数の枠にある`);
  }
});

test("teams: 適性は ◎〇△✖ のいずれか", () => {
  for (const t of teams) {
    for (const v of Object.values(t.aptitude)) assert.ok(APTITUDE.has(v), `${t.id}: 適性 ${v}`);
    // 適性の軸は、鏡ダンジョンの編成なら 周回・深層、それ以外は 通常・短期・長期
    const axes = t.category === "鏡ダンジョン" ? ["周回", "深層"] : ["通常", "短期", "長期"];
    assert.deepEqual(Object.keys(t.aptitude), axes, `${t.id}: 適性の軸`);
  }
});

test("teams: 解説の人格・E.G.O リンクは存在するコードを指す", () => {
  for (const t of teams) {
    const text = readFileSync(join(DATA, "team-guides", `${t.id}.md`), "utf-8");
    for (const m of text.matchAll(/\]\((persona|ego):(\d{4})\)/g)) {
      const ok = m[1] === "persona" ? personaOwner.has(m[2]) : egoCodes.has(m[2]);
      assert.ok(ok, `${t.id}.md: ${m[1]}:${m[2]} が無い`);
    }
  }
});

test("teams: 編成例は出撃7人以上で、囚人が重複せず、コードと note が揃う", () => {
  for (const t of teams) {
    for (const x of t.examples ?? []) {
      // 鏡ダンジョンの編成(穴周回など)は、必須の人格以外の枠が自由なので人数を問わない
      if (t.category !== "鏡ダンジョン") assert.ok(x.members.length >= 7, `${t.id}/${x.name}: 出撃が7人未満`);
      const owners = x.members.map((m) => personaOwner.get(m.code));
      assert.equal(new Set(owners).size, owners.length, `${t.id}/${x.name}: 囚人が重複`);
      // 裏置きは出撃しない囚人から選ぶ(同じ囚人の人格は同時に編成できない)
      for (const s of x.support) assert.ok(!owners.includes(personaOwner.get(s.code)), `${t.id}/${x.name}: 裏置き ${s.code} の囚人が出撃メンバーと重複`);
      for (const m of [...x.members, ...x.support]) {
        assert.ok(personaOwner.has(m.code), `${t.id}/${x.name}: 人格 ${m.code} が無い`);
        assert.ok(m.note, `${t.id}/${x.name}: ${m.code} に note が無い`);
      }
      for (const m of x.egos) {
        assert.ok(egoCodes.has(m.code), `${t.id}/${x.name}: E.G.O ${m.code} が無い`);
        assert.ok(m.note, `${t.id}/${x.name}: E.G.O ${m.code} に note が無い`);
        // E.G.O は持ち主の囚人が出撃していないと使えない
        assert.ok(owners.includes(egoOwner.get(m.code)), `${t.id}/${x.name}: E.G.O ${m.code} の囚人が出撃していない`);
      }
    }
  }
});

test("persona-keywords: 全人格の公式キーワードがある", () => {
  for (const code of personaOwner.keys()) assert.ok(personaKeywords[code], `${code} のキーワードが無い(npm run keywords)`);
});

// キーワード外の人格を入れること自体は許すが、印(offKeyword)と理由(note)を必須にして、紛れ込みだけを止める
// 状態異常のキーワード(対応キーワード表の7種)。口笛・蜘蛛の巣など、これを軸にしない編成は検査しない
const STATUS_KEYWORDS = new Set(["火傷", "出血", "振動", "破裂", "沈潜", "呼吸", "充電"]);

test("teams: 編成のキーワードを持たない人格には offKeyword を付け、持つ人格には付けない", () => {
  for (const t of teams) {
    if (!t.keywords.some((k) => STATUS_KEYWORDS.has(k))) {
      const marked = [...t.core, ...t.flex, ...t.alternatives, ...t.support].filter((m) => m.offKeyword);
      assert.equal(marked.length, 0, `${t.id}: 状態異常を軸にしない編成で offKeyword は使わない`);
      continue;
    }
    const groups: [string, TeamData["core"]][] = [
      ["優先枠", t.core],
      ["自由枠", t.flex],
      ["代替枠", t.alternatives],
      ["裏置き", t.support],
      ...(t.examples ?? []).map((x): [string, TeamData["core"]] => [`編成例「${x.name}」`, x.members]),
      ...(t.combos ?? []).map((c): [string, TeamData["core"]] => [`コンビ「${c.name}」`, c.members]),
    ];
    for (const [slot, members] of groups) {
      for (const m of members) {
        const kw = personaKeywords[m.code];
        const has = [...(kw?.keywords ?? []), ...(kw?.viaEgo ?? [])].some((k) => t.keywords.includes(k));
        if (has) assert.ok(!m.offKeyword, `${t.id}/${slot}: ${m.code} はキーワードを持つのに offKeyword が付いている`);
        else assert.ok(m.offKeyword, `${t.id}/${slot}: ${m.code} は ${t.keywords.join("・")} 人格ではない。入れるなら offKeyword と理由を付ける`);
      }
    }
  }
});
