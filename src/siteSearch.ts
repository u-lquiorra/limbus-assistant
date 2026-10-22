// サイト内検索の対象を、各ページのデータから組み立てる。
// どのデータも画面表示のためにすでに読み込まれているので、外部サービスや別ファイルの索引は使わない
import { allPersonas, characterList, getCharacter, keywordPersonas, teams } from "./data/loader";
import personaKeywords from "./data/persona-keywords.json";
import { bossSummaries } from "./bosses";
import { glossaryTerms } from "./glossary";
import { KEYWORD_PAGES } from "./keywordPages";
import { TRAIT_FILTERS, personasMatching, traitFilterPath } from "./traitFilters";
import type { SearchEntry } from "./search";

const keywordsByCode = personaKeywords as Record<string, { keywords: string[] }>;

// ナビにあるガイドページ。本文は検索しないため、探されそうな語を terms に並べる
const GUIDE_ENTRIES: SearchEntry[] = [
  {
    kind: "guide",
    title: "初心者ガイド",
    sub: "ストーリーの進め方・育成・日課・交換",
    to: "/beginner",
    terms: ["初心者", "始め方", "育成", "日課", "交換", "ストーリー"],
  },
  {
    kind: "guide",
    title: "リセマラ",
    sub: "おすすめ人格・終了ライン",
    to: "/reroll",
    terms: ["リセマラ", "リセット", "最初", "ガチャ", "抽出", "おすすめ"],
  },
  {
    kind: "guide",
    title: "キーワード別人格一覧",
    sub: "複数キーワード・所属の組み合わせで絞り込み",
    to: "/keywords",
    terms: ["キーワード", "絞り込み", "組み合わせ", "複合", "一覧", "人格", "所属", "特性"],
  },
  {
    kind: "guide",
    title: "E.G.O一覧",
    sub: "必要資源(罪悪属性)で絞り込み",
    to: "/egos",
    // 検索は点を取り除かないため、「EGO」と「E.G.O」の両方で見つかるようにする
    terms: ["EGO", "E.G.O", "一覧", "必要資源", "資源", "罪悪属性", "コスト"],
  },
  {
    kind: "guide",
    title: "サポートパッシブ一覧",
    sub: "囚人ごと・必要資源で絞り込み・裏置きの候補探し",
    to: "/support-passives",
    terms: ["サポートパッシブ", "サポパ", "パッシブ", "裏置き", "控え", "必要資源", "資源", "罪悪属性", "一覧"],
  },
];

function buildEntries(): SearchEntry[] {
  const sinners: SearchEntry[] = characterList.map((c) => ({
    kind: "sinner",
    title: c.name,
    sub: `囚人 No.${c.number}`,
    to: `/character/${encodeURIComponent(c.name)}`,
    image: c.posterThumb,
    terms: [],
  }));

  const personas: SearchEntry[] = allPersonas.map(({ status }) => ({
    kind: "persona",
    title: status.name,
    sub: [status.character, status.affiliation?.name].filter(Boolean).join("・"),
    to: `/persona/${status.code}`,
    image: status.image,
    terms: [status.code, ...(keywordsByCode[status.code]?.keywords ?? [])],
  }));

  const egos: SearchEntry[] = characterList.flatMap((c) =>
    (getCharacter(c.name)?.egos ?? []).map((ego) => ({
      kind: "ego" as const,
      title: ego.name,
      sub: `${ego.character}・${ego.rank}`,
      to: `/ego/${ego.code}`,
      image: ego.image,
      terms: [ego.code],
    }))
  );

  const teamEntries: SearchEntry[] = teams.map((team) => ({
    kind: "team",
    title: team.name,
    sub: `${team.category}・${team.difficulty}向け`,
    to: `/teams/${team.id}`,
    terms: team.keywords,
  }));

  // 一覧と同じく章順に並べる
  const bosses: SearchEntry[] = [...bossSummaries]
    .sort((a, b) => a.chapter - b.chapter)
    .map((boss) => ({
      kind: "boss",
      title: boss.name,
      sub: `${boss.stage} ${boss.stageName}`,
      to: `/bosses/${boss.id}`,
      terms: [boss.shortName, boss.stage, boss.stageName, ...boss.unitNames, ...(boss.projection ? ["射影戦闘", boss.projection.difficulty, `${boss.projection.targetTurns}ターン以内`] : [])],
    }));

  const glossary: SearchEntry[] = glossaryTerms.map((term) => ({
    kind: "glossary",
    title: term.name,
    sub: term.summary,
    to: `/glossary/${term.id}`,
    terms: [term.reading, ...term.aliases, ...(term.sections ?? []).flatMap((s) => [s.name, s.reading])],
  }));

  const keywordEntries: SearchEntry[] = KEYWORD_PAGES.map((p) => ({
    kind: "guide",
    title: `${p.keyword}人格一覧`,
    sub: `キーワード別人格一覧・${keywordPersonas(p.keyword).length}人格`,
    to: `/keywords/${p.id}`,
    terms: [p.keyword, "キーワード", "一覧"],
  }));

  // 所属(特性キーワード)は一覧ページを持たないため、その所属を選んだ状態の絞り込みを開く
  const traitEntries: SearchEntry[] = TRAIT_FILTERS.map((trait) => ({
    kind: "guide",
    title: `${trait}所属の人格`,
    sub: `キーワード別人格一覧で絞り込み・${personasMatching([], [trait]).length}人格`,
    to: traitFilterPath([trait]),
    terms: [trait, "所属"],
  }));

  return [...GUIDE_ENTRIES, ...keywordEntries, ...traitEntries, ...sinners, ...personas, ...egos, ...teamEntries, ...bosses, ...glossary];
}

let cache: SearchEntry[] | undefined;

/** 検索ページを開いたときに一度だけ組み立てる */
export function siteSearchEntries(): SearchEntry[] {
  cache ??= buildEntries();
  return cache;
}
