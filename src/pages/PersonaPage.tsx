import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPersona, loadEgoSynergies, loadGuide, loadPersonaDetail, teamsForPersona } from "../data/loader";
import TeamLinks from "../components/TeamLinks";
import { guideKeywords, type Guide, type InlineSegment } from "../guide";
import { ATTACK_TYPES, asset, describeSinSkill, resistanceTone, seasonLabel } from "../lib";
import { SIN_COLORS, SIN_ORDER } from "../sinColors";
import type { Keyword, LabeledValue, PassiveDetail, PersonaDetail, SkillCell, SkillDetail } from "../types";
import { AttackTypeIcon, Coins, SinBadge } from "../components/ui";
import EffectText from "../components/EffectText";
import { ExtraSection, GuideSection, SYNERGY_HEADING } from "../components/GuideView";
import { glossaryTermForName } from "../glossary";

const TONE_LABEL = { weak: "弱点", resist: "耐性", normal: "普通" } as const;

function lines(v: string): string[] {
  return v.split("\n").filter(Boolean);
}

// "斬撃" / "反撃-斬撃" から斬/貫/打を取り出す
function attackKey(type?: string): string | undefined {
  return ATTACK_TYPES.find((t) => type?.includes(t));
}

function infoValue(info: LabeledValue[], label: string): string | undefined {
  return info.find((i) => i.label === label)?.value;
}

// 同期化段階で変わる値は最後(最大段階)を大きく、それまでの推移を小さく出す
function StagedValue({ value }: { value: string }) {
  const ls = lines(value);
  return (
    <>
      <span className="staged-main">{ls[ls.length - 1] ?? "-"}</span>
      {ls.length > 1 && <span className="staged-history">{ls.join(" → ")}</span>}
    </>
  );
}

