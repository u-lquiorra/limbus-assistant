export const isEnglish = (path: string) => /^\/en(?:\/|$)/.test(path);

// 英語版の囚人ページは英語のスラッグで配信する(/en/character/yi-sang)。日本語版の URL(/character/イサン)は変えない。
// 英語圏の検索結果でも読める URL にするため。スラッグは各囚人の公式英語名から作る
const SINNER_SLUGS: Record<string, string> = {
  イサン: "yi-sang",
  ファウスト: "faust",
  ドンキホーテ: "don-quixote",
  良秀: "ryoshu",
  ムルソー: "meursault",
  ホンル: "hong-lu",
  ヒースクリフ: "heathcliff",
  イシュメール: "ishmael",
  ロージャ: "rodion",
  シンクレア: "sinclair",
  ウーティス: "outis",
  グレゴール: "gregor",
};
const SLUG_SINNERS: Record<string, string> = Object.fromEntries(Object.entries(SINNER_SLUGS).map(([name, slug]) => [slug, name]));
const CHARACTER_PATH = /^\/character\/([^/?#]+)(.*)$/s;
const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    // 不正なエンコードはスラッグとも囚人名とも一致しないので、そのまま比べる
    return value;
  }
};

/** 英語版の囚人ページの名前部分(スラッグ)を日本語の囚人名に戻す。スラッグでなければそのまま返す */
export const sinnerNameFromSlug = (value: string) => SLUG_SINNERS[value] ?? value;

const toEnglishCharacter = (path: string) =>
  path.replace(CHARACTER_PATH, (match, name: string, rest: string) => {
    const slug = SINNER_SLUGS[decode(name)];
    return slug ? `/character/${slug}${rest}` : match;
  });
const toJapaneseCharacter = (path: string) =>
  path.replace(CHARACTER_PATH, (match, slug: string, rest: string) => {
    const name = SLUG_SINNERS[slug];
    return name ? `/character/${encodeURIComponent(name)}${rest}` : match;
  });

export const originalPath = (path: string) => isEnglish(path) ? toJapaneseCharacter(path.slice(3) || "/") : path;
export function languagePath(path: string, language: "ja" | "en"): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const original = originalPath(path);
  return language === "ja" ? original : `/en${original === "/" ? "/" : toEnglishCharacter(original)}`;
}
