// コイン番号を表すローマ数字。wikiには全角(Ⅰ)と半角(I)の表記揺れがある。
// scripts/persona.ts(破壊不能コインの判定)と EffectText(コイン行の表示)の両方で使う
export const COIN_NUMERALS: Record<string, number> = {
  Ⅰ: 1, Ⅱ: 2, Ⅲ: 3, Ⅳ: 4, Ⅴ: 5, Ⅵ: 6, Ⅶ: 7, Ⅷ: 8, Ⅸ: 9, Ⅹ: 10, Ⅺ: 11, Ⅻ: 12,
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
};

// 行頭のコイン番号。半角は誤検出を避けるため直後が空白か "[" の場合だけ拾う
export const COIN_PREFIX = /^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]|(?:VIII|VII|VI|IV|IX|III|II|I|V|X)(?=\s|\[))\s*/;
