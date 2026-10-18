import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEgo, loadEgoDetail, loadEgoGuide } from "../data/loader";
import { egoGuideKeywords, type Guide, type InlineSegment } from "../guide";
import { stripStageMarks } from "../egoStage";
import { ATTACK_TYPES, asset, resistanceTone } from "../lib";
import { SIN_COLORS, SIN_ORDER } from "../sinColors";
import type { EgoDetail, EgoPassiveDetail, EgoSkillDetail, Keyword } from "../types";
import { AttackTypeIcon, Coins, SinBadge } from "../components/ui";
import EffectText from "../components/EffectText";
import { decorate } from "../components/decorate";

const TONE_LABEL = { weak: "脆弱", resist: "耐性", normal: "普通" } as const;

function lines(v: string): string[] {
  return v.split("\n").filter(Boolean);
}

// wiki の耐性表記 "脆弱 [×2]" / "抵抗 [×0.75]" / "普通" から倍率を取り出す
function resistanceValue(text: string): string {
  return text.match(/×\s*([\d.]+)/)?.[1] ?? "1";
}

// "貫通" / "斬撃" から斬/貫/打を取り出す
function attackKey(type?: string): string | undefined {
  return ATTACK_TYPES.find((t) => type?.includes(t));
}

// 解析段階で変わる値は最後(最大段階)を大きく、それまでの推移を小さく出す
function StagedValue({ value }: { value: string }) {
  const ls = lines(stripStageMarks(value));
  return (
    <>
      <span className="staged-main">{ls[ls.length - 1] ?? "-"}</span>
      {ls.length > 1 && <span className="staged-history">{ls.join(" → ")}</span>}
    </>
  );
}

function EgoSkillCard({ skill, sin }: { skill: EgoSkillDetail; sin?: string }) {
  const key = attackKey(skill.attackType);
  const coinCount = lines(stripStageMarks(skill.stats.find((s) => s.label === "コイン個数")?.value ?? "")).at(-1);
  return (
    <article className="skill-card ego-skill-card" // 上の帯は E.G.O の罪悪属性色にする(人格のスキルカードと同じ作り)
      style={{ ["--sin" as string]: sin ? SIN_COLORS[sin] : "var(--line-strong)" }}>
      <header className="skill-card-head">
        <span className="skill-card-slot">{skill.kind}</span>
        <h3 className="skill-card-name">{skill.kind}スキル</h3>
        <span className="skill-card-tags">
          <span className="skill-card-type">
            {key && <AttackTypeIcon type={key} size={20} />}
            {skill.attackType}
          </span>
        </span>
      </header>
      <dl className="skill-card-stats">
        {skill.stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>
              {s.label === "コイン個数" ? (
                <span className="staged-main coin-count">
                  {coinCount} <Coins count={coinCount} unbreakable={skill.unbreakableCoins} />
                </span>
              ) : (
                <StagedValue value={s.value} />
              )}
            </dd>
          </div>
        ))}
      </dl>
      <EffectText text={skill.effect} keywords={skill.keywords} unbreakableCoins={skill.unbreakableCoins} />
    </article>
  );
}

function EgoPassiveCard({ passive }: { passive: EgoPassiveDetail }) {
  return (
    <article className="passive-card">
      <header className="passive-card-head">
        <span className="passive-kind">E.G.Oパッシブ</span>
        <h3 className="passive-card-name">{passive.name}</h3>
      </header>
      <EffectText text={passive.effect} keywords={passive.keywords} />
    </article>
  );
}

function InlineText({ segments, keywords }: { segments: InlineSegment[]; keywords: Keyword[] }) {
  return (
    <>
      {segments.map((s, i) => {
        const content = decorate(s.text, keywords, false);
        return s.strong ? <strong key={i}>{content}</strong> : <span key={i}>{content}</span>;
      })}
    </>
  );
}

