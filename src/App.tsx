import { useEffect, useRef } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
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
import { NAV_ITEMS, activeNavItem } from "./nav";
import "./App.css";

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

function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <header className="site-header">
        <div className="container site-header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">
              LIMBUS <span className="brand-accent">ASSISTANT</span>
            </span>
          </Link>
          <SiteNav />
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
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/glossary/:id" element={<GlossaryDetail />} />
          <Route path="/beginner" element={<BeginnerGuide />} />
          <Route path="/reroll" element={<RerollGuide />} />
          <Route path="/bosses" element={<BossIndex />} />
          <Route path="/bosses/:id" element={<BossPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="container">
          <DataSourceNote />
          <p>
            本サイトは非公式のファンサイト。ゲーム内の画像・キャラクター等の著作権は Project Moon に帰属する。
          </p>
        </div>
      </footer>
    </HashRouter>
  );
}

export default App;
