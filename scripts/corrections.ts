// wiki本文の誤記・ページ間の食い違いを、取得後のデータに対して補正する。
// 生成済みJSONを手で直すと再取得で消えるため、補正はここに集約する。
// 各項目は根拠(reason)を必ず書く。wiki側が修正されて一致しなくなった項目は警告が出るので削除する。

export interface Correction {
  code: string; // 対象の人格コード
  name?: string; // 対象をスキル名・パッシブ名で絞る(改行は無視して比較)
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
