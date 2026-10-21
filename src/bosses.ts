import summaries from "./data/bosses/index.json";

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
  /** コイン威力が不明なときは仮の数値を画面に出さない。powerUnknown も指定する */
  coinPowerUnknown?: boolean;
  coins: number;
  /** 模倣などで枚数が変動し、固定値を表示できない場合 */
  coinsUnknown?: boolean;
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
  /** 一覧に出すリード。lead にボス・登場人物の名前や先の展開が入るときだけ、伏せた文を書く */
  listLead?: string;
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

// ボスごとの詳細データ。全ボス分をまとめて読むと最初の読み込みが重くなるため、ページを開いたときだけ読み込む。
// 並びはボス攻略一覧の表示順。キー(ID)とファイル名はそろえる(bosses.test.ts で検査)
const BOSS_LOADERS: Record<string, () => Promise<{ default: BossGuide }>> = {
  "ebony-queen-apple": () => import("./data/bosses/ebony-queen-apple"),
  "doomsday-calendar": () => import("./data/bosses/doomsday-calendar"),
  "golden-apple": () => import("./data/bosses/golden-apple"),
  aido: () => import("./data/bosses/aido"),
  "you-want-to-get-beat": () => import("./data/bosses/you-want-to-get-beat"),
  "baba-yaga": () => import("./data/bosses/baba-yaga"),
  guido: () => import("./data/bosses/guido"),
  "quadruped-beast": () => import("./data/bosses/quadruped-beast"),
  "inquisitor-with-everything": () => import("./data/bosses/inquisitor-with-everything"),
  "wriggling-beast": () => import("./data/bosses/wriggling-beast"),
  kromer: () => import("./data/bosses/kromer"),
  "brazen-bull": () => import("./data/bosses/brazen-bull"),
  "dongbaek-sunshower": () => import("./data/bosses/dongbaek-sunshower"),
  "dongbaek-spicebush": () => import("./data/bosses/dongbaek-spicebush"),
  "fairy-gentleman": () => import("./data/bosses/fairy-gentleman"),
  "talisman-doll": () => import("./data/bosses/talisman-doll"),
  "wayward-fox": () => import("./data/bosses/wayward-fox"),
  "shock-centipede": () => import("./data/bosses/shock-centipede"),
  "brazen-bull-dungeon": () => import("./data/bosses/brazen-bull-dungeon"),
  dongrang: () => import("./data/bosses/dongrang"),
  ricardo: () => import("./data/bosses/ricardo"),
  "walking-pearl": () => import("./data/bosses/walking-pearl"),
  "skin-prophet": () => import("./data/bosses/skin-prophet"),
  "dream-devouring-siltcurrent": () => import("./data/bosses/dream-devouring-siltcurrent"),
  "ahab-trio": () => import("./data/bosses/ahab-trio"),
  "gas-harpoon": () => import("./data/bosses/gas-harpoon"),
  "kim-satgat": () => import("./data/bosses/kim-satgat"),
  josephine: () => import("./data/bosses/josephine"),
  hindley: () => import("./data/bosses/hindley"),
  "crying-hindley": () => import("./data/bosses/crying-hindley"),
  "dead-rabbits-boss": () => import("./data/bosses/dead-rabbits-boss"),
  "heathcliff-mirror": () => import("./data/bosses/heathcliff-mirror"),
  nelly: () => import("./data/bosses/nelly"),
  "erlking-cathy": () => import("./data/bosses/erlking-cathy"),
  "cassetti-sasha": () => import("./data/bosses/cassetti-sasha"),
  camille: () => import("./data/bosses/camille"),
  barber: () => import("./data/bosses/barber"),
  "white-moon-knight": () => import("./data/bosses/white-moon-knight"),
  dulcinea: () => import("./data/bosses/dulcinea"),
  "bloodfiend-trio": () => import("./data/bosses/bloodfiend-trio"),
  sancho: () => import("./data/bosses/sancho"),
  "don-quixote": () => import("./data/bosses/don-quixote"),
  "drunken-nightguest": () => import("./data/bosses/drunken-nightguest"),
  "jia-qiu": () => import("./data/bosses/jia-qiu"),
  "lei-heng": () => import("./data/bosses/lei-heng"),
  "jia-fang-kubo": () => import("./data/bosses/jia-fang-kubo"),
  "jia-mu": () => import("./data/bosses/jia-mu"),
  "ren-albina": () => import("./data/bosses/ren-albina"),
  sora: () => import("./data/bosses/sora"),
  "shiomi-yoru": () => import("./data/bosses/shiomi-yoru"),
  "albina-callisto": () => import("./data/bosses/albina-callisto"),
  "kira-matthias": () => import("./data/bosses/kira-matthias"),
  "shiomi-yoru-rematch": () => import("./data/bosses/shiomi-yoru-rematch"),
  "lucio-valentina": () => import("./data/bosses/lucio-valentina"),
  "albina-callisto-rematch": () => import("./data/bosses/albina-callisto-rematch"),
  "kira-matthias-rematch": () => import("./data/bosses/kira-matthias-rematch"),
  "roach-emperor": () => import("./data/bosses/roach-emperor"),
  "little-finger-master": () => import("./data/bosses/little-finger-master"),
  lian: () => import("./data/bosses/lian"),
  gustave: () => import("./data/bosses/gustave"),
  fourleg: () => import("./data/bosses/fourleg"),
  oneleg: () => import("./data/bosses/oneleg"),
  "sous-chef": () => import("./data/bosses/sous-chef"),
  "sewing-king": () => import("./data/bosses/sewing-king"),
  linamovible: () => import("./data/bosses/linamovible"),
  "red-god-unborn": () => import("./data/bosses/red-god-unborn"),
  flannel: () => import("./data/bosses/flannel"),
  annette: () => import("./data/bosses/annette"),
  alriune: () => import("./data/bosses/alriune"),
  controller: () => import("./data/bosses/controller"),
  "old-sea-thread": () => import("./data/bosses/old-sea-thread"),
  "warden-chaplain": () => import("./data/bosses/warden-chaplain"),
  "red-god-ripe": () => import("./data/bosses/red-god-ripe"),
  jeanne: () => import("./data/bosses/jeanne"),
};