function SkillCard({ skill }: { skill: SkillDetail }) {
  const key = attackKey(skill.attackType);
  const coinCount = lines(skill.stats.find((s) => s.label === "コイン個数")?.value ?? "").at(-1);
  const slotLabel = skill.slot.replace(/^スキル/, "S").replace(/^守備スキル$/, "守備");
  return (
    <article
      className={`skill-card${skill.special ? " skill-card-special" : ""}`}
      style={{ ["--sin" as string]: skill.sin ? SIN_COLORS[skill.sin] : "var(--line-strong)" }}
    >
      <header className="skill-card-head">
        <span className="skill-card-slot">
          {slotLabel}
          {skill.special && skill.slot !== "特殊" ? (
            <small className="slot-special">特殊</small>
          ) : (
            skill.copies && <small>{skill.copies}</small>
          )}
        </span>
        <h3 className="skill-card-name">{skill.name}</h3>
        <span className="skill-card-tags">
          <SinBadge sin={skill.sin} />
          <span className="skill-card-type">
            {key && <AttackTypeIcon type={key} size={20} />}
            {skill.attackType}
          </span>
          {skill.form && <span className="skill-card-form">{skill.form}</span>}
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

// スキル欄のタブ。特殊スキル(S3の変化形など)は元のスロットのタブにまとめ、枠ラベルの無い「特殊」だけ別タブにする
const SKILL_TABS = [
  { key: "スキル1", label: "S1" },
  { key: "スキル2", label: "S2" },
  { key: "スキル3", label: "S3" },
  { key: "守備スキル", label: "守備" },
  { key: "特殊", label: "特殊" },
] as const;

function SkillTabs({ skills }: { skills: SkillDetail[] }) {
  const tabs = SKILL_TABS.map((t) => ({ ...t, skills: skills.filter((s) => s.slot === t.key) })).filter(
    (t) => t.skills.length
  );
  const [active, setActive] = useState<string>(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!current) return null;
  return (
    <div className="skill-tabs">
      <div className="skill-tab-list" role="tablist" aria-label="スキル枠">
        {tabs.map((t) => {
          const base = t.skills.find((s) => !s.special) ?? t.skills[0];
          const selected = t.key === current.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`skill-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`skill-panel-${t.key}`}
              className={`skill-tab${selected ? " is-active" : ""}`}
              style={{ ["--sin" as string]: base.sin ? SIN_COLORS[base.sin] : "var(--line-strong)" }}
              onClick={() => setActive(t.key)}
            >
              <span className="skill-tab-label">{t.label}</span>
              <span className="skill-tab-name">{base.name.replace(/\n/g, " ")}</span>
              {t.skills.length > 1 && <small className="skill-tab-extra">+{t.skills.length - 1}</small>}
            </button>
          );
        })}
      </div>
      <div
        className="skill-cards"
        role="tabpanel"
        id={`skill-panel-${current.key}`}
        aria-labelledby={`skill-tab-${current.key}`}
      >
        {current.skills.map((s, i) => (
          <SkillCard key={`${s.slot}-${i}`} skill={s} />
        ))}
      </div>
    </div>
  );
}

// "傲慢×4" → 罪悪属性色のチップ
function ResourceChips({ resource }: { resource?: string }) {
  if (!resource) return null;
  const parts = [...resource.matchAll(new RegExp(`(${SIN_ORDER.join("|")})\\s*×\\s*(\\d+)`, "g"))];
  if (!parts.length) return <span className="passive-cond">{resource}</span>;
  return (
    <>
      {parts.map((m) => (
        <SinBadge key={m[1]} sin={m[1]} label={`${m[1]}×${m[2]}`} />
      ))}
    </>
  );
}

function slotShortLabel(skill: SkillDetail): string {
  const base = skill.slot.replace(/^スキル/, "S").replace(/^守備スキル$/, "守備");
  return skill.special && skill.slot !== "特殊" ? `${base}(特殊)` : base;
}

// 破壊不能コインの情報は、条件の有無にかかわらずこの欄1か所にまとめる。
// パッシブ由来の変化は対象スキルを効果文から確実に特定できないため、スキルごとの補足にはしない
function UnbreakableSummary({ detail }: { detail: PersonaDetail }) {
  const inherent = detail.skills.filter((s) => s.unbreakableCoins?.length);
  const bySkill = detail.skills.filter((s) => s.unbreakableByEffect?.length);
  const byPassive = detail.passives.filter((p) => p.unbreakableByEffect?.length);
  if (!inherent.length && !bySkill.length && !byPassive.length) return null;
  return (
    <section className="ub-summary" aria-labelledby="ub-summary-title">
      <h3 id="ub-summary-title" className="ub-summary-title">
        破壊不能コイン
      </h3>
      <dl className="ub-summary-list">
        {inherent.length > 0 && (
          <div>
            <dt>
              <span className="coin coin-unbreakable" /> 破壊不能コイン
            </dt>
            <dd>
              <ul>
                {inherent.map((s, i) => (
                  <li key={`${s.slot}-${i}`}>
                    <strong>
                      {slotShortLabel(s)} {s.name.replace(/\n/g, " ")}
                    </strong>
                    : コイン{(s.unbreakableCoins ?? []).join("・")}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {(bySkill.length > 0 || byPassive.length > 0) && (
          <div>
            <dt>条件付きで破壊不能になる</dt>
            <dd>
              <ul>
                {bySkill.map((s, i) => (
                  <li key={`s-${s.slot}-${i}`}>
                    <strong>
                      {slotShortLabel(s)} {s.name.replace(/\n/g, " ")}
                    </strong>
                    の効果: {(s.unbreakableByEffect ?? []).join(" / ")}
                  </li>
                ))}
                {byPassive.map((p, i) => (
                  <li key={`p-${p.name}-${i}`}>
                    <strong>パッシブ「{p.name}」</strong>: {(p.unbreakableByEffect ?? []).join(" / ")}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function PassiveCard({ passive }: { passive: PassiveDetail }) {
  return (
    <article className="passive-card">
      <header className="passive-card-head">
        <span className="passive-kind">{passive.kind === "サポート" ? "サポートパッシブ" : "バトルパッシブ"}</span>
        <h3 className="passive-card-name">{passive.name}</h3>
        <span className="passive-card-req">
          <ResourceChips resource={passive.resource} />
          {passive.condition && <span className="passive-cond">{passive.condition}</span>}
        </span>
      </header>
      <EffectText text={passive.effect} keywords={passive.keywords} />
    </article>
  );
}

function SummarySkillRow({ label, cell }: { label: string; cell: SkillCell }) {
  const key = attackKey(cell.type);
  return (
    <div className="summary-skill">
      <span className="skill-card-slot">{label}</span>
      <SinBadge sin={cell.sin} />
      {key && <AttackTypeIcon type={key} size={20} />}
      <span className="staged-main">{cell.maxPower ?? "-"}</span>
      {/* 表記を読み取れなかったセルは原文をそのまま出す */}
      <span className="staged-history">
        {cell.basePower ? `基礎${cell.basePower} / コイン${cell.coinPower} × ${cell.coins}` : cell.raw}
      </span>
    </div>
  );
}

export default function PersonaPage() {
  const { code = "" } = useParams<{ code: string }>();
  const ctx = getPersona(code);
  // 読み込んだ人格コードと一緒に持ち、別人格の詳細が一瞬表示されないようにする
  const [loaded, setLoaded] = useState<{ code: string; detail: PersonaDetail | null } | null>(null);
  const detail = loaded?.code === code ? loaded.detail : undefined;
  const [loadedGuide, setLoadedGuide] = useState<{ code: string; guide: Guide | null } | null>(null);
  const guide = loadedGuide?.code === code ? loadedGuide.guide : undefined;
  const [loadedEgos, setLoadedEgos] = useState<{ code: string; items: InlineSegment[][] } | null>(null);
  const egoItems = loadedEgos?.code === code ? loadedEgos.items : [];

  useEffect(() => {
    let cancelled = false;
    loadPersonaDetail(code)
      .catch((e: unknown) => {
        // 再デプロイ後の古いチャンク参照などで失敗したら概要表示に切り替える(原因はログに残す)
        console.error(`人格詳細データの読み込みに失敗しました: ${code}`, e);
        return null;
      })
      .then((d) => {
        if (!cancelled) setLoaded({ code, detail: d });
      });
    loadGuide(code)
      .catch((e: unknown) => {
        // ガイドは補助情報なので、読めなければ欄ごと出さない(原因はログに残す)
        console.error(`攻略ガイドの読み込みに失敗しました: ${code}`, e);
        return null;
      })
      .then((g) => {
        if (!cancelled) setLoadedGuide({ code, guide: g });
      });
    loadEgoSynergies(code, SYNERGY_HEADING)
      .catch((e: unknown) => {
        // 相性の良いE.G.Oも補助情報なので、読めなければ欄ごと出さない(原因はログに残す)
        console.error(`相性の良いE.G.Oの読み込みに失敗しました: ${code}`, e);
        return [];
      })
      .then((items) => {
        if (!cancelled) setLoadedEgos({ code, items });
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
    return [...map.values()];
  }, [detail]);

  // 詳細データより先にガイドが読み込まれた場合は、詳細が届いた時点でツールチップが付く
  const guideTerms = useMemo(() => (detail ? guideKeywords(detail) : []), [detail]);

  if (!ctx) {
    return (
      <div className="container section">
        <p className="empty">人格が見つかりませんでした。</p>
        <Link to="/" className="back-link">
          ← 囚人一覧に戻る
        </Link>
      </div>
    );
  }

  const { character, status, skills, prev, next } = ctx;
  // ガイドの「編成・相性」は本文から分け、パッシブの下に人格画像つきの欄として出す
  const guideSections = guide?.sections ?? [];
  const mainSections = guideSections.filter((sec) => sec.heading !== SYNERGY_HEADING);
  const synergySection = guideSections.find((sec) => sec.heading === SYNERGY_HEADING);
  const info = detail?.info ?? [];
  const keywords =
    infoValue(info, "特性キーワード")
      ?.split(/[,、]/)
      .map((s) => s.trim())
      .filter((s) => s && s !== status.affiliation?.name) ?? [];
  const sinSkillEntries = SIN_ORDER.flatMap((sin) => {
    const label = describeSinSkill(status.sinSkills?.[sin] ?? "");
    return label ? [[sin, label] as const] : [];
  });
  const stagger = infoValue(info, "混乱区間");
  const panic = infoValue(info, "パニックタイプ");
  const summaryPassives = [
    ...character.passives.filter((p) => p.code === code).map((p) => ({ ...p, kind: "バトル" })),
    ...character.supportPassives.filter((p) => p.code === code).map((p) => ({ ...p, kind: "サポート" })),
  ];
  const charPath = `/character/${encodeURIComponent(character.name)}`;

  return (
    <>
      <section className="persona-hero">
        {status.image && (
          <div className="persona-hero-backdrop" style={{ backgroundImage: `url("${asset(status.image)}")` }} />
        )}
        <div className="container">
          <nav className="breadcrumb" aria-label="パンくずリスト">
            <Link to="/">囚人一覧</Link>
            <span aria-hidden="true">/</span>
            <Link to={charPath}>{character.name}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{status.name}</span>
          </nav>
        </div>
        <div className="container persona-hero-inner">
          <div className="persona-hero-image">
            {status.image && <img src={asset(status.image)} alt={status.name} width={364} height={364} />}
          </div>
          <div className="persona-hero-info">
            <p className="kicker">
              IDENTITY {status.code} ・ {seasonLabel(status.season)}
            </p>
            <h1 className="persona-title">{status.name}</h1>
            {detail?.ruby && detail.ruby.replace(/\s+/g, "") !== status.name.replace(/\s+/g, "") && (
              <p className="persona-ruby">{detail.ruby}</p>
            )}
            <div className="persona-tags">
              <Link to={charPath} className="tag tag-link">
                {character.name}
              </Link>
              {status.affiliation && (
                <span className="tag">
                  {status.affiliation.icon && <img src={asset(status.affiliation.icon)} alt="" width={18} height={18} />}
                  {status.affiliation.name}
                </span>
              )}
              {keywords.map((k) => (
                <span key={k} className="tag tag-muted">
                  {k}
                </span>
              ))}
            </div>

            <dl className="spec-list">
              <div>
                <dt>HP</dt>
                <dd>{status.hp}</dd>
              </div>
              <div>
                <dt>速度</dt>
                <dd>{status.speed}</dd>
              </div>
              <div>
                <dt>攻撃Lv</dt>
                <dd>{status.level.split(".").join("/")}</dd>
              </div>
              <div>
                <dt>守備Lv</dt>
                <dd>{status.defense}</dd>
              </div>
              {stagger && (
                <div>
                  <dt>混乱区間</dt>
                  <dd>{lines(stagger)[0]}</dd>
                </div>
              )}
              {panic && (
                <div>
                  <dt>パニック</dt>
                  <dd>{panic}</dd>
                </div>
              )}
              {sinSkillEntries.length > 0 && (
                <div className="spec-sins">
                  <dt title="攻撃スキル6枚のうちの枚数と、同じ罪悪属性の守備スキル">資源構成</dt>
                  <dd>
                    {sinSkillEntries.map(([sin, label]) => (
                      <SinBadge key={sin} sin={sin} label={`${sin} ${label}`} />
                    ))}
                  </dd>
                </div>
              )}
              <div className="spec-resist">
                <dt>耐性</dt>
                <dd>
                  {ATTACK_TYPES.map((t) => {
                    const v = status.resistance[t] || "1";
                    const tone = resistanceTone(v);
                    return (
                      <span key={t} className={`resist-chip resist-${tone}`} title={`${t}: ${TONE_LABEL[tone]}`}>
                        <AttackTypeIcon type={t} size={16} />×{v}
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
        {mainSections.length > 0 && <GuideSection sections={mainSections} keywords={guideTerms} updated={guide?.meta.updated} />}

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
              {/* 人格を切り替えたらタブを S1 に戻すため、人格コードで作り直す */}
              <SkillTabs key={code} skills={detail.skills} />
              <UnbreakableSummary detail={detail} />
              <div className="section-note coin-legend">
                <span>
                  <span className="coin" /> 通常コイン
                </span>
                <span>
                  <span className="coin coin-unbreakable" /> 破壊不能コイン
                </span>
                <span>複数の値は同期化段階ごとの数値(大きい数字が最大段階)。ローマ数字は何枚目のコインの効果かを示します。</span>
              </div>
            </>
          ) : (
            skills && (
              <div className="summary-skills">
                <SummarySkillRow label="S1" cell={skills.s1} />
                <SummarySkillRow label="S2" cell={skills.s2} />
                <SummarySkillRow label="S3" cell={skills.s3} />
                <SummarySkillRow label="守備" cell={skills.defenseSkill} />
              </div>
            )
          )}
        </section>

        <section className="section-block">
          <header className="section-header">
            <h2 className="section-title">
              <span className="section-title-en">PASSIVES</span>
              パッシブ
            </h2>
          </header>
          {detail === undefined ? (
            <p className="loading">読み込み中…</p>
          ) : (
            <div className="passive-cards">
              {(detail?.passives.length ? detail.passives : summaryPassives.map((p) => ({ ...p, keywords: [] as Keyword[] }))).map(
                (p, i) => (
                  <PassiveCard key={`${p.kind}-${p.name}-${i}`} passive={p} />
                )
              )}
            </div>
          )}
        </section>

        {synergySection && <ExtraSection en="SYNERGY" title="相性のいい人格" section={synergySection} keywords={guideTerms} withThumbs />}
        {egoItems.length > 0 && (
          <ExtraSection
            en="E.G.O"
            title="相性の良いE.G.O"
            section={{ heading: "", blocks: [{ type: "ul", items: egoItems }] }}
            keywords={guideTerms}
            withThumbs
          />
        )}
        <TeamLinks teams={teamsForPersona(code)} label="この人格が入る編成例" />

        {glossary.length > 0 && (
          <section className="section-block">
            <header className="section-header">
              <h2 className="section-title">
                <span className="section-title-en">KEYWORDS</span>
                用語解説
              </h2>
            </header>
            <dl className="glossary">
              {glossary.map((k) => {
                const entry = glossaryTermForName(k.term);
                return (
                  <div key={k.term} className="glossary-item">
                    <dt>{k.term}{entry && (
                      <Link className="glossary-reference" to={`/glossary/${entry.id}`}>共通の仕組み →</Link>
                    )}</dt>
                    <dd>{k.desc}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        <p className="glossary-reference-entry">
          <Link className="back-link" to="/glossary">用語辞典 →</Link>
          <span className="staged-history">マッチ・精神力・耐性など、戦闘の基本を確認する</span>
        </p>
        <nav className="persona-pager" aria-label="同じ囚人の他の人格">
          {prev ? (
            <Link to={`/persona/${prev.code}`} className="pager-link">
              <span className="pager-dir">← PREV</span>
              <span className="pager-name">{prev.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {status.wikiUrl && (
            <a className="wiki-link" href={status.wikiUrl} target="_blank" rel="noreferrer">
              wikiで詳しく見る ↗
            </a>
          )}
          {next ? (
            <Link to={`/persona/${next.code}`} className="pager-link pager-next">
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
