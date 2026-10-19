import { Link } from "react-router-dom";
import { allPersonas, characterList } from "../data/loader";
import { asset } from "../lib";
import SiteSearchResults from "../components/SiteSearchResults";
import { SearchBox } from "../components/ui";
import { useSearchQuery } from "../useSearchQuery";

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
  const { value: query, boxProps } = useSearchQuery();
  const q = query.trim();

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

          <div role="search">
            <SearchBox
              {...boxProps}
              placeholder="人格・囚人・ボス・用語・編成で検索"
              label="サイト内を検索"
            />
          </div>

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
          </header>
          <SiteSearchResults query={query} headingLevel="h3" />
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
