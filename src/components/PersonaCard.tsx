import { Link } from "react-router-dom";
import type { PersonaStatus, PersonaSkills } from "../types";
import { asset, personaAttackTypes, personaSins, seasonLabel } from "../lib";
import { AttackTypeIcon, SinDot } from "./ui";

interface Props {
  status: PersonaStatus;
  skills?: PersonaSkills;
  showCharacter?: boolean;
}

export default function PersonaCard({ status, skills, showCharacter }: Props) {
  return (
    <Link to={`/persona/${status.code}`} className="persona-card">
      <div className="persona-card-media">
        {status.image ? (
          <img src={asset(status.image)} alt="" loading="lazy" width={364} height={364} />
        ) : (
          <div className="persona-card-placeholder" />
        )}
        <span className="persona-card-season">{seasonLabel(status.season)}</span>
      </div>
      <div className="persona-card-body">
        <span className="persona-card-code">
          {status.code}
          {showCharacter && <span className="persona-card-char"> / {status.character}</span>}
        </span>
        <span className="persona-card-name">{status.name}</span>
        <div className="persona-card-meta">
          <span className="persona-card-icons">
            {personaAttackTypes(status).map((t) => (
              <AttackTypeIcon key={t} type={t} size={16} />
            ))}
          </span>
          <span className="persona-card-sins">
            {personaSins(skills).map((s) => (
              <SinDot key={s} sin={s} />
            ))}
          </span>
        </div>
        <dl className="persona-card-stats">
          <div>
            <dt>HP</dt>
            <dd>{status.hp}</dd>
          </div>
          <div>
            <dt>速度</dt>
            <dd>{status.speed}</dd>
          </div>
          <div>
            <dt>守備Lv</dt>
            <dd>{status.defense}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
