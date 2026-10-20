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
import jiaFangKubo from "./data/bosses/jia-fang-kubo";
import jiaMu from "./data/bosses/jia-mu";
import renAlbina from "./data/bosses/ren-albina";
import sora from "./data/bosses/sora";
import shiomiYoru from "./data/bosses/shiomi-yoru";
import albinaCallisto from "./data/bosses/albina-callisto";
import kiraMatthias from "./data/bosses/kira-matthias";
import lucioValentina from "./data/bosses/lucio-valentina";
import kiraMatthiasRematch from "./data/bosses/kira-matthias-rematch";
import littleFingerMaster from "./data/bosses/little-finger-master";
import lian from "./data/bosses/lian";
import roachEmperor from "./data/bosses/roach-emperor";
import shiomiYoruRematch from "./data/bosses/shiomi-yoru-rematch";
import albinaCallistoRematch from "./data/bosses/albina-callisto-rematch";
import walkingPearl from "./data/bosses/walking-pearl";
import skinProphet from "./data/bosses/skin-prophet";
import dreamDevouringSiltcurrent from "./data/bosses/dream-devouring-siltcurrent";
import gustave from "./data/bosses/gustave";
import fourleg from "./data/bosses/fourleg";
import oneleg from "./data/bosses/oneleg";
import sousChef from "./data/bosses/sous-chef";
import redGodRipe from "./data/bosses/red-god-ripe";
import wardenChaplain from "./data/bosses/warden-chaplain";
import jeanne from "./data/bosses/jeanne";
import sewingKing from "./data/bosses/sewing-king";
import linamovible from "./data/bosses/linamovible";
import redGodUnborn from "./data/bosses/red-god-unborn";
import alriune from "./data/bosses/alriune";
import flannel from "./data/bosses/flannel";
import annette from "./data/bosses/annette";
import controller from "./data/bosses/controller";

export interface BossUnit {
  id: string;
  name: string;
  image?: { path: string; width: number; height: number };
  part: string;
  hp: string;
  level: number | string;
  defenseLevel: number | null;
  offField?: string;
  skillLevelReduction?: number;
  defenseLevelReduction?: number;
  combatLevelNote?: string;
  speed: string;
  stagger: string;
  notes: string[];
  physical: Record<"斬" | "貫" | "打", number | null>;
  sins: Record<string, number | null>;
}

export interface BossSkill {
  id: string;
  unit: string;
  name: string;
  sin?: string;
  type: "斬" | "貫" | "打" | "回避" | "防御" | "反撃";
  attackType?: "斬" | "貫" | "打";
  base: number;
  powerUnknown?: boolean;
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

export const bossGuides: BossGuide[] = [kromer, brazenBull, dongbaekSunshower, dongbaek, fairyGentleman, talismanDoll, waywardFox, shockCentipede, dongrang, ricardo, walkingPearl, skinProphet, dreamDevouringSiltcurrent, ahab, gasHarpoon, kimSatgat, heathcliff, nelly, erlkingCathy, cassettiSasha, barber, dulcinea, bloodfiendTrio, sancho, donQuixote, drunkenNightguest, jiaQiu, leiHeng, jiaFangKubo, jiaMu, renAlbina, sora, shiomiYoru, albinaCallisto, kiraMatthias, shiomiYoruRematch, lucioValentina, albinaCallistoRematch, kiraMatthiasRematch, roachEmperor, littleFingerMaster, lian, gustave, fourleg, oneleg, sousChef, sewingKing, linamovible, redGodUnborn, flannel, annette, alriune, controller, wardenChaplain, redGodRipe, jeanne];
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
