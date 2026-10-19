// 全プロファイルを集め、スキルの素の威力(基本威力・コイン威力・コイン個数)を人格データから埋める
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { PersonaDetail } from "../../../src/types.ts";
import type { Profile, Skill } from "../types.ts";
import { BLEED_PROFILES } from "./bleed.ts";
import { BREATH_PROFILES } from "./breath.ts";
import { BURN_PROFILES } from "./burn.ts";
import { CHARGE_PROFILES } from "./charge.ts";
import { PASSIVE_MODS, SKILL_MODS } from "./mods.ts";
import { RUPTURE_PROFILES } from "./rupture.ts";
import { SINKING_PROFILES } from "./sinking.ts";
import { TREMOR_PROFILES } from "./tremor.ts";

const PERSONAS = join(import.meta.dirname, "../../../src/data/personas");

export const norm = (s: string) => s.replace(/\s/g, "");

// "2/3" → 3、"+4/+5" → 5、"-2" → -2(同期化の段階値は最後の値を採る)
function lastNumber(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = v.split("/").pop()?.match(/[+-]?\d+/);
  return m ? Number(m[0]) : undefined;
}

function attachPower(code: string, skills: Skill[]): void {
  const path = join(PERSONAS, `${code}.json`);
  if (!existsSync(path)) return;
  const detail = JSON.parse(readFileSync(path, "utf-8")) as PersonaDetail;
  for (const s of skills) {
    const d = detail.skills.find((x) => norm(x.name) === norm(s.name));
    if (!d) continue;
    const stat = (label: string) => lastNumber(d.stats.find((x) => x.label.startsWith(label))?.value);
    const base = stat("基本威力");
    const coin = stat("コイン威力");
    const coins = stat("コイン個数");
    if (base !== undefined && coin !== undefined && coins !== undefined) s.power = { base, coin, coins };
  }
}

export function allSkills(p: Profile): Skill[] {
  return [
    ...Object.values(p.skills).flatMap((vs) => vs.map((v) => v.skill)),
    ...(p.overrides ?? []).map((o) => o.skill),
    ...(p.followUps ?? []).map((f) => f.skill),
  ];
}

export const PROFILES: Profile[] = [
  ...BURN_PROFILES,
  ...TREMOR_PROFILES,
  ...BLEED_PROFILES,
  ...RUPTURE_PROFILES,
  ...SINKING_PROFILES,
  ...BREATH_PROFILES,
  ...CHARGE_PROFILES,
];

export const PROFILE_MAP = new Map<string, Profile>();
for (const p of PROFILES) {
  // 同じ人格は1か所にだけ書く(複数の編成に出る人格は最初に出る編成のファイルに置く)
  if (PROFILE_MAP.has(p.code)) throw new Error(`プロファイルが重複: ${p.code}`);
  PROFILE_MAP.set(p.code, p);
  attachPower(p.code, allSkills(p));
  // 威力・ダメージ量の補正(mods.ts)を同名のスキルすべてに付ける
  const skillMods = SKILL_MODS[p.code] ?? {};
  for (const s of allSkills(p)) {
    const m = Object.entries(skillMods).find(([n]) => norm(n) === norm(s.name))?.[1];
    if (m) s.mods = [...(s.mods ?? []), ...m];
  }
  if (PASSIVE_MODS[p.code]) p.bonuses = [...(p.bonuses ?? []), { label: "パッシブ補正", mods: PASSIVE_MODS[p.code] }];
}
