import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { bindGlossaryTranslation, glossaryTextFields, type EnglishGlossaryTerm } from "./lib/glossary-english";
import type { GlossaryTerm } from "../src/glossary";

test("辞典の英訳: 全項目の本文・補足・図解と関連検索語が揃う", async () => {
  const terms: GlossaryTerm[] = (await Promise.all(["glossary", "glossary-systems"].map(async (file) => JSON.parse(await readFile(`src/data/${file}.json`, "utf8")).terms))).flat();
  const translations = new Map<string, EnglishGlossaryTerm>();
  for (const file of await readdir("src/i18n/direct")) {
    const data = JSON.parse(await readFile(`src/i18n/direct/${file}`, "utf8"));
    if (data.kind !== "glossary-terms") continue;
    for (const [id, english] of Object.entries(data.terms)) {
      assert(!translations.has(id), `用語英訳の重複: ${id}`);
      translations.set(id, english as EnglishGlossaryTerm);
    }
  }
  assert.deepEqual([...translations.keys()].sort(), terms.map((term) => term.id).sort());
  const compiled = JSON.parse(await readFile("src/i18n/messages.en.json", "utf8"));
  for (const term of terms) {
    const english = translations.get(term.id)!;
    const messages = bindGlossaryTranslation(term, english);
    for (const [source, translated] of Object.entries(messages)) assert.equal(compiled.messages[source], translated, `${term.id}: ${source}`);
    assert(!/[\u3040-\u30ff\u3400-\u9fff]/.test(english.text.join(" ") + english.aliases.join(" ")), `${term.id}: 英訳に日本語が残る`);
    assert(!glossaryTextFields(term).join(" ").includes("????"), `${term.id}: 原文が文字化けしている`);
  }
});
