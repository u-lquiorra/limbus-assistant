import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { languagePath, originalPath, sinnerNameFromSlug } from "./path.ts";

const yiSang = `/character/${encodeURIComponent("イサン")}`;

test("英語版の囚人ページは英語のスラッグにし、日本語版の URL は変えない", () => {
  assert.equal(languagePath(yiSang, "en"), "/en/character/yi-sang");
  assert.equal(languagePath(`${yiSang}/`, "en"), "/en/character/yi-sang/");
  assert.equal(languagePath(`${yiSang}?q=1#top`, "en"), "/en/character/yi-sang?q=1#top");
  // エンコードしていない日本語名からも変換できる
  assert.equal(languagePath("/character/良秀", "en"), "/en/character/ryoshu");
  assert.equal(languagePath(yiSang, "ja"), yiSang);
});

test("英語版の囚人ページから日本語版へ戻せる", () => {
  assert.equal(originalPath("/en/character/yi-sang"), yiSang);
  assert.equal(languagePath("/en/character/yi-sang/", "ja"), `${yiSang}/`);
  assert.equal(languagePath("/en/character/yi-sang", "en"), "/en/character/yi-sang");
  assert.equal(sinnerNameFromSlug("hong-lu"), "ホンル");
  // スラッグでない値と日本語名はそのまま返す
  assert.equal(sinnerNameFromSlug("イサン"), "イサン");
  assert.equal(sinnerNameFromSlug("unknown"), "unknown");
});

test("囚人ページ以外のパスは英語版でも同じ形のまま", () => {
  assert.equal(languagePath("/persona/0101", "en"), "/en/persona/0101");
  assert.equal(languagePath("/", "en"), "/en/");
  assert.equal(originalPath("/en/persona/0101"), "/persona/0101");
  assert.equal(originalPath("/en"), "/");
  // 不正なエンコードでも例外にしない
  assert.equal(languagePath("/character/%E3%82", "en"), "/en/character/%E3%82");
});

test("全囚人に英語のスラッグがあり、重複しない", async () => {
  const names = (await readdir("src/data")).filter((file) => /^[^\x00-\x7f].*\.json$/.test(file)).map((file) => file.replace(/\.json$/, ""));
  assert.equal(names.length, 12);
  const slugs = names.map((name) => languagePath(`/character/${encodeURIComponent(name)}`, "en").split("/").at(-1));
  for (const slug of slugs) assert.match(slug ?? "", /^[a-z]+(?:-[a-z]+)*$/, `英数字のスラッグになっていない: ${slug}`);
  assert.equal(new Set(slugs).size, names.length);
  for (const name of names) assert.equal(sinnerNameFromSlug(languagePath(`/character/${name}`, "en").split("/").at(-1) ?? ""), name);
});
