import dongbaek from "./data/bosses/dongbaek-spicebush";
import ricardo from "./data/bosses/ricardo";
import ahab from "./data/bosses/ahab-trio";
import heathcliff from "./data/bosses/heathcliff-mirror";
import dulcinea from "./data/bosses/dulcinea";
import donQuixote from "./data/bosses/don-quixote";
import kromer from "./data/bosses/kromer";
import gasHarpoon from "./data/bosses/gas-harpoon";
import erlkingCathy from "./data/bosses/erlking-cathy";
import dongrang from "./data/bosses/dongrang";
import kimSatgat from "./data/bosses/kim-satgat";
import cassettiSasha from "./data/bosses/cassetti-sasha";
import sancho from "./data/bosses/sancho";
import nelly from "./data/bosses/nelly";
import barber from "./data/bosses/barber";
import bloodfiendTrio from "./data/bosses/bloodfiend-trio";
import brazenBull from "./data/bosses/brazen-bull";
import waywardFox from "./data/bosses/wayward-fox";
import shockCentipede from "./data/bosses/shock-centipede";
import dongbaekSunshower from "./data/bosses/dongbaek-sunshower";
import fairyGentleman from "./data/bosses/fairy-gentleman";
import talismanDoll from "./data/bosses/talisman-doll";
import drunkenNightguest from "./data/bosses/drunken-nightguest";
import jiaQiu from "./data/bosses/jia-qiu";
import leiHeng from "./data/bosses/lei-heng";

export interface BossUnit {
  id: string;
  name: string;
  image?: { path: string; width: number; height: number };
  part: string;
  hp: string;
  level: number | string;
  defenseLevel: number;
  skillLevelReduction?: number;
  defenseLevelReduction?: number;
  combatLevelNote?: string;
  speed: string;
  stagger: string;
  notes: string[];
  physical: Record<"斬" | "貫" | "打", number>;
  sins: Record<string, number>;
}

export interface BossSkill {
  id: string;
  unit: string;
  name: string;
  sin?: string;
  type: "斬" | "貫" | "打" | "回避" | "防御" | "反撃";
  attackType?: "斬" | "貫" | "打";
  base: number;
  coinPower: number;
  coins: number;
  weight: number | null;
  levelOffset: number;
  level?: number;
  levelUnknown?: boolean;
  unbreakableCoins?: number[];
  label?: string;
  effects: string[];
  response: string;
}

export interface BossGuide {
  id: string;
  name: string;
  shortName: string;
  stage: string;
  stageName: string;
  chapter: number;
  members: number;
  reserves?: number;
  statNote?: string;
  skillNote?: string;
  checkedAt: string;
  lead: string;
  priorities: string[];
  troubleshooting?: { symptom: string; advice: string }[];
  units: BossUnit[];
  skills: BossSkill[];
  passives: { name: string; unit: string; condition: string; effect: string; response: string }[];
  phases: { id: string; timing: string; title: string; steps: string[] }[];
  mechanics: { name: string; effect: string; response: string; units?: string[] }[];
  warnings: string[];
  preparation: string[];
  roles: { name: string; reason: string }[];
  relatedTerms: string[];
  sources: { title: string; url: string }[];
}

export const bossGuides: BossGuide[] = [kromer, brazenBull, dongbaekSunshower, dongbaek, fairyGentleman, talismanDoll, waywardFox, shockCentipede, dongrang, ricardo, ahab, gasHarpoon, kimSatgat, heathcliff, nelly, erlkingCathy, cassettiSasha, barber, dulcinea, bloodfiendTrio, sancho, donQuixote, drunkenNightguest, jiaQiu, leiHeng];
const byId = new Map(bossGuides.map((boss) => [boss.id, boss]));

export function getBossGuide(id: string): BossGuide | undefined {
  return byId.get(id);
}

export const BOSS_SECTIONS = [
  { id: "strategy", label: "GUIDE", title: "攻略のカギ" },
  { id: "notes", label: "NOTES", title: "専用効果・注意点" },
  { id: "team", label: "PARTY", title: "おすすめ編成・準備" },
  { id: "stats", label: "STATUS", title: "基本ステータス" },
  { id: "skills", label: "SKILLS", title: "スキルと対処" },
  { id: "passives", label: "PASSIVES", title: "パッシブ" },
] as const;
