import { useId, useState } from "react";
import Breadcrumb from "../components/Breadcrumb";
import { Link } from "../components/Link";
import "./focused-battle-guide.css";

// 仕様照合先。画面本文には出典を混ぜない。
// https://limbuscompany.wiki.gg/wiki/Battles
// https://wikiwiki.jp/lcbwiki/Wiki管理/戦闘指南/戦闘の基本
// src/data/glossary-systems.json: target-redirect
const STEPS = [
  { title: "敵の狙いを見る", text: "敵Xは味方Aを、敵Yは味方Cを狙っている。まず敵の各スロットを選び、攻撃先・効果・危険度を確認する。この例では、Aに当てたくないXの攻撃を先に対処する。" },
  { title: "速いBで引き受ける", text: "Bの攻撃スキルをXのスロットへドラッグする。Bの速度6はXの速度4より高いため、Xの攻撃先をBへ変えられる。ここでマッチ予測を見て、勝ちやすいスキルを選ぶ。" },
  { title: "Cは自分の攻撃に対応", text: "Cの攻撃スキルをYのスロットへ指定する。Yは元からCを狙っているので、Cの速度3がYの速度5より低くてもマッチできる。こちらも予測と効果を確認する。" },
  { title: "Aの行動を足す", text: "残ったAもXへ攻撃する。Aの速度2ではXの攻撃先を奪わないため、BとXのマッチを残して一方攻撃を狙える。全員を指定した後に、XがBを、YがCを狙っているか再確認する。" },
];

function Unit({ name, speed, enemy = false }: { name: string; speed: number; enemy?: boolean }) {
  return <span className={`focus-unit${enemy ? " focus-unit-enemy" : ""}`}><strong>{name}</strong><span>速度 <b>{speed}</b></span></span>;
}

function BattleDiagram({ step }: { step: number }) {
  const markerId = useId();
  const arrow = `url(#${markerId})`;
  return <>
    <div className="focus-board-head"><span>味方のスロット</span><span>矢印は攻撃の向き</span><span>敵のスロット</span></div>
    <div className="focus-battle-map">
      <div className="focus-map-a"><Unit name="味方A" speed={2} /></div>
      <div className="focus-map-b"><Unit name="味方B" speed={6} /></div>
      <div className="focus-map-c"><Unit name="味方C" speed={3} /></div>
      <div className="focus-map-x"><Unit name="敵X" speed={4} enemy /></div>
      <div className="focus-map-y"><Unit name="敵Y" speed={5} enemy /></div>
      <svg className="focus-connections" viewBox="0 0 200 340" preserveAspectRatio="none" aria-hidden="true">
        <defs><marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="context-stroke" strokeWidth="1.5" /></marker></defs>
        {step === 0
          ? <path className="focus-path-enemy" d="M 190 50 L 10 50" markerEnd={arrow} />
          : <path className="focus-path-match" d="M 10 170 L 190 50" markerStart={arrow} markerEnd={arrow} />}
        <path className={step < 2 ? "focus-path-enemy" : "focus-path-match"} d="M 190 290 L 10 290" markerStart={step >= 2 ? arrow : undefined} markerEnd={arrow} />
        {step === 3 && <path className="focus-path-extra" d="M 10 50 L 190 50" markerEnd={arrow} />}
      </svg>
    </div>
    <div className="focus-map-legend">
      <span className={step === 0 ? "focus-key-enemy" : "focus-key-match"}>{step === 0 ? "X → A：敵の攻撃" : "B ↔ X：マッチ"}</span>
      <span className={step < 2 ? "focus-key-enemy" : "focus-key-match"}>{step < 2 ? "Y → C：敵の攻撃" : "C ↔ Y：マッチ"}</span>
      {step === 3 && <span className="focus-key-extra">A → X：一方攻撃</span>}
    </div>
    <p className="focus-map-status">{step === 0 ? "行動未指定：A・B・C" : step === 1 ? "行動未指定：A・C。Xの狙いはAからBへ変更。" : step === 2 ? "行動未指定：A。BとCがそれぞれマッチを担当。" : "全員の指定が完了。Aが攻撃しても、Xのマッチ担当はBのまま。"}</p>
  </>;
}

