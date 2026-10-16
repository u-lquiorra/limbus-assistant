import { useParams, Link } from "react-router-dom";
import { getCharacter } from "../data/loader";
import PersonaCard from "../components/PersonaCard";

export default function CharacterDetail() {
  const { name } = useParams<{ name: string }>();
  const character = name ? getCharacter(name) : undefined;

  if (!character) {
    return (
      <section className="character-detail">
        <p>キャラクターが見つかりませんでした。</p>
        <Link to="/">一覧に戻る</Link>
      </section>
    );
  }

  const skillsByCode = new Map(character.skills.map((s) => [s.code, s]));

  return (
    <section className="character-detail">
      <Link to="/" className="back-link">
        ← 罪人一覧に戻る
      </Link>
      <h1>{character.name}</h1>
      <p className="profile-text">{character.profile.profileText}</p>

      <h2>人格一覧 ({character.statuses.length}件)</h2>
      <div className="persona-list">
        {character.statuses.map((status) => (
          <PersonaCard key={status.code} status={status} skills={skillsByCode.get(status.code)} />
        ))}
      </div>
    </section>
  );
}
