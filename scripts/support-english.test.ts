import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bindSupportCopy, type SupportCopy } from "./lib/support-english";
import { localizeSupportPassive } from "../src/i18n/supportPassives";
import { setEnglishMessages } from "../src/i18n/text";
import type { SupportPassive } from "../src/supportPassives";

test("サポートパッシブ全件の訳と説明を照合し、原文や条件の更新を検出する", async () => {
  const passives: SupportPassive[] = JSON.parse(await readFile("src/data/support-passives.json", "utf8"));
  const copy: SupportCopy = JSON.parse(await readFile("src/i18n/direct/support-passives.json", "utf8"));
  const compiled = JSON.parse(await readFile("src/i18n/messages.en.json", "utf8"));
  const messages = bindSupportCopy(passives, copy);
  for (const [key, value] of Object.entries(messages)) assert.equal(compiled.messages[key], value);
  setEnglishMessages(compiled);
  for (const passive of passives) {
    const english = localizeSupportPassive(passive, "en");
    assert.equal(localizeSupportPassive(passive, "ja"), passive, "日本語は原文を使う");
    assert.deepEqual(english.cost, passive.cost);
    assert.equal(english.condition, passive.condition);
    assert.equal(english.name, copy.entries[passive.code].name);
    assert.equal(english.effect, copy.entries[passive.code].effect);
    assert.equal(english.keywords.length, passive.keywords.length);
    for (const keyword of english.keywords) assert(copy.keywords.some(entry => entry.term === keyword.term && entry.desc === keyword.desc));
  }
  const changed = structuredClone(passives);
  changed[0].cost[0].count++;
  assert.throws(() => bindSupportCopy(changed, copy), /原文が更新/);
  const tooltipChanged = structuredClone(passives);
  tooltipChanged[0].keywords.push({ term: "追加", desc: "新しい説明" });
  assert.throws(() => bindSupportCopy(tooltipChanged, copy), /原文が更新/);
  assert.throws(() => bindSupportCopy(passives, { ...copy, entries: {} }), /件数/);
  assert.notEqual(copy.entries["0103"].name, copy.entries["0415"].name, "師事の同名パッシブは別の正式訳名を使う");
  assert.match(copy.entries["0108"].effect, /3\/5 × discarded skill rank/);
  assert.match(copy.entries["0108"].effect, /1\/2 times per turn/);
  assert.match(copy.entries["1013"].effect, /rounded up; once per encounter; max 5/);
});
