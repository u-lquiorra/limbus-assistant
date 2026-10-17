export const SIN_ORDER = ["憤怒", "色欲", "怠惰", "暴食", "憂鬱", "傲慢", "嫉妬"] as const;

// wikiwiki.jp/lcbwiki の配色(red/orange/yellow/lawngreen/skyblue/royalblue/blueviolet)を暗背景向けに調整
export const SIN_COLORS: Record<string, string> = {
  憤怒: "#e0373a",
  色欲: "#ee7d23",
  怠惰: "#e8c32b",
  暴食: "#8fc93a",
  憂鬱: "#3fa7d6",
  傲慢: "#3a66d6",
  嫉妬: "#8b45d4",
};

// 明るい色の上では黒文字にする
const DARK_TEXT = new Set(["色欲", "怠惰", "暴食"]);

export function sinTextColor(sin: string): string {
  return DARK_TEXT.has(sin) ? "#141114" : "#fff";
}
