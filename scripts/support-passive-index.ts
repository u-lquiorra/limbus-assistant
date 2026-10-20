// サポートパッシブ一覧(/support-passives)用の要約を、人格ごとの詳細データ(src/data/personas/<コード>.json)から作り直す。
// 必要資源は詳細データにしか無く、一覧のために全人格の詳細を読み込むと重いため、一覧に要る項目だけを1つにまとめる。
// 人格を追加・更新したら実行する(npm run build でも先に実行される)。
//   npx tsx scripts/support-passive-index.ts   src/data/support-passives.json へ
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { CharacterData, PersonaDetail } from "../src/types.ts";
import type { SupportPassive } from "../src/supportPassives.ts";

const DATA = join(import.meta.dirname, "..", "src", "data");
const OUT = join(DATA, "support-passives.json");

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf-8")) as T;

/** "暴食×2\n憂鬱×1" を [{ sin: "暴食", count: 2 }, { sin: "憂鬱", count: 1 }] にする。読めない書式は止める */
export function parseResource(resource: string | undefined, code: string): SupportPassive["cost"] {
  if (!resource) throw new Error(`${code}: サポートパッシブの必要資源が無い`);
  return resource
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(憤怒|色欲|怠惰|暴食|憂鬱|傲慢|嫉妬)×(\d+)$/);
      if (!m) throw new Error(`${code}: 必要資源を読めない: ${JSON.stringify(resource)}`);
      return { sin: m[1], count: Number(m[2]) };
    });
}

/** 囚人一覧の順・囚人の中は人格の順で、サポートパッシブを持つ人格の要約を作る */
export function buildSupportPassiveIndex(): SupportPassive[] {
  const characters = readJson<{ name: string }[]>(join(DATA, "characters.json"));
  return characters.flatMap(({ name }) => {
    const character = readJson<CharacterData>(join(DATA, `${name}.json`));
    return character.statuses.flatMap((status) => {
      const detail = readJson<PersonaDetail>(join(DATA, "personas", `${status.code}.json`));
      const passive = detail.passives.find((p) => p.kind === "サポート");
      if (!passive) return [];
      return [
        {
          code: status.code,
          // 人格ページと同じく詳細データの名前を使う。wiki の表の都合で入った改行は除く
          name: passive.name.replace(/\s*\n\s*/g, ""),
          cost: parseResource(passive.resource, status.code),
          condition: passive.condition ?? "",
          effect: passive.effect,
          keywords: passive.keywords,
        },
      ];
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = buildSupportPassiveIndex();
  writeFileSync(OUT, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`サポートパッシブの要約: ${index.length} 件を書き出した`);
}
