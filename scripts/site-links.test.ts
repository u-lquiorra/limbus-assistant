import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { load } from "cheerio";
import { createServer } from "vite";
import { getGlossaryTerm, glossarySectionRedirect, glossaryTerms } from "../src/glossary.ts";
import { parseGuide } from "../src/guide.ts";
import { BOSS_SECTIONS, bossGuides, getBossGuide } from "../src/bosses.ts";
import type { CharacterData, CharacterListEntry } from "../src/types.ts";

const dataRoot = new URL("../src/data/", import.meta.url);
const characters: CharacterListEntry[] = JSON.parse(await readFile(new URL("characters.json", dataRoot), "utf8"));
const characterData: CharacterData[] = await Promise.all(characters.map(async ({ name }) =>
  JSON.parse(await readFile(new URL(`${name}.json`, dataRoot), "utf8")) as CharacterData
));
const personaCodes = new Set(characterData.flatMap((character) => character.statuses.map(({ code }) => code)));
const egoCodes = new Set(characterData.flatMap((character) => (character.egos ?? []).map(({ code }) => code)));

function assertRoute(path: string, context: string) {
  const url = new URL(path, "https://limbus.test");
  const parts = url.pathname.split("/").filter(Boolean);
  const [kind, id] = parts;
  if (!kind || (parts.length === 1 && ["beginner", "reroll", "glossary", "bosses"].includes(kind))) return;
  assert.equal(parts.length, 2, `${context}: 不明なページ ${path}`);
  if (kind === "glossary") {
    const term = getGlossaryTerm(id);
    assert(term || glossarySectionRedirect(id), `${context}: 存在しない用語 ${path}`);
    if (url.hash) assert(term?.sections?.some((section) => section.id === decodeURIComponent(url.hash.slice(1))), `${context}: 存在しない節 ${path}`);
  } else if (kind === "bosses") {
    const boss = getBossGuide(id);
    assert(boss, `${context}: 存在しないボス ${path}`);
    if (url.hash) assert(BOSS_SECTIONS.some((section) => section.id === url.hash.slice(1)) || boss.skills.some((skill) => `skill-${skill.id}` === url.hash.slice(1)), `${context}: 存在しない節 ${path}`);
  } else if (kind === "persona") {
    assert(personaCodes.has(id), `${context}: 存在しない人格 ${path}`);
  } else if (kind === "ego") {
    assert(egoCodes.has(id), `${context}: 存在しないE.G.O ${path}`);
  } else if (kind === "character") {
    assert(characters.some(({ name }) => name === decodeURIComponent(id)), `${context}: 存在しない囚人 ${path}`);
  } else {
    assert.fail(`${context}: 不明なページ ${path}`);
  }
}