export default function FocusedBattleGuide() {
  const [step, setStep] = useState(0);
  return (
    <article className="container section focus-guide">
      <Breadcrumb items={[{ label: "初心者ガイド", to: "/beginner" }, { label: "集中戦闘の進め方" }]} />
      <header className="focus-heading">
        <p className="kicker">FOCUSED BATTLE</p>
        <h1 className="persona-title">図で覚える、集中戦闘の進め方</h1>
        <p>最初に決めるのは、誰がどの攻撃を受け持つか。敵の狙いを見て、危険な攻撃から順に対応する。</p>
        <p className="focus-note">通常の単体攻撃・攻撃スキルでのマッチを扱う入門例。図はゲーム画面の再現ではなく、敵2スロット・味方3スロットの関係を抜き出した模式図だ。数値・危険度は説明用の架空設定。確認日：2026年10月22日。</p>
      </header>

      <nav aria-label="この記事の内容" className="focus-toc">
        <Link to="/focused-battle#turn-example">1ターンの例</Link><Link to="/focused-battle#speed-rule">速度の見方</Link><Link to="/focused-battle#cannot-win">勝てないとき</Link><Link to="/focused-battle#before-start">開始前の確認</Link>
      </nav>

      <section id="turn-example" className="focus-section">
        <h2><span>01</span>同じ盤面で、4つの判断を追う</h2>
        <p>この例ではBがXに、CがYに勝ちやすい攻撃スキルを持つと仮定する。速度の数字はマッチの強さを表さない。</p>
        <div className="focus-example">
          <div className="focus-step-buttons" role="group" aria-label="図の段階を選ぶ">
            {STEPS.map((s, i) => <button key={s.title} type="button" aria-pressed={step === i} aria-controls="focus-board" onClick={() => setStep(i)}><span>{i + 1}</span>{s.title}</button>)}
          </div>
          <figure id="focus-board" className="focus-board" aria-label={`${step + 1}段階目の攻撃先`}>
            <BattleDiagram step={step} />
            <figcaption aria-live="polite" aria-atomic="true"><strong>{step + 1}. {STEPS[step].title}</strong><p>{STEPS[step].text}</p></figcaption>
          </figure>
        </div>
        <p className="focus-note">図は指定した時点の関係を示す。実際の行動順や、混乱・死亡などで行動が止まるかは別に確認する。一方攻撃も、味方が先に倒されるなどすれば実行できない。</p>
        <details className="focus-transcript"><summary>4段階の説明をまとめて読む</summary><ol>{STEPS.map((s) => <li key={s.title}><strong>{s.title}</strong><p>{s.text}</p></li>)}</ol></details>
      </section>

      <section id="speed-rule" className="focus-section">
        <h2><span>02</span>速度は「引き受けられるか」に使う</h2>
        <div className="focus-rule-grid">
          <div className="focus-rule"><h3>他の味方を庇う</h3><div className="focus-equation">味方 <b>6</b> <span>＞</span> 敵 <b>4</b></div><p>敵より速ければ、攻撃先を自分へ変更できる。</p><p className="focus-note">同速の4では通常引き受けられない。</p></div>
          <div className="focus-rule"><h3>自分を狙う攻撃に対応</h3><div className="focus-equation">自分 <b>3</b> <span>←</span> 敵 <b>5</b></div><p>元から自分が対象なら、遅くても攻撃を合わせてマッチできる。</p><p className="focus-note">速さだけを見て諦めなくてよい。</p></div>
        </div>
        <aside className="focus-callout"><strong>引き受ける → マッチ予測を見る → 効果文も読む</strong><p>速度が高くてもマッチに勝てるとは限らない。予測は確定結果ではなく、コインの出目や戦闘中の条件変化にも左右される。</p></aside>
        <p className="focus-related">詳しく：<Link to="/glossary/target-redirect">対象変更</Link> ／ <Link to="/glossary/match">マッチ</Link> ／ <Link to="/glossary/unopposed">一方攻撃</Link></p>
      </section>

      <section id="cannot-win" className="focus-section">
        <h2><span>03</span>勝ちにくい攻撃を、そのまま開始しない</h2>
        <ol className="focus-decision-flow">
          <li><span>1</span><div><h3>別のスキルで勝てるか</h3><p>同じ味方の別スキルや、使用可能なE.G.Oへ替えた予測を確認する。E.G.Oは資源と精神力の消費も見る。</p></div></li>
          <li><span>2</span><div><h3>別の味方が引き受けられるか</h3><p>敵より速く、勝ちやすいスキルを持つ味方を探す。替えた結果、その味方が受け持っていた別の攻撃を放置しないかも見る。</p></div></li>
          <li><span>3</span><div><h3>守備でしのげるか</h3><p>回避は成功すれば攻撃を避けられるが、失敗の危険がある。通常の防御はシールドで被害を抑える手段で、敵の攻撃自体を消すものではない。通常の反撃は被弾を前提にするため、瀕死の味方を守る手段として安易に選ばない。マッチ可能な守備は、それぞれの効果文も確認する。</p></div></li>
        </ol>
        <p className="focus-related">詳しく：<Link to="/glossary/guard">防御</Link> ／ <Link to="/glossary/evade">回避</Link> ／ <Link to="/glossary/counter">反撃</Link> ／ <Link to="/bosses">ボスごとの対処</Link></p>
        <aside className="focus-callout"><strong>特殊な攻撃は、個別の説明を優先する</strong><p>「マッチ不可」「対象変更不可」は別の制限だ。破壊不能コインはマッチに勝っても攻撃が残る。広域攻撃は主対象を引き受けても副対象が安全になるとは限らない。通常の単体攻撃と同じ図だけで判断しない。</p></aside>
      </section>

      <section id="before-start" className="focus-section">
        <h2><span>04</span>開始前は、敵側からもう一度見る</h2>
        <div className="focus-checks"><div><b>敵の全スロット</b><p>見落とした攻撃や、危険な効果はないか。</p></div><div><b>最後の攻撃先</b><p>複数人で同じスロットを狙い、マッチ担当が変わっていないか。</p></div><div><b>受ける味方の状態</b><p>残りHP・耐性・混乱区間・精神力は大丈夫か。</p></div></div>
        <p>同じ敵スロットへ複数の指定をすると、最後に成立した対象変更が優先される。図の例でも、最後は矢印を見直す。想定と違ったら担当を指定し直し、全員の選択を終えた状態で確認する。</p>
        <div className="focus-end-links"><Link to="/beginner">初心者ガイドへ</Link><Link to="/glossary/focused-battle">集中戦闘の用語解説へ</Link><Link to="/bosses">ボス攻略で実践する →</Link></div>
      </section>
    </article>
  );
}