// 攻略ガイド(src/data/guides/ego/<code>.md)。人格ページの GuideSection と同じ見た目
// (PersonaPage 側は別担当の変更中のため、共通化せずここに持つ)
function GuideSection({ guide, keywords }: { guide: Guide; keywords: Keyword[] }) {
  return (
    <section className="section-block">
      <header className="section-header">
        <h2 className="section-title">
          <span className="section-title-en">GUIDE</span>
          ギミックと使い方
        </h2>
      </header>
      <div className="guide">
        {guide.sections.map((sec) => (
          <div key={sec.heading} className="guide-part">
            <h3 className="guide-heading">{sec.heading}</h3>
            {sec.blocks.map((b, i) =>
              b.type === "p" ? (
                <p key={i}>
                  <InlineText segments={b.text} keywords={keywords} />
                </p>
              ) : (
                <ul key={i}>
                  {b.items.map((item, j) => (
                    <li key={j}>
                      <InlineText segments={item} keywords={keywords} />
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        ))}
      </div>
      <p className="section-note">
        下のスキル・パッシブの効果文をもとにした解説。
        {guide.meta.updated && `(更新日: ${guide.meta.updated})`}
      </p>
    </section>
  );
}

function infoValue(detail: EgoDetail | null | undefined, label: string): string | undefined {
  return detail?.info.find((i) => i.label.startsWith(label))?.value;
}

export default function EgoPage() {
  const { code = "" } = useParams<{ code: string }>();
  const ctx = getEgo(code);
  // 読み込んだコードと一緒に持ち、別の E.G.O の詳細が一瞬表示されないようにする
  const [loaded, setLoaded] = useState<{ code: string; detail: EgoDetail | null } | null>(null);
  const detail = loaded?.code === code ? loaded.detail : undefined;
  const [loadedGuide, setLoadedGuide] = useState<{ code: string; guide: Guide | null } | null>(null);
  const guide = loadedGuide?.code === code ? loadedGuide.guide : undefined;

  useEffect(() => {
    let cancelled = false;
    loadEgoDetail(code)
      .catch((e: unknown) => {
        console.error(`E.G.O詳細データの読み込みに失敗しました: ${code}`, e);
        return null;
      })
      .then((d) => {
        if (!cancelled) setLoaded({ code, detail: d });
      });
    loadEgoGuide(code)
      .catch((e: unknown) => {
        // ガイドは補助情報なので、読めなければ欄ごと出さない(原因はログに残す)
        console.error(`E.G.Oガイドの読み込みに失敗しました: ${code}`, e);
        return null;
      })
      .then((g) => {
        if (!cancelled) setLoadedGuide({ code, guide: g });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const glossary = useMemo(() => {
    if (!detail) return [];
    const map = new Map<string, Keyword>();
    for (const k of [...detail.skills, ...detail.passives].flatMap((x) => x.keywords)) {
      if (!map.has(k.term)) map.set(k.term, k);
    }
    for (const k of detail.specialEffects) if (!map.has(k.term)) map.set(k.term, k);
    return [...map.values()];
  }, [detail]);

  const guideTerms = useMemo(() => (detail && ctx ? egoGuideKeywords(detail, ctx.ego.name) : []), [detail, ctx]);

  if (!ctx) {
    return (
      <div className="container section">
        <p className="empty">E.G.Oが見つからない。</p>
        <Link to="/" className="back-link">
          ← 囚人一覧に戻る
        </Link>
      </div>
    );
  }

  const { character, ego, prev, next } = ctx;
  const charPath = `/character/${encodeURIComponent(character.name)}`;
  const sp = infoValue(detail, "精神消耗量");
  const cost = detail?.cost ?? SIN_ORDER.flatMap((sin) => (ego.cost[sin] ? [{ sin, count: Number(ego.cost[sin]) }] : []));

  return (
    <>
      <section className="persona-hero">
        {ego.image && <div className="persona-hero-backdrop" style={{ backgroundImage: `url("${asset(ego.image)}")` }} />}
        <div className="container">
          <nav className="breadcrumb" aria-label="パンくずリスト">
            <Link to="/">囚人一覧</Link>
            <span aria-hidden="true">/</span>
            <Link to={charPath}>{character.name}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{ego.name}</span>
          </nav>
        </div>
        <div className="container persona-hero-inner">
          <div className="persona-hero-image">
            {ego.image && <img src={asset(ego.image)} alt={ego.name} width={364} height={364} />}
          </div>
          <div className="persona-hero-info">
            <p className="kicker">
              E.G.O {ego.code} ・ {ego.rank}
            </p>
            <h1 className="persona-title">{ego.name}</h1>
            {detail?.ruby && <p className="persona-ruby">{detail.ruby}</p>}
            <div className="persona-tags">
              <Link to={charPath} className="tag tag-link">
                {character.name}
              </Link>
              <SinBadge sin={ego.sin} />
              {detail?.origin && <span className="tag tag-muted">{detail.origin}</span>}
              {ego.note && <span className="tag tag-muted">{ego.note}</span>}
            </div>

            <dl className="spec-list">
              <div>
                <dt>危険ランク</dt>
                <dd>{ego.rank}</dd>
              </div>
              {sp && (
                <div>
                  <dt>精神消耗</dt>
                  <dd>{sp}</dd>
                </div>
              )}
              <div className="spec-sins">
                <dt title="E.G.O の使用に必要な罪悪属性の資源">必要資源</dt>
                <dd>
                  {cost.map((c) => (
                    <SinBadge key={c.sin} sin={c.sin} label={`${c.sin}×${c.count}`} />
                  ))}
                </dd>
              </div>
              <div className="spec-resist ego-resist">
                <dt title="この E.G.O を使用中の、各罪悪属性に対する被ダメージ倍率">耐性</dt>
                <dd>
                  {SIN_ORDER.map((sin) => {
                    const fromDetail = detail?.resistance.find((r) => r.sin === sin);
                    const v = fromDetail ? resistanceValue(fromDetail.value) : (ego.resistance[sin] ?? "1");
                    const tone = resistanceTone(v);
                    return (
                      <span key={sin} className={`resist-chip resist-${tone}`} title={`${sin}: ${TONE_LABEL[tone]}`}>
                        <i className="ego-resist-dot" style={{ background: SIN_COLORS[sin] }} />×{v}
                      </span>
                    );
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="container persona-body">
        {guide && guide.sections.length > 0 && <GuideSection guide={guide} keywords={guideTerms} />}

        <section className="section-block">
          <header className="section-header">
            <h2 className="section-title">
              <span className="section-title-en">SKILLS</span>
              スキル
            </h2>
          </header>
          {detail === undefined ? (
            <p className="loading">読み込み中…</p>
          ) : detail && detail.skills.length ? (
            <>
              <div className="skill-cards">
                {detail.skills.map((s) => (
                  <EgoSkillCard key={s.kind} skill={s} sin={ego.sin} />
                ))}
              </div>
              <div className="section-note coin-legend">
                <span>
                  <span className="coin" /> 通常コイン
                </span>
                <span>
                  <span className="coin coin-unbreakable" /> 破壊不能コイン
                </span>
                <span>
                  <span className="stage stage-3">解析Ⅲ</span> <span className="stage stage-4">解析Ⅳ</span>{" "}
                  で追加・変化する部分。複数の値は解析段階ごとの数値(大きい数字が最大段階)。
                </span>
              </div>
            </>
          ) : (
            <p className="empty">スキル詳細は取得できていません。</p>
          )}
        </section>

        {detail && detail.passives.length > 0 && (
          <section className="section-block">
            <header className="section-header">
              <h2 className="section-title">
                <span className="section-title-en">PASSIVE</span>
                E.G.Oパッシブ
              </h2>
            </header>
            <div className="passive-cards">
              {detail.passives.map((p, i) => (
                <EgoPassiveCard key={`${p.name}-${i}`} passive={p} />
              ))}
            </div>
          </section>
        )}

        {glossary.length > 0 && (
          <section className="section-block">
            <header className="section-header">
              <h2 className="section-title">
                <span className="section-title-en">KEYWORDS</span>
                用語解説
              </h2>
            </header>
            <dl className="glossary">
              {glossary.map((k) => (
                <div key={k.term} className="glossary-item">
                  <dt>{k.term}</dt>
                  <dd>{k.desc}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <nav className="persona-pager" aria-label="同じ囚人の他のE.G.O">
          {prev ? (
            <Link to={`/ego/${prev.code}`} className="pager-link">
              <span className="pager-dir">← PREV</span>
              <span className="pager-name">{prev.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {ego.wikiUrl && (
            <a className="wiki-link" href={ego.wikiUrl} target="_blank" rel="noreferrer">
              wikiで詳しく見る ↗
            </a>
          )}
          {next ? (
            <Link to={`/ego/${next.code}`} className="pager-link pager-next">
              <span className="pager-dir">NEXT →</span>
              <span className="pager-name">{next.name}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </>
  );
}