test("実際の初心者・リセマラガイド・辞典・ボス攻略: 内部リンクと目次の参照先が存在する", async () => {
  // Viteで実際のページを読み込み、CSS importやimport.metaも本番と同じ形で扱う。
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  try {
    const { default: BeginnerGuide } = await server.ssrLoadModule("/src/pages/BeginnerGuide.tsx");
    const { default: RerollGuide } = await server.ssrLoadModule("/src/pages/RerollGuide.tsx");
    const { default: GlossaryPage } = await server.ssrLoadModule("/src/pages/GlossaryPage.tsx");
    const { default: GlossaryDetail } = await server.ssrLoadModule("/src/pages/GlossaryDetail.tsx");
    const { default: BossPage, BossIndex } = await server.ssrLoadModule("/src/pages/BossPage.tsx");
    const pages = [
      { path: "/beginner", route: "/beginner", component: BeginnerGuide },
      { path: "/reroll", route: "/reroll", component: RerollGuide },
      { path: "/reroll?tab=walpurgis#candidates", route: "/reroll", component: RerollGuide },
      { path: "/reroll#walpurgis", route: "/reroll", component: RerollGuide },
      { path: "/reroll#recommend-0216", route: "/reroll", component: RerollGuide },
      { path: "/glossary", route: "/glossary", component: GlossaryPage },
      ...glossaryTerms.map((term) => ({ path: `/glossary/${term.id}`, route: "/glossary/:id", component: GlossaryDetail })),
      { path: "/bosses", route: "/bosses", component: BossIndex },
      ...bossGuides.map((boss) => ({ path: `/bosses/${boss.id}`, route: "/bosses/:id", component: BossPage })),
      { path: "/bosses/dongbaek-spicebush#skill-spring-wind", route: "/bosses/:id", component: BossPage },
      ...bossGuides.filter((boss) => boss.troubleshooting).map((boss) => ({ path: `/bosses/${boss.id}#skill-${boss.skills.at(-1)!.id}`, route: "/bosses/:id", component: BossPage })),
      { path: "/bosses/unknown", route: "/bosses/:id", component: BossPage },
    ];
    for (const { path, route, component } of pages) {
      const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] },
        createElement(Routes, null, createElement(Route, { path: route, element: createElement(component) }))
      ));
      const $ = load(html);
      if (path.startsWith("/bosses/") && path !== "/bosses/unknown") {
        const boss = getBossGuide(new URL(path, "https://limbus.test").pathname.split("/").at(-1)!);
        assert(boss);
        assert.equal($(".boss-skill-card").length, boss.skills.length);
        assert.equal($(".passive-card").length, boss.passives.length);
        assert.equal($(".boss-skill-panel:not([hidden])").length, boss.units.filter((unit) => boss.skills.some((skill) => skill.unit === unit.id)).length);
        $("[role=tab]").each((_, element) => {
          const panel = $(element).attr("aria-controls");
          assert(panel && $(`[id="${panel}"]`).length === 1, "スキルタブの表示先が存在する");
        });
        if (path.includes("#skill-spring-wind")) assert.equal($("#boss-panel-spring-wind").is("[hidden]"), false);
        const skillId = new URL(path, "https://limbus.test").hash.replace(/^#skill-/, "");
        if (path.includes("#skill-")) assert.equal($(`[id="boss-panel-${skillId}"]`).is("[hidden]"), false);
        assert.equal($(".boss-troubleshooting dt").length, boss.troubleshooting?.length ?? 0);
        for (const section of ["strategy", "notes", "team", "skills", "passives"]) {
          assert($(`#${section} abbr.fx-keyword[title]`).length > 0, `${boss.id}/${section}: 用語の説明がある`);
        }
        $("abbr.fx-keyword").each((_, element) => {
          assert($(element).attr("title")?.trim(), `${boss.id}: ツールチップが空でない`);
          assert.equal($(element).find("abbr").length, 0, "ツールチップを入れ子にしない");
        });
        assert.doesNotMatch($(".skill-card-stats").text(), /NaN|undefined/);
        if (boss.id === "lian") {
          const weapons = $(".boss-mechanics > .glossary-item").filter((_, el) => $(el).find("dt").text() === "ハンマーで後頭部を潰すべきときは…");
          assert.equal(weapons.length, 2, "同名の武器を前後半とも掲載する");
          assert.match(weapons.eq(0).find(".boss-phase-timing").text(), /前半/);
          assert.match(weapons.eq(1).find(".boss-phase-timing").text(), /後半/);
          assert.match(weapons.eq(0).find("dt abbr").attr("title")!, /混乱区間3前進/);
          assert.doesNotMatch(weapons.eq(0).find("dt abbr").attr("title")!, /混乱区間5前進/);
          assert.match(weapons.eq(1).find("dt abbr").attr("title")!, /混乱区間5前進/);
        }
        if (boss.id === "albina-callisto") {
          const body = $(".boss-unit[aria-labelledby='unit-body-theatre']");
          assert(body.length > 0);
          assert.equal(body.find(".resist-chip").filter((_, el) => $(el).text() === "不明").length, 7, "身体観劇の貫通と6罪悪耐性は不明表示");
          assert.doesNotMatch(body.find(".boss-resistances").text(), /NaN|null/);
        }
        if (boss.id === "sancho") {
          assert.equal($(".boss-hero-info .spec-list > div").eq(3).find("dd").text(), "52", "防御だけ34低下を適用");
          assert.equal($("#skill-sancho-1 .skill-card-stats > div").eq(4).find(".staged-main").text(), "51", "攻撃は35低下を適用");
        }
        if (boss.id === "jeanne") {
          const offField = $(".boss-unit[aria-labelledby='unit-jeanne-three']");
          assert.match(offField.find(".boss-unit-info").text(), /直接攻撃の対象にならない/);
          assert.equal(offField.find(".boss-resistances").length, 0, "攻撃対象でない本体に耐性表を作らない");
          assert.doesNotMatch(offField.find(".spec-list dt").text(), /防御Lv|速度|混乱区間/);
          assert.doesNotMatch(offField.text(), /NaN|null|undefined/);
        }
        if (boss.id === "lei-heng") {
          assert.match($(".boss-unit .spec-list dt").text(), /防御Lv（平均化前）/, "動的な平均化の前の防御値と明示する");
          assert.match($("#skill-lei-heng-1 .skill-card-stats > div").eq(4).find("dt").text(), /平均化前/);
          assert.equal($("#skill-lei-heng-1 .skill-card-stats > div").eq(4).find(".staged-main").text(), "85");
          assert.equal($("#skill-lei-heng-7 .skill-card-stats > div").eq(4).find(".staged-main").text(), "不明", "元資料で不明な大技のLvを埋めない");
        }
        for (const skill of boss.skills) {
          if (skill.powerUnknown) {
            const stats = $(`[id="skill-${skill.id}"] .skill-card-stats > div`);
            assert.equal(stats.eq(0).find(".staged-main").text(), "未確定", "不整合な威力を計算結果として断定しない");
            assert.equal(stats.eq(1).find(".staged-main").text(), "未確定");
          }
          assert.equal($(`[id="skill-${skill.id}"] .fx-coin-unbreakable`).length, skill.unbreakableCoins?.length ?? 0, `${boss.id}/${skill.id}: 破壊不能コイン表示`);
          if (skill.levelUnknown) assert.match($(`[id="skill-${skill.id}"] .skill-card-stats`).text(), /不明/);
          if (skill.weight === null) assert.equal($(`[id="skill-${skill.id}"] .skill-card-stats > div`).last().find("dd").text(), "不明");
        }
      }
      if (path.startsWith("/reroll")) {
        const isLimited = path !== "/reroll";
        assert.equal($("#normal-candidates").is("[hidden]"), isLimited);
        assert.equal($("#walpurgis").is("[hidden]"), !isLimited);
        assert.equal($("[role=tab][aria-selected=true]").length, 1);
        assert.equal($(".reroll-explanation:not([hidden])").length, isLimited ? 6 : 12);
        const names = $("#normal-candidates .reroll-table tbody th").map((_, element) => $(element).text()).get();
        assert.deepEqual(names, characters.map(({ name }) => name), "おすすめ一覧が12囚人を順番に網羅している");
        assert.equal($("#normal-candidates .reroll-table tbody tr").length, 12);
        const limitedCodes = $("#walpurgis .reroll-table-persona").map((_, element) => $(element).attr("href")!.split("/").at(-1)!).get();
        assert(limitedCodes.length > 0, "期間限定のおすすめが存在する");
        assert.equal(new Set(limitedCodes).size, limitedCodes.length, "期間限定候補が重複していない");
        for (const code of limitedCodes) {
          assert(characterData.some((character) => character.statuses.some((status) => status.code === code && status.season === "W")), `${code}: ヴァルプルギスの夜の人格である`);
        }
        assert.equal($(".reroll-explanation").length, 12 + limitedCodes.length);
        assert.doesNotMatch($("body").text(), /wiki|ウィキ/i, "ページ本文に参照元の説明を表示しない");
      }
      const ids = $("[id]").map((_, element) => $(element).attr("id")!).get();
      assert.equal(new Set(ids).size, ids.length, `${path}: HTMLのIDが重複している`);
      $("a").each((_, element) => {
        const href = $(element).attr("href");
        assert(href, `${path}: リンク先が空`);
        if (/^https?:\/\//.test(href)) return;
        // HashRouterでは href="#section" はルートを壊すため、ルート込みのLinkを使う。
        assert(href.startsWith("/"), `${path}: HashRouterで使えない内部リンク ${href}`);
        assertRoute(href, path);
        const url = new URL(href, "https://limbus.test");
        if (url.pathname === new URL(path, "https://limbus.test").pathname && url.hash) {
          assert(ids.includes(decodeURIComponent(url.hash.slice(1))), `${path}: ページ内リンク先がない ${href}`);
        }
      });
      $("[aria-labelledby]").each((_, element) => {
        for (const id of $(element).attr("aria-labelledby")!.split(/\s+/)) {
          assert(ids.includes(id), `${path}: 見出しの参照先がない ${id}`);
        }
      });
    }
  } finally {
    await server.close();
  }
});

