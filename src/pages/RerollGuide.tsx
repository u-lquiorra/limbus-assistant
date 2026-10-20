import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getPersona } from "../data/loader";
import { rerollCandidates, rerollCheckedAt, walpurgisCandidates } from "../data/reroll";
import { asset } from "../lib";
import "./beginner-guide.css";
import "./reroll-guide.css";

const sections = [
  ["finish", "終了ライン"], ["candidates", "おすすめ人格"], ["reasons", "選んだ理由・注意点"], ["ego", "E.G.Oの優先度"],
  ["steps", "手順・端末の違い"], ["after", "終了後にすること"],
];

function resolveCandidates(entries: typeof rerollCandidates) {
  return entries.map((candidate) => {
    const persona = getPersona(candidate.code);
    if (!persona) throw new Error(`リセマラ候補の人格が見つかりません: ${candidate.code}`);
    return { ...candidate, status: persona.status };
  });
}

function CandidateTable({ candidates, limited = false }: { candidates: ReturnType<typeof resolveCandidates>; limited?: boolean }) {
  return <table className="reroll-table">
    <caption>人格名を選ぶと性能・使い方へ。「理由」でこのページの詳しい説明へ移動。</caption>
    <thead><tr><th scope="col">囚人</th><th scope="col">おすすめ人格</th><th scope="col">役割</th></tr></thead>
    <tbody>{candidates.map(({ code, status, shortName, role }) => <tr key={code}>
      <th scope="row">{status.character}</th>
      <td><Link className="reroll-table-persona" to={`/persona/${code}`} title={status.name}>{status.image && <img src={asset(status.image)} alt="" loading="lazy" width={40} height={40} />}<span>{shortName}<small>{limited ? "期間限定" : `シーズン${status.season}`}</small></span></Link></td>
      <td><span className="reroll-role">{role}</span><Link className="reroll-reason-link" to={`/reroll#recommend-${code}`} onClick={() => { const target = document.getElementById(`recommend-${code}`); if (target instanceof HTMLDetailsElement) target.open = true; }}>理由 →</Link></td>
    </tr>)}</tbody>
  </table>;
}

