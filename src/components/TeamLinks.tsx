import { Link } from "react-router-dom";
import type { TeamData } from "../types";

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
