/** 一度だけ外部翻訳で下訳を生成し、表示時は保存済みの訳だけを使う。 */
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { createHash } from "node:crypto";

const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const sources: string[] = await read(".cache/english/source-text.json");
const manifest = await read(".cache/english/export-manifest.json");
const sourceHash = createHash("sha256").update(await readFile(".cache/english/source-text.json")).digest("hex");
if (manifest.kind !== "rendered-public-page-text" || manifest.sha256 !== sourceHash) throw new Error("公開ページだけを収集した送信対象と一致しない");
const offline = process.argv.includes("--offline");
if (!offline && !process.argv.includes("--approve-public-text-export")) throw new Error("外部送信には内容確認とユーザーの承認が必要。確認後だけ --approve-public-text-export を指定する。");
const dictionary: { entries: { key: string; ja: string; en: string }[]; provenance: unknown } = await read("src/data/localization/names.json");
const overrides: Record<string, string> = await read("src/i18n/overrides.en.json");
const candidates = new Map<string, Set<string>>();
for (const entry of dictionary.entries) {
  if (!candidates.has(entry.ja)) candidates.set(entry.ja, new Set());
  candidates.get(entry.ja)!.add(entry.en);
}
const names: Record<string, string> = Object.fromEntries([...candidates].filter(([, en]) => en.size === 1).map(([ja, en]) => [ja, [...en][0]]));
const coverage: { references: { ja: string; status: string; matches: string[] }[] } = await read("src/data/localization/coverage.json");
const byKey = new Map(dictionary.entries.map((entry) => [entry.key, entry]));
const aliases = new Map<string, Set<string>>();
for (const ref of coverage.references.filter((r) => r.status === "matched")) {
  if (!aliases.has(ref.ja)) aliases.set(ref.ja, new Set());
  ref.matches.forEach((key) => { const entry = byKey.get(key); if (entry) aliases.get(ref.ja)!.add(entry.en); });
}
for (const [ja, english] of aliases) if (english.size === 1) names[ja] = [...english][0];
Object.assign(names, overrides);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// 一文字の一般名詞を長い語の一部として置換しない。最長一致で固有名詞を保護する。
const pattern = new RegExp(Object.keys(names).filter((s) => s.length >= 2 && /[\u3040-\u30ff\u3400-\u9fff]/.test(s)).sort((a, b) => b.length - a.length).map(escape).join("|"), "g");
const target = "src/i18n/messages.en.json";
let previous: Record<string, string> = {};
try { previous = (await read(target)).messages; } catch { /* 初回生成 */ }
const messages: Record<string, string> = { ...previous, ...overrides };
const errors: { source: string; reason: string }[] = [];
await mkdir(".cache/english", { recursive: true });
const cache = ".cache/english/machine-cache.json";
let saved: Record<string, string> = {};
try { saved = await read(cache); } catch { /* 初回生成 */ }
const todo = sources.filter((s) => !messages[s] && !names[s]);
const batches: string[][] = [];
let batch: string[] = [], size = 0;
for (const source of todo) {
  if (batch.length && (size + source.length > 2300 || batch.length >= 35)) { batches.push(batch); batch = []; size = 0; }
  batch.push(source); size += source.length;
}
if (batch.length) batches.push(batch);
let cursor = 0, completed = 0;
async function atomicWrite(path: string, content: string) {
  await writeFile(`${path}.tmp`, content);
  await rename(`${path}.tmp`, path);
}
const saveCheckpoint = async () => {
  const pending = sources.filter((s) => !messages[s] && !names[s]).length;
  await atomicWrite(cache, JSON.stringify(saved));
  await atomicWrite(target, JSON.stringify({ messages: Object.fromEntries(Object.entries(messages).sort(([a], [b]) => a.localeCompare(b, "ja"))), names }, null, 2) + "\n");
  await atomicWrite("src/i18n/provenance.en.json", JSON.stringify({ status: pending ? "incomplete-machine-translation-preview" : "machine-translated-preview", provider: "Google Translate", sourceHash, sourceTexts: sources.length, pending, dictionary: "src/data/localization/names.json", dictionaryProvenance: dictionary.provenance, failures: errors.length, note: "固有名詞辞書と機械翻訳の下訳。未翻訳文は日本語で表示する。攻略内容の独立レビュー済みを意味しない。" }, null, 2) + "\n");
};
let checkpointWrite = Promise.resolve();
const checkpoint = () => { checkpointWrite = checkpointWrite.then(saveCheckpoint); return checkpointWrite; };
async function stopForRateLimit(): Promise<never> {
  await checkpoint();
  await writeFile(".cache/english/blocked.json", JSON.stringify({ reason: "Google Translate HTTP 429", remaining: sources.filter((s) => !messages[s] && !names[s]).length, sourceHash }, null, 2));
  console.error("Google Translateの制限が継続しているため送信を停止。取得済みの訳は保存済み。");
  process.exit(2);
}
process.on("SIGINT", () => { checkpoint().finally(() => process.exit(130)); });
async function translate(source: string): Promise<string> {
  if (saved[source]) return saved[source];
  if (offline) throw new Error("外部翻訳は実行していない");
  const replacements: string[] = [];
  const token = (text: string) => { const id = replacements.push(text) - 1; return ` [ZXQ${String(id).padStart(5, "0")}QXZ] `; };
  const usedNames = new Set<string>();
  const protectedText = source.replace(pattern, (match) => {
    const english = names[match];
    usedNames.add(english);
    return /[\u3040-\u30ff\u3400-\u9fff]/.test(english) ? token(english) : ` [${english}] `;
  }).replace(/\[ZXQ\d{5}QXZ\]|\[[^\]\n]+\]|https?:\/\/[^\s]+|\bS[123]\b|[+-]?\d+(?:\.\d+)?(?:%|％)?|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+/g, (match) => match.startsWith("[") ? match : token(match));
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  for (const [key, value] of Object.entries({ client: "gtx", sl: "ja", tl: "en", dt: "t" })) url.searchParams.set(key, value);
  let last = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { method: "POST", body: new URLSearchParams({ q: protectedText }), signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      let output: string = data[0].map((row: unknown[]) => row[0] ?? "").join("");
      output = output.replace(/ZXQ\s*(\d+)\s*QXZ/gi, (_, digits) => `ZXQ${String(digits).padStart(5, "0")}QXZ`);
      for (const [index, replacement] of replacements.entries()) {
        const marker = `ZXQ${String(index).padStart(5, "0")}QXZ`;
        if (!output.includes(marker)) {
          await writeFile(".cache/english/marker-error.json", JSON.stringify({ source, protectedText, output, missing: marker }, null, 2));
          throw new Error(`保護した名前・数値が失われた: ${marker}`);
        }
        output = output.replaceAll(`[${marker}]`, replacement).replaceAll(marker, replacement);
      }
      if (/ZXQ\d+QXZ/.test(output)) throw new Error("翻訳マーカーが残っている");
      for (const english of usedNames) {
        const literal = new RegExp(escape(english), "gi");
        if (!literal.test(output)) throw new Error(`保護した名前が失われた: ${english}`);
        output = output.replace(literal, english).replaceAll(`[${english}]`, english);
      }
      saved[source] = output;
      return output;
    } catch (e) {
      last = String(e);
      if (last.includes("保護した") || last.includes("マーカー")) throw e;
      if (attempt === 0) console.log(`翻訳再試行: ${last}`);
      await new Promise((resolve) => setTimeout(resolve, last.includes("429") ? 15_000 * (attempt + 1) : 1000 * (attempt + 1)));
    }
  }
  throw new Error(last);
}
console.log(`英訳: ${todo.length}文、${batches.length}バッチ`);
if (offline) {
  await checkpoint();
  console.log("辞書と手動訳だけを反映。外部送信なし。");
  process.exit(0);
}
await Promise.all(Array.from({ length: 2 }, async () => {
  while (cursor < batches.length) {
    const current = batches[cursor++];
    try {
      const delimiter = "\nZXQBREAKQXZ\n";
      const result = await translate(current.join(delimiter));
      const pieces = result.split(/\s*ZXQBREAKQXZ\s*/);
      if (pieces.length !== current.length) throw new Error("バッチの区切りが変わった");
      for (const [i, source] of current.entries()) {
        const prefix = source.match(/^\s*/)?.[0] ?? "";
        const suffix = source.match(/\s*$/)?.[0] ?? "";
        messages[source] = prefix + pieces[i].trim() + suffix;
      }
    } catch (batchError) {
      if (String(batchError).includes("HTTP 429")) {
        await stopForRateLimit();
      }
      console.log(`バッチ分割: ${String(batchError)}`);
      for (const source of current) {
        try { messages[source] = await translate(source); }
        catch (e) {
          if (String(e).includes("HTTP 429")) await stopForRateLimit();
          errors.push({ source, reason: String(e) });
        }
      }
    }
    completed++;
    if (completed % 5 === 0) console.log(`英訳: ${completed}/${batches.length}、失敗${errors.length}`);
    await checkpoint();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}));
await checkpoint();
await writeFile(".cache/english/translation-errors.json", JSON.stringify(errors, null, 2) + "\n");
console.log(`完了: ${Object.keys(messages).length}文、失敗${errors.length}`);
if (errors.length) process.exitCode = 1;
