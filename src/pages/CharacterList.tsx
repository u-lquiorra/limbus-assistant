import { Link } from "react-router-dom";
import { characterList } from "../data/loader";

export default function CharacterList() {
  return (
    <section className="character-list">
      <h1>罪人一覧</h1>
      <div className="character-grid">
        {characterList.map((c) => (
          <Link to={`/character/${encodeURIComponent(c.name)}`} key={c.name} className="character-card">
            <h2>{c.name}</h2>
            <p className="profile-preview">{c.profileText}</p>
            <span className="persona-count">人格 {c.personaCount}件</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
