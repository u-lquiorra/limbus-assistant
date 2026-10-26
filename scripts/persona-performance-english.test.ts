import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { load } from "cheerio";

test("人格・E.G.O性能欄の直接英訳: 全段階の効果・説明・コイン・数値を保持する", async () => {
  const copies = await Promise.all((await readdir("src/i18n/direct")).filter(file => /^persona-performance-.+\.json$/.test(file) || /^ego-performance-(?:01|05|06|07|09|10)(?:-.+)?\.json$/.test(file)).map(async file => JSON.parse(await readFile(`src/i18n/direct/${file}`, "utf8"))));
  const officialNames: string[] = JSON.parse(await readFile("src/data/localization/names.json", "utf8")).entries.map((entry: { en: string }) => entry.en).filter((name: string) => /[\u3040-\u30ff\u3400-\u9fff]/.test(name)).sort((a: string, b: string) => b.length - a.length);
  const hasJapanese = (source: string) => {
    for (const name of officialNames) source = source.replaceAll(name, "");
    return /[\u3040-\u30ff\u3400-\u9fff]/.test(source);
  };
  const numbers = (source: string) => (source.normalize("NFKC").match(/\d+/g) ?? []).sort();
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  try {
    const { LanguageContext, setEnglishMessages, translateText } = await server.ssrLoadModule("/src/i18n/text.ts");
    const { default: EffectText } = await server.ssrLoadModule("/src/components/EffectText.tsx");
    setEnglishMessages(JSON.parse(await readFile("src/i18n/messages.en.json", "utf8")));
    for (const copy of copies) for (const code of copy.codes) {
      const path = `src/data/${copy.kind === "ego-performance" ? "egos" : "personas"}/${code}.json`;
      const raw = await readFile(path, "utf8");
      assert.equal(createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex"), copy.sourceHashes[path], `${code}: 原文変更時は英訳も確認する`);
      const detail = JSON.parse(raw);
      for (const item of [...detail.skills, ...detail.passives, ...(detail.earlier ? [...detail.earlier.skills, ...detail.earlier.passives] : [])]) {
        const english = translateText(item.effect, "en");
        assert(!hasJapanese(english), `${code}/${item.name}: ${english}`);
        const html = renderToStaticMarkup(createElement(LanguageContext.Provider, { value: "en" }, createElement(EffectText, { text: item.effect, keywords: item.keywords, unbreakableCoins: item.unbreakableCoins })));
        const $ = load(html);
        assert(!hasJapanese($.text()), `${code}/${item.name}: 描画時の日本語混在`);
        assert.deepEqual(numbers(english), numbers(item.effect), `${code}/${item.name}: 効果の数値`);
        for (const stage of ["Ⅲ", "Ⅳ"]) {
          const stageNumbers = (source: string) => numbers([...source.matchAll(new RegExp(`〘${stage}:([^〙]*)〙`, "g"))].map(match => match[1]).join(" "));
          assert.deepEqual(stageNumbers(english), stageNumbers(item.effect), `${code}/${item.name}: 解析${stage}の数値`);
        }
        const expectedCoins = item.effect.split("\n").map((line: string) => line.match(/^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]|(?:VIII|VII|VI|IV|IX|III|II|I|V|X)(?=\s|\[))/u)?.[1]).filter(Boolean);
        assert.deepEqual($(".fx-coin").map((_, el) => $(el).text()).get(), expectedCoins);
        for (const keyword of item.keywords) {
          const description = translateText(keyword.desc, "en");
          assert(!hasJapanese(description), `${code}/${keyword.term}: ${description}`);
          if (/^(?:09|10)/.test(code)) assert.deepEqual(numbers(description), numbers(keyword.desc), `${code}/${keyword.term}: 用語説明の数値`);
        }
        for (const el of $("[aria-description]").toArray()) assert(!hasJapanese($(el).attr("aria-description")!));
        assert.equal($(".fx-coin-unbreakable").length, (item.unbreakableCoins ?? []).length);
        const japaneseHtml = renderToStaticMarkup(createElement(LanguageContext.Provider, { value: "ja" }, createElement(EffectText, { text: item.effect, keywords: item.keywords })));
        const japanese = load(japaneseHtml);
        assert.equal(japanese(".fx-line").length, item.effect.split("\n").length);
        if (item.effect !== "-") assert(/[\u3040-\u30ff\u3400-\u9fff]/.test(japanese.text()));
      }
    }
    assert.equal(translateText("persona:0101:name:連撃", "en"), "Enjamb");
    assert.equal(translateText("persona:0102:name:観察", "en"), "Acute Studies");
    assert.equal(translateText("persona:0102:name:分析", "en"), "Observational Eye");
    assert.equal(translateText("persona:0103:name:冷静", "en"), "Poised");
    assert.equal(translateText("persona:0103:name:師事", "en"), "Bestow");
    assert.equal(translateText("persona:0104:name:え辛(がら)い春風", "en"), "Pungent Spring Breeze");
    assert.equal(translateText("persona:0105:name:ギャンブラー", "en"), "Gamble");
    assert.equal(translateText("persona:0106:name:整理師範教育", "en"), "Cleanup Demonstration");
    assert.equal(translateText("persona:0107:name:急襲", "en"), "Ambush");
    assert.equal(translateText("persona:0108:name:探求没入", "en"), "Fixated Study");
    assert.equal(translateText("persona:0109:name:血点描派", "en"), "Sanguine Pointillist");
    assert.equal(translateText("persona:0111:name:然れども、その感応と同期化の程度如何によりては喰わるることもあるなり。", "en"), "Yet, the degree to which that attunement and synchronization are achieved may resultantly allow the user to be devoured");
    assert.equal(translateText("persona:0116:name:回避", "en"), "Sidestep");
    const reloads = copies.flatMap(copy => Object.entries(copy.messages)).filter(([key]) => key.startsWith("keyword-name:再装填:"));
    assert(reloads.length > 0);
    for (const [key] of reloads) assert.equal(translateText(key, "en"), "Reload");
    const bygoneDays = JSON.parse(await readFile("src/data/egos/0106.json", "utf8"));
    assert.match(translateText(bygoneDays.skills[1].effect, "en"), /Inflict 2 Sinking\. Inflict 2 Bind next turn/);
    assert.equal(translateText("persona:0501:name:連撃", "en"), "Des Coups");
    assert.equal(translateText("persona:0504:name:執念の金槌", "en"), "Obsessive Hammer");
    assert.equal(translateText("persona:0512:name:挿翅虎", "en"), "Chachihu [揷翅虎]");
  } finally {
    await server.close();
  }
});
