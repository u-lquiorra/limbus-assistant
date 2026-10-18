import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCharacter, getNeighbors } from "../data/loader";
import { ATTACK_TYPES, asset, personaAttackTypes, personaSins } from "../lib";
import { SIN_COLORS, SIN_ORDER, sinTextColor } from "../sinColors";
import PersonaCard from "../components/PersonaCard";
import EgoCard from "../components/EgoCard";
import { AttackTypeIcon, SearchBox } from "../components/ui";

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

// 囚人が変わったら絞り込み状態をリセットするため、名前をkeyにして作り直す
export default function CharacterDetailRoute() {
  const { name } = useParams<{ name: string }>();
  return <CharacterDetail key={name} name={name} />;
}

function CharacterDetail({ name }: { name?: string }) {
  const [query, setQuery] = useState("");
  const [sinFilter, setSinFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());

  const character = name ? getCharacter(name) : undefined;
  const skillsByCode = useMemo(
    () => new Map((character?.skills ?? []).map((s) => [s.code, s])),
    [character]
  );

  const filtered = useMemo(() => {
    if (!character) return [];
    const q = query.trim().toLowerCase();
    return character.statuses.filter((s) => {
      if (q && ![s.name, s.affiliation?.name ?? "", s.code].some((v) => v.toLowerCase().includes(q))) return false;
      if (sinFilter.size) {
        const sins = personaSins(skillsByCode.get(s.code));
        if (![...sinFilter].every((f) => sins.includes(f))) return false;
      }
      if (typeFilter.size) {
        const types = personaAttackTypes(s);
        if (![...typeFilter].every((f) => types.includes(f))) return false;
      }
      return true;
    });
  }, [character, query, sinFilter, typeFilter, skillsByCode]);

  if (!character) {
    return (
      <div className="container section">
        <p className="empty">囚人が見つかりませんでした。</p>
        <Link to="/" className="back-link">
          ← 囚人一覧に戻る
        </Link>
      </div>
    );
  }

  const { prev, next } = getNeighbors(character.name);
  const affiliationCount = new Set(character.statuses.map((s) => s.affiliation?.name).filter(Boolean)).size;
  const maxHp = character.statuses.length
    ? Math.max(...character.statuses.map((s) => Number.parseInt(s.hp, 10) || 0))
    : "-";
  const filtersActive = query || sinFilter.size || typeFilter.size;
  // 中断したスクレイプで旧形式のJSONが残った場合でも画面が壊れないよう、images が無い前提でも描画する
  const poster = character.images?.poster;

  return (
    <>
      <section className="char-hero">
        {poster && <div className="char-hero-backdrop" style={{ backgroundImage: `url("${asset(poster)}")` }} />}
        <div className="container char-hero-top">
          <Link to="/" className="back-link">
            ← 囚人一覧
          </Link>
        </div>
        <div className="container char-hero-inner">
          <div className="char-hero-poster">
            {poster && <img src={asset(poster)} alt={`${character.name} 告知ポスター`} width={900} height={1273} />}
          </div>
          <div className="char-hero-info">
            {character.number && <p className="kicker">SINNER No.{character.number}</p>}
            <h1 className="char-name">{character.name}</h1>
            <blockquote className="char-quote">「{character.profile.profileText}」</blockquote>
            <dl className="hero-stats">
              <div>
                <dt>人格</dt>
                <dd>{character.statuses.length}</dd>
              </div>
              <div>
                <dt>所属</dt>
                <dd>{affiliationCount}</dd>
              </div>
              <div>
                <dt>最大HP</dt>
                <dd>{maxHp}</dd>
              </div>
            </dl>
            <nav className="char-pager" aria-label="他の囚人">
              {prev && (
                <Link to={`/character/${encodeURIComponent(prev.name)}`} className="pager-link">
                  <span className="pager-dir">← PREV</span>
                  <span className="pager-name">{prev.name}</span>
                </Link>
              )}
              {next && (
                <Link to={`/character/${encodeURIComponent(next.name)}`} className="pager-link pager-next">
                  <span className="pager-dir">NEXT →</span>
                  <span className="pager-name">{next.name}</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </section>

      <section className="container section">
        <header className="section-header">
          <h2 className="section-title">
            <span className="section-title-en">IDENTITIES</span>
            人格一覧
          </h2>
          <span className="section-count">
            {filtered.length} / {character.statuses.length}件
          </span>
        </header>

        <div className="toolbar">
          <SearchBox value={query} onChange={setQuery} placeholder="人格名・所属で絞り込み" label="人格を絞り込み" small />
          <div className="chip-group" role="group" aria-label="罪悪属性で絞り込み">
            {SIN_ORDER.map((sin) => {
              const active = sinFilter.has(sin);
              return (
                <button
                  key={sin}
                  type="button"
                  className={`chip${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  style={
                    active
                      ? { background: SIN_COLORS[sin], borderColor: SIN_COLORS[sin], color: sinTextColor(sin) }
                      : { borderColor: SIN_COLORS[sin] }
                  }
                  onClick={() => setSinFilter((s) => toggle(s, sin))}
                >
                  {sin}
                </button>
              );
            })}
          </div>
          <div className="chip-group" role="group" aria-label="攻撃属性で絞り込み">
            {ATTACK_TYPES.map((t) => {
              const active = typeFilter.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`chip chip-icon${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => setTypeFilter((s) => toggle(s, t))}
                >
                  <AttackTypeIcon type={t} size={16} />
                  {t}
                </button>
              );
            })}
          </div>
          {filtersActive ? (
            <button
              type="button"
              className="chip-reset"
              onClick={() => {
                setQuery("");
                setSinFilter(new Set());
                setTypeFilter(new Set());
              }}
            >
              クリア
            </button>
          ) : null}
        </div>

        {filtered.length ? (
          <div className="persona-grid">
            {filtered.map((status) => (
              <PersonaCard key={status.code} status={status} skills={skillsByCode.get(status.code)} />
            ))}
          </div>
        ) : (
          <p className="empty">条件に一致する人格はありません。</p>
        )}
      </section>

      {character.egos && character.egos.length > 0 && (
        <section className="container section">
          <header className="section-header">
            <h2 className="section-title">
              <span className="section-title-en">E.G.O</span>
              E.G.O一覧
            </h2>
            <span className="section-count">{character.egos.length}件</span>
          </header>
          <div className="persona-grid">
            {character.egos.map((ego) => (
              <EgoCard key={ego.code} ego={ego} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
