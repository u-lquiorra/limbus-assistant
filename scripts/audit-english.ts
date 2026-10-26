// 公開ページの英語描画をローカルで照合する。ネットワーク送信は行わない。
import { createServer } from "vite";
import { load } from "cheerio";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const data = JSON.parse(await readFile("src/i18n/messages.en.json", "utf8"));
const supportCopy = JSON.parse(await readFile("src/i18n/direct/support-passives.json", "utf8"));
const officialNames: { en: string }[] = JSON.parse(await readFile("src/data/localization/names.json", "utf8")).entries;
const navigationOnly = process.argv.includes("--navigation");
const catalogsOnly = process.argv.includes("--catalogs");
const teamsOnly = process.argv.includes("--teams");
const supportOnly = process.argv.includes("--support");
const bossesOnly = process.argv.includes("--bosses");
const bossPaths = new Set((await Promise.all((await readdir("src/i18n/direct")).filter(file => /^boss-.+\.json$/.test(file)).map(async file => JSON.parse(await readFile(`src/i18n/direct/${file}`, "utf8"))))).filter(source => source.kind === "boss-copy").map(source => `/en/bosses/${source.id}`));
const teamPaths = new Set((await Promise.all((await readdir("src/i18n/direct")).filter(file => /^team-.+\.json$/.test(file)).map(async file => JSON.parse(await readFile(`src/i18n/direct/${file}`, "utf8"))))).filter(source => source.kind === "team-copy").map(source => `/en/teams/${source.id}`));
// 公式英語名の一部は漢字を含む（Bright【光】など）。言語切替の日本語表記も対象外。
const allowed = [...new Set<string>([...Object.values(data.names) as string[], ...officialNames.map(entry => entry.en), ...Object.values(supportCopy.entries as Record<string, { name: string }>).map(entry => entry.name), "日本語"])]
  .filter((text) => /[\u3040-\u30ff\u3400-\u9fff]/.test(text)).sort((a, b) => b.length - a.length);
const japanese = (text: string) => {
  for (const name of allowed) text = text.replaceAll(name, "");
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
};
const pages: Record<string, { untranslated: string[]; remainingRenderedText: string[] }> = {};
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { render, prerenderRoutes, pageMeta } = await server.ssrLoadModule("/src/entry-server.tsx");
  const { setTranslationCollector, translateText } = await server.ssrLoadModule("/src/i18n/text.ts");
  const routes: string[] = prerenderRoutes().filter((path: string) => /^\/en(?:\/|$)/.test(path)
    && (!navigationOnly || /^\/en(?:\/(?:teams|beginner|reroll|bosses|search|about|focused-battle|glossary(?:\/[^/]+)?))?$/.test(path))
    && (!catalogsOnly || /^\/en\/(?:egos|keywords(?:\/[^/]+)?|character\/[^/]+)$/.test(path))
    && (!teamsOnly || teamPaths.has(path))
    && (!supportOnly || path === "/en/support-passives")
    && (!bossesOnly || bossPaths.has(path)));
  if (supportOnly) routes.push(...["wrath", "lust", "sloth", "gluttony", "gloom", "pride", "envy", "wrath,pride", "wrath,lust,sloth,gluttony,gloom,pride,envy"].map(sin => `/en/support-passives?sin=${sin}`));
  if (navigationOnly) routes.push("/en/glossary?page=2", "/en/glossary?q=Clash", "/en/glossary?q=zzzzmissing", "/en/search?q=Clash", "/en/search?q=zzzzmissing");
  if (catalogsOnly) {
    const { TRAIT_FILTERS } = await server.ssrLoadModule("/src/traitFilters.ts");
    routes.push(...["wrath", "lust", "sloth", "gluttony", "gloom", "pride", "envy", "wrath,pride", "wrath,lust,sloth,gluttony,gloom,pride,envy"].map(sin => `/en/egos?sin=${sin}`));
    routes.push(...["burn", "bleed", "tremor", "rupture", "sinking", "breath", "charge", "burn,bleed", "burn,bleed,tremor,rupture,sinking,breath,charge"].map(kw => `/en/keywords?kw=${kw}`));
    routes.push(...TRAIT_FILTERS.map((trait: string) => `/en/keywords?trait=${encodeURIComponent(trait)}`));
  }
  for (const [index, path] of routes.entries()) {
    const sources = new Set<string>();
    setTranslationCollector((text: string) => sources.add(text));
    const html = await render(path);
    const meta = pageMeta(new URL(path, "https://limbus-assistant.com").pathname);
    setTranslationCollector(undefined);
    const $ = load(html);
    $("script,style").remove();
    const remaining = new Set<string>();
    $("*").each((_, element) => {
      for (const child of "children" in element ? element.children : []) {
        if (child.type === "text" && japanese(child.data)) remaining.add(child.data);
      }
      for (const attr of ["alt", "title", "aria-label", "placeholder", "data-label", ...(supportOnly || bossesOnly ? ["aria-description"] : [])]) {
        const value = $(element).attr(attr);
        if (value && japanese(value)) remaining.add(value);
      }
    });
    for (const value of Object.values(meta)) if (typeof value === "string" && japanese(value)) remaining.add(value);
    pages[path] = {
      untranslated: [...sources].filter((source) => japanese(translateText(source, "en"))).sort(),
      remainingRenderedText: [...remaining].sort(),
    };
    if (index % 50 === 0) console.log(`英語描画の照合: ${index}/${routes.length}`);
  }
  const summary = {
    pagesChecked: routes.length,
    pagesWithoutDetectedJapanese: Object.values(pages).filter((page) => !page.remainingRenderedText.length).length,
    ...(navigationOnly || catalogsOnly || teamsOnly || supportOnly || bossesOnly
      ? { remainingRenderedStrings: new Set(Object.values(pages).flatMap((page) => page.remainingRenderedText)).size }
      : { uniqueUntranslatedStrings: new Set(Object.values(pages).flatMap((page) => page.untranslated)).size }),
    note: "初期描画とメタデータの日本語残存を検出した値。動的なタブや翻訳精度の確認を代替せず、全ページ翻訳完了を意味しない。",
  };
  await mkdir(".cache/english", { recursive: true });
  await writeFile(`.cache/english/${bossesOnly ? "boss-audit" : supportOnly ? "support-audit" : teamsOnly ? "team-audit" : catalogsOnly ? "catalog-audit" : navigationOnly ? "navigation-audit" : "untranslated-direct"}.json`, JSON.stringify({ summary, pages }, null, 2) + "\n");
  await writeFile(`src/i18n/${bossesOnly ? "boss-progress" : supportOnly ? "support-progress" : teamsOnly ? "team-progress" : catalogsOnly ? "catalog-progress" : navigationOnly ? "navigation-progress" : "progress"}.en.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(summary);
  if (process.argv.includes("--check") && Object.values(pages).some((page) => page.remainingRenderedText.length)) process.exitCode = 1;
} finally { await server.close(); }
