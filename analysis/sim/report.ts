// teams.json の状態異常編成をすべてシミュレーションし、analysis/reports/status-teams.md に書き出す。
// 人格ごとに「抜いたときに減るダメージ」で格付けし、弱い枠には入れ替え候補を探す。
// 実行: npm run analyze(数分かかる)
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { PROFILE_MAP, allSkills } from "./profiles/index.ts";
import { DEFAULT_ROTATION, DMG_KINDS, simulate, type SimResult, type TeamInput } from "./simulate.ts";
import type { Effect, Profile, StatusKey } from "./types.ts";

const ROOT = join(import.meta.dirname, "../..");
const TURNS = 10;
const TRIALS = 3000;
const SCREEN_TRIALS = 500; // 入れ替え候補の一次選別
const MAIN_RATE = 0.85; // 格付けに使うマッチ勝率
const CLASH_RATES = [0.85, 0.5]; // 要約では高め(手持ちが育っている)と低め(格上ボス)の2通り
const STATUS_TEAMS = ["burn", "tremor", "bleed", "rupture", "sinking", "breath", "charge"];
const LABEL: Record<string, string> = {
  burn: "火傷",
  tremor: "振動",
  bleed: "出血",
  rupture: "破裂",
  sinking: "沈潜",
  breath: "呼吸",
  charge: "充電",
};

// 格付け: 編成内の平均寄与に対する比
type Rank = "強力" | "おすすめ" | "入れ替え候補" | "非推奨" | "要確認";
const RANK_ORDER: Rank[] = ["強力", "おすすめ", "入れ替え候補", "非推奨", "要確認"];

// シミュレーションで扱えていない強みを持つ人格。wiki の編成ガイドで優先枠・中核とされているのに低く出たものは、
// 格付けを下げずに「要確認」とする
const UNMODELED: Record<string, string> = {
  "0415": "天殺(複数スロット)・剣痕・もつれによる火力",
  "1113": "振動-鎖によるマッチ妨害、時間猶予のダメージ上乗せ",
  "0309": "振動-鎖によるマッチ妨害、時間猶予のダメージ上乗せ",
  "0114": "号令(味方のマッチ威力+1・防御レベル+2)",
  "0508": "剣契の味方への呼吸の分配、本国剣術の支援",
  "0103": "剣契の呼吸の分配・傲慢共鳴の支援",
  "0208": "剣契の呼吸の分配・紅梅の被クリティカル増加",
  "0308": "味方への呼吸の分配",
  "0110": "精神力のある敵への蝶の全量ダメージ(精神力の無いボスとして半減で計算)、サポートパッシブの蝶付与",
  "0212": "E.G.O《永続》の使い手としての役割(E.G.O はシミュレーション外)",
};
function rankOf(ratio: number): Rank {
  if (ratio >= 1.3) return "強力";
  if (ratio >= 0.8) return "おすすめ";
  if (ratio >= 0.4) return "入れ替え候補";
  return "非推奨";
}

interface TeamsJson {
  id: string;
  examples: { name: string; members: { code: string }[]; support: { code: string }[] }[];
}
const teamsJson = (JSON.parse(readFileSync(join(ROOT, "src/data/teams.json"), "utf-8")) as TeamsJson[])
  .filter((t) => STATUS_TEAMS.includes(t.id))
  .sort((a, b) => STATUS_TEAMS.indexOf(a.id) - STATUS_TEAMS.indexOf(b.id));

// 人格コード → 囚人名(同じ囚人は同じ編成に入れられない)
const owner = new Map<string, string>();
for (const c of JSON.parse(readFileSync(join(ROOT, "src/data/characters.json"), "utf-8")) as { name: string }[]) {
  const data = JSON.parse(readFileSync(join(ROOT, `src/data/${c.name}.json`), "utf-8")) as { statuses: { code: string }[] };
  for (const s of data.statuses) owner.set(s.code, c.name);
}

