// 呼吸編成の人格プロファイル(内部データ。画面には出さない)。前提は burn.ts の冒頭と同じ。
// 呼吸は自分のクリティカル率(威力×5%)を上げる自己バフ。シミュレーターではクリティカルでスキルダメージ×1.2になる
import type { Profile } from "../types.ts";
import { coin, skill } from "./helpers.ts";

const H = 0.7; // 表面的中・マッチ勝利の確率の近似

export const BREATH_PROFILES: Profile[] = [
  // ---------------- 剣契型 ----------------
  {
    code: "0508",
    name: "剣契頭目",
    skills: {
      S1: [
        {
          skill: skill("抜剣", [coin({ self: { breathP: 1 } }), coin({ self: { breathP: 1 } })], {
            onUse: { self: { breathC: 2 } },
          }),
        },
      ],
      S2: [{ skill: skill("刺法", [coin({ self: { breathP: 3 } }), coin(), coin()], { onUse: { self: { breathC: 3 } } }) }],
      S3: [{ skill: skill("肉斬", [coin()], { onUse: { self: { breathP: 5 }, prob: H } }) }],
    },
    bonuses: [{ label: "追慕", selfBreathUp: 1 }],
    notes: ["本国剣術で剣契の味方に呼吸を配る効果は扱わない", "マッチ敗北時の「骨断」は扱わない"],
  },
  {
    code: "0815",
    name: "LCD現場推理チーム",
    skills: {
      S1: [
        {
          skill: skill("勢法", [coin({ self: { breathP: 2 } }), coin({ self: { breathP: 1 }, bleedP: 1 })], {
            onUse: { self: { breathC: 2 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill(
            "刺法",
            [coin({ self: { breathP: 2 }, bleedP: 1 }), coin({ self: { breathP: 2 }, bleedP: 1 }), coin({ bleedC: 1 })],
            { onUse: { self: { breathC: 3 } } },
          ),
        },
      ],
      S3: [
        {
          skill: skill("清潾火", [coin({ self: { breathC: 3 } }), coin({ self: { breathP: 2 } }), coin({ bleedP: 1 })], {
            onUse: { self: { breathP: 3 } },
          }),
        },
      ],
    },
    followUps: [
      {
        // 鬼化腰撃: ドッケビの火15以上なら基本攻撃スキル終了時に「相戦清潾火」
        label: "相戦清潾火",
        skill: skill(
          "相戦清潾火",
          [coin({ self: { breathP: 3 } }), coin({ bleedP: 1 }), coin({ bleedP: 1 }), coin({ bleedP: 1 })],
          { onUse: { self: { breathC: 3 } } },
        ),
        trigger: "self-hit",
        prob: 0.8,
        from: 3,
        unopposed: true,
      },
    ],
    bonuses: [{ label: "帰るべき場所", selfBreathUp: 1 }],
    notes: ["ドッケビの火15以上は3ターン目から8割で満たすとする"],
  },
  {
    code: "0103",
    name: "剣契殺手(イサン)",
    skills: {
      S1: [{ skill: skill("撃勢", [coin({ self: { breathP: 3 } })], { onUse: { self: { breathC: 2 } } }) }],
      S2: [{ skill: skill("ひんねじる", [coin(), coin()], { onUse: { self: { breathC: 3 }, prob: H } }) }],
      S3: [
        {
          skill: skill("異面賛刺", [coin({ self: { breathP: 2 }, prob: H }), coin(), coin()], {
            onUse: { self: { breathP: 2 } },
          }),
        },
      ],
    },
    notes: ["「次のターンに呼吸を得る」は使用時に得るものとして扱う", "呼吸回数によるコイン威力の増加は扱わない"],
  },
  {
    code: "0208",
    name: "剣契殺手(ファウスト)",
    // 紅梅(特殊出血)は、クリティカル被弾時に数値の半分の出血を得る → 紅梅1を出血威力0.5として近似
    skills: {
      S1: [
        {
          skill: skill("月下剣舞", [coin(), coin({ self: { breathP: 1 }, prob: H }), coin({ bleedP: 0.5, crit: true })], {
            onUse: { self: { breathC: 2 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill("刺法", [coin({ self: { breathC: 1 } }), coin({ bleedP: 1, crit: true })], {
            onUse: { self: { breathC: 2 } },
          }),
        },
      ],
      S3: [{ skill: skill("舞い散る紅梅", [coin({ bleedP: 2.5, crit: true }), coin({ bleedP: 2.5, crit: true })]) }],
    },
    bonuses: [{ label: "梅が如く咲き出でる血", perHit: { bleedP: 0.5, crit: true } }],
    notes: ["紅梅の被クリティカルダメージ増加は扱わない"],
  },
  {
    code: "0308",
    name: "剣契殺手(ドンキホーテ)",
    skills: {
      S1: [
        {
          skill: skill("抜剣", [coin({ self: { breathP: 1 } }), coin({ self: { breathP: 1 } })], {
            onUse: { self: { breathC: 2 } },
          }),
        },
      ],
      S2: [{ skill: skill("剣軌", [coin({ self: { breathP: 2 } }), coin()], { onUse: { self: { breathC: 2 } } }) }],
      S3: [{ skill: skill("さらば！", [coin(), coin(), coin()], { onUse: { self: { breathP: 5 } } }) }],
    },
    notes: ["味方に呼吸を配る効果は扱わない"],
  },
  {
    code: "1015",
    name: "蜘蛛の巣小指の子方",
    skills: {
      S1: [
        {
          skill: skill("連撃", [coin({ self: { breathP: 2 } }), coin({ self: { breathP: 2 }, bleedC: 2 })], {
            onUse: { self: { breathC: 3 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill("無名斬", [coin({ self: { breathP: 3, breathC: 1 } }), coin({ self: { breathC: 1 }, bleedP: 2 })]),
        },
      ],
      S3: [{ skill: skill("落星一殺", [coin({ bleedP: 5 })], { onUse: { self: { breathP: 7 } } }) }],
    },
    turnStart: [{ effect: { self: { breathP: 2 } } }], // 整剣: 戦闘開始時に(傲慢共鳴数÷2)+1の呼吸
    notes: ["月下青刀・クリティカル時の再使用は扱わない"],
  },
  {
    code: "0615",
    name: "S社チュノックン",
    skills: {
      S1: [
        {
          skill: skill("捕縄で締め上げる", [coin({ self: { breathP: 4 }, bleedC: 2 }), coin({ bleedP: 2 }), coin()], {
            onUse: { self: { breathC: 3 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill(
            "裂き斬る",
            [coin({ self: { breathP: 3 }, bleedP: 2 }), coin({ trigger: { status: "bleed" }, prob: 0.5 })],
            { onUse: { self: { breathC: 2 } } },
          ),
        },
      ],
      S3: [
        {
          // 捕縛[ホンル]がある対象(2回目以降)には全コイン破壊不能・出血回数+2
          skill: skill("推刷執行", [coin(), coin({ bleedC: 2 }), coin({ bleedP: 2 }), coin({ bleedP: 3 })], {
            onUse: { self: { breathP: 5, breathC: 3 } },
          }),
          until: 6,
        },
        {
          skill: skill("推刷執行", [coin(), coin({ bleedC: 2 }), coin({ bleedP: 2 }), coin({ bleedP: 3 })], {
            onUse: { self: { breathP: 5, breathC: 3 }, bleedC: 2 },
            unbreakable: true,
          }),
          from: 7,
        },
      ],
    },
    notes: ["捕縛[ホンル]は1回目のS3で付き、2回目のS3から効くとする", "引き裂かれた傷は扱わない"],
  },
];
