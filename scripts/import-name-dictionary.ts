/** 日英の名前だけを同じゲーム内ID・段階で結合する。説明文は取り込まない。 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const repository = "x1bViolet/Limbus-Localization-Files";
// 更新時は両言語のリビジョンを明示的に差し替え、差分と未対応一覧を確認する。
const revisions = {
  ja: "78fde566dc7189175e3b190a828c7db334fd0807",
  en: "c31b3b0c44b2e230e29d51106190b4c1511a4c33",
};
const output = resolve("src/data/localization");
const cache = resolve(".cache/name-dictionary");
const offline = process.argv.includes("--offline");
type Row = { id: string | number; name?: string; title?: string; level?: number; levelList?: Row[] };
type Entry = {
  key: string; category: string; gameId: string; ja: string; en: string;
  sourceFile: string; level?: number;
};
const clean = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const normalize = (s: string) => clean(s).normalize("NFKC").replace(/\s+/g, "");

async function getJson(url: string, file: string) {
  if (existsSync(file)) return JSON.parse(await readFile(file, "utf8"));
  if (offline) throw new Error(`キャッシュが無い: ${file}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const data = await response.json();
  await mkdir(resolve(file, ".."), { recursive: true });
  await writeFile(file, JSON.stringify(data));
  return data;
}

function category(file: string): string {
  if (file.startsWith("Personalities")) return "persona";
  if (file.startsWith("Characters")) return "character";
  if (file.startsWith("Egos")) return "ego";
  if (file.startsWith("EGOgift")) return "ego-gift";
  if (file.startsWith("Skills")) return "skill";
  if (/^Passive/.test(file)) return "passive";
  if (file.startsWith("Enemies")) return "enemy";
  if (file.startsWith("Bufs")) return "status";
  return "term";
}

await mkdir(cache, { recursive: true });
const trees = await Promise.all(Object.entries(revisions).map(async ([language, revision]) => {
  const tree = await getJson(`https://api.github.com/repos/${repository}/git/trees/${revision}?recursive=1`, resolve(cache, `${revision}-tree.json`));
  if (tree.truncated) throw new Error("取得したファイル一覧が省略されている");
  return [language, new Set<string>(tree.tree.filter((f: { type: string }) => f.type === "blob").map((f: { path: string }) => f.path))] as const;
}));
const paths = Object.fromEntries(trees);
const files = [...new Set([...paths.ja, ...paths.en])].filter((p) => /^(Personalities|Characters|Egos|EGOgift|Skills|Passive_|Passives|Enemies|Bufs|KeywordDictionary|AttributeText|MentalCondition)[^/]*\.json$/.test(p)).sort();
const entries: Entry[] = [];
const missing: { sourceFile: string; gameId?: string; level?: number; ja?: string; reason: string }[] = [];
let cursor = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < files.length) {
    const file = files[cursor++];
    if (!paths.ja.has(file) || !paths.en.has(file)) {
      missing.push({ sourceFile: file, reason: "language-file-missing" });
      continue;
    }
    const [ja, en] = await Promise.all(Object.values(revisions).map(async (revision) => {
      return getJson(`https://raw.githubusercontent.com/${repository}/${revision}/${file}`, resolve(cache, revision, file));
    }));
    if (Object.keys(ja).length === 0 || Object.keys(en).length === 0) {
      missing.push({ sourceFile: file, reason: "empty-language-file" });
      continue;
    }
    if (!Array.isArray(ja.dataList) || !Array.isArray(en.dataList)) throw new Error(`未知のデータ形式: ${file}`);
    const enById = new Map<string, Row>(en.dataList.map((row: Row) => [String(row.id), row]));
    for (const jp of ja.dataList as Row[]) {
      const english = enById.get(String(jp.id));
      const variants = jp.levelList ?? [jp];
      for (const variant of variants) {
        const translated = jp.levelList ? english?.levelList?.find((r) => r.level === variant.level) : english;
        const name = category(file) === "persona" ? variant.title : variant.name;
        if (!name?.trim()) continue;
        const englishName = category(file) === "persona" ? translated?.title : translated?.name;
        if (!englishName?.trim()) {
          missing.push({ sourceFile: file, gameId: String(jp.id), level: variant.level, ja: clean(name), reason: "english-name-missing" });
          continue;
        }
        entries.push({
          key: `${file}:${jp.id}${variant.level === undefined ? "" : `:${variant.level}`}`,
          category: category(file), gameId: String(jp.id), ja: clean(name), en: clean(englishName),
          sourceFile: file, ...(variant.level === undefined ? {} : { level: variant.level }),
        });
      }
    }
  }
}));
entries.sort((a, b) => a.key.localeCompare(b.key, "en"));
missing.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en"));

// 現在のサイトとの対応は別に持つ。表示名の違いは推測で補わず、未対応として残す。
const references: { kind: string; id: string; ja: string; matches: string[]; status: string }[] = [];
function reference(kind: string, id: string, ja: string, candidates: Entry[]) {
  const matches = candidates.filter((e) => normalize(e.ja) === normalize(ja));
  const translations = new Set(matches.map((e) => e.en));
  references.push({ kind, id, ja, matches: matches.map((e) => e.key), status: matches.length === 0 ? "unresolved" : translations.size > 1 ? "ambiguous" : "matched" });
}
const read = async (file: string) => JSON.parse(await readFile(resolve(file), "utf8"));
const characters = await read("src/data/characters.json");
for (const character of characters) {
  const data = await read(`src/data/${character.name}.json`);
  reference("character", character.number, character.name, entries.filter((e) => e.category === "character" && Number(e.gameId) === Number(character.number)));
  for (const [kind, rows, prefix] of [["persona", data.statuses, "1"], ["ego", data.egos ?? [], "2"]] as const) {
    for (const row of rows) {
      reference(kind, row.code, row.name, entries.filter((e) => e.category === kind && e.gameId === `${prefix}${row.code}`));
      const detail = await read(`src/data/${kind === "persona" ? "personas" : "egos"}/${row.code}.json`);
      for (const [field, cat] of [["skills", "skill"], ["passives", "passive"]] as const) {
        for (const [index, item] of detail[field].entries()) {
          if (item.name) reference(`${kind}-${cat}`, `${row.code}:${index}`, item.name, entries.filter((e) => e.category === cat));
        }
      }
    }
  }
}
for (const file of ["glossary.json", "glossary-systems.json"]) {
  const glossary = await read(`src/data/${file}`);
  for (const term of glossary.terms) reference("glossary", term.id, term.name, entries.filter((e) => ["term", "status", "skill"].includes(e.category)));
}
const bosses = await read("src/data/bosses/index.json");
for (const boss of bosses) reference("boss", boss.id, boss.shortName, entries.filter((e) => e.category === "enemy"));
await mkdir(output, { recursive: true });
await writeFile(resolve(output, "names.json"), JSON.stringify({
  schemaVersion: 1,
  provenance: { repository: `https://github.com/${repository}`, revisions, status: "game-localization-mirror-paired", note: "第三者ミラーの日英データを同一ファイル・ゲーム内ID・段階で結合。公式配信元での照合済みを意味しない。説明文は収録しない。" },
  entries,
}, null, 2) + "\n");
await writeFile(resolve(output, "coverage.json"), JSON.stringify({ schemaVersion: 1, references, missing }, null, 2) + "\n");
console.log(JSON.stringify({ entries: entries.length, categories: Object.fromEntries([...new Set(entries.map((e) => e.category))].map((c) => [c, entries.filter((e) => e.category === c).length])), site: Object.fromEntries(["matched", "unresolved", "ambiguous"].map((s) => [s, references.filter((r) => r.status === s).length])), missing: missing.length }, null, 2));
