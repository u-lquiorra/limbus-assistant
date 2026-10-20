import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import PageToc from "../components/PageToc";
import { PersonaRow } from "../components/TeamLinks";
import { getPersona, getTeam, keywordPersonas, loadGuide, peekGuide } from "../data/loader";
import { getGlossaryTerm } from "../glossary";
import { guideSummary } from "../guide";
import { asset } from "../lib";
import { KEYWORD_PAGES, getKeywordPage } from "../keywordPages";
import type { PersonaStatus } from "../types";
import "./teams.css";

const INDEX_LABEL = "キーワード別人格一覧";

// 人格を囚人ごとにまとめる。人格の並び(囚人順)をそのまま保つ
function groupBySinner(personas: PersonaStatus[]): [string, PersonaStatus[]][] {
  const groups = new Map<string, PersonaStatus[]>();
  for (const s of personas) groups.set(s.character, [...(groups.get(s.character) ?? []), s]);
  return [...groups];
}

// 各人格のガイドの「ひとことで」。静的 HTML の生成と最初の描画では先読みの結果を使い、画面遷移後はここで読み込む
function useSummaries(codes: string[]): Record<string, string | undefined> {
  const key = codes.join(",");
  const initial = () => Object.fromEntries(codes.map((c) => [c, guideSummary(peekGuide(c))]));
  const [loaded, setLoaded] = useState<{ key: string; summaries: Record<string, string | undefined> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(",") : [];
    Promise.all(
      list.map((code) =>
        loadGuide(code).then(
          (g) => [code, guideSummary(g)] as const,
          (e: unknown) => {
            // 要約は補助情報なので、読めなければその人格だけ要約なしで出す(原因はログに残す)
            console.error(`人格ガイドの読み込みに失敗した: ${code}`, e);
            return [code, undefined] as const;
          }
        )
      )
    ).then((entries) => {
      if (!cancelled) setLoaded({ key, summaries: Object.fromEntries(entries) });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return loaded?.key === key ? loaded.summaries : initial();
}

/** /keywords: 7つのキーワードの一覧ページへの入口 */
export function KeywordIndex() {
  return (
    <section className="container section">
      <Breadcrumb items={[{ label: INDEX_LABEL }]} />
      <header className="section-header">
        <h1 className="section-title">
          <span className="section-title-en">KEYWORDS</span>
          キーワード別人格一覧
        </h1>
        <span className="section-count">{KEYWORD_PAGES.length}キーワード</span>
      </header>
      <p className="team-lead">
        火傷・出血・振動・破裂・沈潜・呼吸・充電の7つのキーワードごとに、そのキーワードを持つ人格をまとめた。編成を組むときの候補探しに使う。
      </p>
      <div className="team-grid">
        {KEYWORD_PAGES.map((p) => {
          const personas = keywordPersonas(p.keyword);
          const faces = getTeam(p.id)?.core ?? [];
          return (
            <Link key={p.id} to={`/keywords/${p.id}`} className="team-card">
              <span className="team-card-faces" aria-hidden="true">
                {faces.slice(0, 5).map((m) => {
                  const image = getPersona(m.code)?.status.image;
                  return image ? <img key={m.code} src={asset(image)} alt="" width={40} height={40} loading="lazy" /> : null;
                })}
              </span>
              <span className="team-card-name">{p.keyword}人格一覧</span>
              <span className="team-card-meta">
                <span className="tag">{p.keyword}</span>
                <span className="tag tag-muted">{personas.length}人格</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** /keywords/:id: そのキーワードを持つ人格の一覧 */
export default function KeywordPage() {
  const { id = "" } = useParams<{ id: string }>();
  const page = getKeywordPage(id);
  const personas = useMemo(() => (page ? keywordPersonas(page.keyword) : []), [page]);
  const summaries = useSummaries(personas.map((s) => s.code));

  if (!page) {
    return (
      <div className="container section">
        <p className="empty">キーワードが見つからない。</p>
        <Link to="/keywords" className="back-link">
          ← キーワード別人格一覧に戻る
        </Link>
      </div>
    );
  }

  const { keyword } = page;
  const team = getTeam(page.id);
  const term = getGlossaryTerm(page.glossaryId);
  const groups = groupBySinner(personas);

  return (
    <div className="container section team-page">
      <Breadcrumb items={[{ label: INDEX_LABEL, to: "/keywords" }, { label: `${keyword}人格一覧` }]} />
      <header className="team-hero">
        <p className="kicker">
          KEYWORD ・ {personas.length}人格 ・ {groups.length}囚人
        </p>
        <h1 className="persona-title">{keyword}人格一覧</h1>
        <p className="team-lead">
          {keyword}をキーワードに持つ人格を、囚人ごとにまとめた。{term?.summary}
        </p>
        <div className="persona-tags">
          {team && (
            <Link to={`/teams/${team.id}`} className="tag tag-link">
              {team.name}の組み方
            </Link>
          )}
          {term && (
            <Link to={`/glossary/${term.id}`} className="tag tag-link">
              用語「{term.name}」
            </Link>
          )}
        </div>
      </header>

      <PageToc />

      {team && team.core.length > 0 && (
        <section className="section-block">
          <header className="section-header">
            <h2 className="section-title">{team.name}の軸になる人格</h2>
            <span className="section-count">編成例の優先枠</span>
          </header>
          <ul className="team-members">
            {team.core.map((m) => (
              <PersonaRow key={m.code} member={m} />
            ))}
          </ul>
        </section>
      )}

      {groups.map(([character, list]) => (
        <section key={character} className="section-block">
          <header className="section-header">
            <h2 className="section-title">{character}の{keyword}人格</h2>
            <span className="section-count">{list.length}人格</span>
          </header>
          <ul className="team-members team-members-compact">
            {list.map((s) => (
              <PersonaRow key={s.code} member={{ code: s.code, note: summaries[s.code] }} />
            ))}
          </ul>
        </section>
      ))}

      <section className="section-block">
        <header className="section-header">
          <h2 className="section-title">ほかのキーワード</h2>
        </header>
        <div className="persona-tags">
          {KEYWORD_PAGES.filter((p) => p.id !== page.id).map((p) => (
            <Link key={p.id} to={`/keywords/${p.id}`} className="tag tag-link">
              {p.keyword}人格一覧
            </Link>
          ))}
        </div>
      </section>

      <Link to="/keywords" className="back-link">
        ← キーワード別人格一覧に戻る
      </Link>
    </div>
  );
}
