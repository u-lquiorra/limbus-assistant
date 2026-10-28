import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { load } from "cheerio";
import { readFile, readdir } from "node:fs/promises";
import { blockSegments, parseGuide, parseInline } from "./guide.ts";
import { isEnglish, languagePath, originalPath } from "./i18n/path.ts";
import { setEnglishMessages, translateText } from "./i18n/text.ts";

test("言語パス: 日英を往復し、クエリ・節・外部URLを保つ", () => {
  assert(isEnglish("/en"));
  assert(isEnglish("/en/persona/0101/"));
  assert(!isEnglish("/enemy"));
  assert.equal(originalPath("/en/"), "/");
  assert.equal(languagePath("/persona/0101?x=2#skills", "en"), "/en/persona/0101?x=2#skills");
  assert.equal(languagePath("/en/persona/0101?x=2#skills", "ja"), "/persona/0101?x=2#skills");
  assert.equal(languagePath("/en/teams", "en"), "/en/teams");
  for (const url of ["https://example.com/a", "//example.com/a", "#skills", "?q=1"]) assert.equal(languagePath(url, "en"), url);
});

test("英訳: 日本語を保持し、動的な件数だけを安全に差し替える", () => {
  setEnglishMessages({ messages: { "10件見つかった。": "Found 10 results." }, names: { "イサン": "Yi Sang" } });
  assert.equal(translateText("イサン", "ja"), "イサン");
  assert.equal(translateText("イサン", "en"), "Yi Sang");
  assert.equal(translateText("23件見つかった。", "en"), "Found 23 results.");
  assert.equal(translateText("「<script>」に一致するページは見つからない。", "en"), "No pages match “<script>”.");
});

