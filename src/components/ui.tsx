import { SIN_COLORS, sinTextColor } from "../sinColors";
import { ATTACK_TYPE_ICON, asset } from "../lib";

export function SinBadge({ sin, label }: { sin?: string; label?: string }) {
  if (!sin) return null;
  return (
    <span className="sin-badge" style={{ background: SIN_COLORS[sin], color: sinTextColor(sin) }}>
      {label ?? sin}
    </span>
  );
}

export function SinDot({ sin }: { sin: string }) {
  return <span className="sin-dot" style={{ background: SIN_COLORS[sin] }} title={sin} aria-label={sin} />;
}

export function AttackTypeIcon({ type, size = 18 }: { type?: string; size?: number }) {
  if (!type) return null;
  const src = ATTACK_TYPE_ICON[type];
  if (!src) return <span className="attack-type-text">{type}</span>;
  return (
    <img
      className="attack-type-icon"
      src={asset(src)}
      alt={type}
      title={type}
      width={size}
      height={size}
      loading="lazy"
    />
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  small,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className={`search${small ? " search-sm" : ""}`}>
      <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}

// unbreakable: 元から破壊不能なコインの番号(1始まり)
export function Coins({ count, unbreakable = [] }: { count?: string; unbreakable?: number[] }) {
  const n = Math.min(Number.parseInt(count ?? "0", 10) || 0, 12);
  if (!n) return null;
  const ub = unbreakable.filter((i) => i <= n).length;
  return (
    <span className="coins" aria-label={`コイン${n}枚${ub ? `(うち破壊不能${ub}枚)` : ""}`}>
      {Array.from({ length: n }, (_, i) => {
        const isUb = unbreakable.includes(i + 1);
        return (
          <span
            key={i}
            className={`coin${isUb ? " coin-unbreakable" : ""}`}
            title={isUb ? `コイン${i + 1}: 破壊不能コイン` : `コイン${i + 1}`}
          />
        );
      })}
    </span>
  );
}
