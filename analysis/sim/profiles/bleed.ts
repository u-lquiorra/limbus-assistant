// 出血編成の人格プロファイル(内部データ。画面には出さない)。前提は burn.ts の冒頭と同じ
import type { Profile } from "../types.ts";
import { coin, randomStatus, skill } from "./helpers.ts";

export const BLEED_PROFILES: Profile[] = [
  // ---------------- 薬指型 ----------------
  {
    code: "0614",
    name: "蜘蛛の巣薬指の親方",
    skills: {
      S1: [{ skill: skill("解体", [coin({ bleedP: 4 }), coin()]) }],
      S2: [{ skill: skill("材料獲得-血で沐浴するオブジェ", [coin({ bleedC: 2 }), coin(), coin()]) }],
      S3: [
        // 生体材料10以上(2ターン目〜)で全コイン破壊不能
        {
          skill: skill(
            "ティビアのメロディー-解体されたものが解体されていないものを解体すること",
            [coin({ bleedP: 4 }), coin(), coin(), coin({ bleedC: 1 })],
            { unbreakable: true },
          ),
        },
      ],
    },
    // 眺望21が薬指の味方のスキル使用ごとに減り、4ターン目に「閉場」が1回出る
    overrides: [
      {
        turns: [4],
        skill: skill(
          "閉場-設置美術第1号「皆さんが撒き散らした肉と骨が客席となり」",
          [
            coin({ bleedP: 3 }, { unbreakable: true }),
            coin(undefined, { unbreakable: true }),
            coin(),
            coin({ bleedC: 1 }, { unbreakable: true }),
            coin({ burnP: 5 }, { unbreakable: true }),
          ],
          // 攻撃対象が1ならダメージ量+100%(単体ボス)
        ),
      },
    ],
    bonuses: [
      { label: "閉場(単体ダメージ量+100%)", dmgUp: 1, turns: [4] },
      { label: "作品名:ティビア", bleedP: 1, bleedC: 1, from: 7 },
    ],
    support: {
      label: "走り回る観客は椅子に座って鑑賞なさってください",
      bonus: { label: "なし" },
      effectPerTurn: { bleedC: 1 }, // ターン終了時、最も速い敵の出血回数+1
    },
    notes: ["作品名:ティビア(生体材料の威力3)は7ターン目からとする", "簡易肋骨の追撃は扱わない"],
  },
  {
    code: "0215",
    name: "蜘蛛の巣薬指の子方",
    skills: {
      S1: [{ skill: skill("屠畜-肋骨", [coin({ bleedC: 1 }), coin()]) }],
      S2: [
        { skill: skill("ファシアが餓えてる", [coin({ bleedC: 2 }), coin(), coin()]), until: 4 },
        { skill: skill("ファシアの食事時間ですね", [coin({ bleedC: 2 }), coin(), coin()]), from: 5 },
      ],
      S3: [
        { skill: skill("抑圧された肉体", [coin({ bleedP: 4 }), coin(), coin(), coin({ bleedC: 1 })]), until: 4 },
        {
          skill: skill("抑圧された肉体の解放", [coin({ bleedP: 4 }), coin(), coin(), coin({ bleedC: 1 })], {
            unbreakable: true,
          }),
          from: 5,
        },
      ],
    },
    bonuses: [{ label: "作品名:ファシア", bleedP: 1, bleedC: 1, from: 7 }],
    support: {
      label: "アイアンメイデン-棘",
      bonus: { label: "なし" },
      effectPerTurn: { bleedC: 2, prob: 0.6 }, // 守備スキルを装着した味方が被弾したとき
    },
    notes: ["拘束解除(作品名:ファシア獲得)は5ターン目、作品名の付与量+1は7ターン目からとする"],
  },
  {
    code: "0109",
    name: "薬指点描派スチューデント",
    skills: {
      S1: [{ skill: skill("上塗り", [coin(), coin(randomStatus("C", 2, 0.7)), coin({ bleedP: 2 })]) }],
      S2: [
        {
          // 再使用確率は40%+マイナス効果1種につき20%。2回まで再使用するとみて的中3回
          skill: skill("血点描画", [coin([{ bleedC: 1 }, ...randomStatus("C", 3)], { times: 3 })]),
        },
      ],
      S3: [
        {
          skill: skill("滴血の彩色", [
            coin(),
            coin([{ bleedC: 1 }, { bleedC: 2, prob: 0.6 }, ...randomStatus("C", 3)]),
            coin([{ bleedP: 1 }, { bleedP: 2, prob: 0.6 }, ...randomStatus("P", 2)]),
            coin(),
          ]),
        },
      ],
    },
    notes: ["ランダムな状態異常は5種に等分する", "マイナス効果3種以上の条件は6割で満たすとみる"],
  },
  {
    code: "0915",
    name: "薬指野獣派ドーセント",
    skills: {
      S1: [
        { skill: skill("強烈な重ね塗り", [coin({ bleedC: 1, sinkingP: 1 })]), until: 1 },
        // マイナス効果4種以上でコインを再使用
        { skill: skill("強烈な重ね塗り", [coin({ bleedC: 1, sinkingP: 1 }, { times: 2 })]), from: 2 },
      ],
      S2: [{ skill: skill("原色表現", [coin({ bleedP: 2 }), coin({ sinkingC: 2 })]) }],
      S3: [
        {
          skill: skill("野獣派-暴悪な展開", [
            coin({ bleedP: 2 }),
            coin({ bleedC: 2 }),
            coin({ sinkingP: 2 }),
            coin({ bleedC: 2 }),
          ]),
          until: 2,
        },
        {
          // マイナス効果6種以上で強化
          skill: skill("あんたの皮膚の下で脈動する赤い絵具を荒く", [
            coin({ bleedP: 3 }, { unbreakable: true }),
            coin({ bleedC: 2 }, { unbreakable: true }),
            coin({ sinkingP: 3 }),
            coin({ bleedC: 2 }, { unbreakable: true }),
          ]),
          from: 3,
        },
      ],
    },
    // 引き裂かれた色彩: 被弾時に数値3につき出血・沈潜威力+1(1ターン1回)
    turnEnd: [{ effect: { bleedP: 1, sinkingP: 1 }, from: 2 }],
    bonuses: [{ label: "野獣派-マスク・ドゥ・ルー", bleedP: 1, sinkingP: 1, from: 5 }],
    notes: ["引き裂かれた色彩による出血・沈潜威力の増加は2ターン目から毎ターン1ずつとする", "強烈な色彩の被ダメージ増加は扱わない"],
  },
  {
    code: "0515",
    name: "薬指野獣派スチューデント",
    skills: {
      S1: [{ skill: skill("荒い描写", [coin({ bleedP: 2 }), coin({ bleedC: 1, sinkingC: 1 })]) }],
      S2: [
        {
          skill: skill("本能的な描き殴り", [
            coin({ bleedP: 1 }),
            coin({ bleedP: 1, sinkingP: 1 }),
            coin({ bleedC: 2, sinkingP: 1 }),
          ]),
        },
      ],
      S3: [
        {
          // 引き裂かれた色彩5以上(3ターン目〜)で3コインが1つ追加、全コイン破壊不能
          skill: skill(
            "野獣派-出品作展開",
            [
              coin({ bleedP: 1 }),
              coin({ bleedP: 2, sinkingP: 2 }),
              coin({ bleedC: 2, sinkingC: 2 }),
              coin([{ bleedC: 2, sinkingC: 2 }, { bleedP: 1, prob: 0.5 }, { sinkingP: 1, prob: 0.5 }]),
            ],
            { unbreakable: true },
          ),
        },
      ],
    },
    bonuses: [{ label: "野獣派-マスク・ドゥ・シヤン", bleedP: 1, sinkingP: 1, from: 4 }],
    notes: ["マスク・ドゥ・シヤン(引き裂かれた色彩[ルージュ]を累計10付与)は4ターン目からとする"],
  },
  {
    code: "1213",
    name: "夜の錐カピターノ",
    skills: {
      S1: [{ skill: skill("隙を突く", [coin({ tremorP: 2, bleedP: 2 }), coin()]) }],
      S2: [
        {
          skill: skill("スティレット・ドッピオ", [coin({ tremorC: 1, bleedC: 1 }), coin(), coin()], {
            onUse: { tremorP: 1, burst: 1, prob: 0.7 }, // マッチ勝利時
          }),
        },
      ],
      S3: [
        {
          skill: skill(
            "エクセキューション",
            [coin({ bleedP: 3 }), coin({ tremorP: 3, tremorC: 1 }), coin(), coin({ convert: "大量出血", burst: 1 })],
            { onUse: { tremorP: 2, burst: 1, prob: 0.7 } },
          ),
          until: 6,
        },
        {
          // 傷2 → 深い傷が付いた敵へは「夜の錐」
          skill: skill(
            "夜の錐",
            [coin(), coin({ bleedP: 4, bleedC: 1 }), coin({ tremorP: 4, tremorC: 2 }), coin({ convert: "大量出血", burst: 2 })],
            { unbreakable: true, onUse: { tremorP: 4, burst: 1, prob: 0.7 } },
          ),
          from: 7,
        },
      ],
    },
    notes: ["メルチェ(体力20%以下で追撃)は扱わない", "深い傷・致命的な傷による出血回数の増加は扱わない"],
  },
  {
    code: "0410",
    name: "ロボトミーE.G.O::赤眼･懺悔",
    skills: {
      S1: [{ skill: skill("どっちも黙れ", [coin(), coin({ bleedP: 1 })]) }],
      S2: [{ skill: skill("く・ヅ/しゃ・こ", [coin(), coin({ bleedP: 2 }), coin()]) }],
      S3: [
        { skill: skill("ドタマを割る", [coin({ bleedP: 3 }), coin(), coin()]), until: 6 },
        { skill: skill("ガチでドタマを割る", [coin({ bleedP: 5 }), coin(), coin()]), from: 7 },
      ],
    },
    notes: ["赤眼・懺悔15以上の強化S3は2回目のS3(9ターン目)から", "回復・自己バフは扱わない"],
  },

  // ---------------- 血鬼型(ラ・マンチャランド) ----------------
  {
    code: "0310",
    name: "ラ・マンチャランド室長",
    skills: {
      S1: [{ skill: skill("耐えるのは終わりだ", [coin({ bleedP: 2 }), coin({ bleedP: 2 })]) }],
      S2: [{ skill: skill("思うがままに繰り広げよ", [coin({ bleedP: 2 }), coin()]) }],
      S3: [
        { skill: skill("貫かせていただきましょう", [coin(), coin(), coin({ bleedP: 3 })]), until: 6 },
        {
          // 硬血15以上で最左方のスキル3が強化
          skill: skill("サンチョ流硬血奥義-ラ・サングレ", [coin(), coin(), coin(), coin({ bleedP: 8, bleedC: 4 })], {
            unbreakable: true,
          }),
          from: 7,
        },
      ],
    },
    notes: ["硬血・血餐の自己バフと回復は扱わない", "強化S3は2回目のS3から"],
  },
  {
    code: "0204",
    name: "握る者",
    // 釘(特殊出血): ターン開始時に出血1と、釘の数だけ出血回数。ターン終了時に半減 → 釘1本 ≒ 出血回数2として扱う
    skills: {
      S1: [{ skill: skill("狂笑", [coin({ bleedC: 2 }), coin({ bleedP: 2 })]) }],
      S2: [{ skill: skill("握り締める", [coin({ bleedC: 4 }), coin({ bleedC: 6 }), coin()]) }],
      S3: [{ skill: skill("処断", [coin({ bleedC: 4 }), coin({ bleedC: 4, prob: 0.7 }), coin()]) }],
    },
    turnStart: [{ effect: { bleedP: 1 }, from: 2 }],
    notes: ["釘はターン開始時の出血付与として、釘1本を出血回数2・毎ターン出血威力1で近似する"],
  },
  {
    code: "0911",
    name: "ラ・マンチャランドの姫",
    skills: {
      S1: [{ skill: skill("下がりなさい…", [coin(), coin({ bleedP: 1, ruptureP: 1 })]) }],
      S2: [
        {
          skill: skill("撒き散らし、磨り潰されよ", [
            coin({ ruptureC: 2, bleedC: 2 }),
            coin(),
            coin({ ruptureP: 1, bleedP: 1 }),
          ]),
        },
      ],
      S3: [
        {
          skill: skill("祝祭は終わるの", [
            coin({ ruptureC: 1, bleedC: 1 }),
            coin({ ruptureP: 1, bleedP: 1 }),
            coin({ ruptureP: 1, bleedP: 1 }),
          ]),
          until: 6,
        },
        {
          skill: skill("ドンキホーテ流硬血奥義 フィナーレ", [
            coin({ ruptureC: 2, bleedC: 2 }),
            coin({ ruptureP: 2, bleedP: 2 }),
            coin({ ruptureP: 2, bleedP: 2 }),
          ]),
          from: 7,
        },
      ],
    },
    notes: ["咲き出す棘25のフィナーレは2回目のS3から", "祝祭の熱気(ダメージ量増加)は扱わない"],
  },
  {
    code: "1210",
    name: "ラ・マンチャランド 神父",
    skills: {
      S1: [{ skill: skill("家族のための献身", [coin({ bleedP: 2 }), coin({ ruptureP: 1 })]) }],
      S2: [{ skill: skill("締め付けてくる罪悪感", [coin({ bleedC: 2 }), coin({ ruptureP: 1 })]) }],
      S3: [
        {
          skill: skill("雪げぬ罪", [coin(), coin({ bleedC: 2, ruptureC: 2 }), coin({ bleedP: 2, ruptureP: 2 })]),
        },
      ],
    },
    // 血に染まった手Ⅲ(20以上)で基本スキルの的中ごとに破裂1・出血1
    bonuses: [{ label: "血に染まった手Ⅲ", perHit: { ruptureP: 1, bleedP: 1 }, from: 5 }],
    notes: ["血に染まった手Ⅲは5ターン目からとする", "自傷・回復は扱わない"],
  },
  {
    code: "0513",
    name: "ラ・マンチャランドの王子",
    skills: {
      S1: [{ skill: skill("行進指揮", [coin({ ruptureP: 1 }), coin({ bleedC: 1 }), coin({ bleedP: 2 })]) }],
      S2: [{ skill: skill("再建の義務", [coin({ bleedC: 2, ruptureC: 1 }), coin({ bleedP: 2, ruptureP: 2 })]) }],
      S3: [
        {
          skill: skill("血を固め、私と貴方にまとわせる。", [
            coin({ bleedC: 1, ruptureC: 1 }),
            coin({ bleedC: 1 }),
            coin({ bleedP: 2, ruptureP: 1 }),
            coin({ bleedP: 2 }, { unbreakable: true }),
          ]),
          until: 6,
        },
        {
          skill: skill("ウヴェルテューレ", [
            coin({ bleedC: 2, ruptureC: 1 }),
            coin({ bleedP: 2 }),
            coin({ bleedP: 2, ruptureP: 1 }, { unbreakable: true }),
            coin(undefined, { unbreakable: true }),
          ]),
          from: 7,
        },
      ],
    },
    notes: ["硬血甲冑5のウヴェルテューレは2回目のS3から", "ラ・マンチャパレード(被ダメージ増加)は扱わない"],
  },
];
