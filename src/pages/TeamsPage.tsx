import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPersona, teams } from "../data/loader";
import { asset } from "../lib";
import type { TeamData } from "../types";
import { AptitudeBadges } from "../components/TeamLinks";
import "./teams.css";

const CATEGORIES: TeamData["category"][] = ["状態異常", "所属", "その他", "鏡ダンジョン"];
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
        軸になるキーワードや所属ごとに、組み方と回し方をまとめています。手持ちに無い人格は、各編成の自由枠・代替枠から選んでください。
      </p>

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
        <p className="empty">条件に一致する編成はありません。</p>
      )}
    </section>
  );
}
