// .cache/wiki/ に保存済みの人格ページの「対応キーワード表」から、人格の公式キーワード(火傷〜充電)を抜き出す。
// おすすめ編成で「〇〇人格」かどうかを判定する根拠にする(効果で〇〇を得られるだけの人格を混ぜないため)。
// 表が無いページの人格は src/data/persona-keywords-manual.json に手で登録し、そちらを優先する。
//   npx tsx scripts/extract-keywords.ts   全人格を src/data/persona-keywords.json へ
import * as cheerio from "cheerio";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

const CACHE_DIR = join(import.meta.dirname, "..", ".cache", "wiki");
const DATA_DIR = join(import.meta.dirname, "..", "src", "data");

// 対応キーワード表の列順(wiki の表の色順と同じ)
export const KEYWORDS = ["火傷", "出血", "振動", "破裂", "沈潜", "呼吸", "充電"] as const;

export interface PersonaKeywords {
  keywords: string[]; // ★: 人格自身のスキル・パッシブでそのキーワードを持つ
  viaEgo?: string[]; // 特: E.G.O の装備などで例外的にそのキーワード持ちとして扱われる
}

export interface ManualKeywords extends PersonaKeywords {
  reason: string; // 手で登録した理由(例: 対応キーワード表がページに無い)
}

// 人格ページの HTML から、その人格の行を探してキーワードを返す。表や行が無ければ null
export function extractKeywords(html: string, code: string): PersonaKeywords | null {
  const $ = cheerio.load(html);
  const table = $("table")
    .toArray()
    .find((t) => $(t).find("thead").text().includes("対応キーワード"));
  if (!table) return null;
  for (const tr of $(table).find("tr").toArray()) {
    const cells = $(tr).children("td").toArray();
    if ($(cells[0]).text().trim() !== code) continue;
    // 実装年月日("26/06/25")の直後の7列がキーワード列
    const dateIdx = cells.findIndex((c) => /^\d\d\/\d\d\/\d\d$/.test($(c).text().trim()));
    if (dateIdx < 0) return null;
    const result: PersonaKeywords = { keywords: [] };
    KEYWORDS.forEach((kw, i) => {
      const text = $(cells[dateIdx + 1 + i]).text().trim();
      if (text.startsWith("★")) result.keywords.push(kw);
      else if (text.startsWith("特")) (result.viaEgo ??= []).push(kw);
    });
    return result;
  }
  return null;
}

function main() {
  const manualPath = join(DATA_DIR, "persona-keywords-manual.json");
  const manual = existsSync(manualPath)
    ? (JSON.parse(readFileSync(manualPath, "utf-8")) as Record<string, ManualKeywords>)
    : {};
  const codes = readdirSync(CACHE_DIR)
    .filter((f) => /^\d{4}\.html$/.test(f))
    .map((f) => f.slice(0, 4))
    .sort();
  const out: Record<string, PersonaKeywords> = {};
  const missing: string[] = [];
  for (const code of codes) {
    if (manual[code]) {
      const { keywords, viaEgo } = manual[code];
      out[code] = viaEgo ? { keywords, viaEgo } : { keywords };
      continue;
    }
    const kw = extractKeywords(readFileSync(join(CACHE_DIR, `${code}.html`), "utf-8"), code);
    if (kw) out[code] = kw;
    else missing.push(code);
  }
  writeFileSync(join(DATA_DIR, "persona-keywords.json"), `${JSON.stringify(out, null, 2)}\n`, "utf-8");
  console.log(`${Object.keys(out).length}件を出力 -> src/data/persona-keywords.json`);
  // 取れなかった人格は黙って飛ばさず、手での登録を促す
  if (missing.length) {
    console.error(`対応キーワード表が見つからない人格: ${missing.join(" ")} (persona-keywords-manual.json に登録してください)`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
