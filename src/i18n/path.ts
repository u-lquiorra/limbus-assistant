export const isEnglish = (path: string) => /^\/en(?:\/|$)/.test(path);
export const originalPath = (path: string) => isEnglish(path) ? path.slice(3) || "/" : path;
export function languagePath(path: string, language: "ja" | "en"): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const original = originalPath(path);
  return language === "ja" ? original : `/en${original === "/" ? "/" : original}`;
}