test("攻略ガイド: ファイル名・対象コード・人格リンク・参照JSONが実データと一致する", async () => {
  const guideRoot = new URL("guides/", dataRoot);
  const files = (await readdir(guideRoot, { recursive: true })).filter((file) => file.endsWith(".md"));
  assert(files.length > 0);
  for (const file of files) {
    const normalized = file.replaceAll("\\", "/");
    const markdown = await readFile(new URL(normalized, guideRoot), "utf8");
    const guide = parseGuide(markdown);
    const code = normalized.split("/").at(-1)!.slice(0, -3);
    assert.equal(guide.meta.code, code, `${file}: 対象コードとファイル名が異なる`);
    const known = normalized.startsWith("ego/") ? egoCodes : personaCodes;
    assert(known.has(code), `${file}: 対象データが存在しない`);
    for (const match of markdown.matchAll(/\]\(persona:([^)]*)\)/g)) {
      assert.match(match[1], /^\d{4}$/, `${file}: 人格コードの形式が不正`);
      assertRoute(`/persona/${match[1]}`, file);
    }
    for (const match of (guide.meta.sources ?? "").matchAll(/(?:\[|,\s*)([^,[\]]+\.json)(?=,|\])/g)) {
      const source = match[1].trim();
      await assert.doesNotReject(access(new URL(source, dataRoot)), `${file}: 参照データが存在しない ${source}`);
    }
  }
});