/** 一覧・検索・ページ情報に使う軽い要約。src/data/bosses/index.json から読む(npm run bosses:index で生成) */
export interface BossSummary {
  id: string;
  name: string;
  shortName: string;
  stage: string;
  stageName: string;
  chapter: number;
  checkedAt: string;
  lead: string;
  /** 一覧に出すリード(ネタバレ回避のため、名前と先の展開を伏せた文) */
  listLead: string;
  /** 先頭の画像のある部位の画像(OGP に使う) */
  image?: BossUnit["image"];
  /** 部位の名前(サイト内検索に使う) */
  unitNames: string[];
}

export function bossSummary(boss: BossGuide): BossSummary {
  const image = boss.units.find((unit) => unit.image)?.image;
  return {
    id: boss.id,
    name: boss.name,
    shortName: boss.shortName,
    stage: boss.stage,
    stageName: boss.stageName,
    chapter: boss.chapter,
    checkedAt: boss.checkedAt,
    lead: boss.lead,
    listLead: boss.listLead ?? boss.lead,
    ...(image ? { image } : {}),
    unitNames: boss.units.map((unit) => unit.name),
  };
}

export const bossSummaries: BossSummary[] = summaries;
const summaryById = new Map(bossSummaries.map((boss) => [boss.id, boss]));

export function getBossSummary(id: string): BossSummary | undefined {
  return summaryById.get(id);
}

export interface BossChapter {
  chapter: number;
  /** 一覧ページでの章の要素 ID(例: 5.5章 → "chapter-5-5") */
  id: string;
  bosses: BossSummary[];
}

export function bossChapterId(chapter: number): string {
  return `chapter-${String(chapter).replace(".", "-")}`;
}

/** ボス攻略一覧を章ごとにまとめる。章の並びとボスの並びは一覧の表示順のまま */
export function groupBossesByChapter(list: BossSummary[]): BossChapter[] {
  const chapters = new Map<number, BossChapter>();
  for (const boss of list) {
    let group = chapters.get(boss.chapter);
    if (!group) {
      group = { chapter: boss.chapter, id: bossChapterId(boss.chapter), bosses: [] };
      chapters.set(boss.chapter, group);
    }
    group.bosses.push(boss);
  }
  return [...chapters.values()];
}

/** 章の見出しに出すステージ番号の範囲(例: "9-18〜9-50")。ボス名を出さずに章の中身の目安を示す */
export function bossChapterStageRange(chapter: BossChapter): string {
  const first = chapter.bosses[0]?.stage ?? "";
  const last = chapter.bosses[chapter.bosses.length - 1]?.stage ?? "";
  return first === last ? first : `${first}〜${last}`;
}

/** 詳細データを読み込める ID の一覧(要約の生成とテストに使う) */
export const bossIds = Object.keys(BOSS_LOADERS);

// 読み込んだ詳細の控え。静的 HTML の生成と、その HTML を引き継ぐ最初の描画(hydrate)で同期的に使う
const loaded = new Map<string, BossGuide | null>();

export async function loadBossGuide(id: string): Promise<BossGuide | null> {
  const load = Object.hasOwn(BOSS_LOADERS, id) ? BOSS_LOADERS[id] : undefined;
  const boss = load ? (await load()).default : null;
  loaded.set(id, boss);
  return boss;
}

/** 読み込み済みの詳細。まだ読んでいなければ undefined、存在しない ID なら null */
export function peekBossGuide(id: string): BossGuide | null | undefined {
  return loaded.get(id);
}

/** 全ボスの詳細(一覧の表示順)。テストと要約の生成用で、画面からは使わない */
export async function loadAllBossGuides(): Promise<BossGuide[]> {
  const guides = await Promise.all(bossIds.map(loadBossGuide));
  return guides.filter((boss): boss is BossGuide => boss !== null);
}

export const BOSS_SECTIONS = [
  { id: "strategy", label: "GUIDE", title: "攻略のカギ" },
  { id: "notes", label: "NOTES", title: "専用効果・注意点" },
  { id: "team", label: "PARTY", title: "おすすめ編成・準備" },
  { id: "stats", label: "STATUS", title: "基本ステータス" },
  { id: "skills", label: "SKILLS", title: "スキルと対処" },
  { id: "passives", label: "PASSIVES", title: "パッシブ" },
] as const;
