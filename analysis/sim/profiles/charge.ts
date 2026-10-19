// 充電編成の人格プロファイル(内部データ。画面には出さない)。前提は burn.ts の冒頭と同じ。
// 充電は自分の資源(回数のみ、最大20、ターン終了時に1減少)。消耗して威力やダメージ量を上げる効果が中心で、
// その多くはこのシミュレーターでは扱わない。ここでは充電の回り方と、充電を条件にした破裂付与を追う
import type { Profile } from "../types.ts";
import { coin, skill } from "./helpers.ts";

const H = 0.7; // 表面的中の確率の近似

export const CHARGE_PROFILES: Profile[] = [
  {
    code: "1215",
    name: "LCE E.G.O::AEDD",
    skills: {
      S1: [
        {
          skill: skill("電気放流", [coin({ self: { charge: 2 }, ruptureP: 1 }), coin({ self: { charge: 2 }, ruptureP: 1 })], {
            onUse: { self: { charge: 2 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill("直流インバーティング", [
            coin({ self: { charge: 5 }, ruptureC: 2 }),
            coin({ self: { charge: 4 }, ruptureP: 2 }),
            coin(),
          ]),
        },
      ],
      S3: [
        {
          skill: skill("高圧電流放電", [coin({ self: { charge: 1 } }), coin({ self: { charge: 2 } }), coin({ ruptureP: 3, ruptureC: 2 })]),
          until: 6,
        },
        {
          // 充電(威力)3以上で強化。充電回数10を消耗して威力上昇
          skill: skill("出力最大-超高圧電流放電", [coin({ ruptureC: 2 }), coin({ ruptureP: 3 }), coin()], {
            unbreakable: true,
            onUse: { consumeCharge: 10 },
          }),
          from: 7,
        },
      ],
    },
    turnStart: [{ effect: { self: { charge: 10 } }, turns: [1] }], // 前へ出たまえ。: 戦闘開始時に充電回数+10
    notes: ["光電・電荷針・高電圧外皮は扱わない", "充電(威力)3以上の強化S3は2回目のS3から"],
  },
  {
    code: "0312",
    name: "ロボトミーE.G.O::愛と憎悪の名の下に",
    // 愛/憎悪は特殊充電。精神力0以上の「魔法少女、参上！」で戦うものとする
    skills: {
      S1: [
        {
          skill: skill("管理人殿の命に従い参上！", [coin(), coin({ self: { charge: 3 }, ruptureP: 3 })], {
            onUse: { self: { charge: 3 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill("愛で!よっ!", [coin({ self: { charge: 4 } }), coin({ ruptureP: 2 })], { onUse: { self: { charge: 5 } } }),
        },
      ],
      S3: [
        {
          skill: skill("アルカナ･ビート! /マイナー･アルカナ･スレイブ!!!", [coin(), coin({ ruptureP: 2 }), coin({ ruptureP: 2 })], {
            unbreakable: true,
            onUse: { self: { charge: 6 } },
          }),
        },
      ],
    },
    support: {
      label: "マジカルパワーチャージングサポート",
      bonus: { label: "なし" },
    },
    notes: ["愛/憎悪の消耗による威力・ダメージ量の上昇は扱わない"],
  },
  {
    code: "0713",
    name: "W社4級整理要員-CCA",
    skills: {
      S1: [{ skill: skill("混雑乗客の整理", [coin({ self: { charge: 4 }, ruptureC: 1 }), coin({ ruptureP: 2 })]) }],
      S2: [
        {
          skill: skill("ブースト・エルボーカッター", [coin({ self: { charge: 6 }, ruptureC: 1 }), coin({ ruptureP: 3 })], {
            onUse: { consumeCharge: 6 },
          }),
        },
      ],
      S3: [
        {
          // 充電(威力)3以上で全コイン破壊不能
          skill: skill(
            "空間切断-CCAオーバードライブ",
            [
              coin({ self: { charge: 1 }, prob: H }),
              coin({ self: { charge: 1 }, prob: H }),
              coin({ self: { charge: 2 }, prob: H }),
              coin([{ consumeCharge: 10 }, { ruptureP: 2 }]),
            ],
            { unbreakable: true },
          ),
        },
      ],
    },
    notes: ["充電力場・過充電は扱わない"],
  },
  {
    code: "1110",
    name: "W社3級整理要員チーフ",
    skills: {
      S1: [{ skill: skill("波動", [coin(), coin({ self: { charge: 2 } })], { onUse: { self: { charge: 2 } } }) }],
      S2: [
        {
          skill: skill("充電跳躍", [coin({ self: { charge: 2 } }), coin({ self: { charge: 2 } })], {
            onUse: { self: { charge: 2 }, consumeCharge: 6 },
          }),
        },
      ],
      S3: [
        {
          skill: skill("次元切断", [
            coin({ ruptureP: 1 }),
            coin({ ruptureP: 1 }),
            coin({ ruptureP: 1 }),
            coin({ ruptureP: 3, consumeCharge: 15 }),
          ]),
        },
      ],
    },
    notes: ["負荷・充電力場は扱わない"],
  },
  {
    code: "0210",
    name: "マルチクラック事務所 代表",
    skills: {
      S1: [{ skill: skill("40Y-3稼働", [coin(), coin({ self: { charge: 3 } })], { onUse: { consumeCharge: 5 } }) }],
      S2: [{ skill: skill("充電逆流", [coin(), coin(), coin()], { onUse: { consumeCharge: 10 } }) }],
      S3: [{ skill: skill("40Y-3充電", [coin({ self: { charge: 7 } }), coin({ self: { charge: 7 } }), coin(), coin()]) }],
    },
    notes: ["状態異常を付与しない。充電の消耗によるダメージ量増加は扱わない"],
  },
  {
    code: "0116",
    name: "LCE E.G.O::次元裂き",
    skills: {
      S1: [{ skill: skill("次元斬り", [coin({ self: { charge: 6 }, ruptureP: 2 })], { onUse: { consumeCharge: 2 } }) }],
      S2: [
        {
          // 次元の亀裂: ターン終了時に破裂回数が数値だけ増加 → 回数として付与
          skill: skill("連続次元斬り", [coin({ self: { charge: 6 }, ruptureP: 1 }), coin({ ruptureP: 2, ruptureC: 1 })], {
            onUse: { consumeCharge: 5 },
          }),
        },
      ],
      S3: [
        {
          skill: skill("空間切断", [
            coin({ self: { charge: 1 }, ruptureP: 1 }),
            coin({ self: { charge: 1 }, ruptureP: 1 }),
            coin({ ruptureP: 1, ruptureC: 2 }),
          ]),
        },
      ],
    },
    support: { label: "人ハ光ヨリモ迅ク逃ゲヨ", bonus: { label: "なし" } },
    notes: ["裏置きのサポート効果(クイック)は扱わない"],
  },
];
