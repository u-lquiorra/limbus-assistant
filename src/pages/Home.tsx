import { Link } from "react-router-dom";
import { characterList } from "../data/loader";
import { keywordFilterPath } from "../keywordPages";
import { egoFilterPath } from "../egoFilter";
import { asset } from "../lib";
import SiteLogo from "../components/SiteLogo";
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
        {/* 添付の警告画面を透過した画像。装飾は読み上げ対象から外す。 */}
        <div className="hero-warning" aria-hidden="true">
          <img src={asset("images/home/trigger-warning.png")} alt="" width={1672} height={941} />
        </div>
        <div className="container hero-inner">
          <div className="hero-text">
            <p className="kicker">UNOFFICIAL DATABASE</p>
            <h1 className="hero-title">
              <span className="visually-hidden">Limbus Assistant</span>
              <SiteLogo lines={["LIMBUS", "ASSISTANT"]} className="hero-logo" />
            </h1>
            <p className="hero-motto" lang="en">
              <span>FACE THE SIN,</span>{" "}<span>SAVE THE E.G.O</span>
            </p>
            <p className="hero-lead">
              <span className="hero-lead-full">人格・E.G.O・編成・ボス攻略・用語など。非公式攻略データベース。</span>
              <span className="hero-lead-short">人格・E.G.O・編成・ボス・用語などの非公式攻略DB</span>
            </p>

            <div role="search">
              <SearchBox
                {...boxProps}
                placeholder="人格・囚人・ボス・用語・編成で検索"
                label="サイト内を検索"
              />
            </div>

          </div>

        </div>
      </section>

      <aside className="container home-warning-reference">
        <details>
          <summary><span>TRIGGER WARNING</span> 起動時の警告画面</summary>
          <img src={asset("images/home/trigger-warning.png")} alt="ゲーム起動時の警告画面。暴力、身体欠損、自殺、差別、光過敏症などの要素を含む作品であることを示す。" width={1672} height={941} loading="lazy" />
        </details>
      </aside>

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
        <Link to={keywordFilterPath()} className="feature-callout">
          <span>
            <strong>キーワードを組み合わせて人格を探す</strong>
            <span>火傷＋出血など、選んだキーワードを全て持つ人格に絞り込む。</span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link to={egoFilterPath()} className="feature-callout">
          <span>
            <strong>E.G.Oを必要資源で探す</strong>
            <span>全囚人のE.G.Oから、選んだ罪悪属性の資源だけで使えるものに絞り込む。</span>
          </span>
          <span aria-hidden="true">→</span>
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
