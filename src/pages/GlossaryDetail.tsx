import { Navigate, useParams } from "react-router-dom";
import { Link } from "../components/Link";
import { getGlossaryTerm, glossarySectionRedirect, GLOSSARY_CATEGORIES } from "../glossary";
import { TermCard } from "./GlossaryPage";
import GlossaryExample from "../components/GlossaryExample";
import GlossarySectionHeader from "../components/GlossarySectionHeader";
import { keywordPageForGlossary } from "../keywordPages";
import "./glossary.css";

export default function GlossaryDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const term = getGlossaryTerm(id);
  const redirect = glossarySectionRedirect(id);
  if (redirect) return <Navigate to={redirect} replace />;
  if (!term) return (
    <div className="container section">
      <h1 className="section-title">用語が見つからない</h1>
      <p className="empty">URLを確認するか、用語一覧から探す。</p>
      <Link to="/glossary" className="back-link">← 用語一覧に戻る</Link>
    </div>
  );
  // 状態異常のキーワード(火傷・破裂など)は、そのキーワードを持つ人格一覧へつなぐ
  const keywordPage = keywordPageForGlossary(term.id);
  const related = term.related.flatMap((key) => {
    const entry = getGlossaryTerm(key);
    return entry ? [entry] : [];
  });
  return (
    <article className="container section glossary-page">
      <nav className="breadcrumb" aria-label="パンくずリスト">
        <Link to="/">ホーム</Link><span aria-hidden="true">/</span><Link to="/glossary">用語辞典</Link><span aria-hidden="true">/</span><span aria-current="page">{term.name}</span>
      </nav>
      <header className="dictionary-heading">
        <p className="kicker">GLOSSARY / {GLOSSARY_CATEGORIES[term.category]}</p>
        <h1 className="persona-title">{term.name}</h1>
        <p className="persona-ruby">{term.reading}</p>
        <div className="persona-tags">
          <span className="tag tag-muted">{GLOSSARY_CATEGORIES[term.category]}</span>
          {keywordPage && <Link className="tag tag-link" to={`/keywords/${keywordPage.id}`}>{keywordPage.keyword}人格一覧</Link>}
        </div>
        <p className="term-aliases">関連する表記・検索語：{term.aliases.join("・")}</p>
      </header>
      <section className="guide term-summary" aria-labelledby="term-summary-title">
        <h2 id="term-summary-title" className="guide-heading">ひとことで</h2><p>{term.summary}</p>
      </section>
      <div className="term-detail-grid">
        <section className="term-section" aria-labelledby="term-mechanism">
          <GlossarySectionHeader id="term-mechanism" label="GUIDE">仕組み</GlossarySectionHeader>
          {term.explanation.map((text) => <p key={text}>{text}</p>)}
        </section>
        <section className="term-section term-cautions" aria-labelledby="term-cautions">
          <GlossarySectionHeader id="term-cautions" label="NOTES">よくある誤解</GlossarySectionHeader>
          <ul>{term.cautions.map((text) => <li key={text}>{text}</li>)}</ul>
        </section>
      </div>
      {term.sections && <section className="term-section" aria-labelledby="term-abilities">
        <GlossarySectionHeader id="term-abilities" label={term.category === "sapling" ? "ABILITIES" : "DETAILS"}>{term.category === "sapling" ? "能力一覧" : "項目別の説明"}</GlossarySectionHeader>
        <nav className="persona-tags term-ability-nav" aria-label={`${term.name}の項目`}>
          {term.sections.map((section) => <Link key={section.id} className="tag tag-link" to={`/glossary/${term.id}#${section.id}`}>{section.name}</Link>)}
        </nav>
        <div className="term-abilities">
          {term.sections.map((section) => <section key={section.id} id={section.id} className="term-ability" aria-labelledby={`${section.id}-title`}>
            <header className="term-ability-heading"><h3 id={`${section.id}-title`}>{section.name}</h3><span>{section.reading}</span></header>
            <p className="term-ability-summary">{section.summary}</p>
            {section.explanation.map((text) => <p key={text}>{text}</p>)}
            <ul>{section.cautions.map((text) => <li key={text}>{text}</li>)}</ul>
            <h4 className="guide-heading">{section.example.title}</h4>
            <GlossaryExample example={section.example} />
            <p className="term-example-note">{section.example.note}</p>
          </section>)}
        </div>
      </section>}
      <section className="term-example" aria-labelledby="term-example-title">
        <GlossarySectionHeader id="term-example-title" label="EXAMPLE">具体例</GlossarySectionHeader>
        <h3 className="guide-heading term-example-heading">{term.example.title}</h3>
        <GlossaryExample example={term.example} />
        <p className="term-example-note">{term.example.note}</p>
      </section>
      <section className="term-section" aria-labelledby="term-related">
        <GlossarySectionHeader id="term-related" label="RELATED">関連用語</GlossarySectionHeader>
        <div className="term-grid">{related.map((entry) => <TermCard key={entry.id} term={entry} />)}</div>
      </section>
      <footer className="term-sources">
        {/* 出典(term.sources)は画面に出さず、データにだけ残す */}
        <p>内容確認日：<time dateTime={term.checkedAt}>{term.checkedAt}</time> ／ 基本的な仕組みを解説。個別スキルや敵の例外は、それぞれの効果文も確認する。</p>
      </footer>
      <Link to="/glossary" className="back-link">← 用語一覧に戻る</Link>
    </article>
  );
}
