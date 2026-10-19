// サイト内検索の照合と並べ替え。データの組み立て(siteSearch.ts)と分け、Node のテストから直接呼べるようにする

export type SearchKind = "persona" | "ego" | "sinner" | "team" | "boss" | "glossary" | "guide";

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  persona: "人格",
  ego: "E.G.O",
  sinner: "囚人",
  team: "編成例",
  boss: "ボス攻略",
  glossary: "用語辞典",
  guide: "ガイド",
};

// 同じ一致度のグループが並んだときの表示順
const KIND_ORDER: SearchKind[] = ["guide", "sinner", "persona", "ego", "team", "boss", "glossary"];

export interface SearchEntry {
  kind: SearchKind;
  title: string;
  /** 結果の2行目に出す補足(囚人名・ステージなど) */
  sub?: string;
  to: string;
  image?: string;
  /** タイトル以外で照合する語(読み・別名・所属・キーワードなど) */
  terms: string[];
}

export interface SearchHit {
  entry: SearchEntry;
  /** 小さいほど一致度が高い。0: タイトル完全一致 / 1: 前方一致 / 2: タイトルに含む / 3: 補足語に含む */
  score: number;
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  hits: SearchHit[];
}

/** 全角・半角、大文字・小文字、カタカナ・ひらがなの違いを吸収する */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function splitQuery(query: string): string[] {
  return normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
}

function scoreEntry(entry: SearchEntry, words: string[]): number | undefined {
  const title = normalizeSearchText(entry.title);
  const rest = normalizeSearchText([entry.sub ?? "", ...entry.terms].join(" "));
  // 複数語は AND 条件。どの語もタイトルか補足語のどこかに含まれていれば一致とする
  if (!words.every((word) => title.includes(word) || rest.includes(word))) return undefined;
  const whole = words.join(" ");
  if (title === whole) return 0;
  if (title.startsWith(words[0])) return 1;
  if (words.every((word) => title.includes(word))) return 2;
  return 3;
}

/** 種類ごとにまとめた検索結果を返す。グループは最も一致度の高い結果の順に並べる */
export function searchEntries(entries: SearchEntry[], query: string): SearchGroup[] {
  const words = splitQuery(query);
  if (!words.length) return [];

  const byKind = new Map<SearchKind, SearchHit[]>();
  for (const entry of entries) {
    const score = scoreEntry(entry, words);
    if (score === undefined) continue;
    const hits = byKind.get(entry.kind) ?? [];
    hits.push({ entry, score });
    byKind.set(entry.kind, hits);
  }

  const groups: SearchGroup[] = [];
  for (const [kind, hits] of byKind) {
    // sort は安定なので、同じ一致度ではデータの並び(囚人順・章順など)を保つ
    hits.sort((a, b) => a.score - b.score);
    groups.push({ kind, label: SEARCH_KIND_LABELS[kind], hits });
  }
  return groups.sort(
    (a, b) => a.hits[0].score - b.hits[0].score || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  );
}
