import { Link } from "react-router-dom";
import { getPersona } from "../data/loader";
import { asset, seasonLabel } from "../lib";
import type { TeamData, TeamMember } from "../types";

// 人格1人の行(画像・名前・囚人とシーズン・一言)。編成ページの各枠と、編成一覧の「単体で強い人格」で使う
export function PersonaRow({ member, index }: { member: TeamMember; index?: number }) {
  const ctx = getPersona(member.code);
  if (!ctx) return null;
  const { status } = ctx;
  return (
    <li className="team-member">
      {index !== undefined && <span className="team-member-index" aria-hidden="true">{index}</span>}
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

// 人格・E.G.O ページの「この人格(E.G.O)が入る編成例」。編成データ(teams.json)からの逆引き
export default function TeamLinks({ teams, label }: { teams: TeamData[]; label: string }) {
  if (!teams.length) return null;
  return (
    <div className="team-links">
      <span className="team-links-label">{label}</span>
      {teams.map((t) => (
        <Link key={t.id} to={`/teams/${t.id}`} className="tag tag-link">
          {t.name}
        </Link>
      ))}
    </div>
  );
}

// 適性を ◎〇△✖ のバッジで並べる(通常の編成は 通常・短期・長期、鏡ダンジョンの編成は 周回・深層)
export function AptitudeBadges({ aptitude }: { aptitude: TeamData["aptitude"] }) {
  return (
    <span className="team-aptitude">
      {Object.entries(aptitude).map(([k, v]) => (
        <span key={k} className="team-aptitude-item" title={`${k}への適性`}>
          {k}
          <b>{v}</b>
        </span>
      ))}
    </span>
  );
}
