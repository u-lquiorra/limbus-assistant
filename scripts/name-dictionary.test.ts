import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

interface Entry { key: string; category: string; gameId: string; ja: string; en: string; sourceFile: string; level?: number }
const names = JSON.parse(readFileSync("src/data/localization/names.json", "utf8"));
const entries: Entry[] = names.entries;
const coverage = JSON.parse(readFileSync("src/data/localization/coverage.json", "utf8"));

test("対訳辞書はゲーム内IDと取得元を持ち、同じキーが重複しない", () => {
  assert.equal(names.schemaVersion, 1);
  for (const revision of Object.values(names.provenance.revisions)) assert.match(String(revision), /^[a-f0-9]{40}$/);
  assert.equal(new Set(entries.map((e) => e.key)).size, entries.length);
  for (const entry of entries) {
    assert(entry.ja.trim() && entry.en.trim() && entry.gameId);
    assert.equal(entry.key, `${entry.sourceFile}:${entry.gameId}${entry.level === undefined ? "" : `:${entry.level}`}`);
    assert(!("desc" in entry), "説明文を辞書へ転載しない");
  }
});

test("囚人と人格・E.G.Oは名前が同じでも別IDで参照できる", () => {
  const find = (category: string, gameId: string) => entries.find((e) => e.category === category && e.gameId === gameId);
  assert.equal(find("character", "1")?.en, "Yi Sang");
  assert.equal(find("persona", "10101")?.en, "LCB Sinner");
  assert.equal(find("persona", "10201")?.en, "LCB Sinner");
  assert.equal(find("ego", "20101")?.ja, "烏瞰刀");
  for (const [ja, en] of [["火傷", "Burn"], ["破裂", "Rupture"], ["沈潜", "Sinking"], ["呼吸", "Poise"]]) {
    assert(entries.some((e) => e.category === "status" && e.ja === ja && e.en === en), ja);
  }
});

test("サイト対応表の未解決・曖昧な名前を確定扱いしない", () => {
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const ids = new Set<string>();
  for (const ref of coverage.references) {
    const id = `${ref.kind}:${ref.id}`;
    assert(!ids.has(id), id);
    ids.add(id);
    const matches = ref.matches.map((key: string) => {
      const entry = byKey.get(key);
      assert(entry, key);
      return entry;
    });
    const translations = new Set(matches.map((e: Entry) => e.en));
    assert.equal(ref.status, matches.length === 0 ? "unresolved" : translations.size > 1 ? "ambiguous" : "matched");
    if (ref.kind === "persona" || ref.kind === "ego") {
      for (const entry of matches) assert.equal(entry.gameId, `${ref.kind === "persona" ? "1" : "2"}${ref.id}`);
    }
  }
});
