import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SearchBox } from "../components/ui";
import { filterGlossary, GLOSSARY_CATEGORIES, glossaryTerms, type GlossaryTerm } from "../glossary";
import "./glossary.css";

export function TermCard({ term }: { term: GlossaryTerm }) {
  return (
    <Link to={`/glossary/${term.id}`} className="term-card">
      <div className="term-card-heading">
        <h3>{term.name}</h3>
        <span className="passive-cond term-category">{GLOSSARY_CATEGORIES[term.category]}</span>
      </div>
      <p>{term.summary}</p>
      <span className="term-card-arrow" aria-hidden="true">→</span>
    </Link>
  );
}

export default function GlossaryPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [searchValue, setSearchValue] = useState(query);
  const composing = useRef(false);
  const rawCategory = params.get("category") ?? "";
  const category = Object.hasOwn(GLOSSARY_CATEGORIES, rawCategory) ? rawCategory : "";
  const terms = filterGlossary(searchValue, category);
  const pageSize = 24;
  const pageCount = Math.max(1, Math.ceil(terms.length / pageSize));
  const requestedPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, pageCount)) : 1;
  const shown = terms.slice((page - 1) * pageSize, page * pageSize);
  const active = !!searchValue.trim() || !!category;
  const categories = Object.entries(GLOSSARY_CATEGORIES).filter(([key]) =>
    glossaryTerms.some((term) => term.category === key)
  );

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  function update(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (key !== "page") next.delete("page");
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }

  return (
    <div className="container section glossary-page">
      <header className="dictionary-heading">
        <p className="kicker">GLOSSARY</p>
        <h1 className="persona-title">用語辞典</h1>
        <p>マッチ・耐性・状態異常・E.G.Oなど、共通の仕組みを調べる。人格固有の効果は、各人格ページの用語解説で確認できる。</p>
        <p className="dictionary-coverage">共通の仕組み {glossaryTerms.length}項目</p>
      </header>
      <div className="dictionary-search">
        <SearchBox
          value={searchValue}
          onChange={(value) => {
            setSearchValue(value);
            if (!composing.current) update("q", value);
          }}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={(value) => {
            composing.current = false;
            setSearchValue(value);
            update("q", value);
          }}
          label="用語を検索"
          placeholder="用語名・読み・別名で検索（例：マッチ、SP）"
        />
        <div className="dictionary-filters" role="group" aria-label="用語のカテゴリ">
          {[["", "すべて"], ...categories].map(([key, label]) => (
            <button type="button" key={key} className={`chip${category === key ? " is-active" : ""}`} aria-pressed={category === key} onClick={() => update("category", key)}>{label}</button>
          ))}
          {active && <button type="button" className="chip-reset" onClick={() => setParams({}, { replace: true })}>条件をクリア</button>}
        </div>
      </div>
      <section aria-labelledby="dictionary-results">
        <header className="section-header">
          <h2 id="dictionary-results" className="section-title"><span className="section-title-en">{active ? "RESULTS" : "GLOSSARY"}</span>{active ? "検索結果" : "用語一覧"}</h2>
          <span className="section-count" role="status">{terms.length} / {glossaryTerms.length}項目</span>
        </header>
        {terms.length ? <div className="term-grid">{shown.map((term) => <TermCard key={term.id} term={term} />)}</div> : (
          <div className="dictionary-empty">
            <p>条件に一致する用語なし。</p>
            <p>別の言葉で検索するか、カテゴリを「すべて」に戻すと探しやすい。</p>
            <button type="button" className="chip" onClick={() => setParams({}, { replace: true })}>すべての用語を見る</button>
          </div>
        )}
        {pageCount > 1 && <nav className="dictionary-pagination" aria-label="用語一覧のページ">
          <button type="button" className="chip" disabled={page === 1} onClick={() => update("page", String(page - 1))}>← 前へ</button>
          <span aria-live="polite">{page} / {pageCount}ページ</span>
          <button type="button" className="chip" disabled={page === pageCount} onClick={() => update("page", String(page + 1))}>次へ →</button>
        </nav>}
      </section>
    </div>
  );
}
