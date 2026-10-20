import { Link } from "react-router-dom";
import type { EgoSummary } from "../types";
import { asset } from "../lib";
import { egoCostSins } from "../egoFilter";
import { SinBadge } from "./ui";

// 人格カード(PersonaCard)と同じ見た目の CSS を使い回す。
// detailed は全囚人の E.G.O を並べる一覧(/egos)用で、囚人名と必要資源も出す
export default function EgoCard({ ego, detailed = false }: { ego: EgoSummary; detailed?: boolean }) {
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
        <span className="persona-card-code">{detailed ? `${ego.character} ・ ${ego.code}` : ego.code}</span>
        <span className="persona-card-name">{ego.name}</span>
        <div className="persona-card-meta">
          <SinBadge sin={ego.sin} />
          <span className="staged-history">{ego.attackTypes}</span>
        </div>
        {detailed && (
          <div className="ego-card-cost" aria-label="必要資源">
            {egoCostSins(ego).map((sin) => (
              <SinBadge key={sin} sin={sin} label={`${sin}×${ego.cost[sin]}`} />
            ))}
          </div>
        )}
        {/* 入手シーズンは常に罪悪属性の下段に置く。無い場合も行を確保して位置を揃える */}
        <span className="staged-history ego-note">{ego.note || " "}</span>
      </div>
    </Link>
  );
}
