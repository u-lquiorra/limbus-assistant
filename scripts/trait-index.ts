// 人格ごとの特性キーワード(所属・組織など。例: 蜘蛛の巣、剣契)の索引を、人格ごとの詳細データ(src/data/personas/<コード>.json)から作り直す。
// 特性キーワードは詳細データにしか無く、キーワード別人格一覧の絞り込みのために全人格の詳細を読み込むと重いため、1つにまとめる。
// 人格を追加・更新したら実行する(npm run build でも先に実行される)。
//   npx tsx scripts/trait-index.ts   src/data/persona-traits.json へ
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { CharacterData, PersonaDetail } from "../src/types.ts";

const DATA = join(import.meta.dirname, "..", "src", "data");
const OUT = join(DATA, "persona-traits.json");

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf-8")) as T;

/** "技術解放連合,E.G.O装備" を ["技術解放連合", "E.G.O装備"] にする。区切りは半角カンマと読点の両方がある */
export function parseTraits(value: string | undefined): string[] {
  return [...new Set((value ?? "").split(/[,、]/).map((s) => s.trim()).filter(Boolean))];
}

/** 囚人一覧の順・囚人の中は人格の順で、人格コード → 特性キーワードの対応を作る */
export function buildTraitIndex(): Record<string, string[]> {
  const characters = readJson<{ name: string }[]>(join(DATA, "characters.json"));
  const out: Record<string, string[]> = {};
  for (const { name } of characters) {
    const character = readJson<CharacterData>(join(DATA, `${name}.json`));
    for (const status of character.statuses) {
      const detail = readJson<PersonaDetail>(join(DATA, "personas", `${status.code}.json`));
      const value = detail.info.find((i) => i.label === "特性キーワード")?.value;
      if (value === undefined) throw new Error(`${status.code}: 特性キーワードの行が無い`);
      out[status.code] = parseTraits(value);
    }
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = buildTraitIndex();
  writeFileSync(OUT, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`特性キーワードの索引: ${Object.keys(index).length} 人格分を書き出した`);
}
