import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { asset } from "../lib";
import { searchEntries, type SearchGroup, type SearchKind } from "../search";
import { siteSearchEntries } from "../siteSearch";
import "../pages/search.css";

// 1グループに最初に出す件数。人格などは一致が多くなりやすいため、残りはボタンで開く
const GROUP_LIMIT = 8;

// 画像の無い結果に、画像の代わりに出す短い種別表示
const NOIMAGE_LABELS: Partial<Record<SearchKind, string>> = {
  team: "TEAM",
  boss: "BOSS",
  glossary: "用語",
  guide: "GUIDE",
};

function ResultGroup({
  group,
  expanded,
  onExpand,
  headingLevel,
}: {
  group: SearchGroup;
  expanded: boolean;
  onExpand: () => void;
  headingLevel: "h2" | "h3";
}) {
  const shown = expanded ? group.hits : group.hits.slice(0, GROUP_LIMIT);
  const rest = group.hits.length - shown.length;
  const headingId = `search-group-${group.kind}`;
  const Heading = headingLevel;
  return (
    <section className="search-group" aria-labelledby={headingId}>
      <Heading id={headingId} className="search-group-title">
        {group.label}
        <span className="section-count">{group.hits.length}件</span>
      </Heading>
      <ul className="search-results">
        {shown.map(({ entry }) => (
          <li key={entry.to}>
            <Link to={entry.to} className={`search-result search-result-${entry.kind}`}>
              {entry.image ? (
                <img src={asset(entry.image)} alt="" width={44} height={44} loading="lazy" />
              ) : (
                <span className="search-result-noimage" aria-hidden="true">
                  {NOIMAGE_LABELS[entry.kind]}
                </span>
              )}
              <span className="search-result-text">
                <strong>{entry.title}</strong>
                {entry.sub && <span>{entry.sub}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <button type="button" className="search-more" onClick={onExpand}>
          残り{rest}件を表示
        </button>
      )}
    </section>
  );
}

/** サイト内検索の結果一覧。検索ページとトップページで共用する。query が空なら何も出さない */
export default function SiteSearchResults({ query, headingLevel = "h2" }: { query: string; headingLevel?: "h2" | "h3" }) {
  const [expanded, setExpanded] = useState<{ query: string; kinds: SearchKind[] }>({ query: "", kinds: [] });
  const groups = useMemo(() => searchEntries(siteSearchEntries(), query), [query]);
  if (!query.trim()) return null;

  const total = groups.reduce((sum, g) => sum + g.hits.length, 0);
  const expandedKinds = expanded.query === query ? expanded.kinds : [];
  return (
    <>
      <p className="search-summary" aria-live="polite">
        {total ? `${total}件見つかった。` : `「${query.trim()}」に一致するページは見つからない。`}
      </p>
      {groups.map((group) => (
        <ResultGroup
          key={group.kind}
          group={group}
          headingLevel={headingLevel}
          expanded={expandedKinds.includes(group.kind)}
          onExpand={() => setExpanded({ query, kinds: [...expandedKinds, group.kind] })}
        />
      ))}
    </>
  );
}
