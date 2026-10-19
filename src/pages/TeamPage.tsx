import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEgo, getPersona, getTeam, loadTeamGuide } from "../data/loader";
import type { Guide } from "../guide";
import { asset, seasonLabel } from "../lib";
import { SIN_ORDER } from "../sinColors";
import type { TeamData, TeamMember } from "../types";
import { SinBadge } from "../components/ui";
import { GuideSection } from "../components/GuideView";
import { AptitudeBadges } from "../components/TeamLinks";
import "./teams.css";

const SLOTS: { key: "core" | "flex" | "alternatives" | "support"; title: string; note: string }[] = [
  { key: "core", title: "優先枠", note: "編成の軸。できるだけ入れたい人格" },
  { key: "flex", title: "自由枠", note: "優先枠で埋まらない残りの枠の候補" },
  { key: "alternatives", title: "代替枠", note: "手持ちに無いときの代わり" },
  { key: "support", title: "裏置き", note: "サポートパッシブのため控えに置く人格" },
];

// 人格の資源構成("3" / "2防" など)から攻撃スキルの枚数を取り出す
function skillCount(raw: string | undefined): number {
  return Number.parseInt(raw ?? "", 10) || 0;
}

// 優先枠の人格が出せる罪悪属性の資源(攻撃スキル6枚中の枚数の合計)
function resourceTotals(team: TeamData): [string, number][] {
  const totals = new Map<string, number>();
  for (const m of team.core) {
    const status = getPersona(m.code)?.status;
    for (const sin of SIN_ORDER) totals.set(sin, (totals.get(sin) ?? 0) + skillCount(status?.sinSkills?.[sin]));
  }
  return SIN_ORDER.map((sin) => [sin, totals.get(sin) ?? 0] as [string, number])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
}

function PersonaRow({ member }: { member: TeamMember }) {
  const ctx = getPersona(member.code);
  if (!ctx) return null;
  const { status } = ctx;
  return (
    <li className="team-member">
      <Link to={`/persona/${status.code}`} className="team-member-thumb" tabIndex={-1} aria-hidden="true">
        {status.image && <img src={asset(status.image)} alt="" width={56} height={56} loading="lazy" />}
      </Link>
      <div className="team-member-body">
        <Link to={`/persona/${status.code}`} className="team-member-name">
          {status.name}
        </Link>
        <span className="team-member-sub">
          {status.character} ・ {seasonLabel(status.season)}
        </span>
        {member.note && <p className="team-member-note">{member.note}</p>}
      </div>
    </li>
  );
}

function EgoRow({ member }: { member: TeamMember }) {
  const ctx = getEgo(member.code);
  if (!ctx) return null;
  const { ego } = ctx;
  return (
    <li className="team-member">
      <Link to={`/ego/${ego.code}`} className="team-member-thumb" tabIndex={-1} aria-hidden="true">
        {ego.image && <img src={asset(ego.image)} alt="" width={56} height={56} loading="lazy" />}
      </Link>
      <div className="team-member-body">
        <Link to={`/ego/${ego.code}`} className="team-member-name">
          {ego.name}
        </Link>
        <span className="team-member-sub">
          {ego.character} ・ {ego.rank} ・ {ego.sin}
        </span>
        {member.note && <p className="team-member-note">{member.note}</p>}
      </div>
    </li>
  );
}

export default function TeamPage() {
  const { id = "" } = useParams<{ id: string }>();
  const team = getTeam(id);
  // 読み込んだ ID と一緒に持ち、別の編成の解説が一瞬表示されないようにする
  const [loaded, setLoaded] = useState<{ id: string; guide: Guide | null } | null>(null);
  const guide = loaded?.id === id ? loaded.guide : undefined;

  useEffect(() => {
    let cancelled = false;
    loadTeamGuide(id)
      .catch((e: unknown) => {
        // 解説は補助情報なので、読めなければ欄ごと出さない(原因はログに残す)
        console.error(`編成の解説の読み込みに失敗しました: ${id}`, e);
        return null;
      })
      .then((g) => {
        if (!cancelled) setLoaded({ id, guide: g });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const resources = useMemo(() => (team ? resourceTotals(team) : []), [team]);

  if (!team) {
    return (
      <div className="container section">
        <p className="empty">編成が見つからない。</p>
        <Link to="/teams" className="back-link">
          ← おすすめ編成の一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="container section team-page">
      <nav className="breadcrumb" aria-label="パンくずリスト">
        <Link to="/teams">おすすめ編成</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{team.name}</span>
      </nav>
      <header className="team-hero">
        <p className="kicker">
          TEAM ・ {team.category} ・ {team.difficulty}向け
        </p>
        <h1 className="persona-title">{team.name}</h1>
        <div className="persona-tags">
          {team.keywords.map((k) => (
            <span key={k} className="tag">
              {k}
            </span>
          ))}
          <AptitudeBadges aptitude={team.aptitude} />
        </div>
      </header>

      {guide && guide.sections.length > 0 && (
        <GuideSection
          sections={guide.sections}
          keywords={[]}
          updated={guide.meta.updated}
          title="組み方と回し方"
          note="メンバーの効果文をもとにした解説。"
          withThumbs
        />
      )}

      {SLOTS.map(({ key, title, note }) =>
        team[key].length ? (
          <section key={key} className="section-block">
            <header className="section-header">
              <h2 className="section-title">{title}</h2>
              <span className="section-count">{note}</span>
            </header>
            <ul className={`team-members${key === "core" || key === "support" ? "" : " team-members-compact"}`}>
              {team[key].map((m) => (
                <PersonaRow key={m.code} member={m} />
              ))}
            </ul>
          </section>
        ) : null
      )}

      {resources.length > 0 && (
        <section className="section-block">
          <header className="section-header">
            <h2 className="section-title">優先枠で出せる資源</h2>
            <span className="section-count">攻撃スキルの枚数の合計</span>
          </header>
          <div className="team-resources">
            {resources.map(([sin, n]) => (
              <SinBadge key={sin} sin={sin} label={`${sin} ${n}`} />
            ))}
          </div>
        </section>
      )}

      {team.egos.length > 0 && (
        <section className="section-block">
          <header className="section-header">
            <h2 className="section-title">相性の良いE.G.O</h2>
          </header>
          <ul className="team-members team-members-compact">
            {team.egos.map((m) => (
              <EgoRow key={m.code} member={m} />
            ))}
          </ul>
        </section>
      )}

      <Link to="/teams" className="back-link">
        ← おすすめ編成の一覧に戻る
      </Link>
    </div>
  );
}
