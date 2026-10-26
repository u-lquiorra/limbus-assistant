import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Link } from "./components/Link";
import { APP_ROUTES } from "./routes";
import SiteLogo from "./components/SiteLogo";
import { NAV_ITEMS, activeNavItem, isPage } from "./nav";
import { asset } from "./lib";
import { X_ACCOUNT, X_URL, canonicalUrl, pageMeta } from "./seo";
import { preloadRoute } from "./preload";
import { LanguageContext, englishLoaded, subscribeTranslations } from "./i18n/text";
import { isEnglish, languagePath, originalPath } from "./i18n/path";
import "./App.css";
import "./theme.css";
import "./i18n/i18n.css";

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
  if (isPage(originalPath(pathname), "/reroll")) return null;
  return <p>データ出典: <a href="https://wikiwiki.jp/lcbwiki/" target="_blank" rel="noreferrer">LimbusCompany攻略Wiki</a></p>;
}

function SiteNav() {
  const { pathname } = useLocation();
  const active = activeNavItem(originalPath(pathname));
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
      aria-current={isPage(originalPath(pathname), "/search") ? "page" : undefined}
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
      document.documentElement.lang = isEnglish(pathname) ? "en" : "ja";
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
      for (const language of ["ja", "en"] as const) {
        setHead(`link[rel="alternate"][hreflang="${language}"]`, () => Object.assign(document.createElement("link"), { rel: "alternate", hreflang: language }), "href", canonicalUrl(languagePath(pathname, language)));
      }
      // 静的 HTML(scripts/prerender.ts)と同じく、x-default は日本語版を指す
      setHead('link[rel="alternate"][hreflang="x-default"]', () => Object.assign(document.createElement("link"), { rel: "alternate", hreflang: "x-default" }), "href", canonicalUrl(languagePath(pathname, "ja")));
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
  const { pathname } = useLocation();
  const loaded = useSyncExternalStore(subscribeTranslations, englishLoaded, englishLoaded);
  useEffect(() => {
    if (isEnglish(pathname) && !loaded) preloadRoute(pathname).catch((e: unknown) => console.error("英語データの読み込みに失敗した", e));
  }, [pathname, loaded]);
  if (isEnglish(pathname) && !loaded) return <p className="container section" lang="en" aria-busy="true">Loading English…</p>;
  return <LanguageContext.Provider value={isEnglish(pathname) ? "en" : "ja"}><AppContent /></LanguageContext.Provider>;
}

function LanguageSwitch() {
  const { pathname, search, hash } = useLocation();
  const current = isEnglish(pathname) ? "en" : "ja";
  return (
    <div className="language-control" role="group" aria-label={current === "en" ? "Language" : "言語"}>
      {([["ja", "日本語"], ["en", "EN"]] as const).map(([language, label]) => language === current
        ? <span key={language} className="language-option is-active" lang={language} aria-current="true">{label}</span>
        : <Link key={language} className="language-option language-switch" localize={false}
          to={`${languagePath(pathname, language)}${search}${hash}`} lang={language} hrefLang={language}
          aria-label={language === "ja" ? "Switch to Japanese" : "Switch to English"}
          title={language === "ja" ? "日本語" : "English"}>{label}</Link>)}
    </div>
  );
}

function AppContent() {
  const { pathname } = useLocation();
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
          <LanguageSwitch />
        </div>
      </header>

      <main className="site-main">
        {isEnglish(pathname) && <p className="container translation-note" lang="en">English translation in progress. Untranslated passages remain in Japanese.</p>}
        {/* ページのコードを読み込む間の表示。静的 HTML を引き継ぐときは先に読み込むので出ない */}
        <Suspense fallback={<div className="container section" aria-busy="true" />}>
          <Routes>
            {APP_ROUTES.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
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
