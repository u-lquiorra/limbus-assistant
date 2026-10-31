// ローカルの直接英訳と用語修正を統合する。外部サービスへは接続しない。
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { rerollCandidates, walpurgisCandidates } from "../src/data/reroll";
import { blockSegments, guideSummary, parseGuide, parseInline, type InlineSegment } from "../src/guide";
import { bindGlossaryTranslation, type EnglishGlossaryTerm } from "./lib/glossary-english";
import type { GlossaryTerm } from "../src/glossary";
import { bindKeywordCopy, keywordCopySources } from "./lib/keyword-english";
import { KEYWORD_PAGES } from "../src/keywordPages";
import { bindTeamCopy, teamCopySources } from "./lib/team-english";
import { bindSupportCopy } from "./lib/support-english";
import { bindBossCopy } from "./lib/boss-english";

const target = "src/i18n/messages.en.json";
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const data: { messages: Record<string, string>; names: Record<string, string> } = await read(target);
const overrides: Record<string, string> = await read("src/i18n/overrides.en.json");
const dictionary = await read("src/data/localization/names.json");
const direct: Record<string, string> = {};
const derived: Record<string, string> = {};
const files = (await readdir("src/i18n/direct")).filter((file) => file.endsWith(".json")).sort();
for (const file of files) {
  const source = await read(join("src/i18n/direct", file));
  const translations: Record<string, string> = { ...source.messages };
  if (source.kind === "persona-performance" || source.kind === "ego-performance") {
    // 同じ原名に異なる個別訳があるとき、性能欄の個別名を全ページへ広げない。
    for (const [key, english] of Object.entries(translations)) {
      const marker = key.indexOf(":name:");
      if (marker < 0) continue;
      const name = key.slice(marker + 6);
      if ((translations[name] && translations[name] !== english)
        || (data.messages[name] && data.messages[name] !== english)) {
        delete translations[name];
        if (!Object.hasOwn(direct, name)) delete data.messages[name];
      }
    }
  }
  if (source.kind === "boss-copy") {
    const boss = (await import(`../src/data/bosses/${source.id}.ts`)).default;
    Object.assign(translations, bindBossCopy(boss, source));
  }
  if (source.kind === "support-copy") Object.assign(translations, bindSupportCopy(await read("src/data/support-passives.json"), source));
  if (source.kind === "keyword-copy") Object.assign(translations, bindKeywordCopy(await keywordCopySources(), source.entries));
  if (source.kind === "team-copy") {
    const sources = await teamCopySources(source.id);
    Object.assign(translations, bindTeamCopy(sources, source.entries));
    // 同じ原文が既に訳されている場合は、既存の直接英訳を再利用する。
    for (const text of Object.values(sources)) if (!translations[text] && (direct[text] ?? data.messages[text])) translations[text] = direct[text] ?? data.messages[text];
    const name = sources["data:name"];
    const guide = parseGuide(await readFile(source.sourceGuide, "utf8"));
    const description = `リンバスの${name}。${guideSummary(guide) ?? ""}編成例と、優先枠・自由枠・裏置きの人格の役割も解説。`.replace(/\s+/g, " ").trim();
    if (!source.metadata?.title || !source.metadata?.description) throw new Error(`編成の英語メタデータが無い: ${source.id}`);
    translations[`【リンバス】${name}の組み方と編成例｜Limbus Assistant`] = source.metadata.title;
    translations[description.length > 120 ? `${description.slice(0, 119)}…` : description] = source.metadata.description;
  }
  if (source.kind === "catalog-labels") {
    const index: Record<string, { keywords: string[] }> = await read("src/data/persona-keywords.json");
    for (const { keyword } of KEYWORD_PAGES) {
      const english = overrides[keyword] ?? data.names[keyword] ?? data.messages[keyword];
      if (!english) throw new Error(`キーワードの英語名が無い: ${keyword}`);
      const count = Object.values(index).filter(entry => entry.keywords.includes(keyword)).length;
      translations[`${keyword}人格一覧`] = `${english} Identities`;
      translations[`【リンバス】${keyword}人格一覧｜囚人別の特徴と編成｜Limbus Assistant`] = `${english} Identities | Sinner Roles and Team Builds | Limbus Assistant`;
      translations[`リンバス(Limbus Company)の${keyword}人格一覧(${count}人格)。${keyword}をキーワードに持つ人格を囚人ごとに並べ、それぞれの特徴と${keyword}編成の軸になる人格をまとめている。`] = `Browse ${count} ${english} Identities in Limbus Company, grouped by Sinner. Compare their roles and find core picks for ${english} teams.`;
    }
    const characters: { name: string }[] = await read("src/data/characters.json");
    for (const { name } of characters) {
      const english = data.names[name];
      if (!english) throw new Error(`囚人の英語名が無い: ${name}`);
      translations[`${name} 告知ポスター`] = `${english} promotional poster`;
      translations[`【リンバス】${name}の人格一覧｜Limbus Assistant`] = `${english} Identities and E.G.O | Limbus Assistant`;
      translations[`リンバス(Limbus Company)の囚人「${name}」の人格・E.G.O一覧。人格ごとのスキル・耐性・速度を比べられる。`] = `Browse ${english}'s Identities and E.G.O in Limbus Company. Compare each Identity's skills, resistances, and Speed.`;
      // コードや必要個数は数値テンプレートで補う。名前の一部だけを置換しない。
      translations[`${name} ・ 0101`] = `${english} · 0101`;
    }
    for (const sin of ["憤怒", "色欲", "怠惰", "暴食", "憂鬱", "傲慢", "嫉妬"]) {
      const english = overrides[sin] ?? data.names[sin] ?? data.messages[sin];
      if (!english) throw new Error(`罪悪属性の英語名が無い: ${sin}`);
      translations[`${sin}×1`] = `${english} ×1`;
      translations[`${sin} 1`] = `${english} 1`;
    }
  }
  if (source.kind === "glossary-terms") {
    const terms: GlossaryTerm[] = (await Promise.all(["glossary", "glossary-systems"].map(async (name) => (await read(`src/data/${name}.json`)).terms))).flat();
    for (const [id, entry] of Object.entries(source.terms)) {
      const term = terms.find((term) => term.id === id);
      if (!term) throw new Error(`英訳の対象用語が無い: ${id}`);
      Object.assign(translations, bindGlossaryTranslation(term, entry as EnglishGlossaryTerm));
    }
  }
  if (source.sourceGuide) {
    const guide = parseGuide(await readFile(source.sourceGuide, "utf8"));
    const links = (segments: InlineSegment[]) => segments.filter((s) => s.persona || s.ego || s.url)
      .map((s) => s.url ?? `${s.persona ? "persona" : "ego"}:${s.persona ?? s.ego}`).sort();
    for (const section of guide.sections) for (const block of section.blocks) {
      for (const segments of blockSegments(block)) {
        const original = segments.map((segment) => segment.text).join("");
        if (!translations[original]) throw new Error(`攻略原文に対応する英訳が無い: ${file}: ${original}`);
        if (JSON.stringify(links(segments)) !== JSON.stringify(links(parseInline(translations[original])))) {
          throw new Error(`攻略英訳のリンク先が原文と異なる: ${file}: ${original}`);
        }
      }
    }
    // 人格ページではE.G.O側の相性文を再利用し、先頭の人格リンクをE.G.Oリンクへ変える。
    // 同じ変換を英訳にも適用し、日本語と英語で別々の説明を持たない。
    if (source.sourceGuide.startsWith("src/data/guides/ego/")) {
      const character = await read(`src/data/${guide.meta.character}.json`);
      const ego = character.egos.find((entry: { code: string }) => entry.code === source.code);
      const name = dictionary.entries.find((entry: { category: string; gameId: string }) => entry.category === "ego" && entry.gameId === `2${source.code}`);
      if (!ego || !name) throw new Error(`E.G.Oの英語名が無い: ${file}`);
      const markdown = (segments: InlineSegment[]) => segments.map((segment) => {
        const kind = segment.persona ? "persona" : segment.ego ? "ego" : undefined;
        const text = kind ? `[${segment.text}](${kind}:${segment.persona ?? segment.ego})` : segment.text;
        return segment.strong ? `**${text}**` : text;
      }).join("");
      const synergy = guide.sections.find((section) => section.heading === "編成・相性");
      for (const block of synergy?.blocks ?? []) if (block.type === "ul") for (const item of block.items) {
        const index = item.findIndex((segment) => segment.persona || segment.ego);
        if (index < 0 || !item[index].persona) continue;
        const original = item.map((segment) => segment.text).join("");
        const translated = parseInline(translations[original]);
        const translatedIndex = translated.findIndex((segment) => segment.persona === item[index].persona);
        if (translatedIndex < 0) throw new Error(`相性英訳のリンクが無い: ${file}`);
        const variant = item.map((segment, i) => i === index ? ego.name : segment.text).join("");
        translated[translatedIndex] = { text: name.en, ego: ego.code, strong: translated[translatedIndex].strong };
        const english = markdown(translated);
        if (derived[variant] && derived[variant] !== english) throw new Error(`相性英訳が衝突している: ${file}`);
        derived[variant] = english;
      }
    }
  }
  if (source.kind === "reroll-candidates") {
    const hash = createHash("sha256").update((await readFile("src/data/reroll.ts", "utf8")).replace(/\r\n/g, "\n")).digest("hex");
    if (hash !== source.sourceHash) throw new Error("リセマラ原文が変更されている。直接英訳も確認する必要がある。");
    for (const candidate of [...rerollCandidates, ...walpurgisCandidates]) {
      const entry = source.translations[candidate.code];
      if (!entry?.reason || !entry?.caution) throw new Error(`候補の直接英訳が無い: ${candidate.code}`);
      translations[candidate.reason] = entry.reason;
      translations[candidate.caution] = entry.caution;
      const name = dictionary.entries.find((e: { category: string; gameId: string }) => e.category === "persona" && e.gameId === `1${candidate.code}`);
      if (!name) throw new Error(`候補の正式英語名が無い: ${candidate.code}`);
      data.names[candidate.shortName] = name.en;
    }
  }
  for (const [ja, en] of Object.entries(translations)) {
    if (!ja.trim() || typeof en !== "string" || !en.trim()) throw new Error(`空の直接英訳: ${file}`);
    if (direct[ja] !== undefined && direct[ja] !== en) throw new Error(`直接英訳が衝突している: ${file}: ${ja}`);
    direct[ja] = en;
  }
}
Object.assign(data.messages, overrides, direct, derived);
await writeFile(target, JSON.stringify(data, null, 2) + "\n");
const provenance = await read("src/i18n/provenance.en.json");
await writeFile("src/i18n/provenance.en.json", JSON.stringify({ ...provenance, status: "direct-translation-in-progress", directFiles: files, directMessages: Object.keys(direct).length, derivedGuideMessages: Object.keys(derived).length, note: "直接英訳を優先する。以前に取得した機械翻訳も一部残る。未訳は日本語で表示する。全記事の英語化は未完了。" }, null, 2) + "\n");
console.log(`直接英訳: ${files.length}ファイル、${Object.keys(direct).length}件（外部送信なし）`);
