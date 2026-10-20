// wiki本文の誤記・ページ間の食い違いを、取得後のデータに対して補正する。
// 生成済みJSONを手で直すと再取得で消えるため、補正はここに集約する。
// 各項目は根拠(reason)を必ず書く。wiki側が修正されて一致しなくなった項目は警告が出るので削除する。

export interface Correction {
  code: string; // 対象の人格コード
  name?: string; // 対象をスキル名・パッシブ名で絞る(改行は無視して比較)
  // 名前だけでは決まらないとき、別の項目の内容でも絞る(例: バトルとサポートで同じ名前が入っている)
  when?: { field: string; includes: string };
  field: string; // 置換するプロパティ名 (effect / condition など)
  from: string;
  to: string;
  reason: string;
}

// 人格ページの誤記は、解析前のHTMLを置換して直す。
// 用語ツールチップ・破壊不能コインの判定など、本文から派生する項目にも誤記が残らないようにするため
export interface TextCorrection {
  code: string;
  from: string;
  to: string;
  reason: string;
}

export const PERSONA_CORRECTIONS: TextCorrection[] = [
  {
    code: "1015",
    from: "月下月刀",
    to: "月下青刀",
    reason: "S3の条件文だけ「月下月刀」。同ページの他の記述・用語はすべて「月下青刀」",
  },
  {
    code: "0916",
    from: 'style="color:pink">共鳴</span>×3</td>',
    to: 'style="color:pink">共鳴</span></td>',
    reason: "サポートパッシブの条件欄だけ「共鳴×3」。数は必要資源欄(憤怒×3)にあり、同ページの性能解説も「憤怒3共鳴で発動」",
  },
  {
    code: "0407",
    from: "をを付与",
    to: "を付与",
    reason: "バトル・サポートパッシブの効果文の誤字(「火傷4をを付与」「火傷3をを付与」)。囚人ページは「火傷3を付与」",
  },
];

// 囚人ページ (src/data/<囚人>.json) のパッシブ一覧への補正。人格ページ側の記述に合わせる
export const CHARACTER_CORRECTIONS: Correction[] = [
  {
    code: "0301",
    name: "正義の成敗",
    field: "effect",
    from: "マッチ終了時",
    to: "マッチ勝利時",
    reason: "人格ページは「マッチ勝利時」。prydwen.gg の同人格ページも won clash (マッチ勝利) と記載",
  },
  {
    code: "1004",
    name: "遊興",
    field: "effect",
    from: "精神力を回復",
    to: "混乱区間を後退",
    reason: "人格ページは「混乱区間を後退」。prydwen.gg も stagger threshold を下げる効果と記載",
  },
  {
    code: "1004",
    name: "遊興",
    field: "condition",
    from: "保有",
    to: "共鳴",
    reason: "人格ページは「憂鬱×3 共鳴」。効果文も憂鬱共鳴数を参照している",
  },
  {
    code: "1005",
    name: "狂炎",
    when: { field: "effect", includes: "打撃ダメージ量" },
    field: "name",
    from: "狂炎",
    to: "追い立てられる",
    reason: "囚人ページのサポートパッシブ欄にバトルパッシブの名前「狂炎」が入っている。人格ページと性能解説は《追い立てられる》(憤怒保有×6)",
  },
  {
    code: "0106",
    name: "整理師範教育",
    field: "effect",
    from: "充電回数が最も低い味方",
    to: "充電回数が最も多い味方",
    reason: "人格ページは「最も多い」。性能解説も、充電回数を持つ人格がいなければ編成順で最も早い人格に発動すると説明している",
  },
  {
    code: "1202",
    name: "ひた走る心",
    field: "effect",
    from: "3番目以降のコイン",
    to: "3番目より後ろのコイン",
    reason: "「3番目以降」は誤解を生むため 2025/11/06 のアップデートで修正された(人格ページの小ネタ)。人格ページは「3番目より後ろ」",
  },
  {
    code: "0201",
    name: "観察",
    field: "effect",
    from: "25%の確率で攻撃レベル減少2を付与",
    to: "25%の確率で次のターンに攻撃レベル減少2を付与",
    reason: "人格ページは「次のターンに」付き。囚人ページは付与の時点が抜けている",
  },
];

// 戻り値の unused は、対象ページなのに一度も当たらなかった補正
export function correctHtml(
  html: string,
  code: string,
  corrections: TextCorrection[]
): { html: string; unused: TextCorrection[] } {
  const unused: TextCorrection[] = [];
  for (const c of corrections.filter((x) => x.code === code)) {
    if (!html.includes(c.from)) {
      unused.push(c);
      continue;
    }
    html = html.split(c.from).join(c.to);
  }
  return { html, unused };
}

// オブジェクトを再帰的にたどり、code が一致する要素(とその子孫)の field を置換する。
// 戻り値は補正ごとの適用回数。0回の補正は呼び出し側で警告する
export function applyCorrections(root: unknown, corrections: Correction[]): Map<Correction, number> {
  const applied = new Map<Correction, number>(corrections.map((c) => [c, 0]));
  const walk = (node: unknown, code: string | undefined) => {
    if (Array.isArray(node)) {
      for (const v of node) walk(v, code);
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const ownCode = typeof obj.code === "string" ? obj.code : code;
    const name = typeof obj.name === "string" ? obj.name.replace(/\n/g, "") : undefined;
    for (const c of corrections) {
      if (c.code !== ownCode || (c.name && c.name !== name)) continue;
      if (c.when && !String(obj[c.when.field] ?? "").includes(c.when.includes)) continue;
      const value = obj[c.field];
      if (typeof value === "string" && value.includes(c.from)) {
        obj[c.field] = value.split(c.from).join(c.to);
        applied.set(c, (applied.get(c) ?? 0) + 1);
      }
    }
    for (const v of Object.values(obj)) walk(v, ownCode);
  };
  walk(root, undefined);
  return applied;
}

// 補正対象(code)のデータを処理したのに一度も当たらなかった補正を返す
export function unusedCorrections(applied: Map<Correction, number>, codes: Iterable<string>): Correction[] {
  const seen = new Set(codes);
  return [...applied].filter(([c, n]) => n === 0 && seen.has(c.code)).map(([c]) => c);
}
