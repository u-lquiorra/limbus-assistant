// ボス攻略の要約(一覧・サイト内検索・ページ情報に使う)を、各ボスの詳細データから作り直す。
// 詳細はページを開いたときだけ読み込むため、最初に読む JS には要約だけを入れる。
// ボスを追加・更新したら実行する(npm run build でも先に実行される)。
//   npx tsx scripts/boss-index.ts   src/data/bosses/index.json へ
import { writeFileSync } from "fs";
import { join } from "path";
import { bossSummary, loadAllBossGuides } from "../src/bosses.ts";

const OUT = join(import.meta.dirname, "..", "src", "data", "bosses", "index.json");

const summaries = (await loadAllBossGuides()).map(bossSummary);
writeFileSync(OUT, `${JSON.stringify(summaries, null, 2)}\n`);
console.log(`ボス攻略の要約: ${summaries.length} 件を書き出した`);
