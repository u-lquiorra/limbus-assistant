import { useState } from "react";
import type { PersonaStatus, PersonaSkills } from "../types";
import { SIN_COLORS } from "../sinColors";

interface Props {
  status: PersonaStatus;
  skills?: PersonaSkills;
}

function SkillRow({ label, cell }: { label: string; cell: PersonaSkills["s1"] | undefined }) {
  if (!cell) return null;
  return (
    <div className="skill-row">
      <span className="skill-label">{label}</span>
      {cell.power ? (
        <span className="skill-detail">
          {cell.type && <span className="skill-type">{cell.type}</span>}
          威力{cell.power}
          {cell.bonus && <span className="skill-bonus"> (+{cell.bonus})</span>}
          {cell.coins && <span className="skill-coins"> ×{cell.coins}コイン</span>}
          {cell.levelReq && <span className="skill-lv"> Lv{cell.levelReq}〜</span>}
        </span>
      ) : (
        <span className="skill-detail skill-raw">{cell.raw || "-"}</span>
      )}
    </div>
  );
}

export default function PersonaCard({ status, skills }: Props) {
  const [open, setOpen] = useState(false);
  const resourceEntries = Object.entries(status.resourceCost).filter(([, v]) => v);

  return (
    <div className="persona-card">
      <button className="persona-header" onClick={() => setOpen((o) => !o)}>
        <span className="persona-code">{status.code}</span>
        <span className="persona-name">{status.name}</span>
        <span className="persona-toggle">{open ? "▾" : "▸"}</span>
      </button>

      <div className="persona-stats">
        <span className="stat">HP {status.hp}</span>
        <span className="stat">防御 {status.defense}</span>
        <span className="stat">速度 {status.speed}</span>
        <span className="stat">Lv {status.level}</span>
      </div>

      {open && (
        <div className="persona-body">
          <div className="persona-section">
            <h4>耐性 (被ダメージ倍率)</h4>
            <div className="resistance-row">
              <span className="resistance-chip">斬 {status.resistance.斬 || "1"}</span>
              <span className="resistance-chip">貫 {status.resistance.貫 || "1"}</span>
              <span className="resistance-chip">打 {status.resistance.打 || "1"}</span>
            </div>
            {status.attackTypes && (
              <p className="attack-types">主な攻撃属性: {status.attackTypes}</p>
            )}
          </div>

          {resourceEntries.length > 0 && (
            <div className="persona-section">
              <h4>罪属性リソース</h4>
              <div className="resource-row">
                {resourceEntries.map(([sin, value]) => (
                  <span
                    key={sin}
                    className="resource-chip"
                    style={{ backgroundColor: SIN_COLORS[sin] ?? "#888" }}
                  >
                    {sin} {value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {skills && (
            <div className="persona-section">
              <h4>スキル</h4>
              <SkillRow label="スキル1" cell={skills.s1} />
              <SkillRow label="スキル2" cell={skills.s2} />
              <SkillRow label="スキル3" cell={skills.s3} />
              <SkillRow label="防御" cell={skills.defenseSkill} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