test("英語SSR: 固有名詞・リンク・canonical・構造化データが英語ページに対応する", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  try {
    const { render, pageMeta, canonicalUrl, structuredDataTags } = await server.ssrLoadModule("/src/entry-server.tsx");
    const english = await render("/en/persona/0101");
    assert(english.includes("LCB Sinner"));
    assert(english.includes("Yi Sang"));
    assert(english.includes("A straightforward Identity that wears down enemy SP with Sinking."), "攻略本文も段落単位で英訳する");
    assert(english.includes('href="/en/"'));
    assert(english.includes('href="/persona/0101/"'), "言語切替が同じページの日本語版を指す");
    assert(!english.includes('href="/teams/"'), "通常のページ間リンクで日本語版へ戻らない");
    assert.equal(canonicalUrl("/en/persona/0101"), "https://limbus-assistant.com/en/persona/0101/");
    assert(pageMeta("/en/persona/0101").title.includes("LCB Sinner"));
    const structured = structuredDataTags("/en/persona/0101", "https://limbus-assistant.com/og-image.png");
    assert(structured.includes('"inLanguage":"en"'));
    assert(!structured.includes("/en/og-image.png"));
    const japanese = await render("/persona/0101");
    assert(japanese.includes("LCB囚人"));
    assert(japanese.includes('href="/en/persona/0101/"'));
    const { searchEntries } = await server.ssrLoadModule("/src/search.ts");
    const { siteSearchEntries } = await server.ssrLoadModule("/src/siteSearch.ts");
    const results = searchEntries(siteSearchEntries(), "Yi Sang");
    const { getCharacter } = await server.ssrLoadModule("/src/data/loader.ts");
    const yiSang = getCharacter("イサン");
    const links = new Set(results.flatMap((group: { hits: { entry: { to: string } }[] }) => group.hits.map((hit) => hit.entry.to)));
    for (const persona of yiSang.statuses) assert(links.has(`/persona/${persona.code}`), persona.code);
    for (const ego of yiSang.egos) assert(links.has(`/ego/${ego.code}`), ego.code);
    const ryoshu = searchEntries(siteSearchEntries(), "Ryoshu");
    assert(ryoshu.some((group: { kind: string }) => group.kind === "sinner"));
    for (const file of (await readdir("src/i18n/direct")).filter((file) => /^(persona|ego)-\d{4}\.json$/.test(file))) {
      const direct = JSON.parse(await readFile(`src/i18n/direct/${file}`, "utf8"));
      const kind = file.startsWith("ego-") ? "ego" : "persona";
      const $ = load(await render(`/en/${kind}/${direct.code}`));
      const renderedGuide = $(".guide").text();
      const guide = parseGuide(await readFile(direct.sourceGuide, "utf8"));
      for (const section of guide.sections) for (const block of section.blocks) {
        for (const segments of blockSegments(block)) {
          const source = segments.map((segment) => segment.text).join("");
          const english = parseInline(direct.messages[source]).map((segment) => segment.text).join("");
          assert(renderedGuide.includes(english), `${file}: 英訳した段落が描画されていない: ${english}`);
        }
      }
    }
    const spicebush = load(await render("/en/persona/0104"));
    const derivedLink = spicebush('.guide a[href="/en/ego/0108/"]');
    assert(derivedLink.text().includes("Great Trichiliocosm"), "再利用したE.G.O相性文も正式英語名とリンクを保つ");
    const compiled = JSON.parse(await readFile("src/i18n/messages.en.json", "utf8"));
    const supportCopy = JSON.parse(await readFile("src/i18n/direct/support-passives.json", "utf8"));
    const officialNames: { en: string }[] = JSON.parse(await readFile("src/data/localization/names.json", "utf8")).entries;
    const allowed = [...new Set([...Object.values(compiled.names) as string[], ...officialNames.map(entry => entry.en), ...Object.values(supportCopy.entries as Record<string, { name: string }>).map(entry => entry.name)])].filter((name) => /[\u3040-\u30ff\u3400-\u9fff]/.test(name)).sort((a, b) => b.length - a.length);
    const assertEnglish = (text: string, label: string) => {
      for (const name of allowed) text = text.replaceAll(name, "");
      assert(!/[\u3040-\u30ff\u3400-\u9fff]/.test(text), `${label}: 未訳が残る: ${text}`);
      assert(!text.includes("????"), `${label}: 文字化けが残る`);
    };
    const { glossaryTerms, filterGlossary } = await server.ssrLoadModule("/src/glossary.ts");
    const { characterList } = await server.ssrLoadModule("/src/data/loader.ts");
    const { TRAIT_FILTERS } = await server.ssrLoadModule("/src/traitFilters.ts");
    const { KEYWORD_PAGES } = await server.ssrLoadModule("/src/keywordPages.ts");
    const translatedTeams = (await Promise.all((await readdir("src/i18n/direct")).filter(file => /^team-.+\.json$/.test(file)).map(async file => JSON.parse(await readFile(`src/i18n/direct/${file}`, "utf8"))))).filter(source => source.kind === "team-copy");
    const translatedBosses = (await Promise.all((await readdir("src/i18n/direct")).filter(file => /^boss-.+\.json$/.test(file)).map(async file => JSON.parse(await readFile(`src/i18n/direct/${file}`, "utf8"))))).filter(source => source.kind === "boss-copy");
    const navigation = ["/en", "/en/teams", "/en/beginner", "/en/reroll", "/en/bosses", "/en/glossary", "/en/search", "/en/about", "/en/focused-battle",
      "/en/egos", "/en/keywords", "/en/support-passives",
      ...["wrath", "lust", "sloth", "gluttony", "gloom", "pride", "envy", "wrath,pride", "wrath,lust,sloth,gluttony,gloom,pride,envy"].map(sin => `/en/support-passives?sin=${sin}`),
      ...KEYWORD_PAGES.map((page: { id: string }) => `/en/keywords/${page.id}`),
      ...translatedTeams.map(source => `/en/teams/${source.id}`),
      ...translatedBosses.map(source => `/en/bosses/${source.id}`),
      ...characterList.map((character: { name: string }) => languagePath(`/character/${encodeURIComponent(character.name)}`, "en")),
      ...TRAIT_FILTERS.map((trait: string) => `/en/keywords?trait=${encodeURIComponent(trait)}`),
      "/en/keywords?kw=burn,bleed", "/en/keywords?kw=burn,bleed,tremor,rupture,sinking,breath,charge",
      ...["wrath", "lust", "sloth", "gluttony", "gloom", "pride", "envy", "wrath,pride", "wrath,lust,sloth,gluttony,gloom,pride,envy"].map(sin => `/en/egos?sin=${sin}`),
      ...glossaryTerms.map((term: { id: string }) => `/en/glossary/${term.id}`),
      "/en/glossary?page=2", "/en/glossary?q=Clash", "/en/glossary?q=zzzzmissing", "/en/search?q=Clash", "/en/search?q=zzzzmissing"];
    for (const path of navigation) {
      const $ = load(await render(path));
      $("script,style,.language-switch").remove();
      assertEnglish($.text(), path);
      if (["/en/bosses/camille", "/en/bosses/white-moon-knight"].includes(path)) {
        assert.match($(".spec-list").first().text(), /1 Sinner(?!s)/, "1名固定戦の人数は単数形にする");
        assert.match($(".boss-section-intro").text(), /Deployment limit: 1 Sinner\./);
        assert(!$.text().includes("1 Sinners"));
      }
      $("*").each((_, node) => {
        for (const attr of ["alt", "title", "aria-label", "placeholder", "data-label", ...(path.includes("/support-passives") || path.includes("/bosses/") ? ["aria-description"] : [])]) assertEnglish($(node).attr(attr) ?? "", `${path}: ${attr}`);
      });
      const pathname = new URL(path, "https://limbus-assistant.com").pathname;
      const meta = pageMeta(pathname);
      assertEnglish(meta.title + meta.description, `${path}: metadata`);
      if (pathname.includes("/glossary")) assertEnglish(structuredDataTags(pathname, "https://limbus-assistant.com/og-image.png"), `${path}: structured data`);
    }
    assert(filterGlossary("Clash").some((term: { id: string }) => term.id === "match"));
    assert(filterGlossary("Heads Chance").some((term: { id: string }) => term.id === "sanity"), "英語の関連検索語でも用語を探せる");
    const selectedEgos = load(await render("/en/egos?sin=wrath,pride"));
    assert.match(selectedEgos(".ego-filter-summary").text(), /^E\.G\.O using only Wrath, Pride resources: \d+ results$/);
    const selectedSupport = load(await render("/en/support-passives?sin=wrath,pride"));
    assert.match(selectedSupport(".ego-filter-summary").text(), /^Support Passives activated using only Wrath, Pride resources: \d+ results$/);
    const selectedKeywords = load(await render("/en/keywords?kw=burn,bleed"));
    assert.match(selectedKeywords(".keyword-filter-summary").text(), /^Identities matching all of Burn, Bleed: \d+$/);
    const japaneseKeywords = load(await render("/keywords?kw=burn,bleed"));
    assert.match(japaneseKeywords(".keyword-filter-summary").text(), /^火傷＋出血を全て満たす人格：\d+人格$/);
    const { getEgo } = await server.ssrLoadModule("/src/data/loader.ts");
    const hollowName = compiled.names[getEgo("0211").ego.name];
    assert(hollowName, "穴の正式英語名がある");
    const hollowTeam = load(await render("/en/teams/hole"));
    assert(hollowTeam("h1").text().includes(hollowName), "穴周回はE.G.O名を使い、採光周回と混同しない");
    const teamList = load(await render("/en/teams"));
    assert(teamList('a[href="/en/teams/hole/"]').text().includes(hollowName), "一覧と詳細で同じE.G.O名を使う");
  } finally { await server.close(); }
});

