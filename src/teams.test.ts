// おすすめ編成データ(src/data/teams.json)の整合性チェック
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { CharacterListEntry, CharacterData, TeamData } from "./types.ts";

const DATA = join(import.meta.dirname, "data");
const teams = JSON.parse(readFileSync(join(DATA, "teams.json"), "utf-8")) as TeamData[];
const characters = JSON.parse(readFileSync(join(DATA, "characters.json"), "utf-8")) as CharacterListEntry[];

// 人格コード → 囚人名、E.G.O コードの集合
const personaOwner = new Map<string, string>();
const egoCodes = new Set<string>();
for (const c of characters) {
  const data = JSON.parse(readFileSync(join(DATA, `${c.name}.json`), "utf-8")) as CharacterData;
  for (const s of data.statuses) personaOwner.set(s.code, c.name);
  for (const e of data.egos ?? []) egoCodes.add(e.code);
}

const APTITUDE = new Set(["◎", "〇", "△", "✖"]);

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
