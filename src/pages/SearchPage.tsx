import { Link } from "react-router-dom";
import { SearchBox } from "../components/ui";
import SiteSearchResults from "../components/SiteSearchResults";
import { useSearchQuery } from "../useSearchQuery";
import "./search.css";

const EXAMPLES = ["火傷", "ホンル", "破裂編成", "クローマー", "リセマラ", "マッチ"];

export default function SearchPage() {
  const { value, boxProps } = useSearchQuery();

  return (
    <div className="container section search-page">
      <header className="search-heading">
        <p className="kicker">SEARCH</p>
        <h1 className="persona-title">サイト内検索</h1>
        <p>人格・E.G.O・囚人・編成例・ボス攻略・用語辞典をまとめて探す。</p>
      </header>

      <div className="search-page-box" role="search">
        <SearchBox {...boxProps} label="サイト内を検索" placeholder="人格名・囚人名・ボス名・用語で検索" autoFocus />
      </div>

      {value.trim() ? (
        <SiteSearchResults query={value} />
      ) : (
        <div className="search-examples">
          <p>例：</p>
          <ul>
            {EXAMPLES.map((example) => (
              <li key={example}>
                <Link className="chip" to={`/search?q=${encodeURIComponent(example)}`} replace>
                  {example}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
