// ページ内目次(PageToc)の、DOM に依存しない計算部分

/** 見出し全体の文字から英字ラベルを除いた和文を目次の表示名にする。和文が無ければ英字を使う */
export function tocLabel(headingText: string, enText: string): string {
  const ja = headingText.replace(enText, "").trim();
  return ja || enText.trim();
}

/** 英字ラベルから節の id を作る(例: "SKILLS" → "sec-skills") */
export function tocId(enText: string): string {
  return `sec-${enText.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * 各節の上端位置(画面上端からの px)から、今読んでいる節の番号を返す。
 * offset(固定ヘッダーと目次の高さ)より上に入った節のうち、最後のものを現在地とする。
 * どの節もまだ入っていなければ先頭を返す。
 */
export function activeSectionIndex(tops: number[], offset: number): number {
  let active = 0;
  tops.forEach((top, i) => {
    if (top - offset <= 1) active = i;
  });
  return active;
}
