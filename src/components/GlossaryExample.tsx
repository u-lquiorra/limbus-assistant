import type { GlossaryTerm } from "../glossary";

function CoinFace({ heads, broken = false }: { heads?: boolean; broken?: boolean }) {
  const label = broken ? "破壊されたコイン" : heads === undefined ? "コイン1枚" : heads ? "表" : "裏";
  return <span className={`diagram-coin${heads ? " is-heads" : ""}${broken ? " is-broken" : ""}`} aria-label={label}>{broken ? "×" : heads === undefined ? "1" : heads ? "表" : "裏"}</span>;
}

export default function GlossaryExample({ example }: { example: GlossaryTerm["example"] }) {
  const diagram = example.diagram;
  let visual;
  switch (diagram?.type) {
    case "evade-backup": {
      visual = <div className="evade-backup-diagram">
        <div className="evade-setup">
          <div className="evade-own-slots">
            <p className="diagram-legend">同じ人格の行動枠（2枠以上）</p>
            <div className="diagram-node"><strong>① 回避を指定</strong><span>行動枠A：一方防御で待機</span></div>
            <div className="diagram-node diagram-highlight"><strong>② 攻撃を指定</strong><span>行動枠B：こちらでマッチ</span></div>
          </div>
          <span className="target-arrow" aria-label="両方を同じ敵スロットへ指定">→</span>
          <div className="diagram-node evade-enemy"><span>同じ敵スロット</span><strong>破壊不能コインを含む攻撃</strong><span>この人格を攻撃する</span></div>
        </div>
        <p className="target-operation">指定順は「回避 → 攻撃」</p>
        <ol className="evade-resolution">
          <li className="diagram-node"><span>マッチ</span><strong>行動枠Bの攻撃で勝利</strong><span>続いて自分が攻撃する</span></li>
          <li className="diagram-node diagram-highlight"><span>残った破壊不能コインが攻撃</span><strong>行動枠Aの回避が発動</strong><span>成功すれば被ダメージ・的中時効果を防ぐ</span></li>
        </ol>
      </div>;
      break;
    }
    case "evade-chain": {
      visual = <div className="evade-chain-diagram">
        <div className="diagram-node diagram-highlight"><strong>回避に使う行動枠は1つ</strong><span>残りの行動枠では攻撃できる</span></div>
        <div className="diagram-arrow" aria-hidden="true">↓</div>
        <ol className="evade-chain-timeline">{example.steps.map((step, index) => <li className={index === example.steps.length - 1 ? "evade-chain-failure" : ""} key={step}>
          <span className="evade-chain-marker" aria-hidden="true">{index === example.steps.length - 1 ? "×" : "✓"}</span>
          <div><strong>{step}</strong><span>{index === 0 ? "指定先からの攻撃で回避が発動" : index === example.steps.length - 1 ? "失敗したコインを避け直すことはできない" : "同じ回避を再使用し、コインを振り直す"}</span></div>
        </li>)}</ol>
      </div>;
      break;
    }
    case "target-redirect": {
      const [enemy, original, helper] = diagram.values;
      visual = <div className="target-redirect-diagram">
        <div className="target-scenario">
          <p className="diagram-legend">変更前</p>
          <div className="target-pair"><div className="diagram-node"><span>敵の攻撃</span><strong>速度 {enemy}</strong></div><span className="target-arrow" aria-label="攻撃先">→</span><div className="diagram-node"><span>狙われている味方A</span><strong>速度 {original}</strong></div></div>
        </div>
        <p className="target-operation">{`味方Bが攻撃を指定：速度${helper} ＞ 敵の速度${enemy}`}</p>
        <div className="target-scenario diagram-highlight">
          <p className="diagram-legend">変更後：Aに向いていた、この攻撃をBが引き受ける</p>
          <div className="target-pair"><div className="diagram-node"><span>敵の攻撃</span><strong>速度 {enemy}</strong></div><span className="target-arrow" aria-label="マッチ">⇄</span><div className="diagram-node"><span>引き受ける味方B</span><strong>速度 {helper}</strong></div></div>
        </div>
      </div>;
      break;
    }
    case "slot-growth": {
      const [limit, members] = diagram.values;
      visual = <div className="slot-growth-diagram">
        <p className="diagram-legend">{`出撃上限${limit}名・味方${members}名 ／ 編成順 A → B → C`}</p>
        <div className="slot-growth-table"><table>
          <caption className="diagram-legend">各ターン開始時の行動枠。□1つが1スロット</caption>
          <thead><tr><th scope="col">ターン</th>{["A", "B", "C"].map((name) => <th scope="col" key={name}>味方{name}</th>)}<th scope="col">合計</th></tr></thead>
          <tbody>{[[1, 1, 1], [2, 1, 1], [2, 2, 1]].map((counts, turn) => <tr key={turn}>
            <th scope="row">{turn + 1}</th>
            {counts.map((count, member) => <td key={member}><span className="slot-tokens" aria-label={`${count}スロット`}>{Array.from({ length: count }, (_, i) => <span className="slot-token" key={i} aria-hidden="true" />)}</span></td>)}
            <td><strong>{counts.reduce((sum, count) => sum + count, 0)}</strong> / {limit}</td>
          </tr>)}</tbody>
        </table></div>
      </div>;
      break;
    }
    case "skill-choice": {
      visual = <div className="skill-choice-diagram">
        <div className="skill-choice-columns">
          <div className="diagram-node diagram-highlight"><span>今ターンに選べる</span><strong>スキルA ／ スキルB</strong><span>どちらか1つを選択</span></div>
          <span className="target-arrow" aria-hidden="true">→</span>
          <div className="diagram-node"><span>次に来る予告</span><strong>スキルC</strong><span>今ターンはまだ選べない</span></div>
        </div>
        <div className="diagram-arrow" aria-hidden="true">↓</div>
        <div className="diagram-node diagram-highlight"><strong>START後、選んだスキルを使用</strong><span>次のスキルが順に欄へ補充される</span></div>
      </div>;
      break;
    }
    case "part-damage": {
      visual = <div className="part-damage-diagram">
        <div className="diagram-node diagram-highlight"><span>攻撃先に選んだ部位</span><strong>攻撃が命中</strong><span>耐性はこの部位の値を参照</span></div>
        <div className="diagram-arrow" aria-hidden="true">↓</div>
        <div className="part-hp-pair">
          {["部位HP", "本体HP"].map((label) => <div className="diagram-node part-hp-node" key={label}>
            <strong>{label}</strong><span className="part-hp-track" aria-hidden="true"><span /></span><small>同じ攻撃でHPが減る</small>
          </div>)}
        </div>
      </div>;
      break;
    }
    case "defense-offset": {
      visual = <div className="defense-offset-diagram">
        <div className="target-pair"><div className="diagram-node"><span>敵</span><strong>通常の回避</strong></div><span className="target-arrow" aria-label="互いに対応">⇄</span><div className="diagram-node"><span>味方</span><strong>通常の防御</strong></div></div>
        <div className="diagram-arrow" aria-hidden="true">↓</div>
        <div className="diagram-node diagram-highlight"><strong>互いに指定先から攻撃が来ない</strong><span>回避判定も、防御のバリア獲得も発動しない</span></div>
        <p className="diagram-legend offset-exception">通常の反撃は相殺できない。戦闘開始時の効果も、この不発とは別。</p>
      </div>;
      break;
    }
    case "effect-timeline": {
      visual = <ol className="effect-timeline">{example.steps.map((step, index) => <li key={step}>
        <span className="count-step" aria-hidden="true">{index + 1}</span><span>{step}</span>
      </li>)}</ol>;
      break;
    }
    case "chance": {
      const [potency, percentPerPoint] = diagram.values;
      const chance = Math.min(100, potency * percentPerPoint);
      visual = <div className="chance-diagram">
        <div className="chance-gauge">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="chance-track" cx="60" cy="60" r="48" />
            <circle className="chance-fill" cx="60" cy="60" r="48" pathLength="100" strokeDasharray={`${chance} ${100 - chance}`} transform="rotate(-90 60 60)" />
          </svg>
          <strong>{chance}%</strong>
        </div>
        <div><p>呼吸威力 <strong>{potency}</strong> × {percentPerPoint}%</p><p>通常のクリティカル確率</p><p className="diagram-legend">確率を示す図。発動順や回数を示すものではない。</p></div>
      </div>;
      break;
    }
    case "condition-branch":
    case "two-attributes": {
      const [root, ...attributes] = example.steps;
      visual = <div className="coin-branch">
        <div className="diagram-node branch-start">{root}</div>
        {diagram.type === "condition-branch" ? (
          <div className="branch-connectors" aria-hidden="true"><span>↙</span><span>↘</span></div>
        ) : <p className="attribute-connector">同時に持つ2つの区分</p>}
        <div className="branch-outcomes">{attributes.map((attribute) => <div className="diagram-node" key={attribute}>{attribute}</div>)}</div>
      </div>;
      break;
    }
    case "coin-branch": {
      const [base, power] = diagram.values;
      visual = <div className="coin-branch">
        <div className="diagram-node branch-start">基本威力 <strong>{base}</strong><span>コインを1枚振る</span></div>
        <div className="branch-connectors" aria-hidden="true"><span>↙</span><span>↘</span></div>
        <div className="branch-outcomes">
          <div className="diagram-node"><CoinFace heads={false} /><span>加算なし</span><strong className="diagram-value">{base}</strong></div>
          <div className="diagram-node diagram-highlight"><CoinFace heads /><span>{base} + {power}</span><strong className="diagram-value">{base + power}</strong></div>
        </div>
      </div>;
      break;
    }
    case "power-comparison": {
      const [base, power, count] = diagram.values;
      const max = base + power * count;
      visual = <div className="power-comparison">
        <p className="diagram-legend">同じスキルでも、表の枚数でマッチ威力が変わる</p>
        {Array.from({ length: count + 1 }, (_, heads) => <div className="power-row" key={heads}>
          <div className="power-coins">{Array.from({ length: count }, (_, i) => <CoinFace key={i} heads={i < heads} />)}<span>{`表${heads}枚`}</span></div>
          <div className="power-bar-track"><div className="power-bar" style={{ width: `${(base + power * heads) / max * 100}%` }} /></div>
          <strong>{base + power * heads}</strong>
          <span className="power-formula">{base} + {power} × {heads}</span>
        </div>)}
      </div>;
      break;
    }
    case "match": {
      const [own, enemy] = diagram.values;
      visual = <div className="match-diagram">
        <div className="match-contest">
          <div className="diagram-node diagram-highlight"><span>自分</span><CoinFace /><strong className="diagram-value">{own}</strong><span>今回のマッチ威力</span></div>
          <span className="match-versus" aria-label="対">VS</span>
          <div className="diagram-node"><span>敵</span><CoinFace /><strong className="diagram-value">{enemy}</strong><span>今回のマッチ威力</span></div>
        </div>
        <div className="diagram-arrow" aria-hidden="true">↓</div>
        <div className="match-resolution"><CoinFace heads={false} broken /><p>敵の通常コインが破壊される<br /><strong>残り0枚 → 自分が勝利して攻撃へ</strong></p></div>
      </div>;
      break;
    }
    case "resistance-comparison": {
      visual = <div className="resistance-comparison">
        <p className="diagram-legend">耐性欄に表示される数値を比較</p>
        {diagram.values.map((value) => <div className="resistance-row" key={value}>
          <strong>×{value.toFixed(1)}</strong>
          <div className="resistance-track"><span className={`resistance-bar ${value < 1 ? "is-resistant" : value > 1 ? "is-weak" : ""}`} style={{ width: `${value / 2 * 100}%` }} /><span className="resistance-baseline" aria-hidden="true" /></div>
          <span>{value < 1 ? "軽減する方向" : value > 1 ? "増加する方向" : "基準"}</span>
        </div>)}
        <p className="diagram-legend">縦線は耐性×1.0の位置。棒は耐性の数値を表し、最終ダメージ比を表すものではない。</p>
      </div>;
      break;
    }
    case "potency-count": {
      const [potency, count] = diagram.values;
      const [effect, trigger, result] = diagram.labels ?? ["破裂", "攻撃を受ける", "追加ダメージ"];
      visual = <div className="count-diagram">
        <div className="diagram-node count-initial"><span>{`${effect}の初期状態`}</span><div className="count-values"><span>威力 <strong>{potency}</strong></span><span>回数 <strong>{count}</strong></span></div></div>
        <ol className="count-timeline">{Array.from({ length: count }, (_, i) => <li key={i}>
          <span className="count-step">{i + 1}</span>
          <div><span>{trigger}</span><strong>{result} {potency}</strong></div>
          <div className="count-remaining"><span>回数</span><strong>{count - i} → {count - i - 1}</strong><small>{i === count - 1 ? "回数が尽きる" : "威力はそのまま"}</small></div>
        </li>)}</ol>
      </div>;
      break;
    }
    default:
      return <ol className="term-example-flow">{example.steps.map((step, index) => <li key={step}><span className="example-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol>;
  }
  return <figure className="example-diagram">{visual}<figcaption className="diagram-caption">{example.steps.join(" ／ ")}</figcaption></figure>;
}
