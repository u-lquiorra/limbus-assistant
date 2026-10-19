import { Link } from "react-router-dom";
import "./beginner-guide.css";

const sections = [
  { id: "start", number: "01", title: "はじめにやること", lead: "まずはストーリーを進め、遊びながらできることを増やそう。", items: [
    { title: "ストーリーを進めよう", body: "最初はメインストーリーを進めるのがおすすめ。新しいコンテンツや育成先が順に開くので、戦闘で困るまでは寄り道を増やしすぎなくて大丈夫。", links: [] },
    { title: "囚人・人格・E.G.Oを知ろう", body: "囚人はキャラクター、人格は戦闘で選ぶバージョン、E.G.Oは戦闘中に資源を使って発動する強力なスキル。人格ごとにスキルや得意な戦い方が異なる。囚人一覧から囚人を選ぶと、その囚人の人格ページを見られる。", links: [["囚人・人格一覧", "personas"], ["E.G.O", "ego"]] },
    { title: "手持ちから出撃メンバーを選ぼう", body: "まずは使える人格を中心に編成し、それぞれのスキルと耐性を見てみよう。最初から状態異常や所属を一つに統一する必要はない。人格のページで役割や使い方を確認できる。", links: [] },
  ] },
  { id: "growth", number: "02", title: "育成について", lead: "全員を一度に育てず、よく使う人格から整える。", items: [
    { title: "まずは出撃する人格を育てる", body: "使う予定の人格を優先し、レベルと同期化を強化しよう。レベルは基礎能力、同期化はスキルやパッシブの解放・強化に関わる。必要素材と強化内容を確認してから使うと無駄が少ない。", links: [["同期化", "synchronization"]] },
    { title: "詰まった場所に合わせて強化する", body: "敵とのレベル差が大きいならレベル、スキルやパッシブが未解放なら同期化を見直そう。進行段階だけで決めた固定レベルではなく、出撃画面の敵情報と手持ちの育成状況を目安にする。", links: [] },
    { title: "素材は足りないものから集める", body: "人格学習チケットが足りなければ経験値採光、同期化素材が足りなければ紐採光を候補にしよう。採光の解放状況や報酬はゲーム内表示を確認し、ストーリー進行に使うエンケファリンも残しておく。", links: [] },
    { title: "E.G.Oの強化は必要になってから", body: "E.G.Oは解析で強化できる。素材を一度に使い切らず、よく使うE.G.Oや効果を確認してから強化先を決めよう。", links: [["幻想解析", "analysis"]] },
  ] },
  { id: "routine", number: "03", title: "毎日・毎週やること", lead: "毎日は採光、週ごとは鏡ダンジョンを目安に、育成素材と交換用の報酬を集めよう。", items: [
    { title: "毎日の採光で育成素材を補充する", body: "経験値採光では人格のレベル上げに使う人格学習チケット、紐採光では人格の同期化やE.G.Oの解析に使う紐を集められる。今育てたい人格がいるなら経験値採光、同期化を進めたいなら紐採光を選ぼう。デイリー追加報酬が残っている場合は、日付が変わる前に必要な方へ使うと取りこぼしにくい。", links: [["同期化", "synchronization"], ["幻想解析", "analysis"]] },
    { title: "エンケファリンを採光に使うか、モジュールに変える", body: "エンケファリンはストーリーや採光に使い、モジュールは鏡ダンジョンや採光のスキップなどに使う。ストーリーを進めたい日はエンケファリンを残し、すぐ周回しない分や上限からあふれそうな分はモジュールに変換しておこう。採光のスキップは時間を短縮できるが、モジュールあたりの報酬は通常戦闘より少なくなる。", links: [] },
    { title: "毎週の鏡ダンジョンでパス報酬を進める", body: "鏡ダンジョンのクリア報酬ではバトルパス経験値を得られ、週のボーナスを使うと追加報酬も受け取れる。ボーナス回数は週ごとに戻るので、受け取り画面で残り回数を確認して活用しよう。まずは安定してクリアできる難易度を選び、ハードは解放されてから挑戦すればよい。", links: [] },
    { title: "集めた報酬を育成と交換に回す", body: "採光はすぐ使う育成素材、鏡ダンジョンはバトルパスや自我の破片ボックスを集めるのに向いている。まず育てたい人格を決めて採光し、交換したい人格・E.G.Oが決まったら鏡ダンジョンの報酬で破片を集める、というように目標ごとに使い分けよう。", links: [] },
  ] },
  { id: "stuck", number: "04", title: "戦闘に詰まったとき", lead: "負けた原因を一つずつ見て、育成か操作かを切り分けよう。", items: [
    { title: "敵と味方のレベル・耐性を見比べる", body: "敵のレベルが高い、攻撃タイプへの耐性が合わないなど、出撃前の情報に手がかりがある。耐性が不利な人格を別の人格に替えるだけで、戦いやすくなることもある。", links: [["耐性", "resistance"]] },
    { title: "危険な攻撃にはマッチを使う", body: "味方のスキルを敵の攻撃に割り当てると、攻撃同士のマッチが起きる。敵の強い攻撃を止めたいときは、マッチの勝ちやすさを確認してから割り当てよう。予測表示だけで勝敗が決まらない場合もある。", links: [["マッチ", "match"]] },
    { title: "精神力とスキルの効果を確認する", body: "精神力は通常コインの表が出る確率に関わる。スキルの基本威力・コイン威力や効果文も読み、人格の得意な条件が整っているか見直そう。", links: [["精神力", "sanity"], ["スキル威力", "skill-power"]] },
    { title: "ボスの説明を読んで、編成を見直す", body: "ボスのパッシブや部位の説明に、対処方法が書かれていることがある。苦手な状態異常や攻撃タイプが分かったら、人格・耐性・サポートを調整する。ボス攻略には3〜7章の難所の対処をまとめているので、今詰まっている戦闘から確認しよう。", links: [["ボス攻略一覧", "/bosses"], ["4-48 ドンベク攻略", "/bosses/dongbaek-spicebush"]] },
  ] },
  { id: "mirror", number: "05", title: "鏡ダンジョン・人格の交換について", lead: "鏡ダンジョンの報酬を、バトルパスと自我の破片につなげる。", items: [
    { title: "鏡ダンジョンはバトルパスを進める場所", body: "鏡ダンジョンをクリアするとバトルパス経験値を獲得できる。パス報酬には育成素材や自我の破片ボックスなどがある。ストーリーで行き詰まったら、必要な人格を育ててから挑戦しよう。", links: [] },
    { title: "まずは挑戦できる難易度から", body: "高難易度を急ぐ必要はない。今の編成で安定して進める難易度を選び、報酬受け取り時にボーナス回数・追加報酬・モジュール消費を確かめよう。ハードは解放条件があるため、ゲーム内表示に従う。", links: [] },
    { title: "ボックスの種類を見分ける", body: "通常の「自我の破片ボックス」はランダムな囚人の破片、「自我の破片セレクトボックス」は開封時に選んだ囚人の破片が出る。どちらも1箱から得られる破片は1〜3個。交換したい人格・E.G.Oが決まっているなら、対象の囚人を選べるセレクトボックスを優先して使おう。", links: [] },
    { title: "破片を自販機で交換する", body: "ボックスから集めた囚人ごとの自我の破片は、自販機でその囚人の人格やE.G.Oと交換できる。交換に必要な数や対象のシーズンは品ごとに異なるので、先に自販機で欲しい品を確認してから、対応する囚人のセレクトボックスを開けよう。", links: [] },
    { title: "交換対象と時期を確認する", body: "人格・E.G.Oによって交換できる時期や条件が異なる。自販機に並んでいるかを確認してから、破片を集める囚人を決めよう。交換に必要な数や対象は変わる可能性があるため、最新のゲーム内表示を優先する。", links: [] },
    { title: "抽出と交換を使い分ける", body: "欲しいものが自販機にあるなら、抽出を続ける前に必要な破片と手持ちを比べよう。交換なら対象を選べる一方、破片を集めるには時間がかかる。抽出の提供内容や期間限定対象も確認して決める。", links: [] },
  ] },
  { id: "other", number: "06", title: "その他・よくある疑問", lead: "迷ったらゲーム内の最新表示を見て、使い道を決めてから消費する。", items: [
    { title: "狂気は何に使う？", body: "狂気は抽出やエンケファリン回復などに使える。使い道を決める前に、今開催中の抽出内容や自分のプレイ頻度を確認しよう。", links: [] },
    { title: "シーズン切り替わりに注意", body: "シーズンが変わると、交換対象やパス報酬などが切り替わる。破片やボックスを使う前に、自販機の対象とゲーム内のお知らせを確認しておくと安心。", links: [] },
    { title: "用語が分からないとき", body: "戦闘中に見慣れない言葉が出たら、用語辞典で共通の仕組みを確認しよう。人格固有の効果は、その人格の詳細ページにある効果文も合わせて読む。", links: [] },
  ] },
];