test("英語攻略リンク: 正式名の角括弧をリンク名の一部として保つ", () => {
  assert.deepEqual(parseInline("**[Great Trichiliocosm [三千大世界]](ego:0108)**"), [
    { text: "Great Trichiliocosm [三千大世界]", strong: true, ego: "0108" },
  ]);
});

test("開発版の本文もアプリと同じ翻訳Context・辞書を参照する", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  try {
    // SSRだけでは、依存関係の事前バンドルによるContext・辞書の複製を検出できない。
    const page = await server.transformRequest("/src/pages/TeamsPage.tsx");
    assert(page);
    assert.match(page.code, /from "\/src\/i18n\/jsx-dev-runtime\.ts"/);
    const development = await server.transformRequest("/src/i18n/jsx-dev-runtime.ts");
    assert(development);
    assert.match(development.code, /from "\/src\/i18n\/jsx-runtime\.ts"/);
    for (const path of ["/src/App.tsx", "/src/preload.ts", "/src/i18n/jsx-runtime.ts"]) {
      const module = await server.transformRequest(path);
      assert(module);
      assert.match(module.code, /from "\/src\/i18n\/text\.ts"/, path);
    }
  } finally { await server.close(); }
});

test("直接英訳: 原文の全段落と人格・E.G.Oへのリンクを保つ", async () => {
  const compiled = JSON.parse(await readFile("src/i18n/messages.en.json", "utf8"));
  for (const file of (await readdir("src/i18n/direct")).filter((file) => /^(persona|ego)-\d{4}\.json$/.test(file))) {
    const direct = JSON.parse(await readFile(`src/i18n/direct/${file}`, "utf8"));
    const guide = parseGuide(await readFile(direct.sourceGuide, "utf8"));
    for (const section of guide.sections) for (const block of section.blocks) {
      for (const segments of blockSegments(block)) {
        const source = segments.map((segment) => segment.text).join("");
        const translated = direct.messages[source];
        assert(translated, `${file}: 原文の更新に対応する英訳が無い: ${source}`);
        assert.equal(compiled.messages[source], translated, "直接英訳を下訳より優先する");
        const links = (items: typeof segments) => items.filter((s) => s.persona || s.ego).map((s) => `${s.persona ? "persona" : "ego"}:${s.persona ?? s.ego}`).sort();
        assert.deepEqual(links(parseInline(translated)), links(segments), "翻訳後も相性先へのリンクを保つ");
      }
    }
  }
});
