import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Link } from "../components/Link";
import { BOSS_SECTIONS, bossChapterId, bossChapterStageRange, bossSummaries, getBossSummary, groupBossesByChapter, loadBossGuide, peekBossGuide, type BossGuide, type BossSkill } from "../bosses";
import { getGlossaryTerm } from "../glossary";
import { SIN_COLORS, SIN_ORDER } from "../sinColors";
import { asset, resistanceTone } from "../lib";
import { bossSkillEffectText } from "../bossSkillText";
import { bossKeywords } from "../bossKeywords";
import { decorate } from "../components/decorate";
import EffectText from "../components/EffectText";
import { AttackTypeIcon, Coins, SinBadge } from "../components/ui";
import "./boss-guide.css";

const bossChapters = groupBossesByChapter(bossSummaries);

export function BossIndex() {
  const { hash } = useLocation();
  // 詳細ページから「#chapter-9」などで戻ってきたときは、その章を開いておく
  useEffect(() => {
    const target = document.getElementById(hash.slice(1));
    if (target instanceof HTMLDetailsElement) target.open = true;
  }, [hash]);
  return <div className="container section boss-index">
    <header className="boss-heading">
      <p className="kicker">BOSS GUIDES</p>
      <h1 className="persona-title">ボス攻略</h1>
      <p>負けやすい場面の対処と、敵のスキル・パッシブを確認しよう。</p>
    </header>
    {/* どのボスにも共通する基本なので、個別の攻略より先に目に入る位置に置く */}
    <Link className="boss-stuck-link" to="/beginner#stuck">
      <span><strong>まず確認：戦闘に詰まったときの基本</strong><span>負けた原因を一つずつ見て、育成か操作かを切り分ける。</span></span>
      <span className="boss-index-arrow" aria-hidden="true">→</span>
    </Link>
    <section aria-labelledby="boss-index-story">
      <header className="section-header"><h2 id="boss-index-story" className="section-title"><span className="section-title-en">STORY</span>ストーリー</h2></header>
      {/* 先の章のネタバレを避けるため、章は閉じた状態で出し、一覧ではボス名を出さずステージ名で示す */}
      <p className="boss-index-note">ネタバレを避けるため、一覧ではボス名を出さず、章ごとに閉じてある。</p>
      <div className="boss-chapters">{bossChapters.map((chapter) => <details key={chapter.id} id={chapter.id} className="boss-chapter">
        <summary><span className="boss-chapter-title">第{chapter.chapter}章</span><span className="boss-chapter-meta">{bossChapterStageRange(chapter)}・{chapter.bosses.length}戦</span></summary>
        <div className="boss-index-list">{chapter.bosses.map((boss) => <Link key={boss.id} to={`/bosses/${boss.id}`} className="boss-index-link">
          <span className="boss-stage-label">{boss.stage}</span>
          <span><strong>{boss.stageName}</strong><span className="boss-index-lead">{boss.listLead}</span></span>
          <span className="boss-index-arrow" aria-hidden="true">→</span>
        </Link>)}</div>
      </details>)}</div>
    </section>
  </div>;
}

