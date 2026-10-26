import { Link } from "../components/Link";
import { useContext } from "react";
import { LanguageContext } from "../i18n/text";
import { Message, TranslatedList } from "../i18n/Message";
import { localizeSupportPassive } from "../i18n/supportPassives";
import Breadcrumb from "../components/Breadcrumb";
import EffectText from "../components/EffectText";
import PageToc from "../components/PageToc";
import SinFilterChips from "../components/SinFilter";
import { useSinFilter } from "../useSinFilter";
import { SinBadge } from "../components/ui";
import { characterList, getPersona } from "../data/loader";
import supportPassiveIndex from "../data/support-passives.json";
import { asset } from "../lib";
import { filterSupportPassivesBySins, groupSupportPassivesByCharacter, type SupportPassive } from "../supportPassives";
import "./teams.css";

const passives = supportPassiveIndex as SupportPassive[];

function SupportPassiveCard({ passive }: { passive: SupportPassive }) {
  const language = useContext(LanguageContext);
  const localized = localizeSupportPassive(passive, language);
  const status = getPersona(passive.code)?.status;
  return (
    <article className="passive-card support-passive-card">
      <Link to={`/persona/${passive.code}`} className="support-passive-persona">
        {status?.image && <img src={asset(status.image)} alt="" width={40} height={40} loading="lazy" />}
        <span>
          <strong>{status?.name ?? passive.code}</strong>
          <span>{status?.character}</span>
        </span>
      </Link>
      <header className="passive-card-head">
        <h3 className="passive-card-name">{localized.name}</h3>
        <span className="passive-card-req">
          {passive.cost.map((c) => (
            <SinBadge key={c.sin} sin={c.sin} label={`${c.sin}×${c.count}`} />
          ))}
          {passive.condition && <span className="passive-cond">{passive.condition}</span>}
        </span>
      </header>
      <EffectText text={localized.effect} keywords={localized.keywords} />
    </article>
  );
}

const characterNumbers = new Map(characterList.map((c) => [c.name, c.number]));

/**
 * /support-passives: 全人格のサポートパッシブを、囚人一覧と同じ人格の順で囚人ごとに並べる。
 * サポートパッシブは罪悪属性の資源で発動するため、編成でたまる資源を選ぶと、その資源だけで発動するものに絞り込める。
 * 控え(裏置き)の候補探しに使う。選択は URL(?sin=wrath,pride)に持つ
 */
export default function SupportPassiveListPage() {
  const [selected, setSelected] = useSinFilter();
  const results = filterSupportPassivesBySins(passives, selected);
  const groups = groupSupportPassivesByCharacter(results, (code) => getPersona(code)?.character.name);

  return (
    <div className="container section team-page">
      <Breadcrumb items={[{ label: "サポートパッシブ一覧" }]} />
      <header className="team-hero">
        <p className="kicker"><Message text="SUPPORT PASSIVES ・ {count}人格" values={{ count: passives.length }} /></p>
        <h1 className="persona-title">サポートパッシブ一覧</h1>
        <p className="team-lead">
          全人格のサポートパッシブを、囚人ごとに人格の順でまとめた。必要資源で絞り込むと、編成でたまる資源だけで発動するものを探せる。
        </p>
      </header>

      <section className="keyword-filter" aria-labelledby="support-filter-title">
        <h2 id="support-filter-title" className="ego-filter-title">
          必要資源で絞り込む
        </h2>
        <p className="keyword-filter-lead">
          選んだ罪悪属性の資源だけで発動するサポートパッシブを出す。複数選ぶと、そのどれかの組み合わせで発動するものも含む。数字は、その属性を足したときの件数。
        </p>
        <SinFilterChips selected={selected} onChange={setSelected} countWith={(sins) => filterSupportPassivesBySins(passives, sins).length} />
        {selected.length > 0 && (
          <p className="keyword-filter-summary ego-filter-summary" aria-live="polite">
            <Message text="{sins}の資源だけで発動するサポートパッシブ：{count}" values={{ sins: <TranslatedList items={selected} />, count: <strong>{results.length}件</strong> }} />
          </p>
        )}
      </section>

      <PageToc />

      {groups.length === 0 && <p className="empty">該当するサポートパッシブはない。罪悪属性を足す。</p>}
      {groups.map((group) => (
        <section key={group.character} className="section-block">
          <header className="section-header">
            <h2 className="section-title">
              <span className="section-title-en">{characterNumbers.get(group.character)}</span>
              {group.character}
            </h2>
            <span className="section-count">{group.passives.length}件</span>
          </header>
          <div className="passive-cards">
            {group.passives.map((p) => (
              <SupportPassiveCard key={p.code} passive={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
