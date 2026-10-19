// 振動編成の人格プロファイル(内部データ。画面には出さない)。前提は burn.ts の冒頭と同じ。
// 振動-灼熱型(夜明組+親指組)の人格は burn.ts にある。ここは物理振動型(T社中心)と振動-反響型の人格
import type { Profile } from "../types.ts";
import { coin, skill } from "./helpers.ts";

const H = 0.7; // 表面的中・マッチ勝利の確率の近似

export const TREMOR_PROFILES: Profile[] = [
  // ---------------- 物理振動型(T社中心) ----------------
  {
    code: "1113",
    name: "T社3級強制徴収職職員",
    skills: {
      S1: [{ skill: skill("徴収準備", [coin({ tremorC: 1 }), coin({ tremorC: 1 })], { onUse: { self: { tremorC: 3 } } }) }],
      S2: [
        {
          skill: skill(
            "T社共振モジュール",
            [
              coin({ tremorP: 2 }),
              coin([{ tremorP: 2 }, { consumeTarget: { tremorP: 4 }, tremorC: 2, self: { tremorC: 2 }, min: { tremorP: 10 } }]),
              coin([{ convert: "鎖" }, { burst: 1, min: { tremorC: 3 } }]),
            ],
            { onUse: { self: { tremorC: 4 } } },
          ),
        },
      ],
      S3: [
        {
          skill: skill("T社3型徴収鉄槌最大展開", [
            coin({ tremorC: 2, consumeTarget: { tremorP: 3 }, self: { tremorC: 6 } }),
            coin({ burst: 1, min: { tremorC: 3 } }),
            coin({ burst: 2, self: { tremorC: -99 } }), // 自分の振動回数を全て消耗してコイン威力に変える
          ]),
        },
      ],
    },
    notes: ["時間貸与・時間猶予は扱わない", "S3最終コインの2回目の振動爆発は時間貸与がある前提"],
  },
  {
    code: "0810",
    name: "西部ツヴァイ協会3課",
    skills: {
      S1: [{ skill: skill("ツヴァイ騎士団大剣術", [coin({ tremorC: 1 }), coin({ tremorC: 1 })]) }],
      S2: [
        {
          // 最終コイン: (自分の振動回数÷2)だけ振動(最大4)。3で近似
          skill: skill("素通りさせることはできません。", [coin({ tremorP: 4 }), coin(), coin({ tremorP: 3 })], {
            onUse: { self: { tremorC: 3 }, prob: H },
          }),
        },
      ],
      S3: [
        {
          skill: skill(
            "守護",
            [
              coin({ tremorP: 2 }),
              coin({ tremorP: 2 }),
              // 自分の振動回数を全て消耗して、その値だけ振動を付与(最大20)。防御態勢なら振動爆発をもう1回
              coin([{ transferSelfTremor: { to: "tremorP", max: 20 } }, { burst: 1 }, { burst: 1, prob: 0.5 }]),
            ],
            { onUse: { self: { tremorC: 3 }, prob: H } },
          ),
        },
      ],
    },
    // 守備「あなたの盾」で自分の振動回数+10。毎ターンは使わないので、平均して1ターン4とみる
    turnStart: [{ effect: { self: { tremorC: 4 } } }],
    notes: ["防御レベル増加・防御態勢のダメージ量補正は扱わない"],
  },
  {
    code: "0309",
    name: "T社3級徴収職職員",
    skills: {
      S1: [{ skill: skill("いざ徴収準備をば", [coin(), coin({ tremorP: 2 })], { onUse: { self: { tremorC: 2 } } }) }],
      S2: [
        {
          skill: skill(
            "T社製加速切断機",
            [coin({ consumeTarget: { tremorP: 3 }, self: { tremorC: 6 } }), coin({ tremorP: 3 }), coin({ burst: 1 })],
            { onUse: { self: { tremorC: 3 } } },
          ),
        },
      ],
      S3: [
        {
          skill: skill("そこ、停まりたまえ！", [coin(), coin({ tremorP: 2 }), coin({ tremorP: 3 }), coin({ burst: 1, convert: "鎖" })], {
            onUse: { self: { tremorC: -10 } },
          }),
        },
      ],
    },
    notes: ["時間猶予は扱わない"],
  },
  {
    code: "1013",
    name: "東部親指ソルダートII",
    skills: {
      S1: [{ skill: skill("礼に則り。", [coin({ tremorC: 1 }), coin({ tremorP: 1 })]) }],
      S2: [
        {
          skill: skill("親指へ尊重を。", [
            coin({ tremorP: 2, tremorC: 1 }),
            coin([{ burnC: 2, prob: 0.4 }, { burst: 1, min: { tremorP: 6 } }]), // 火傷回数は振動-灼熱10以上のとき
          ]),
        },
      ],
      S3: [
        {
          // 灼熱推進弾3以上で破壊不能
          skill: skill(
            "推力集中",
            [
              coin({ tremorC: 1, burnC: 3, convert: "灼熱" }),
              coin({ tremorC: 1, burnP: 3 }),
              coin({ tremorC: 1, burnP: 4, burst: 3 }),
            ],
            { unbreakable: true },
          ),
        },
      ],
    },
    notes: ["灼熱推進弾は足りるものとする", "弾丸の補給(弾丸上納)は扱わない"],
  },
  {
    code: "0609",
    name: "20区ユロージヴィ(ホンル)",
    skills: {
      S1: [
        {
          skill: skill("推理開始", [coin({ tremorP: 2 }), coin({ self: { tremorC: 2 } })], {
            onUse: { self: { tremorC: 2 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill(
            "変形杖護身術",
            [coin({ self: { tremorC: 3 } }), coin({ tremorP: 3 }), coin({ burst: 1, min: { tremorP: 6 } })],
            { onUse: { self: { tremorC: 3 } } },
          ),
        },
      ],
      S3: [
        {
          // 自分の振動回数を消耗したなら振動-反響へ振幅絡縺、振動爆発が増える
          skill: skill("犯人はあなたですね！", [coin({ convert: "反響" }), coin({ burst: 1 }), coin({ burst: 1 }), coin({ burst: 2 })], {
            onUse: { self: { tremorC: -15 } },
          }),
        },
      ],
    },
    notes: ["振幅絡縺は振幅変換として扱う", "サポートの追加振動爆発(25%)は扱わない"],
  },
  {
    code: "0207",
    name: "ロボトミーE.G.O::後悔",
    skills: {
      S1: [
        {
          skill: skill("締め付ける拘束具", [coin({ self: { tremorC: 3 }, tremorC: 3 })], { onUse: { self: { tremorC: 3 } } }),
        },
      ],
      S2: [{ skill: skill("金属の響き", [coin(), coin(), coin({ tremorP: 5 })], { onUse: { self: { tremorC: 4 } } }) }],
      S3: [
        {
          // 振動爆発時、混乱区間前進値の30%の憤怒ダメージ(最大20)
          skill: skill("解かれた暴力性", [
            coin({ burst: 1, burstDmg: { rate: 0.3, cap: 20 } }),
            coin({ burst: 1, burstDmg: { rate: 0.3, cap: 20 } }),
            coin({ burst: 1, burstDmg: { rate: 0.3, cap: 20 }, consumeTarget: { tremorC: 2 } }),
          ]),
        },
      ],
    },
    notes: ["振動爆発を受けた敵の防御レベル減少は扱わない"],
  },
  {
    code: "0406",
    name: "LCCB係長(良秀)",
    skills: {
      S1: [{ skill: skill("押しのける", [coin()], { onUse: { self: { breathC: 2 } } }) }],
      S2: [{ skill: skill("夕・む", [coin({ self: { breathP: 2 } }), coin({ self: { breathP: 1 } })]) }],
      S3: [
        {
          skill: skill(
            "あ・われ",
            [
              coin({ self: { breathC: 1 }, crit: true }),
              coin({ self: { breathC: 1 }, crit: true }),
              // クリティカルなら振動・破裂の威力と回数が2倍
              coin([
                { tremorP: 4, tremorC: 2, ruptureP: 4, ruptureC: 2 },
                { tremorP: 4, tremorC: 2, ruptureP: 4, ruptureC: 2, crit: true },
                { burst: 1 },
              ]),
            ],
            { onUse: { self: { breathP: 4 } } },
          ),
        },
      ],
    },
    support: { label: "ラスト一本", bonus: { label: "なし" } },
    notes: ["裏置きのサポート(弾丸を使う味方に呼吸3)は扱わない"],
  },

  // ---------------- 振動-反響型(低いなきごえ) ----------------
  {
    code: "0804",
    name: "LCCB係長(イシュメール)",
    skills: {
      S1: [{ skill: skill("押し付ける", [coin()]) }],
      S2: [{ skill: skill("振動弾", [coin(), coin({ tremorP: 8, tremorC: 2 }), coin({ tremorP: 8, tremorC: 2 })]) }],
      S3: [{ skill: skill("制圧", [coin({ burst: 1 }), coin({ ruptureP: 4, ruptureC: 2 }), coin({ ruptureP: 4, ruptureC: 2 }), coin()]) }],
    },
    bonuses: [{ label: "弱点補足", perHit: { tremorP: 1, prob: H } }], // マッチ勝利時、的中するたびに振動1
    notes: ["弾丸は足りるものとする"],
  },
  {
    code: "1007",
    name: "奥歯ボートセンターフィクサー(シンクレア)",
    skills: {
      S1: [
        {
          skill: skill("猛襲", [
            coin(),
            coin({ self: { tremorC: 2 }, tremorC: 1 }),
            coin(),
            coin({ self: { tremorC: 2 }, tremorC: 1 }),
          ]),
        },
      ],
      S2: [{ skill: skill("落ち着いて…", [coin({ tremorP: 6 })], { onUse: { self: { tremorC: 6 } } }) }],
      S3: [
        {
          // 自分の振動回数が10以上なら、全て消耗して同じ値の振動回数を付与
          skill: skill("ギャンブラー", [coin({ transferSelfTremor: { to: "tremorC", max: 99, min: 10 } }), coin()]),
        },
      ],
    },
    notes: ["自分への振動爆発と、その分の打撃ダメージは扱わない"],
  },
  {
    code: "0409",
    name: "20区ユロージヴィ(良秀)",
    skills: {
      S1: [
        {
          skill: skill("ねじの抜けた奴らめ", [coin({ self: { tremorC: 3 } }), coin({ tremorC: 2 })], {
            onUse: { self: { tremorC: 2 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill(
            "圧着ぜんまいスパナ",
            [coin(), coin({ tremorC: 1 }), coin({ transferSelfTremor: { to: "tremorC", max: 5 } })],
            { onUse: { self: { tremorC: 2 } } },
          ),
        },
      ],
      S3: [
        {
          skill: skill("叩きゃ直る", [coin({ tremorP: 2 }), coin({ tremorP: 2 }), coin({ burst: 1 })], {
            onUse: { self: { tremorC: -8 } },
          }),
        },
      ],
    },
    notes: ["制・支の追撃は扱わない"],
  },
  {
    code: "0505",
    name: "バラのスパナ工房フィクサー",
    skills: {
      S1: [{ skill: skill("引き受けた業務処理", [coin([{ tremorP: 2 }, { tremorP: 2, prob: H }])]) }],
      S2: [{ skill: skill("強制休憩", [coin([{ tremorP: 3 }, { tremorP: 2, prob: H }]), coin()]) }],
      S3: [
        {
          skill: skill("仕上げの加速", [
            coin([{ self: { charge: 1 } }, { tremorP: 1, prob: H }]),
            coin([{ self: { charge: 2 } }, { tremorP: 2, prob: H }]),
            coin([{ self: { charge: 2 } }, { tremorP: 3, prob: H }]),
            coin({ burst: 1, consumeTarget: { tremorC: 2 } }), // 振動爆発時、振動回数が3減少
          ]),
        },
      ],
    },
    notes: ["充電の消耗による混乱区間前進量の増加は扱わない"],
  },
  {
    code: "1105",
    name: "奥歯事務所フィクサー",
    skills: {
      S1: [{ skill: skill("待て！", [coin()], { onUse: { self: { tremorC: 2 } } }) }],
      S2: [{ skill: skill("引き裂く", [coin({ tremorP: 2 }), coin({ tremorP: 2 }), coin({ burst: 1 })]) }],
      S3: [
        {
          skill: skill("思い切った判断", [coin({ tremorP: 4, tremorC: 3 }), coin({ burst: 1 }), coin({ burst: 1 }), coin({ burst: 1 })], {
            onUse: { self: { tremorC: -10 } },
          }),
        },
      ],
    },
    bonuses: [{ label: "武勇伝", burstDmgRate: 0.3 }], // 振動爆発時、混乱区間前進量の30%の怠惰ダメージ
    notes: ["「捨てる」による手札の操作は扱わない"],
  },
];
