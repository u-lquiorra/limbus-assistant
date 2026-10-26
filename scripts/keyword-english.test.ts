import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bindKeywordCopy, keywordCopySources } from "./lib/keyword-english";

test("キーワード一覧の直接英訳は現在の原文と一致し、統合辞書へ反映される", async () => {
  const sources = await keywordCopySources();
  const source = JSON.parse(await readFile("src/i18n/direct/keyword-copy.json", "utf8"));
  const messages = bindKeywordCopy(sources, source.entries);
  const compiled = JSON.parse(await readFile("src/i18n/messages.en.json", "utf8"));
  for (const [ja, en] of Object.entries(messages)) assert.equal(compiled.messages[ja], en);
  const key = Object.keys(source.entries)[0];
  assert.throws(() => bindKeywordCopy({ ...sources, [key]: `${sources[key]} 原文更新` }, source.entries), /原文が更新/);
});