function Contents({ boss }: { boss: BossGuide }) {
  return <ol>{BOSS_SECTIONS.map((section, index) => <li key={section.id}>
    <Link to={`/bosses/${boss.id}#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</Link>
  </li>)}</ol>;
}

function Section({ id, children }: { id: typeof BOSS_SECTIONS[number]["id"]; children: ReactNode }) {
  const index = BOSS_SECTIONS.findIndex((section) => section.id === id);
  return <section id={id} className="boss-section" aria-labelledby={`${id}-title`}>
    <header className="section-header"><h2 id={`${id}-title`} className="section-title"><span className="section-title-en">{BOSS_SECTIONS[index].label}</span>{BOSS_SECTIONS[index].title}</h2></header>
    {children}
  </section>;
}

function ResistanceList({ values }: { values: Record<string, number | null> }) {
  return <dl className="boss-resistances">{Object.entries(values).map(([name, value]) => <div key={name}>
    <dt>{name.length === 1 ? <><AttackTypeIcon type={name} />{name}</> : <SinBadge sin={name} />}</dt>
    <dd>{value === null ? <span className="resist-chip">不明</span> : <span className={`resist-chip resist-${resistanceTone(String(value))}`}>×{value.toFixed(2).replace(/0$/, "")}</span>}</dd>
  </div>)}</dl>;
}

function Skill({ skill, boss, number }: { skill: BossSkill; boss: BossGuide; number: number }) {
  const unit = boss.units.find((unit) => unit.id === skill.unit)!;
  const level = skill.levelUnknown ? "不明" : skill.level ?? (typeof unit.level === "number" ? unit.level + skill.levelOffset - (unit.skillLevelReduction ?? 0) : "不明");
  const end = skill.base + skill.coinPower * skill.coins;
  const range = `${Math.min(skill.base, end)}〜${Math.max(skill.base, end)}`;
  const keywords = bossKeywords(boss, skill.unit);
  return <article className="skill-card boss-skill-card" id={`skill-${skill.id}`} style={{ ["--sin" as string]: skill.sin ? SIN_COLORS[skill.sin] : "var(--line-strong)" }}>
    <header className="skill-card-head">
      <span className="skill-card-slot">{number.toString().padStart(2, "0")}</span>
      <h4 className="skill-card-name">{skill.name}</h4>
      <span className="skill-card-tags"><SinBadge sin={skill.sin} /><span className="skill-card-type">{skill.attackType && <AttackTypeIcon type={skill.attackType} size={20} />}{["斬", "貫", "打"].includes(skill.type) ? <><AttackTypeIcon type={skill.type} size={20} />{skill.type === "貫" ? "貫通" : `${skill.type}撃`}</> : skill.type}{skill.attackType && `（${skill.attackType === "貫" ? "貫通" : `${skill.attackType}撃`}）`}</span>{skill.label && <span className="skill-card-form">{skill.label}</span>}</span>
    </header>
    <dl className="skill-card-stats">
      <div><dt>表示威力</dt><dd><span className="staged-main">{skill.powerUnknown ? "未確定" : range}</span></dd></div>
      <div><dt>基本威力</dt><dd><span className="staged-main">{skill.powerUnknown ? "未確定" : skill.base}</span></dd></div>
      <div><dt>コイン威力</dt><dd><span className="staged-main">{skill.coinPowerUnknown ? "不明" : `${skill.coinPower >= 0 ? "+" : ""}${skill.coinPower}`}</span></dd></div>
      <div><dt>コイン個数</dt><dd><span className="staged-main coin-count">{skill.coinsUnknown ? "不定" : <>{skill.coins} <Coins count={String(skill.coins)} /></>}</span></dd></div>
      <div><dt>{["回避", "防御"].includes(skill.type) ? "守備" : "攻撃"}レベル{unit.combatLevelNote && `（${unit.combatLevelNote}）`}</dt><dd><span className="staged-main">{level}</span><span className="staged-history">{skill.levelUnknown ? "数値不明" : skill.level !== undefined ? "推定値" : `敵Lv${skill.levelOffset >= 0 ? "+" : ""}${skill.levelOffset}${unit.skillLevelReduction ? `−${unit.skillLevelReduction}` : ""}`}</span></dd></div>
      <div><dt>加重値</dt><dd><span className="staged-main">{skill.weight ?? "不明"}</span></dd></div>
    </dl>
    <EffectText text={bossSkillEffectText(skill)} keywords={keywords} unbreakableCoins={skill.unbreakableCoins} />
    <div className="boss-skill-response"><h5 className="guide-heading">対処のポイント</h5><p>{decorate(skill.response, keywords, false)}</p></div>
  </article>;
}

function SkillTabs({ boss, unitId }: { boss: BossGuide; unitId: string }) {
  const skills = boss.skills.filter((skill) => skill.unit === unitId);
  const { hash } = useLocation();
  const linked = skills.find((skill) => hash === `#skill-${skill.id}`);
  const [selection, setSelection] = useState({ id: linked?.id ?? skills[0]?.id, hash });
  const activeId = selection.hash !== hash ? linked?.id ?? selection.id : selection.id;
  if (selection.hash !== hash) setSelection({ id: activeId, hash });
  const active = skills.find((skill) => skill.id === activeId) ?? skills[0];
  if (!active) return null;
  return <div className="skill-tabs">
    <div className="skill-tab-list boss-skill-tab-list" role="tablist" aria-label={`${boss.units.find((unit) => unit.id === unitId)?.name}のスキル`}>
      {skills.map((skill, index) => <button key={skill.id} type="button" role="tab" id={`boss-tab-${skill.id}`} aria-controls={`boss-panel-${skill.id}`} aria-selected={skill.id === active.id} tabIndex={skill.id === active.id ? 0 : -1} className={`skill-tab${skill.id === active.id ? " is-active" : ""}`} style={{ ["--sin" as string]: skill.sin ? SIN_COLORS[skill.sin] : "var(--line-strong)" }} onClick={() => setSelection({ id: skill.id, hash })} onKeyDown={(event) => {
        const change = event.key === "ArrowRight" ? (index + 1) % skills.length : event.key === "ArrowLeft" ? (index - 1 + skills.length) % skills.length : event.key === "Home" ? 0 : event.key === "End" ? skills.length - 1 : undefined;
        if (change === undefined) return;
        event.preventDefault();
        setSelection({ id: skills[change].id, hash });
        document.getElementById(`boss-tab-${skills[change].id}`)?.focus();
      }}><span className="skill-tab-label">{String(index + 1).padStart(2, "0")}</span><span className="skill-tab-name">{skill.name}</span></button>)}
    </div>
    {skills.map((skill, index) => <div key={skill.id} className="boss-skill-panel" role="tabpanel" id={`boss-panel-${skill.id}`} aria-labelledby={`boss-tab-${skill.id}`} hidden={skill.id !== active.id} tabIndex={0}><Skill skill={skill} boss={boss} number={index + 1} /></div>)}
  </div>;
}

// ボスの詳細データ。静的 HTML の生成と最初の描画では先読みの結果を使い、画面遷移後はここで読み込む
function useBossGuide(id: string): BossGuide | null | undefined {
  // 読み込んだ ID と一緒に持ち、別のボスの内容が一瞬表示されないようにする
  const [state, setState] = useState<{ id: string; boss: BossGuide | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadBossGuide(id)
      .catch((e: unknown) => {
        console.error(`ボス攻略の読み込みに失敗した: ${id}`, e);
        return null;
      })
      .then((boss) => {
        if (!cancelled) setState({ id, boss });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return state?.id === id ? state.boss : peekBossGuide(id);
}

export default function BossPage() {
  const { id = "" } = useParams<{ id: string }>();
  const summary = getBossSummary(id);
  const loaded = useBossGuide(id);
  if (summary && loaded === undefined) return <div className="container section"><h1 className="section-title">{summary.name}</h1><p className="empty">読み込み中…</p></div>;
  // 一覧にあるのに詳細が読めないのは通信の失敗などなので、「見つからない」とは分けて伝える
  if (summary && !loaded) return <div className="container section"><h1 className="section-title">{summary.name}</h1><p className="empty">読み込みに失敗した。ページを再読み込みする。</p><Link to="/bosses" className="back-link">← ボス攻略一覧</Link></div>;
  const boss = summary ? loaded : null;
  if (!boss) return <div className="container section"><h1 className="section-title">ボス攻略が見つからない</h1><p className="empty">URLを確認するか、攻略一覧から探す。</p><Link to="/bosses" className="back-link">← ボス攻略一覧</Link></div>;
  const mainUnit = boss.units[0];
  const keywords = bossKeywords(boss);
  const text = (value: string) => decorate(value, keywords, false);
  return <article className="boss-guide">
    <section className="persona-hero boss-hero">
      {mainUnit.image && <div className="persona-hero-backdrop" style={{ backgroundImage: `url("${asset(mainUnit.image.path)}")` }} />}
      <div className="container"><nav className="breadcrumb" aria-label="パンくずリスト"><Link to="/">ホーム</Link><span aria-hidden="true">/</span><Link to="/bosses">ボス攻略</Link><span aria-hidden="true">/</span><span aria-current="page">{boss.stage} {boss.shortName}</span></nav></div>
      <div className={`container persona-hero-inner${mainUnit.image ? "" : " boss-hero-no-image"}`}>
        {mainUnit.image && <div className="persona-hero-image"><img src={asset(mainUnit.image.path)} alt={boss.name} width={mainUnit.image.width} height={mainUnit.image.height} /></div>}
        <header className="persona-hero-info boss-hero-info">
          <p className="kicker">CHAPTER {String(boss.chapter).padStart(2, "0")} / BOSS GUIDE</p>
          <h1 className="persona-title">{boss.name}</h1>
          <div className="persona-tags"><span className="tag tag-muted">{boss.stage}「{boss.stageName}」</span><span className="tag tag-muted">ストーリー攻略</span></div>
          <p className="boss-lead">{text(boss.lead)}</p>
          <dl className="spec-list"><div><dt>HP</dt><dd>{mainUnit.hp}</dd></div><div><dt>レベル</dt><dd>{mainUnit.level}</dd></div><div><dt>速度</dt><dd>{mainUnit.speed}</dd></div><div><dt>防御Lv{mainUnit.combatLevelNote ? `（${mainUnit.combatLevelNote}）` : mainUnit.defenseLevelReduction || mainUnit.skillLevelReduction ? "（補正後）" : ""}</dt><dd>{mainUnit.defenseLevel === null ? "不明" : mainUnit.defenseLevel - (mainUnit.defenseLevelReduction ?? mainUnit.skillLevelReduction ?? 0)}</dd></div><div><dt>出撃上限</dt><dd>{boss.members}名{boss.reserves ? `＋控え${boss.reserves}名` : ""}</dd></div></dl>
          <p className="boss-checked">資料確認日：<time dateTime={boss.checkedAt}>{boss.checkedAt}</time></p>
        </header>
      </div>
    </section>
    <div className="container persona-body boss-layout">
      <aside className="boss-sidebar"><nav className="boss-toc" aria-label="ボス攻略の目次"><p>目次</p><Contents boss={boss} /></nav></aside>
      <div className="boss-content">
        <details className="boss-mobile-toc" open><summary>目次<span>全{BOSS_SECTIONS.length}項目</span></summary><Contents boss={boss} /></details>
        <div className="guide boss-priorities"><h2 className="guide-heading">まず押さえる3つのこと</h2><ol>{boss.priorities.map((priority) => <li key={priority}>{text(priority)}</li>)}</ol></div>
        <Section id="strategy">
          {boss.troubleshooting && <div className="boss-troubleshooting"><h3>負け方から対処を探す</h3><dl>{boss.troubleshooting.map((item) => <div key={item.symptom}><dt>{text(item.symptom)}</dt><dd>{text(item.advice)}</dd></div>)}</dl></div>}
          <p className="boss-section-intro">ターン数は通常の進行の目安。HPの削り方や混乱で順番が変わるため、敵が使うスキル名も確認しよう。</p>
          <div className="guide">{boss.phases.map((phase) => <div className="guide-part" key={phase.id}>
            <p className="boss-phase-timing">{phase.timing}</p><h3 className="guide-heading">{phase.title}</h3>
            <ul>{phase.steps.map((step) => <li key={step}>{text(step)}</li>)}</ul>
          </div>)}</div>
        </Section>
        <Section id="notes">
          <div className="guide boss-notes"><div className="guide-part"><h3 className="guide-heading">見落としやすいこと</h3><ul>{boss.warnings.map((warning) => <li key={warning}>{text(warning)}</li>)}</ul></div></div>
          <dl className="glossary boss-mechanics">{boss.mechanics.map((mechanic) => {
            const scopedKeywords = mechanic.units?.length === 1 ? bossKeywords(boss, mechanic.units[0]) : keywords;
            const duplicateName = boss.mechanics.some(other => other !== mechanic && other.name === mechanic.name);
            return <div className="glossary-item" key={`${mechanic.name}:${mechanic.units?.join(",") ?? "all"}`}>
              <dt>{decorate(mechanic.name, scopedKeywords, false)}</dt>
              <dd>
                {duplicateName && <p className="boss-phase-timing">{mechanic.units?.map(unitId => boss.units.find(unit => unit.id === unitId)?.name).join("／")}</p>}
                <p>{decorate(mechanic.effect, scopedKeywords, false)}</p>
                <p className="boss-mechanic-response">{decorate(mechanic.response, scopedKeywords, false)}</p>
              </dd>
            </div>;
          })}</dl>
        </Section>
        <Section id="team">
          <div className="guide"><div className="guide-part"><h3 className="guide-heading">まず整えるもの</h3><ul>{boss.preparation.map((value) => <li key={value}>{text(value)}</li>)}</ul></div>
            {boss.roles.map((role) => <div className="guide-part" key={role.name}><h3 className="guide-heading">{role.name}</h3><p>{text(role.reason)}</p></div>)}
            <div className="guide-part"><p>1人で複数の役割を兼ねても大丈夫。まずマッチに勝てる主力を決め、危険な攻撃への対処とギミックの処理を分担しよう。</p></div>
          </div>
        </Section>
        <Section id="stats">
          <p className="boss-section-intro">{boss.stage}の数値。出撃上限は{boss.members}名{boss.reserves ? `、控え${boss.reserves}名の連続戦闘` : ""}。{boss.statNote && text(boss.statNote)}</p>
          {boss.units.map((unit) => <section className="boss-unit" key={unit.id} aria-labelledby={`unit-${unit.id}`}>
            <h3 id={`unit-${unit.id}`}>{unit.name}<small>部位：{unit.part}</small></h3>
            <div className="boss-unit-layout">
              {unit.image && <div className="boss-unit-image persona-hero-image"><img src={asset(unit.image.path)} alt={`${unit.name}の外見`} width={unit.image.width} height={unit.image.height} loading="lazy" /></div>}
              <div className="boss-unit-info">
                {unit.offField ? <>
                  <p className="boss-section-intro">{decorate(unit.offField, bossKeywords(boss, unit.id), false)}</p>
                  <dl className="spec-list"><div><dt>本体HP</dt><dd>{unit.hp}</dd></div><div><dt>レベル</dt><dd>{unit.level}</dd></div></dl>
                </> : <>
                <dl className="spec-list"><div><dt>HP</dt><dd>{unit.hp}</dd></div><div><dt>レベル</dt><dd>{unit.level}</dd></div><div><dt>速度</dt><dd>{unit.speed}</dd></div><div><dt>防御Lv{unit.combatLevelNote ? `（${unit.combatLevelNote}）` : unit.defenseLevelReduction || unit.skillLevelReduction ? "（補正後）" : ""}</dt><dd>{unit.defenseLevel === null ? "不明" : unit.defenseLevel - (unit.defenseLevelReduction ?? unit.skillLevelReduction ?? 0)}</dd></div><div><dt>混乱区間</dt><dd>{unit.stagger}</dd></div></dl>
                <h4>物理耐性</h4><ResistanceList values={unit.physical} />
                <h4>罪悪耐性</h4><ResistanceList values={Object.fromEntries(SIN_ORDER.map((sin) => [sin, unit.sins[sin]]))} />
                </>}
              </div>
            </div>
            <ul className="boss-unit-notes">{unit.notes.map((note) => <li key={note}>{decorate(note, bossKeywords(boss, unit.id), false)}</li>)}</ul>
          </section>)}
        </Section>
        <Section id="skills">
          <p className="boss-section-intro">タブでスキルを切り替えられる。表示威力は固有の強化や攻撃レベル差による補正を含まない値。</p>
          {boss.skillNote && <p className="boss-section-intro">{text(boss.skillNote)}</p>}
          {boss.units.filter((unit) => boss.skills.some((skill) => skill.unit === unit.id)).map((unit) => <section className="boss-skill-group" key={`${boss.id}-${unit.id}`} aria-labelledby={`skills-${unit.id}`}><h3 id={`skills-${unit.id}`}>{unit.name}</h3><SkillTabs boss={boss} unitId={unit.id} /></section>)}
        </Section>
        <Section id="passives">
          {boss.units.filter((unit) => boss.passives.some((passive) => passive.unit === unit.id)).map((unit) => <section className="boss-passive-group" key={unit.id} aria-labelledby={`passives-${unit.id}`}>
            <h3 id={`passives-${unit.id}`}>{unit.name}</h3>
            <div className="passive-cards">{boss.passives.filter((passive) => passive.unit === unit.id).map((passive) => <article className="passive-card" key={passive.name}>
              <header className="passive-card-head"><span className="passive-kind">敵パッシブ</span><h4 className="passive-card-name">{passive.name}</h4></header>
              <p className="boss-passive-condition">条件：{decorate(passive.condition, bossKeywords(boss, unit.id), false)}</p><EffectText text={passive.effect} keywords={bossKeywords(boss, unit.id)} />
              <div className="boss-skill-response"><h5 className="guide-heading">攻略への影響</h5><p>{decorate(passive.response, bossKeywords(boss, unit.id), false)}</p></div>
            </article>)}</div>
          </section>)}
        </Section>
        <aside className="boss-related" aria-label="関連する用語"><h2>仕組みを確認する</h2><div>{boss.relatedTerms.map((id) => { const term = getGlossaryTerm(id); return term && <Link key={id} to={`/glossary/${id}`}>{term.name} →</Link>; })}</div></aside>
        <footer className="boss-sources"><p>敵のステータス・効果・行動は更新で変わることがある。戦闘中の表示も確認する。</p></footer>
        <Link to={`/bosses#${bossChapterId(boss.chapter)}`} className="back-link">← ボス攻略一覧に戻る</Link>
      </div>
    </div>
  </article>;
}
