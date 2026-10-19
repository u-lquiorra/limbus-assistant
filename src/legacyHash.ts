/**
 * 旧 URL(HashRouter 時代の `#/persona/1001` や `#/bosses/x#strategy`)を、通常のパス+ページ内リンクに直す。
 * 旧形式でなければ undefined。ページ内リンク(`#strategy`)だけの hash はそのまま扱うため対象外
 */
export function legacyHashPath(hash: string): string | undefined {
  if (!hash.startsWith('#/')) return undefined
  // 2つ目の # 以降(旧形式でのページ内リンク)は、そのまま通常の hash として残る
  return hash.slice(1)
}
