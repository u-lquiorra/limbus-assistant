import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { allPersonas, characterList } from "../data/loader";
import { asset } from "../lib";
import PersonaCard from "../components/PersonaCard";
import { SearchBox } from "../components/ui";

const MAX_RESULTS = 48;

const HOME_STEPS = [
  {
    to: "/reroll",
    kicker: "REROLL",
    title: "リセマラ",
    description: "始める前に。おすすめ人格と、どこで終えてよいかの目安。",
  },
  {
    to: "/beginner",
    kicker: "BEGINNER",
    title: "初心者ガイド",
    description: "ストーリーの進め方から、育成・日課・交換までを順番に案内する。",
  },
  {
    to: "/teams",
    kicker: "TEAMS",
    title: "編成例",
    description: "火傷・出血・破裂など、キーワードごとの組み方と人格の役割。",
  },
  {
    to: "/bosses",
    kicker: "BOSSES",
    title: "ボス攻略",
    description: "詰まりやすい戦闘の負け方と対処、敵のスキル・パッシブ。",
  },
] as const;

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

      <section className="container section" aria-labelledby="home-start-title">
        <header className="section-header">
          <h2 className="section-title" id="home-start-title">
            <span className="section-title-en">START HERE</span>
            目的から探す
          </h2>
        </header>
        {/* 始めたばかりの人が上から順に進めるよう、プレイの段階に沿って並べる */}
        <ol className="home-steps">
          {HOME_STEPS.map((step, i) => (
            <li key={step.to}>
              <Link to={step.to} className="home-step">
                <span className="home-step-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="kicker">{step.kicker}</span>
                <strong>{step.title}</strong>
                <span className="home-step-desc">{step.description}</span>
              </Link>
            </li>
          ))}
        </ol>
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