// 裏置きの効果を受ける味方は編成の1人目とする(「編成順が最も早い」「精神力が最も高い」などの近似)
const toInput = (ex: TeamsJson["examples"][number]): TeamInput => ({
  name: ex.name,
  members: ex.members.map((m) => m.code),
  support: ex.support[0] ? { code: ex.support[0].code, target: ex.members[0].code } : undefined,
});
const run = (team: TeamInput, rate: number, trials = TRIALS): SimResult =>
  simulate({ ...team, support: team.support && team.members.includes(team.support.target) ? team.support : undefined }, PROFILE_MAP, {
    turns: TURNS,
    trials,
    clashWinRate: rate,
    seed: 42,
  });
const total = (r: SimResult) => r.turns[TURNS - 1].cumTotal;

const name = (code: string) => PROFILE_MAP.get(code)?.name ?? code;
const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
const i0 = (x: number) => Math.round(x).toLocaleString("ja-JP");
const sumDmg = (r: SimResult, k: (typeof DMG_KINDS)[number]) => r.turns.reduce((a, t) => a + t.dmg[k], 0);
const statusKinds = DMG_KINDS.filter((k) => k !== "skill");

// ---------------- 実行 ----------------
const results = new Map<string, SimResult>();
for (const rate of CLASH_RATES) {
  for (const t of teamsJson) for (const ex of t.examples) results.set(`${t.id}|${ex.name}|${rate}`, run(toInput(ex), rate));
}

interface MemberEval {
  code: string;
  marginal: number; // 抜いたときに減る合計ダメージ
  ratio: number; // 編成内平均に対する比
  rank: Rank;
  skill: number;
  applied: string;
  swaps: { code: string; gain: number }[]; // 入れ替えたときの増減(正なら良くなる)
}
interface ExampleEval {
  team: string;
  example: string;
  total: number;
  members: MemberEval[];
}
const evals: ExampleEval[] = [];
const profiled = [...PROFILE_MAP.values()].filter((p) => p.skills.S1.length > 0);

// 入れ替え候補は、その編成のキーワードを扱う人格に限る(他キーワードの人格を足しても、罪悪資源や共鳴が噛み合わないため)
function handlesKeyword(p: Profile, team: string): boolean {
  const effects: Effect[] = allSkills(p).flatMap((sk) => [
    ...(sk.onUse ? [sk.onUse] : []),
    ...sk.coins.flatMap((c) => (c.hit === undefined ? [] : Array.isArray(c.hit) ? c.hit : [c.hit])),
  ]);
  const has = (pred: (e: Effect) => boolean) => effects.some(pred);
  switch (team) {
    case "breath":
      return has((e) => !!(e.self?.breathP || e.self?.breathC));
    case "charge":
      return has((e) => !!e.self?.charge || e.consumeCharge !== undefined);
    case "tremor":
      return has((e) => !!(e.tremorP || e.tremorC || e.burst || e.transferSelfTremor));
    default:
      return has((e) => !!(e[`${team}P` as StatusKey] || e[`${team}C` as StatusKey]));
  }
}

