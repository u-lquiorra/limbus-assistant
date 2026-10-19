// 共通ヘッダーのナビ項目と、現在のパスがどの項目に属するかの判定

export const NAV_ITEMS = [
  { to: "/", label: "囚人一覧" },
  { to: "/teams", label: "編成例" },
  { to: "/beginner", label: "初心者ガイド" },
  { to: "/reroll", label: "リセマラ" },
  { to: "/bosses", label: "ボス攻略" },
  { to: "/glossary", label: "用語辞典" },
] as const;

// 囚人・人格・E.G.O の詳細ページは囚人一覧から辿るため、「囚人一覧」を選択中として扱う
const SINNER_SECTION_PREFIXES = ["/character/", "/persona/", "/ego/"];

/** pathname が属するナビ項目の `to` を返す。どれにも属さなければ undefined */
export function activeNavItem(pathname: string): string | undefined {
  if (pathname === "/" || SINNER_SECTION_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return "/";
  // "/teams" と "/teams/xxx" は一致させ、"/teamsx" のような別パスは一致させない
  return NAV_ITEMS.find((item) => item.to !== "/" && (pathname === item.to || pathname.startsWith(`${item.to}/`)))?.to;
}
