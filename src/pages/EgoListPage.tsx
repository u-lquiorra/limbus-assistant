import { useSearchParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import EgoCard from "../components/EgoCard";
import { allEgos } from "../data/loader";
import { filterEgosBySins, formatSinFilter, parseSinFilter } from "../egoFilter";
import { SIN_COLORS, SIN_ORDER } from "../sinColors";
// 絞り込みボタンは、キーワード別人格一覧の絞り込みと同じ見た目を使う
import "./teams.css";

/**
 * /egos: 全囚人の E.G.O 一覧。必要資源(罪悪属性)を選ぶと、選んだ資源だけで使える E.G.O に絞り込む。
 * 選択は URL(?sin=wrath,pride)に持ち、共有や戻る操作でも保つ
 */
export default function EgoListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = parseSinFilter(searchParams.get("sin"));
  const results = filterEgosBySins(allEgos, selected);

  const update = (sins: string[]) => {
    const value = formatSinFilter(sins);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("sin", value);
        else next.delete("sin");
        return next;
      },
      { replace: true, preventScrollReset: true }
    );
  };
  const toggle = (sin: string) => update(selected.includes(sin) ? selected.filter((s) => s !== sin) : [...selected, sin]);

  return (
    <section className="container section">
      <Breadcrumb items={[{ label: "E.G.O一覧" }]} />
      <header className="section-header">
        <h1 className="section-title">
          <span className="section-title-en">E.G.O</span>
          E.G.O一覧
        </h1>
        <span className="section-count">
          {results.length} / {allEgos.length}件
        </span>
      </header>
      <p className="team-lead">全囚人の E.G.O をまとめた。必要資源で絞り込むと、編成でたまる資源だけで使える E.G.O を探せる。</p>

      <section className="keyword-filter" aria-labelledby="ego-filter-title">
        <h2 id="ego-filter-title" className="ego-filter-title">
          必要資源で絞り込む
        </h2>
        <p className="keyword-filter-lead">
          選んだ罪悪属性の資源だけで使える E.G.O を出す。複数選ぶと、そのどれかの組み合わせで使えるものも含む。数字は、その属性を足したときの件数。
        </p>
        <div className="keyword-filter-chips" role="group" aria-label="絞り込む罪悪属性">
          {SIN_ORDER.map((sin) => {
            const pressed = selected.includes(sin);
            // 押したときの件数を先に見せ、増え方の目安にする
            const count = pressed ? results.length : filterEgosBySins(allEgos, [...selected, sin]).length;
            return (
              <button key={sin} type="button" className="keyword-filter-chip" aria-pressed={pressed} onClick={() => toggle(sin)}>
                <i className="ego-filter-dot" style={{ background: SIN_COLORS[sin] }} aria-hidden="true" />
                {sin}
                <span className="keyword-filter-count">{count}</span>
              </button>
            );
          })}
          {selected.length > 0 && (
            <button type="button" className="keyword-filter-clear" onClick={() => update([])}>
              選択を解除
            </button>
          )}
        </div>
        {selected.length > 0 && (
          <p className="keyword-filter-summary ego-filter-summary" aria-live="polite">
            {selected.join("・")}の資源だけで使える E.G.O：<strong>{results.length}件</strong>
          </p>
        )}
      </section>

      {results.length > 0 ? (
        <div className="persona-grid">
          {results.map((ego) => (
            <EgoCard key={ego.code} ego={ego} detailed />
          ))}
        </div>
      ) : (
        <p className="empty">該当する E.G.O はない。罪悪属性を足す。</p>
      )}
    </section>
  );
}
