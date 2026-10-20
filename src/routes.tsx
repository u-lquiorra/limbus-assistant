// 画面のルート一覧。トップ以外のページのコードは、そのページを開いたときだけ読み込む。
// App(ルーティング)と preload(静的 HTML の生成・引き継ぎ前の先読み)の両方で使う
import { matchPath } from "react-router-dom";
import Home from "./pages/Home";
import { lazyPage, type LazyPage } from "./lazyPage";

export interface AppRoute {
  path: string;
  element: React.JSX.Element;
  /** 遅延読み込みするページのときだけある */
  page?: LazyPage;
  /** ページのソース(プロジェクトからの相対パス)。静的 HTML に、そのページの CSS・JS の読み込みを書くために使う */
  module?: string;
}

const CharacterDetail = lazyPage(() => import("./pages/CharacterDetail").then((m) => m.default));
const PersonaPage = lazyPage(() => import("./pages/PersonaPage").then((m) => m.default));
const EgoPage = lazyPage(() => import("./pages/EgoPage").then((m) => m.default));
const TeamsPage = lazyPage(() => import("./pages/TeamsPage").then((m) => m.default));
const TeamPage = lazyPage(() => import("./pages/TeamPage").then((m) => m.default));
const KeywordIndex = lazyPage(() => import("./pages/KeywordPage").then((m) => m.KeywordIndex));
const KeywordPage = lazyPage(() => import("./pages/KeywordPage").then((m) => m.default));
const GlossaryPage = lazyPage(() => import("./pages/GlossaryPage").then((m) => m.default));
const GlossaryDetail = lazyPage(() => import("./pages/GlossaryDetail").then((m) => m.default));
const BeginnerGuide = lazyPage(() => import("./pages/BeginnerGuide").then((m) => m.default));
const RerollGuide = lazyPage(() => import("./pages/RerollGuide").then((m) => m.default));
const BossIndex = lazyPage(() => import("./pages/BossPage").then((m) => m.BossIndex));
const BossPage = lazyPage(() => import("./pages/BossPage").then((m) => m.default));
const SearchPage = lazyPage(() => import("./pages/SearchPage").then((m) => m.default));
const AboutPage = lazyPage(() => import("./pages/AboutPage").then((m) => m.default));

function lazyRoute(path: string, page: LazyPage, module: string): AppRoute {
  const Page = page;
  return { path, element: <Page />, page, module: `src/pages/${module}.tsx` };
}

export const APP_ROUTES: AppRoute[] = [
  { path: "/", element: <Home /> },
  lazyRoute("/character/:name", CharacterDetail, "CharacterDetail"),
  lazyRoute("/persona/:code", PersonaPage, "PersonaPage"),
  lazyRoute("/ego/:code", EgoPage, "EgoPage"),
  lazyRoute("/teams", TeamsPage, "TeamsPage"),
  lazyRoute("/teams/:id", TeamPage, "TeamPage"),
  lazyRoute("/keywords", KeywordIndex, "KeywordPage"),
  lazyRoute("/keywords/:id", KeywordPage, "KeywordPage"),
  lazyRoute("/glossary", GlossaryPage, "GlossaryPage"),
  lazyRoute("/glossary/:id", GlossaryDetail, "GlossaryDetail"),
  lazyRoute("/beginner", BeginnerGuide, "BeginnerGuide"),
  lazyRoute("/reroll", RerollGuide, "RerollGuide"),
  lazyRoute("/bosses", BossIndex, "BossPage"),
  lazyRoute("/search", SearchPage, "SearchPage"),
  lazyRoute("/bosses/:id", BossPage, "BossPage"),
  lazyRoute("/about", AboutPage, "AboutPage"),
];

function routeFor(pathname: string): AppRoute | undefined {
  return APP_ROUTES.find((r) => matchPath(r.path, pathname));
}

/** パスに対応するページのソース。遅延読み込みでないページは undefined */
export function pageModule(pathname: string): string | undefined {
  return routeFor(pathname)?.module;
}

/** パスに対応するページのコードを読み込む。トップと見つからないページは最初の JS に入っているので何もしない */
export function preloadPage(pathname: string): Promise<void> {
  return routeFor(pathname)?.page?.preload() ?? Promise.resolve();
}