export default function RerollGuide() {
  const { hash } = useLocation();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const target = document.getElementById(hash.slice(1));
    if (target instanceof HTMLDetailsElement) target.open = true;
  }, [hash]);
  const candidates = resolveCandidates(rerollCandidates);
  const limitedCandidates = resolveCandidates(walpurgisCandidates);
  const targetedCandidate = [...candidates, ...limitedCandidates].find(({ code }) => hash === `#recommend-${code}`);
  const limited = targetedCandidate ? targetedCandidate.status.season === "W" : hash === "#walpurgis" || searchParams.get("tab") === "walpurgis";
  return <div className="container section beginner-guide reroll-guide">
    <header className="beginner-heading">
      <p className="kicker">REROLL GUIDE</p>
      <h1 className="persona-title">リセマラガイド</h1>
      <p className="beginner-intro">主力になる人格を引いて、物語を始めよう。理想の組み合わせを揃える必要はない。</p>
      <p className="beginner-updated">おすすめ更新日：{rerollCheckedAt}</p>
    </header>

    <aside className="reroll-answer" aria-labelledby="answer-title">
      <p className="kicker">まずは結論</p>
      <h2 id="answer-title">リセマラは必須ではない。迷ったら、主力候補1体を目安に。</h2>
      <p>多くの人格・E.G.Oは、遊びながら集める自我の破片で交換できる。序盤を楽にしたいならリセマラを試し、好きな人格が引けたらそのまま始めても大丈夫。交換できる時期や対象には制限があるので、欲しい人格の入手条件は先に確認しよう。</p>
      <Link to="/reroll#candidates">おすすめ人格を見る →</Link>
    </aside>

    <div className="beginner-layout">
      <aside className="beginner-sidebar"><nav className="beginner-toc" aria-label="リセマラガイドの目次"><p className="beginner-toc-title">目次</p><ol>{sections.map(([id, title], i) => <li key={id}><Link to={`/reroll#${id}`}><span>0{i + 1}</span>{title}</Link></li>)}</ol></nav></aside>
      <div className="beginner-content">
        <details className="beginner-toc-mobile" open><summary>目次 <span>全{sections.length}章</span></summary><ol>{sections.map(([id, title], i) => <li key={id}><Link to={`/reroll#${id}`}><span>0{i + 1}</span>{title}</Link></li>)}</ol></details>
        <section id="finish" className="beginner-section" aria-labelledby="finish-title">
          <h2 id="finish-title" className="section-title"><span className="section-title-en">01</span>どこで終了する？</h2>
          <div className="reroll-finish-grid">
            <article><p className="kicker">手早く始める</p><h3>使いたい主力候補を1体</h3><p>下の候補の使い方と注意点を読み、育てたい1体が引けたら終了の目安。好きな人格で始める選択もよい。</p></article>
            <article><p className="kicker">もう少し狙うなら</p><h3>別々の囚人で主力を2〜3体</h3><p>同時に出撃できる人格が増えると編成を組みやすい。候補全員や特定の組み合わせが揃うまで粘る必要はない。</p></article>
          </div>
          <p className="reroll-note">同じ囚人の人格は同時出撃できない。ファウストの人格を2種類引いても、出撃できるファウストは1人。同じ人格の重複も、出撃人数が増える結果にはならない。</p>
        </section>

        <section id="candidates" className="beginner-section" aria-labelledby="candidates-title">
          <h2 id="candidates-title" className="section-title"><span className="section-title-en">02</span>おすすめ人格</h2>
          <div className="reroll-tabs" role="tablist" aria-label="おすすめ人格の種類" onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const nextLimited = event.key === "Home" ? false : event.key === "End" ? true : !limited;
            const target = document.getElementById(nextLimited ? "tab-walpurgis" : "tab-normal");
            target?.click();
            target?.focus();
          }}>
            <Link id="tab-normal" role="tab" aria-selected={!limited} aria-controls="normal-candidates" tabIndex={limited ? -1 : 0} to="/reroll#candidates">通常 <small>12人格</small></Link>
            <Link id="tab-walpurgis" role="tab" aria-selected={limited} aria-controls="walpurgis" tabIndex={limited ? 0 : -1} to="/reroll?tab=walpurgis#candidates">ヴァルプルギスの夜 <small>6人格</small></Link>
          </div>
          <div id="normal-candidates" role="tabpanel" aria-labelledby="tab-normal" hidden={limited}>
          <p className="beginner-section-lead">新しいシーズンの人格を中心に、攻守の役割と育てた後の強みから選んだ各囚人の候補。囚人順で、強さの順位ではない。全員を揃える必要はない。</p>
          <p className="reroll-note">対象期間：{rerollCheckedAt}時点のS8。抽出ごとに排出対象が異なるため、狂気を使う前に「提供一覧」で候補の名前を確認しよう。新人管理人記念抽出から全候補が出るとは限らない。</p>
          <CandidateTable candidates={candidates} />
          <p className="reroll-note">支援や変身を得意とする候補には、仲間や準備が必要な場合もある。選んだ理由と注意点を見てから終了を判断しよう。</p>
          </div>
          <div id="walpurgis" role="tabpanel" aria-labelledby="tab-walpurgis" hidden={!limited}>
          <p className="beginner-section-lead">開催時に狙いたい限定人格の候補。火力だけでなく、回復や編成への貢献も見て6人格を選んだ。囚人順で、全員を揃える必要はない。</p>
          <p className="reroll-note">ヴァルプルギスの夜の開催中に、引く抽出の提供一覧に載っている場合に狙おう。開催外はリセマラの対象に含めず、通常の候補から選んで大丈夫。</p>
          <CandidateTable candidates={limitedCandidates} limited />
          </div>
        </section>

        <section id="reasons" className="beginner-section" aria-labelledby="reasons-title">
          <h2 id="reasons-title" className="section-title"><span className="section-title-en">03</span>選んだ理由・注意点</h2>
          <p className="beginner-section-lead">気になる囚人の説明を開いて確認しよう。性能は同期化Ⅳを基準にしており、入手直後から全ての動きができるわけではない。</p>
          <div className="reroll-explanations">{[...candidates, ...limitedCandidates].map(({ code, status, reason, caution }) => <details id={`recommend-${code}`} className="reroll-explanation" key={code} hidden={(status.season === "W") !== limited}>
            <summary><span>{status.character}{status.season === "W" && " ／ ヴァルプルギスの夜"}<strong>{status.name}</strong></span></summary>
            <div><h3>おすすめの理由</h3><p>{reason}</p><h3>使う前に知っておきたいこと</h3><p>{caution}</p><Link className="reroll-detail" to={`/persona/${code}`}>性能・使い方を詳しく見る →</Link></div>
          </details>)}</div>
        </section>

        <section id="ego" className="beginner-section" aria-labelledby="ego-title">
          <h2 id="ego-title" className="section-title"><span className="section-title-en">04</span>E.G.Oは狙うべき？</h2>
          <article className="beginner-topic"><h3>最初は人格を優先しよう</h3><p>人格は普段の戦闘で使うスキルを決める。E.G.Oは資源を消費して使う特殊な技で、使うための編成や育成も必要になる。リセマラでは、まず主力になる人格がいるかを見て判断しよう。</p></article>
          <article className="beginner-topic"><h3>E.G.Oとのセット引きは必須にしない</h3><p>有用なE.G.Oが一緒に出たらうれしいが、それだけを理由に主力人格のいる結果を捨てる必要はない。引けたE.G.Oの使い道は、対象の囚人の詳細ページで確認できる。</p></article>
        </section>

        <section id="steps" className="beginner-section" aria-labelledby="steps-title">
          <h2 id="steps-title" className="section-title"><span className="section-title-en">05</span>リセマラの手順</h2>
          <p className="beginner-section-lead">スマホ版の未連携アカウントで行う流れ。既に遊んでいるアカウントを削除しないよう、操作するデータを確認しよう。</p>
          <ol className="reroll-steps">
            <li><strong>スマホ版で未連携の状態から開始する</strong><p>チュートリアルを進めるかスキップする。結果を決めるまでは外部アカウントと連携しない。</p></li>
            <li><strong>配布を受け取り、抽出の提供一覧を確認する</strong><p>新人管理人記念抽出などの対象・必要な狂気・確定枠を確認する。狙う人格が載っていなければ、その抽出を繰り返しても出ない。</p></li>
            <li><strong>抽出して、終了ラインと比べる</strong><p>使いたい主力がいるか、囚人が偏っていないかを見る。終了するなら、削除せずアカウントを保護する。</p></li>
            <li><strong>やり直す場合のみ、未連携データを削除する</strong><p>「設定 → 環境設定 → アカウント → アカウント削除」へ進む。画面上の対象・削除条件を読み、今回やり直すために作ったデータであることを確認してから行う。</p></li>
          </ol>
          <div className="beginner-topic"><h3>回数・時間の目安</h3><p>新人管理人記念抽出は狂気1600で20回、000人格またはE.G.Oが1つ確定。初回ダウンロードを除き1周1〜2分が目安だが、端末・通信・配布状況で変わる。開始時の狂気や確定枠は、抽出前にゲーム内表示で確認しよう。</p></div>
          <div className="beginner-topic"><h3>Steam版・アカウント連携の注意</h3><p>Steam版は起動時にアカウントが連携されるため、スマホの未連携データと同じ手順ではやり直せない。PCで遊びたい場合は、スマホで結果を決めてから連携する方法がある。連携時は、どちらの進行データを残すか必ず確認しよう。連携済みアカウントは削除に待機期間があるため、削除画面の条件を確認しよう。</p></div>
        </section>

        <section id="after" className="beginner-section" aria-labelledby="after-title">
          <h2 id="after-title" className="section-title"><span className="section-title-en">06</span>終わったら、物語へ</h2>
          <article className="beginner-topic"><h3>アカウントを保護する</h3><p>続けるデータを決めたら、ゲーム内の案内に従って連携し、ユーザーIDを控えておこう。</p></article>
          <article className="beginner-topic"><h3>主力を育てながらストーリーを進める</h3><p>引いた人格のレベル・同期化を少しずつ上げる。足りない役割は初期人格や00人格も使って補おう。日課や破片交換の流れは初心者ガイドへ。</p></article>
          <Link to="/beginner" className="beginner-home-link"><span className="kicker">NEXT STEP</span><strong>初心者ガイドで、次にすることを見る →</strong><span>育成・採光・鏡ダンジョン・交換を順番に案内。</span></Link>
        </section>
      </div>
    </div>
  </div>;
}
