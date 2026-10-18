import { Link } from "react-router-dom";
import type { EgoSummary } from "../types";
import { asset } from "../lib";
import { SinBadge } from "./ui";

// 人格カード(PersonaCard)と同じ見た目の CSS を使い回す
export default function EgoCard({ ego }: { ego: EgoSummary }) {
  return (
    <Link to={`/ego/${ego.code}`} className="persona-card ego-card">
      <div className="persona-card-media">
        {ego.image ? (
          <img src={asset(ego.image)} alt="" loading="lazy" width={480} height={480} />
        ) : (
          <div className="persona-card-placeholder" />
        )}
        <span className={`persona-card-season ego-rank ego-rank-${ego.rank}`}>{ego.rank}</span>
      </div>
      <div className="persona-card-body">
        <span className="persona-card-code">{ego.code}</span>
        <span className="persona-card-name">{ego.name}</span>
        <div className="persona-card-meta">
          <SinBadge sin={ego.sin} />
          <span className="staged-history">{ego.attackTypes}</span>
        </div>
        {/* 入手シーズンは常に罪悪属性の下段に置く。無い場合も行を確保して位置を揃える */}
        <span className="staged-history ego-note">{ego.note || " "}</span>
      </div>
    </Link>
  );
}
