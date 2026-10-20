import { SIN_COLORS, SIN_ORDER } from "../sinColors";

/**
 * 罪悪属性のボタン(複数選択)。E.G.O 一覧・サポートパッシブ一覧で共通に使う。
 * countWith は、その属性を足したとき(選択中ならそのまま)の件数を返す。押す前に増え方の目安を見せるため
 */
export default function SinFilterChips({
  selected,
  onChange,
  countWith,
}: {
  selected: string[];
  onChange: (sins: string[]) => void;
  countWith: (sins: string[]) => number;
}) {
  const toggle = (sin: string) => onChange(selected.includes(sin) ? selected.filter((s) => s !== sin) : [...selected, sin]);
  return (
    <div className="keyword-filter-chips" role="group" aria-label="絞り込む罪悪属性">
      {SIN_ORDER.map((sin) => {
        const pressed = selected.includes(sin);
        return (
          <button key={sin} type="button" className="keyword-filter-chip" aria-pressed={pressed} onClick={() => toggle(sin)}>
            <i className="ego-filter-dot" style={{ background: SIN_COLORS[sin] }} aria-hidden="true" />
            {sin}
            <span className="keyword-filter-count">{countWith(pressed ? selected : [...selected, sin])}</span>
          </button>
        );
      })}
      {selected.length > 0 && (
        <button type="button" className="keyword-filter-clear" onClick={() => onChange([])}>
          選択を解除
        </button>
      )}
    </div>
  );
}
