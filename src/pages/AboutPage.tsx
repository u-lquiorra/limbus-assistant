import { Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { X_ACCOUNT, X_URL } from "../seo";
import "./about.css";

const ISSUES_URL = "https://github.com/u-lquiorra/limbus-assistant/issues";

// サイトの運営方針・データの扱い・免責・問い合わせ先。検索エンジンや利用者に、誰がどう作っているかを示す
export default function AboutPage() {
  return (
    <div className="container section about-page">
      <Breadcrumb items={[{ label: "このサイトについて" }]} />
      <header className="about-heading">
        <p className="kicker">ABOUT</p>
        <h1 className="persona-title">このサイトについて</h1>
      </header>

      <section className="about-section" aria-labelledby="about-overview">
        <h2 id="about-overview">概要</h2>
        <p>
          Limbus Assistant は、Project Moon のゲーム「Limbus Company」(リンバス)の攻略情報をまとめた、個人運営の非公式ファンサイトだ。初めて遊ぶ人でも戦術や使い方が分かることを目指し、人格・E.G.O の使い方、編成例、ボス攻略、用語辞典を日本語で解説している。
        </p>
        <ul>
          <li><Link to="/beginner">初心者ガイド</Link>・<Link to="/reroll">リセマラガイド</Link>：始めたばかりの人向けの手順</li>
          <li><Link to="/">囚人・人格・E.G.O</Link>：ステータス・スキル・パッシブと、使い方の解説</li>
          <li><Link to="/teams">編成例</Link>：キーワードや所属ごとの組み方と、人格の役割</li>
          <li><Link to="/bosses">ボス攻略</Link>：詰まりやすい戦闘の負け方と対処</li>
          <li><Link to="/glossary">用語辞典</Link>：マッチ・精神力・状態異常など、戦闘の仕組み</li>
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-method">
        <h2 id="about-method">掲載内容の作り方</h2>
        <p>
          人格・E.G.O のステータスやスキルは、ゲーム内の情報をもとに整理している。使い方や編成の解説は、スキル・パッシブの効果文、ダメージなどの計算、運営者の検証をもとに独自に書いている。
        </p>
        <p>各ページには、内容を最後に確認した日付を載せている。</p>
      </section>

      <section className="about-section" aria-labelledby="about-disclaimer">
        <h2 id="about-disclaimer">注意事項</h2>
        <ul>
          <li>ゲームのアップデートで、数値や効果が変わることがある。食い違う場合は、ゲーム内の表示を優先する。</li>
          <li>内容の正確さには注意しているが、誤りが含まれる可能性がある。本サイトの情報を利用して生じた損害について、責任は負わない。</li>
          <li>ゲーム内の画像・キャラクター・名称の著作権は Project Moon に帰属する。本サイトは Project Moon とは関係がない。</li>
          <li>権利者から掲載内容について連絡があった場合は、速やかに対応する。</li>
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-contact">
        <h2 id="about-contact">お問い合わせ</h2>
        <p>
          誤りの報告や要望は、<a href={ISSUES_URL} target="_blank" rel="noreferrer">GitHub の Issues</a>で受け付けている。
        </p>
        <p>
          更新のお知らせは X の <a href={X_URL} target="_blank" rel="noreferrer">@{X_ACCOUNT}</a> で発信している。X での連絡も受け付けている。
        </p>
      </section>
    </div>
  );
}
