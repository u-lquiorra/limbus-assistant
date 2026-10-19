import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { allPersonas, characterList } from "../data/loader";
import { asset } from "../lib";
import PersonaCard from "../components/PersonaCard";
import { SearchBox } from "../components/ui";

const MAX_RESULTS = 48;

export default function Home() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return allPersonas.filter(({ status }) =>
      [status.name, status.character, status.affiliation?.name ?? "", status.code].some((s) =>
        s.toLowerCase().includes(q)
      )
    );
  }, [q]);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="kicker">UNOFFICIAL DATABASE</p>
          <h1 className="hero-title">
            LIMBUS
            <br />
            <span>ASSISTANT</span>
          </h1>
          <p className="hero-lead">Limbus Company の囚人・人格データを日本語でまとめた非公式攻略データベース。</p>

          <SearchBox value={query} onChange={setQuery} placeholder="人格・所属・囚人名で検索" label="人格を検索" />

          <dl className="hero-stats">
            <div>
              <dt>囚人</dt>
              <dd>{characterList.length}</dd>
            </div>
            <div>
              <dt>人格</dt>
              <dd>{allPersonas.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      {q && (
        <section className="container section">
          <header className="section-header">
            <h2 className="section-title">
              <span className="section-title-en">RESULTS</span>
              検索結果
            </h2>
            <span className="section-count">{results.length}件</span>
          </header>
          {results.length ? (
            <div className="persona-grid">
              {results.slice(0, MAX_RESULTS).map(({ status, skills }) => (
                <PersonaCard key={status.code} status={status} skills={skills} showCharacter />
              ))}
            </div>
          ) : (
            <p className="empty">「{query}」に一致する人格は見つからない。</p>
          )}
          {results.length > MAX_RESULTS && (
            <p className="empty">上位{MAX_RESULTS}件を表示中。条件を絞り込むと探しやすい。</p>
          )}
        </section>
      )}

      <section className="container section home-guides">
        <Link to="/reroll" className="beginner-home-link">
          <span className="kicker">REROLL GUIDE</span>
          <strong>これから始めるなら、リセマラガイド</strong>
          <span>おすすめ人格・終了ライン・スマホとSteamの違いを確認。 →</span>
        </Link>
        <Link to="/beginner" className="beginner-home-link">
          <span className="kicker">NEW MANAGER GUIDE</span>
          <strong>まず何をすればいい？ 初心者ガイド</strong>
          <span>ストーリーの進め方から、育成・日課・交換までを順番に案内する。 →</span>
        </Link>
      </section>

      <section className="container section">
        <header className="section-header">
          <h2 className="section-title">
            <span className="section-title-en">SINNERS</span>
            囚人一覧
          </h2>
        </header>
        <div className="sinner-grid">
          {characterList.map((c) => (
            <Link key={c.name} to={`/character/${encodeURIComponent(c.name)}`} className="sinner-card">
              {c.posterThumb && <img src={asset(c.posterThumb)} alt="" loading="lazy" width={420} height={594} />}
              <div className="sinner-card-shade" />
              <div className="sinner-card-body">
                <span className="sinner-card-no">No.{c.number}</span>
                <span className="sinner-card-name">{c.name}</span>
                <span className="sinner-card-quote">{c.profileText}</span>
                <span className="sinner-card-count">人格 {c.personaCount}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
