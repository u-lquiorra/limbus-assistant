import { useMemo, useState } from "react";
import { Link } from "../components/Link";
import { getPersona, standalonePersonas, teams } from "../data/loader";
import { keywordFilterPath } from "../keywordPages";
import { supportPassivesPath } from "../supportPassives";
import { asset } from "../lib";
import type { TeamData } from "../types";
import { AptitudeBadges, PersonaRow } from "../components/TeamLinks";
import "./teams.css";

// 編成が1件も無い分類(非表示中の鏡ダンジョンなど)は、押しても0件になるだけなのでボタンを出さない
const CATEGORIES = (["状態異常", "所属", "その他", "鏡ダンジョン"] as TeamData["category"][]).filter((c) =>
  teams.some((t) => t.category === c)
);
// 鏡ダンジョンの編成はギフト前提で鏡の外では成り立たないので、一覧では別のセクションに分ける
const MIRROR: TeamData["category"] = "鏡ダンジョン";
const DIFFICULTIES: TeamData["difficulty"][] = ["初心者", "中上級"];

function TeamGrid({ teams }: { teams: TeamData[] }) {
  if (!teams.length) return null;
  return (
    <div className="team-grid">
      {teams.map((t) => (
        <Link key={t.id} to={`/teams/${t.id}`} className="team-card">
          <span className="team-card-faces" aria-hidden="true">
            {t.core.slice(0, 5).map((m) => {
              const image = getPersona(m.code)?.status.image;
              return image ? <img key={m.code} src={asset(image)} alt="" width={40} height={40} loading="lazy" /> : null;
            })}
          </span>
          <span className="team-card-name">{t.name}</span>
          <span className="team-card-meta">
            <span className="tag tag-muted">{t.category}</span>
            <span className="tag tag-muted">{t.difficulty}向け</span>
            {t.keywords.map((k) => (
              <span key={k} className="tag">
                {k}
              </span>
            ))}
          </span>
          <AptitudeBadges aptitude={t.aptitude} />
        </Link>
      ))}
    </div>
  );
}

export default function TeamsPage() {
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const shown = useMemo(
    () => teams.filter((t) => (!category || t.category === category) && (!difficulty || t.difficulty === difficulty)),
    [category, difficulty]
  );

  return (
    <section className="container section">
      <header className="section-header">
        <h1 className="section-title">
          <span className="section-title-en">TEAMS</span>
          編成例
        </h1>
        <span className="section-count">
          {shown.length} / {teams.length}件
        </span>
      </header>
      <p className="team-lead">
        軸になるキーワードや所属ごとに、組み方と回し方をまとめた。手持ちに無い人格は、各編成の自由枠・代替枠から選ぶ。
      </p>
      {/* 複合キーワードの編成を組むときの候補探しに使うので、編成一覧の先頭で案内する */}
      <Link to={keywordFilterPath()} className="feature-callout">
        <span>
          <strong>キーワードを組み合わせて人格を探す</strong>
          <span>火傷＋出血など、選んだキーワードを全て持つ人格に絞り込む。キーワード別の人格一覧もここから見られる。</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link to={supportPassivesPath()} className="feature-callout">
        <span>
          <strong>裏置きの候補をサポートパッシブから探す</strong>
          <span>全人格のサポートパッシブを必要資源の罪悪属性ごとに並べ、編成でたまる資源だけで発動するものに絞り込む。</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>

      <div className="toolbar">
        <div className="chip-group" role="group" aria-label="分類で絞り込み">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${category === c ? " is-active" : ""}`}
              aria-pressed={category === c}
              onClick={() => setCategory(category === c ? null : c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="chip-group" role="group" aria-label="難易度で絞り込み">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              className={`chip${difficulty === d ? " is-active" : ""}`}
              aria-pressed={difficulty === d}
              onClick={() => setDifficulty(difficulty === d ? null : d)}
            >
              {d}向け
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <>
          <TeamGrid teams={shown.filter((t) => t.category !== MIRROR)} />
          {shown.some((t) => t.category === MIRROR) && (
            <section className="section-block team-mirror">
              <header className="section-header">
                <h2 className="section-title">鏡ダンジョン</h2>
                <span className="section-count">鏡ダンジョンのギフト前提の編成</span>
              </header>
              <TeamGrid teams={shown.filter((t) => t.category === MIRROR)} />
            </section>
          )}
        </>
      ) : (
        <p className="empty">条件に一致する編成はない。</p>
      )}

      {/* ハイブリッド・ハイランダー編成は組み方が難しいため編成としては載せず、単体で強い人格の紹介にとどめる */}
      <section className="section-block team-standalone">
        <header className="section-header">
          <h2 className="section-title">単体で強い人格</h2>
          <span className="section-count">{standalonePersonas.length}人格</span>
        </header>
        <p className="team-lead">
          特定の編成を組まなくても活躍しやすい人格。キーワードがそろわないうちの主力や、編成の空いた枠に入れやすい。ヴァルプルギスの夜の限定人格も含む。
        </p>
        <ul className="team-members team-members-compact">
          {standalonePersonas.map((m) => (
            <PersonaRow key={m.code} member={m} />
          ))}
        </ul>
      </section>
    </section>
  );
}