for (const t of teamsJson) {
  for (const ex of t.examples) {
    const team = toInput(ex);
    const base = results.get(`${t.id}|${ex.name}|${MAIN_RATE}`);
    if (!base) continue;
    const baseTotal = total(base);
    const marginals = team.members.map(
      (code) => baseTotal - total(run({ ...team, members: team.members.filter((c) => c !== code) }, MAIN_RATE)),
    );
    const avg = marginals.reduce((a, b) => a + b, 0) / marginals.length;
    const members: MemberEval[] = team.members.map((code, i) => {
      const c = base.contributions[code];
      const applied = (["burn", "bleed", "rupture", "sinking", "tremor"] as const)
        .map((s) => ({ s, v: (c?.applied[`${s}P` as StatusKey] ?? 0) + (c?.applied[`${s}C` as StatusKey] ?? 0) }))
        .filter((x) => x.v >= 1)
        .sort((a, b) => b.v - a.v)
        .map((x) => `${({ burn: "火傷", bleed: "出血", rupture: "破裂", sinking: "沈潜", tremor: "振動" } as const)[x.s]}${Math.round(x.v)}`)
        .join(" ");
      const ratio = avg > 0 ? marginals[i] / avg : 0;
      let rank = rankOf(ratio);
      if ((rank === "入れ替え候補" || rank === "非推奨") && UNMODELED[code]) rank = "要確認";
      return { code, marginal: marginals[i], ratio, rank, skill: c?.dmg.skill ?? 0, applied, swaps: [] };
    });

    // 入れ替え候補: 弱い枠を、同じ囚人が編成にいない人格に入れ替えて比べる(一次選別 → 上位3人を精査)
    for (const m of members.filter((x) => x.rank === "入れ替え候補" || x.rank === "非推奨" || x.rank === "要確認")) {
      const others = team.members.filter((c) => c !== m.code);
      const used = new Set(others.map((c) => owner.get(c)));
      const screened = profiled
        .filter((p) => !used.has(owner.get(p.code)) && p.code !== m.code && handlesKeyword(p, t.id))
        .map((p) => {
          const members2 = team.members.map((c) => (c === m.code ? p.code : c));
          return { code: p.code, members2, score: total(run({ ...team, members: members2 }, MAIN_RATE, SCREEN_TRIALS)) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      m.swaps = screened
        .map((s) => ({ code: s.code, gain: total(run({ ...team, members: s.members2 }, MAIN_RATE)) - baseTotal }))
        .filter((s) => s.gain > 0)
        .sort((a, b) => b.gain - a.gain);
    }
    evals.push({ team: t.id, example: ex.name, total: baseTotal, members: members.sort((a, b) => b.marginal - a.marginal) });
  }
}

// ---------------- 書き出し ----------------
const out: string[] = [
  "# 状態異常編成シミュレーション",
  "",
  `生成: npm run analyze / ${TURNS}ターン × ${TRIALS}回の平均 / 行動順: ${DEFAULT_ROTATION.join("→")} の繰り返し`,
  "",
  "内部評価用。画面には出さない。前提と近似は analysis/README.md と analysis/sim/profiles/*.ts の notes を参照。",
  "",
  "- スキル = 威力(基本威力+表のコイン威力+効果文の条件付き補正)× クリティカル × ダメージ量補正。耐性・レベル差は全員同じ(等倍)として除外",
  "- 状態異常 = 火傷(ターン終了・発動・黒炎)、出血(ボスのコイン1枚ごと、1ターン6枚)、破裂・沈潜(被弾ごと)、振動爆発の追加ダメージ",
  "- 沈潜は精神力の無いボス(憂鬱ダメージになる)としてダメージに数える",
  "- 格付けは、その人格を抜いたときに減る合計ダメージ(マッチ勝率85%)を、同じ編成の平均と比べたもの",
  "- 入れ替え候補は、その編成のキーワード(呼吸なら呼吸を得る、充電なら充電を扱う)を持つ人格から探す",
  "  - 強力: 平均の1.3倍以上(編成の要)",
  "  - おすすめ: 0.8〜1.3倍",
  "  - 入れ替え候補: 0.4〜0.8倍",
  "  - 非推奨: 0.4倍未満(抜いても合計がほぼ減らない、または増える)",
  "  - 要確認: 低く出たが、シミュレーションで扱えていない強みを持つ人格(理由を併記)。wiki では優先枠・中核とされているものがある",
  "",
];

// 要約
out.push(
  "## 要約(10ターン合計)",
  "",
  "| 編成 | 編成例 | マッチ勝率 | 合計 | スキル | 状態異常 | 火傷 | 出血 | 破裂 | 沈潜 | 振動爆発 | 混乱 | クリティカル/ターン |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
);
for (const rate of CLASH_RATES) {
  const rows = teamsJson
    .flatMap((t) => t.examples.map((ex) => ({ t, ex, r: results.get(`${t.id}|${ex.name}|${rate}`) as SimResult })))
    .sort((a, b) => total(b.r) - total(a.r));
  for (const { t, ex, r } of rows) {
    const last = r.turns[TURNS - 1];
    out.push(
      `| ${LABEL[t.id]} | ${ex.name} | ${rate * 100}% | ${i0(last.cumTotal)} | ${i0(sumDmg(r, "skill"))} | ${i0(last.cumStatus)} | ${i0(sumDmg(r, "burn"))} | ${i0(sumDmg(r, "bleed"))} | ${i0(sumDmg(r, "rupture"))} | ${i0(sumDmg(r, "sinking"))} | ${i0(sumDmg(r, "tremor"))} | ${i0(r.turns.reduce((a, x) => a + x.stagger, 0))} | ${f1(r.turns.reduce((a, x) => a + x.crits, 0) / TURNS)} |`,
    );
  }
}
out.push("");

// 人格の格付け(全編成をまとめて)
const byPersona = new Map<string, { rank: Rank; where: string; ratio: number }[]>();
for (const e of evals) {
  for (const m of e.members) {
    const list = byPersona.get(m.code) ?? [];
    list.push({ rank: m.rank, where: `${LABEL[e.team]}/${e.example}`, ratio: m.ratio });
    byPersona.set(m.code, list);
  }
}
out.push("## 人格の格付け(全編成)", "", "複数の編成に出る人格は、最も良い格付けを代表にする。", "");
for (const rank of RANK_ORDER) {
  const list = [...byPersona.entries()]
    .map(([code, xs]) => ({ code, best: xs.reduce((a, b) => (b.ratio > a.ratio ? b : a)) }))
    .filter((x) => x.best.rank === rank)
    .sort((a, b) => b.best.ratio - a.best.ratio);
  if (list.length === 0) continue;
  out.push(`### ${rank}`, "", "| 人格 | 平均比 | 編成 | 備考 |", "|---|---|---|---|");
  for (const x of list) out.push(`| ${name(x.code)}(${x.code}) | ${f1(x.best.ratio)} | ${x.best.where} | ${rank === "要確認" ? `扱えていない強み: ${UNMODELED[x.code]}` : ""} |`);
  out.push("");
}

// 編成ごとの格付けと入れ替え候補
out.push("## 編成ごとの格付けと入れ替え候補(マッチ勝率85%、10ターン合計)", "");
for (const e of evals) {
  out.push(
    `### ${LABEL[e.team]} / ${e.example}`,
    "",
    `合計 ${i0(e.total)}`,
    "",
    "| 格付け | 人格 | 抜くと減る合計 | 平均比 | 自分のスキルダメージ | 付与した威力+回数 | 入れ替え候補(合計の増加) |",
    "|---|---|---|---|---|---|---|",
    ...e.members.map((m) => {
      const swaps = m.swaps.length
        ? m.swaps.map((s) => `${name(s.code)}(${s.code}) +${i0(s.gain)}`).join("、")
        : m.rank === "入れ替え候補" || m.rank === "非推奨" || m.rank === "要確認"
          ? "より良い候補なし"
          : "-";
      const note = m.rank === "要確認" ? `(扱えていない強み: ${UNMODELED[m.code]})` : "";
      return `| ${m.rank}${note} | ${name(m.code)}(${m.code}) | ${i0(m.marginal)} | ${f1(m.ratio)} | ${i0(m.skill)} | ${m.applied || "-"} | ${swaps} |`;
    }),
    "",
  );
}

// ターンごとの推移
out.push("## ターンごとの推移(マッチ勝率85%)", "", "状態異常の列は「威力/回数」(ターン終了の火傷ダメージ直前)。", "");
for (const t of teamsJson) {
  for (const ex of t.examples) {
    const r = results.get(`${t.id}|${ex.name}|${MAIN_RATE}`);
    if (!r) continue;
    out.push(
      `### ${LABEL[t.id]} / ${ex.name}`,
      "",
      "| ターン | 火傷 | 出血 | 破裂 | 沈潜 | 振動 | スキル | 状態異常 | 累計 |",
      "|---|---|---|---|---|---|---|---|---|",
      ...r.turns.map((x) => {
        const pc = (s: string) => `${Math.round(x.state[`${s}P` as StatusKey])}/${Math.round(x.state[`${s}C` as StatusKey])}`;
        const st = statusKinds.reduce((a, k) => a + x.dmg[k], 0);
        return `| ${x.turn} | ${pc("burn")} | ${pc("bleed")} | ${pc("rupture")} | ${pc("sinking")} | ${pc("tremor")} | ${i0(x.dmg.skill)} | ${i0(st)} | ${i0(x.cumTotal)} |`;
      }),
      "",
    );
  }
}

mkdirSync(join(ROOT, "analysis/reports"), { recursive: true });
const path = join(ROOT, "analysis/reports/status-teams.md");
writeFileSync(path, out.join("\n"));
console.log(`書き出し: ${path}`);
