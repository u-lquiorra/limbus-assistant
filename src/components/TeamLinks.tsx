import { Link } from "react-router-dom";
import type { TeamData } from "../types";

// 人格・E.G.O ページの「この人格(E.G.O)が入るおすすめ編成」。編成データ(teams.json)からの逆引き
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

// 適性(通常戦闘・短期戦・長期戦)を ◎〇△✖ のバッジで並べる
export function AptitudeBadges({ aptitude }: { aptitude: TeamData["aptitude"] }) {
  return (
    <span className="team-aptitude">
      {(["通常", "短期", "長期"] as const).map((k) => (
        <span key={k} className="team-aptitude-item" title={`${k}戦闘への適性`}>
          {k}
          <b>{aptitude[k]}</b>
        </span>
      ))}
    </span>
  );
}
