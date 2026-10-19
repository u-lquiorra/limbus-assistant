import { test } from "node:test";
import assert from "node:assert/strict";
import coreData from "./data/glossary.json";
import systemData from "./data/glossary-systems.json";
import {
  filterGlossary, getGlossaryTerm, glossaryTermForName, glossarySectionRedirect,
  glossaryTerms, glossarySources, GLOSSARY_CATEGORIES,
} from "./glossary.ts";

test("辞典データ: 固定ID・関連用語・出典が有効で、必須の説明が揃う", () => {
  const ids = glossaryTerms.map((term) => term.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const term of glossaryTerms) {
    assert.match(term.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert(Object.hasOwn(GLOSSARY_CATEGORIES, term.category));
    assert(term.name && term.reading && term.summary);
    assert(term.explanation.length && term.explanation.every(Boolean));
    assert(term.example.title && term.example.steps.length && term.example.note);
    assert(term.cautions.length && term.cautions.every(Boolean));
    assert.match(term.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert(term.related.length && term.related.every((id) => id !== term.id && getGlossaryTerm(id)));
    assert(term.sources.length);
    for (const sourceId of term.sources) {
      const source = glossarySources[sourceId];
      assert(source?.title);
      assert.equal(new URL(source.url).protocol, "https:");
    }
  }
});

test("辞典の参照: 節IDとリンク用の正式名が衝突せず、出典の結合で上書きしない", () => {
  const ids = new Set(glossaryTerms.map((term) => term.id));
  const names = new Map<string, string>();
  for (const term of glossaryTerms) {
    for (const section of term.sections ?? []) {
      assert.match(section.id, /^[a-z]+(?:-[a-z]+)*$/);
      assert(!ids.has(section.id), `用語・節IDが重複: ${section.id}`);
      ids.add(section.id);
      assert.equal(glossarySectionRedirect(section.id), `/glossary/${term.id}#${section.id}`);
    }
    const linkNames = [term.name, ...term.linkNames ?? [], ...(term.sections ?? []).map((section) => section.name)];
    for (const name of linkNames) {
      assert(name.trim(), `${term.id}: 空のリンク名`);
      assert(!names.has(name) || names.get(name) === term.id, `リンク名が複数の用語に一致: ${name}`);
      names.set(name, term.id);
      assert.equal(glossaryTermForName(name)?.id, term.id);
    }
    assert.equal(new Date(`${term.checkedAt}T00:00:00Z`).toISOString().slice(0, 10), term.checkedAt);
  }
  for (const id of Object.keys(coreData.sources)) {
    assert(!Object.hasOwn(systemData.sources, id), `出典IDが重複: ${id}`);
  }
});

test("辞典検索: 名前・読み・別名と、全角英字・カタカナ読みを扱う", () => {
  assert(filterGlossary("まっち").some((term) => term.id === "match"));
  assert.deepEqual(filterGlossary("セイシンリョク").map((term) => term.id), ["sanity"]);
  assert.deepEqual(filterGlossary(" ＳＰ ").map((term) => term.id), ["sanity"]);
  assert(filterGlossary("衝突").some((term) => term.id === "match"));
  assert.equal(filterGlossary("   ").length, glossaryTerms.length);
  assert.deepEqual(filterGlossary("存在しない語"), []);
});

test("辞典検索: 複数語とカテゴリを同時に適用する", () => {
  assert.deepEqual(filterGlossary("斬撃 貫通", "attributes").map((term) => term.id), ["attack-type"]);
  assert.deepEqual(filterGlossary("SP", "attributes"), []);
  assert(filterGlossary("", "status").every((term) => term.category === "status"));
});

test("光の苗木: 5能力は親ページの節に集約し、検索・共通リンク・旧URLを維持する", () => {
  const parent = getGlossaryTerm("sapling");
  assert(parent);
  const sections = parent.sections ?? [];
  assert.deepEqual(sections.map((section) => section.id), ["pigritia", "superbia", "morositas", "ira", "luxuria"]);
  for (const section of sections) {
    assert.equal(getGlossaryTerm(section.id), undefined);
    assert.equal(glossarySectionRedirect(section.id), `/glossary/sapling#${section.id}`);
    assert.equal(glossaryTermForName(section.name)?.id, "sapling");
    for (const query of [section.name, section.reading]) {
      assert.deepEqual(filterGlossary(query).map((term) => term.id), ["sapling"]);
    }
    assert(section.summary && section.explanation.length && section.cautions.length);
    assert(section.example.title && section.example.steps.length && section.example.note);
  }
  assert.deepEqual(filterGlossary("", "sapling").map((term) => term.id), ["sapling"]);
  assert.equal(glossarySectionRedirect("unknown"), undefined);
  assert.equal(glossarySectionRedirect("toString"), undefined);
});

test("人格の用語リンク: 固有語を部分一致で誤リンクしない", () => {
  assert.equal(glossaryTermForName("精神力")?.id, "sanity");
  assert.equal(glossaryTermForName("混乱区間")?.id, "stagger");
  assert.equal(glossaryTermForName("特殊な混乱区間"), undefined);
  assert.equal(glossaryTermForName("火傷")?.id, "burn");
  assert.equal(glossaryTermForName("特殊火傷"), undefined);
  assert.equal(glossaryTermForName("憤怒"), undefined);
  assert.equal(glossaryTermForName("クリティカル"), undefined);
  assert(filterGlossary("憤怒").some((term) => term.id === "sin"));
  assert.equal(glossaryTermForName("脆弱"), undefined);
  assert.equal(getGlossaryTerm("unknown"), undefined);
  assert.equal(getGlossaryTerm("toString"), undefined);
});

test("辞典の図: 計算・比較・回数表示に必要な数値が有効", () => {
  const expectedCounts: Record<string, number> = {
    "coin-branch": 2, "power-comparison": 3, match: 2,
    "resistance-comparison": 3, "potency-count": 2, "two-attributes": 0, "condition-branch": 0, chance: 2,
    "target-redirect": 3, "slot-growth": 2, "defense-offset": 0, "effect-timeline": 0,
    "skill-choice": 0, "part-damage": 0,
  };
  for (const term of glossaryTerms.flatMap((term) => [term, ...term.sections ?? []])) {
    const diagram = term.example.diagram;
    if (!diagram) continue;
    assert(Object.hasOwn(expectedCounts, diagram.type));
    assert.equal(diagram.values.length, expectedCounts[diagram.type]);
    assert(diagram.values.every((value) => Number.isFinite(value) && value > 0));
    if (diagram.type === "power-comparison") {
      const [base, power, count] = diagram.values;
      assert(Number.isInteger(count) && count <= 12);
      assert.equal(base + power * count, 10);
    }
    if (diagram.type === "match") assert(diagram.values[0] > diagram.values[1]);
    if (diagram.type === "resistance-comparison") assert.deepEqual(diagram.values, [0.5, 1, 2]);
    if (diagram.type === "potency-count") assert(Number.isInteger(diagram.values[1]) && diagram.values[1] <= 12);
    if (diagram.type === "two-attributes" || diagram.type === "condition-branch") assert.equal(term.example.steps.length, 3);
    if (diagram.type === "potency-count" && diagram.labels) assert.equal(diagram.labels.length, 3);
    if (diagram.type === "chance") assert(diagram.values[0] * diagram.values[1] <= 100);
    if (diagram.type === "target-redirect") {
      const [enemy, original, helper] = diagram.values;
      assert(helper > enemy && enemy > original);
    }
    if (diagram.type === "slot-growth") assert.deepEqual(diagram.values, [5, 3]);
  }
});
