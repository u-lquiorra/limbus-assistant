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

  // ---------------- ル・ノワール型 ----------------
  // 保存・漂流慣性は特殊充電。回数は充電回数(self.charge)として、威力(累計10消耗ごとに+1)は self.chargeP として追う。
  // 威力は「3〜4ターン目に3」程度なので、2ターン目から毎ターン+1で近似する
  {
    code: "0315",
    name: "オートクチュール::ル・ノワール ブランドマネージャー",
    tags: ["ル・ノワール"],
    skills: {
      S1: [{ skill: skill("釘刺されよ", [coin({ tremorC: 2 }), coin({ self: { charge: 6 } })], { onUse: { self: { charge: 4 } } }) }],
      S2: [{ skill: skill("釘よ、生まれよ", [coin({ tremorP: 4 }), coin({ self: { charge: 8 }, tremorC: 3, burst: 1 })]) }],
      S3: [
        {
          // Ⅲで振動-保存へ振幅変換して振動爆発。約束された釘3以上でもう1回(半分の確率で近似)
          skill: skill("誕生を断たん！", [
            coin({ tremorP: 4 }),
            coin({ tremorC: 3 }),
            coin([{ self: { charge: 4 }, convert: "保存", burst: 1 }, { burst: 1, prob: 0.5 }]),
          ]),
        },
      ],
    },
    followUps: [
      {
        // 他のル・ノワール所属の味方が攻撃する前に一方攻撃(1ターンに1回)
        label: "審判！",
        skill: skill("審判！", [coin({ tremorP: 4 })]),
        trigger: { code: "0416" },
        unopposed: true,
      },
    ],
    turnStart: [{ effect: { self: { chargeP: 1 } }, from: 2, until: 6 }],
    notes: [
      "約束された釘(振動爆発時の怠惰ダメージ・束縛)と保存神域(バリア・敵の速度低下・被ダメージ増加)は扱わない",
      "守備・反撃から出る強化S3「幾度も振り下ろし、誕生を断たん！」は扱わない",
    ],
  },
  {
    code: "0416",
    name: "オートクチュール::ル・ノワール シューズフロア",
    tags: ["ル・ノワール"],
    skills: {
      S1: [{ skill: skill("不潔だな", [coin({ tremorP: 2 }), coin({ self: { charge: 5 } })]) }],
      S2: [
        // Ⅲの振動爆発は保存威力3以上(4ターン目〜)
        { skill: skill("来て試着してみろ", [coin({ self: { charge: 3 } }), coin({ tremorP: 2, tremorC: 2 }), coin()], { onUse: { self: { charge: 4 } } }), until: 3 },
        {
          skill: skill("来て試着してみろ", [coin({ self: { charge: 3 } }), coin({ tremorP: 2, tremorC: 2 }), coin({ burst: 1 })], {
            onUse: { self: { charge: 4 } },
          }),
          from: 4,
        },
      ],
      S3: [
        {
          skill: skill("トリプル・スタンピード・ステッチング", [coin({ self: { charge: 5 } }), coin({ tremorP: 3, tremorC: 3 }), coin({ burst: 1 })], {
            onUse: { self: { charge: 5 } },
          }),
          until: 3,
        },
        {
          // 保存威力3以上で振動爆発が2回追加
          skill: skill("トリプル・スタンピード・ステッチング", [coin({ self: { charge: 5 } }), coin({ tremorP: 3, tremorC: 3 }), coin({ burst: 3 })], {
            onUse: { self: { charge: 5 } },
          }),
          from: 4,
          until: 4,
        },
        {
          // コートが溜まってアルミュール・エヴェイエ状態になると、S3が「ワンキック」に変わる(5ターン目〜とみる)
          skill: skill("ワンキック-クチュール・ミュルティプル", [
            coin({ self: { charge: 5 } }),
            coin({ tremorP: 3, tremorC: 3, burst: 1 }),
            coin({ burst: 1 }),
            coin({ burst: 1 }),
          ]),
          from: 5,
        },
      ],
    },
    turnStart: [{ effect: { self: { chargeP: 1 } }, from: 2, until: 6 }],
    notes: [
      "コート・アルミュール・エヴェイエの増減は追わず、5ターン目からワンキックとする(コート状態へ戻る周期は扱わない)",
      "バリア、被弾時の振動威力付与、振動爆発の混乱区間前進量増加(饋還)、反撃からのワンキックは扱わない",
    ],
  },
  {
    code: "0917",
    name: "オートクチュール::お直し室",
    skills: {
      // S1は味方に充電回数・攻撃レベル増加・バリアを配るスキル。ダメージは出さない
      S1: [{ skill: skill("ルトゥーシュ(Retouche)", [coin(undefined, { noDamage: true })]) }],
      S2: [{ skill: skill("固定、そしてパターンに沿って裁断", [coin({ self: { charge: 6 } }), coin({ tremorC: 2 }), coin({ burst: 1 })]) }],
      S3: [
        {
          // Ⅲで振動爆発。漂流慣性回数5以上ならもう1回(8割で近似)
          skill: skill("クーベ・ダン・ル・ビエ", [coin({ tremorC: 3 }), coin({ tremorP: 3 }), coin([{ burst: 1 }, { burst: 1, prob: 0.8 }])], {
            onUse: { self: { charge: 5 } },
          }),
        },
      ],
    },
    followUps: [
      {
        // ドゥ、オー・ボン・スィゾーを持つ味方(編成順最速の充電人格を優先)の攻撃後に発動。付与されている確率を6割とみる
        label: "パターン起こし",
        skill: skill("パターン起こし", [coin({ tremorC: 1 }, { times: 2 })]),
        trigger: { code: "0315" },
        prob: 0.6,
        unopposed: true,
      },
    ],
    turnStart: [{ effect: { self: { chargeP: 1 } }, from: 2, until: 6 }],
    notes: ["味方へのバリア・攻撃レベル増加・充電回数の配布、裁断の印と「切り抜く」は扱わない"],
  },
];
