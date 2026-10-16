import { HashRouter, Routes, Route, Link } from "react-router-dom";
import CharacterList from "./pages/CharacterList";
import CharacterDetail from "./pages/CharacterDetail";
import "./App.css";

function App() {
  return (
    <HashRouter>
      <header className="site-header">
        <Link to="/" className="site-title">
          Limbus Assistant
        </Link>
        <span className="site-subtitle">Limbus Company 攻略データベース</span>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<CharacterList />} />
          <Route path="/character/:name" element={<CharacterDetail />} />
        </Routes>
      </main>
      <footer className="site-footer">
        データ出典:{" "}
        <a href="https://wikiwiki.jp/lcbwiki/" target="_blank" rel="noreferrer">
          LimbusCompany攻略Wiki (wikiwiki.jp/lcbwiki)
        </a>
      </footer>
    </HashRouter>
  );
}

export default App;
