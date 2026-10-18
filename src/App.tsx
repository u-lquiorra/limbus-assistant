import { useEffect } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import CharacterDetail from "./pages/CharacterDetail";
import PersonaPage from "./pages/PersonaPage";
import EgoPage from "./pages/EgoPage";
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
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
          <nav className="site-nav">
            <Link to="/">囚人一覧</Link>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/character/:name" element={<CharacterDetail />} />
          <Route path="/persona/:code" element={<PersonaPage />} />
          <Route path="/ego/:code" element={<EgoPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            データ出典:{" "}
            <a href="https://wikiwiki.jp/lcbwiki/" target="_blank" rel="noreferrer">
              LimbusCompany攻略Wiki
            </a>
          </p>
          <p>
            本サイトは非公式のファンサイトです。ゲーム内の画像・キャラクター等の著作権は Project Moon に帰属します。
          </p>
        </div>
      </footer>
    </HashRouter>
  );
}

export default App;
