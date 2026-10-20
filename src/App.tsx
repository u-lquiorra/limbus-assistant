import { useEffect, useRef } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import CharacterDetail from "./pages/CharacterDetail";
import PersonaPage from "./pages/PersonaPage";
import EgoPage from "./pages/EgoPage";
import TeamsPage from "./pages/TeamsPage";
import TeamPage from "./pages/TeamPage";
import GlossaryPage from "./pages/GlossaryPage";
import GlossaryDetail from "./pages/GlossaryDetail";
import BeginnerGuide from "./pages/BeginnerGuide";
import RerollGuide from "./pages/RerollGuide";
import BossPage, { BossIndex } from "./pages/BossPage";
import SearchPage from "./pages/SearchPage";
import AboutPage from "./pages/AboutPage";
import KeywordPage, { KeywordIndex } from "./pages/KeywordPage";
import SiteLogo from "./components/SiteLogo";
import { NAV_ITEMS, activeNavItem } from "./nav";
import { asset } from "./lib";
import { X_ACCOUNT, X_URL, canonicalUrl, pageMeta } from "./seo";
import { preloadRoute } from "./preload";
import "./App.css";
import "./theme.css";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
        window.scrollTo(0, window.scrollY + target.getBoundingClientRect().top - headerHeight - 16);
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

// 固定ヘッダーの高さを CSS 変数 --header-h に渡す。画面幅でナビが2段になり高さが変わるため実測する
function HeaderHeightVar() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--header-h", `${header.getBoundingClientRect().height}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return null;
}

function DataSourceNote() {
  const { pathname } = useLocation();
  if (pathname === "/reroll") return null;
  return <p>データ出典: <a href="https://wikiwiki.jp/lcbwiki/" target="_blank" rel="noreferrer">LimbusCompany攻略Wiki</a></p>;
}

function SiteNav() {
  const { pathname } = useLocation();
  const active = activeNavItem(pathname);
  const navRef = useRef<HTMLElement>(null);

  // 狭い画面ではナビが横スクロールになるため、選択中の項目が見える位置まで送る
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }, [active]);

  return (
    <nav className="site-nav" aria-label="サイト内メニュー" ref={navRef}>
      {NAV_ITEMS.map((item) => (
        <Link key={item.to} to={item.to} aria-current={item.to === active ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function SiteSearchLink() {
  const { pathname } = useLocation();
  return (
    <Link
      to="/search"
      className="site-search-link"
      aria-label="サイト内検索"
      title="サイト内検索"
      aria-current={pathname === "/search" ? "page" : undefined}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </Link>
  );
}

function NotFound() {
  return (
    <div className="container section">
      <h1 className="section-title">ページが見つからない</h1>
      <p className="empty">URL が変わったか、ページが削除された可能性がある。</p>
      <Link to="/" className="back-link">← トップに戻る</Link>
    </div>
  );
}

// 画面遷移のたびに title・description・canonical を書き換える。最初の値は静的 HTML の head に入っている
function PageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      const meta = pageMeta(pathname);
      document.title = meta.title;
      const setHead = (selector: string, create: () => HTMLElement, attr: string, value: string) => {
        let el = document.head.querySelector<HTMLElement>(selector);
        if (!el) {
          el = create();
          document.head.append(el);
        }
        el.setAttribute(attr, value);
      };
      const metaTag = (name: string) => () => Object.assign(document.createElement("meta"), { name });
      setHead('meta[name="description"]', metaTag("description"), "content", meta.description);
      setHead('meta[name="robots"]', metaTag("robots"), "content", meta.noindex ? "noindex" : "index,follow");
      setHead('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", canonicalUrl(pathname));
    };
    apply();
    // description にはガイドの要約を使うため、ガイドの読み込みが終わったらもう一度書き換える
    preloadRoute(pathname).then(apply, (e: unknown) => console.error(`ページ情報の更新に失敗した: ${pathname}`, e));
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  return null;
}

/** サイト全体。ルーターは呼び出し側で包む(ブラウザでは BrowserRouter、静的 HTML の生成では StaticRouter) */
function App() {
  return (
    <>
      <ScrollToTop />
      <PageMeta />
      <HeaderHeightVar />
      <header className="site-header">
        <div className="container site-header-inner">
          <Link to="/" className="brand" aria-label="Limbus Assistant ホーム">
            <img className="brand-emblem" src={asset("images/home/locomotive-emblem.webp")} alt="" width={32} height={46} />
            <SiteLogo lines={["LIMBUS ASSISTANT"]} className="brand-logo" />
          </Link>
          <SiteNav />
          <SiteSearchLink />
        </div>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/character/:name" element={<CharacterDetail />} />
          <Route path="/persona/:code" element={<PersonaPage />} />
          <Route path="/ego/:code" element={<EgoPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:id" element={<TeamPage />} />
          <Route path="/keywords" element={<KeywordIndex />} />
          <Route path="/keywords/:id" element={<KeywordPage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/glossary/:id" element={<GlossaryDetail />} />
          <Route path="/beginner" element={<BeginnerGuide />} />
          <Route path="/reroll" element={<RerollGuide />} />
          <Route path="/bosses" element={<BossIndex />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/bosses/:id" element={<BossPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="container">
          <DataSourceNote />
          <p>
            本サイトは非公式のファンサイト。ゲーム内の画像・キャラクター等の著作権は Project Moon に帰属する。
          </p>
          <p>
            <Link to="/about">このサイトについて</Link>
            {" ・ "}
            <a href={X_URL} target="_blank" rel="noreferrer">
              X(@{X_ACCOUNT})
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}

export default App;