const sources = [
  ["鏡ダンジョン", "https://wikiwiki.jp/lcbwiki/鏡ダンジョン"],
  ["バトルパス", "https://wikiwiki.jp/lcbwiki/一覧表/バトルパス"],
  ["インベントリ（破片ボックス）", "https://wikiwiki.jp/lcbwiki/一覧表/インベントリ"],
  ["新入管理人向け情報", "https://wikiwiki.jp/lcbwiki/Wiki管理/新入管理人向け情報"],
  ["経験値採光", "https://wikiwiki.jp/lcbwiki/経験値採光"],
];

export default function BeginnerGuide() {
  return <div className="container section beginner-guide">
    <header className="beginner-heading">
      <p className="kicker">NEW MANAGER GUIDE</p>
      <h1 className="persona-title">初心者ガイド</h1>
      <p className="beginner-intro">まずはストーリーを進めよう。戦闘に詰まったら育成を見直し、毎日の採光と毎週の鏡ダンジョンで少しずつ戦力を整えよう。</p>
      <p className="beginner-updated">ゲーム内仕様の確認日：2026年10月18日</p>
    </header>

    <Link to="/reroll" className="beginner-home-link" style={{ marginBottom: 30 }}><span className="kicker">REROLL GUIDE</span><strong>ゲーム開始前の抽出で迷ったら、リセマラガイドへ →</strong><span>おすすめ人格と終了ライン、端末ごとの注意点を確認。</span></Link>

    <div className="beginner-layout">
      <aside className="beginner-sidebar">
        <nav className="beginner-toc" aria-label="初心者ガイドの目次">
          <p className="beginner-toc-title">目次</p>
          <ol>{sections.map((section) => <li key={section.id}><Link to={`/beginner#${section.id}`}><span>{section.number}</span>{section.title}</Link></li>)}</ol>
        </nav>
      </aside>

      <div className="beginner-content">
        <details className="beginner-toc-mobile">
          <summary>目次 <span>全6章</span></summary>
          <ol>{sections.map((section) => <li key={section.id}><Link to={`/beginner#${section.id}`}><span>{section.number}</span>{section.title}</Link></li>)}</ol>
        </details>
        <div className="beginner-sections">{sections.map((section) => <section className="beginner-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
      <header className="section-header beginner-section-heading">
        <h2 id={`${section.id}-title`} className="section-title"><span className="section-title-en">{section.number}</span>{section.title}</h2>
      </header>
      <p className="beginner-section-lead">{section.lead}</p>
      <div className="beginner-topic-list">{section.items.map((item) => <article className="beginner-topic" key={item.title}>
        <h3>{item.title}</h3><p>{item.body}</p>
        {item.links.length > 0 && <p className="beginner-related">くわしく：{item.links.map(([name, id], index) => <span key={id}>{index > 0 && "・"}<Link to={id.startsWith("/") ? id : id === "personas" ? "/" : `/glossary/${id}`}>{name}</Link></span>)}</p>}
      </article>)}</div>
      {section.id === "mirror" && <ShardBoxGuide />}
        </section>)}</div>
        <aside className="beginner-sources"><h2>参考資料</h2><p>ゲーム内で確認できる報酬・解放条件を優先してください。抽出内容やシーズン報酬など更新される情報は、プレイ時に再確認してください。</p><ul>{sources.map(([name, url]) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{name}<span aria-hidden="true"> ↗</span></a></li>)}</ul></aside>
      </div>
    </div>
  </div>;
}

