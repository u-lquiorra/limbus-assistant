// サイト内リンクのパスを、静的 HTML の配信先(末尾 / 付き)にそろえる。
// GitHub Pages は /teams を /teams/ へ転送するため、/ なしのリンクはたどるたびに転送が1回挟まる。
// 検索エンジンのクロールの無駄にもなるので、リンクの時点で / を付けておく

/**
 * サイト内の絶対パス(/ で始まる)の末尾に / を付ける。?query と #hash は保つ。
 * 外部 URL・相対パス・ファイル(最後の区切りに拡張子があるもの)はそのまま返す
 */
export function withTrailingSlash(to: string): string {
  // "//example.com" はプロトコル相対の外部 URL なので対象外
  if (!to.startsWith("/") || to.startsWith("//")) return to;
  const i = to.search(/[?#]/);
  const path = i < 0 ? to : to.slice(0, i);
  const rest = i < 0 ? "" : to.slice(i);
  if (path.endsWith("/")) return to;
  const last = path.slice(path.lastIndexOf("/") + 1);
  if (last.includes(".")) return to;
  return `${path}/${rest}`;
}

/** HTML の <a> のうち、末尾に / が無いサイト内リンクの href を返す(ビルド時の検査用) */
export function findSlashlessLinks(html: string): string[] {
  const hrefs = [...html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)].map((m) => m[1]);
  return hrefs.filter((href) => withTrailingSlash(href) !== href);
}
