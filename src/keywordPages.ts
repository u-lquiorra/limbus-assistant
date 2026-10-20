// キーワード別の人格一覧ページ(/keywords/:id)の定義。
// Node のテスト(scripts/site-links.test.ts)からも直接読めるよう、import.meta.glob を使う loader には依存させない。
// 該当する人格の抽出は loader の keywordPersonas で行う

export interface KeywordPage {
  /** URL に使う ID。同じキーワードの編成(teams.json)の ID とそろえる */
  id: string;
  keyword: string;
  /** 用語辞典の ID(呼吸だけ poise で、編成の ID と違う) */
  glossaryId: string;
}

// 並びは対応キーワード表の列順(火傷・出血・振動・破裂・沈潜・呼吸・充電)
export const KEYWORD_PAGES: KeywordPage[] = [
  { id: "burn", keyword: "火傷", glossaryId: "burn" },
  { id: "bleed", keyword: "出血", glossaryId: "bleed" },
  { id: "tremor", keyword: "振動", glossaryId: "tremor" },
  { id: "rupture", keyword: "破裂", glossaryId: "rupture" },
  { id: "sinking", keyword: "沈潜", glossaryId: "sinking" },
  { id: "breath", keyword: "呼吸", glossaryId: "poise" },
  { id: "charge", keyword: "充電", glossaryId: "charge" },
];

export function getKeywordPage(id: string): KeywordPage | undefined {
  return KEYWORD_PAGES.find((p) => p.id === id);
}

/** 用語辞典の ID から、同じキーワードの一覧ページを引く(用語ページからのリンク用) */
export function keywordPageForGlossary(glossaryId: string): KeywordPage | undefined {
  return KEYWORD_PAGES.find((p) => p.glossaryId === glossaryId);
}