function ShardBoxGuide() {
  return <figure className="beginner-shard-guide" aria-labelledby="shard-flow-title">
    <figcaption id="shard-flow-title">鏡ダンジョンから人格交換まで</figcaption>
    <ol className="beginner-shard-flow">
      <li><span className="shard-step">01</span><strong>鏡ダンジョンをクリア</strong><small>報酬でバトルパス経験値を獲得</small></li>
      <li><span className="shard-step">02</span><strong>パス報酬を受け取る</strong><small>通常報酬や上限後の超過報酬にボックス</small></li>
      <li><span className="shard-step">03</span><strong>ボックスを開ける</strong><small>囚人の自我の破片を1〜3個獲得</small></li>
      <li><span className="shard-step">04</span><strong>自販機で交換</strong><small>集めた破片で人格・E.G.Oを選ぶ</small></li>
    </ol>
    <div className="beginner-box-types">
      <section><h4>自我の破片ボックス</h4><p>誰の破片が出るかランダム。特定の交換先が決まっていないとき向け。</p></section>
      <section><h4>自我の破片セレクトボックス</h4><p>開封時に囚人を選べる。交換したい人格・E.G.Oに合わせて使える。</p></section>
    </div>
    <div className="beginner-box-table-wrap">
      <table className="beginner-box-table">
        <caption>鏡ダンジョン1回分のバトルパス進行目安</caption>
        <thead><tr><th scope="col">鏡ダンジョン1回</th><th scope="col">週ボーナス</th><th scope="col">パス経験値</th><th scope="col">進むレベル</th><th scope="col">上限後のセレクトボックス</th></tr></thead>
        <tbody>
          <tr><th scope="row">ノーマル</th><td data-label="週ボーナス">なし</td><td data-label="パス経験値">30</td><td data-label="進むレベル">3レベル</td><td data-label="上限後のセレクトボックス">無償：3個<br />リンバスパス：9個</td></tr>
          <tr><th scope="row">ノーマル</th><td data-label="週ボーナス">1回分</td><td data-label="パス経験値">45</td><td data-label="進むレベル">4レベル＋5進行度</td><td data-label="上限後のセレクトボックス">無償：4個<br />リンバスパス：12個</td></tr>
          <tr><th scope="row">ハード</th><td data-label="週ボーナス">1回分</td><td data-label="パス経験値">75</td><td data-label="進むレベル">7レベル＋5進行度</td><td data-label="上限後のセレクトボックス">無償：7個<br />リンバスパス：21個</td></tr>
          <tr><th scope="row">ハード</th><td data-label="週ボーナス">2回分</td><td data-label="パス経験値">150</td><td data-label="進むレベル">15レベル</td><td data-label="上限後のセレクトボックス">無償：15個<br />リンバスパス：45個</td></tr>
          <tr><th scope="row">ハード</th><td data-label="週ボーナス">3回分</td><td data-label="パス経験値">225</td><td data-label="進むレベル">22レベル＋5進行度</td><td data-label="上限後のセレクトボックス">無償：22個<br />リンバスパス：66個</td></tr>
        </tbody>
      </table>
    </div>
    <p className="beginner-box-note"><strong>見方：</strong>最終層までクリアした場合の報酬。ハードの数値は、その週のボーナスをまだ使っていない状態で受け取る場合を示している。経験値10で1レベル上がり、表は開始時の進行度0で計算。余った進行度は次回に持ち越される。箱数はパスの通常報酬をすべて獲得した後のもので、1レベルごとに無償パスで1個、リンバスパス購入済みなら合計3個を受け取れる。</p>
  </figure>;
}
