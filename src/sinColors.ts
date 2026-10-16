// wikiwiki.jp/lcbwiki で確認した罪属性ごとの固定配色
export const SIN_ORDER = ["憤怒", "色欲", "怠惰", "暴食", "憂鬱", "傲慢", "嫉妬"] as const;

export const SIN_COLORS: Record<string, string> = {
  憤怒: "#e74c3c",
  色欲: "#e67e22",
  怠惰: "#d4c430",
  暴食: "#7cc842",
  憂鬱: "#4aa8d8",
  傲慢: "#3f6fd1",
  嫉妬: "#8a4fd1",
};
