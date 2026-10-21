import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "../components/Link";
import Breadcrumb from "../components/Breadcrumb";
import PageToc from "../components/PageToc";
import { getEgo, getPersona, getTeam, loadTeamGuide, peekTeamGuide } from "../data/loader";
import type { Guide } from "../guide";
import { asset } from "../lib";
import { SIN_ORDER } from "../sinColors";
import type { TeamData, TeamMember } from "../types";
import { SinBadge } from "../components/ui";
import { GuideSection } from "../components/GuideView";
import { AptitudeBadges, PersonaRow } from "../components/TeamLinks";
import { getKeywordPage } from "../keywordPages";
import { supportPassivesPath } from "../supportPassives";
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

// 補助的な項目(裏置き・持ち込むE.G.O)用の小さな表示。解説は title で出す
function Chip({ to, image, name, note }: { to: string; image?: string; name: string; note?: string }) {
  return (
    <li>
      <Link to={to} className="team-chip" title={note}>
        {image && <img src={asset(image)} alt="" width={24} height={24} loading="lazy" />}
        {name}
      </Link>
    </li>
  );
}

export default function TeamPage() {
  const { id = "" } = useParams<{ id: string }>();
  const team = getTeam(id);
  // 読み込んだ ID と一緒に持ち、別の編成の解説が一瞬表示されないようにする
  const [loaded, setLoaded] = useState<{ id: string; guide: Guide | null } | null>(null);
  const guide = loaded?.id === id ? loaded.guide : peekTeamGuide(id);

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
  // 状態異常の編成は、同じキーワードの人格一覧へつなぐ
  const keywordPage = getKeywordPage(id);

  if (!team) {
    return (
      <div className="container section">
        <p className="empty">編成が見つからない。</p>
        <Link to="/teams" className="back-link">
          ← 編成例の一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="container section team-page">
      <Breadcrumb items={[{ label: "編成例", to: "/teams" }, { label: team.name }]} />
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
        {keywordPage && (
          <p className="team-lead">
            ほかの候補は<Link to={`/keywords/${keywordPage.id}`}>{keywordPage.keyword}人格一覧</Link>から探せる。
          </p>
        )}
      </header>

      <PageToc />

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

      {team.examples && team.examples.length > 0 && (
        <section className="section-block team-examples">
          <header className="section-header">
            <h2 className="section-title">編成例</h2>
            <span className="section-count">
              {team.category === "鏡ダンジョン" ? "必須の人格以外の枠は自由" : "組み方の例。出撃7人"}
            </span>
          </header>
          <div className="team-combos">
            {team.examples.map((x) => (
              <div key={x.name} className="team-example">
                <h3 className="team-example-name">{x.name}</h3>
                <p className="team-combo-note">{x.note}</p>
                <ol className="team-members team-members-dense team-example-list">
                  {x.members.map((m, i) => (
                    <PersonaRow key={m.code} member={m} index={i + 1} />
                  ))}
                </ol>
                {x.support.length > 0 && (
                <div className="team-example-extra">
                  <span className="team-example-label">裏置き</span>
                  <ul className="team-chips">
                    {x.support.map((m) => {
                      const s = getPersona(m.code)?.status;
                      return s ? <Chip key={m.code} to={`/persona/${s.code}`} image={s.image} name={s.name} note={m.note} /> : null;
                    })}
                  </ul>
                </div>
                )}
                <div className="team-example-extra">
                  <span className="team-example-label">E.G.O</span>
                  <ul className="team-chips">
                    {x.egos.map((m) => {
                      const e = getEgo(m.code)?.ego;
                      return e ? <Chip key={m.code} to={`/ego/${e.code}`} image={e.image} name={e.name} note={m.note} /> : null;
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {team.combos && team.combos.length > 0 && (
        <section className="section-block">
          <header className="section-header">
            <h2 className="section-title">コンビ・トリオ運用</h2>
            <span className="section-count">同じ所属などで組むと強いまとまり</span>
          </header>
          <div className="team-combos">
            {team.combos.map((c) => (
              <div key={c.name} className="team-combo">
                <h3 className="team-combo-name">{c.name}</h3>
                <p className="team-combo-note">{c.note}</p>
                <ul className="team-members team-members-dense">
                  {c.members.map((m) => (
                    <PersonaRow key={m.code} member={m} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
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
            {key === "support" && (
              <Link to={supportPassivesPath()} className="back-link team-support-link">
                ほかの裏置き候補をサポートパッシブ一覧で探す →
              </Link>
            )}
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
        ← 編成例の一覧に戻る
      </Link>
    </div>
  );
}
