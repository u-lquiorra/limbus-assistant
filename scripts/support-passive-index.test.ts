import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSupportPassiveIndex, parseResource } from "./support-passive-index.ts";
import { filterSupportPassivesBySins, groupSupportPassivesByCharacter, type SupportPassive } from "../src/supportPassives.ts";
import { activeNavItem } from "../src/nav.ts";
import { SIN_ORDER } from "../src/sinColors.ts";

const index = JSON.parse(readFileSync(new URL("../src/data/support-passives.json", import.meta.url), "utf-8")) as SupportPassive[];

test("サポートパッシブの要約: 人格の詳細データと一致する(古ければ npm run support:index で作り直す)", () => {
  assert.deepEqual(index, buildSupportPassiveIndex(), "要約が古い。npm run support:index で作り直す");
  assert(index.length > 150, "全人格分を読めている");
  assert.equal(new Set(index.map((p) => p.code)).size, index.length, "1人格につき1件");
  for (const p of index) {
    assert(p.cost.length > 0, `${p.code}: 必要資源がある`);
    assert(!p.name.includes("\n"), `${p.code}: 名前に改行が残っていない`);
  }
});

test("サポートパッシブの要約: 必要資源の書式を読み、読めない書式は止める", () => {
  assert.deepEqual(parseResource("傲慢×3", "x"), [{ sin: "傲慢", count: 3 }]);
  assert.deepEqual(parseResource("暴食×2\n憂鬱×1", "x"), [
    { sin: "暴食", count: 2 },
    { sin: "憂鬱", count: 1 },
  ]);
  assert.throws(() => parseResource("傲慢3", "x"), /必要資源を読めない/);
  assert.throws(() => parseResource(undefined, "x"), /必要資源が無い/);
});

const characters = JSON.parse(readFileSync(new URL("../src/data/characters.json", import.meta.url), "utf-8")) as { name: string }[];
// 囚人一覧での人格の並びと、各人格の囚人
const personaOrder = characters.flatMap(({ name }) =>
  (JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), "utf-8")) as { statuses: { code: string }[] }).statuses.map((s) => ({
    code: s.code,
    character: name,
  }))
);
const characterOf = (code: string) => personaOrder.find((p) => p.code === code)?.character;

test("サポートパッシブ一覧: 囚人ごとに、囚人一覧と同じ人格の順でまとめる", () => {
  const groups = groupSupportPassivesByCharacter(index, characterOf);
  assert.deepEqual(
    groups.map((g) => g.character),
    characters.map((c) => c.name).filter((name) => index.some((p) => characterOf(p.code) === name)),
    "囚人一覧の並び"
  );
  assert.deepEqual(
    groups.flatMap((g) => g.passives.map((p) => p.code)),
    personaOrder.map((p) => p.code).filter((code) => index.some((p) => p.code === code)),
    "人格の並び(重複も漏れも無い)"
  );
  for (const g of groups) assert(g.passives.every((p) => characterOf(p.code) === g.character), `${g.character}: ほかの囚人が混ざらない`);
});

test("サポートパッシブ一覧: 絞り込んだ後も囚人ごとにまとめ、囚人が分からない人格は止める", () => {
  const groups = groupSupportPassivesByCharacter(filterSupportPassivesBySins(index, ["傲慢"]), characterOf);
  assert.equal(new Set(groups.map((g) => g.character)).size, groups.length, "同じ囚人が2組に分かれない");
  const make = (code: string): SupportPassive => ({ code, name: code, cost: [{ sin: "傲慢", count: 1 }], condition: "保有", effect: "", keywords: [] });
  assert.throws(() => groupSupportPassivesByCharacter([make("9999")], characterOf), /囚人が分からない/);
});

test("サポートパッシブ一覧: 控え選びのページなので、ナビは「編成例」を選択中にする", () => {
  assert.equal(activeNavItem("/support-passives"), "/teams");
  assert.equal(activeNavItem("/support-passives/"), "/teams");
});

test("サポートパッシブ一覧: 選んだ資源だけで発動するものに絞り込む(E.G.O 一覧と同じ考え方)", () => {
  assert.equal(filterSupportPassivesBySins(index, []), index, "何も選ばなければ全件");
  for (const p of index) {
    assert(filterSupportPassivesBySins(index, p.cost.map((c) => c.sin)).includes(p), `${p.code}: 自分の必要資源を全て選べば出る`);
  }
  const pride = filterSupportPassivesBySins(index, ["傲慢"]);
  assert(pride.length > 0 && pride.every((p) => p.cost.every((c) => c.sin === "傲慢")), "ほかの資源も要るものは出さない");
  const multi = index.find((p) => p.cost.length >= 2)!;
  assert(!filterSupportPassivesBySins(index, [multi.cost[0].sin]).includes(multi), "2属性を使うものは片方だけでは出ない");
  assert.equal(filterSupportPassivesBySins(index, [...SIN_ORDER]).length, index.length, "全属性を選べば全件");
});

test("サポートパッシブ一覧: 各ページからの導線は、必要資源を選んだ状態で開く", async () => {
  const { supportPassivesPath } = await import("../src/supportPassives.ts");
  const { parseSinFilter } = await import("../src/egoFilter.ts");
  assert.equal(supportPassivesPath(), "/support-passives");
  for (const p of index) {
    const path = supportPassivesPath(p.cost.map((c) => c.sin));
    const sins = parseSinFilter(new URL(path, "https://x.test").searchParams.get("sin"));
    assert(filterSupportPassivesBySins(index, sins).includes(p), `${p.code}: 人格ページの導線で開いた一覧に自分が入る`);
  }
});
