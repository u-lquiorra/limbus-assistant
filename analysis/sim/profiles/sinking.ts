// 沈潜編成の人格プロファイル(内部データ。画面には出さない)。前提は burn.ts の冒頭と同じ。
// 沈潜は「攻撃を受けるたびに威力ぶんの精神力ダメージ」だが、精神力の無いボス(幻想体など)では憂鬱ダメージになるので、
// ここではダメージとして数える。精神力のあるボスでは、実際には精神力を削ってパニックを狙う効果になる
import type { Profile } from "../types.ts";
import { coin, skill } from "./helpers.ts";

const H = 0.7; // 表面的中・マッチ勝利の確率の近似

export const SINKING_PROFILES: Profile[] = [
  {
    code: "0913",
    name: "ロボトミーE.G.O::涙で研ぎ澄まされた剣",
    skills: {
      S1: [{ skill: skill("騎士の保護", [coin({ sinkingP: 1 }), coin({ sinkingP: 1 })]) }],
      S2: [{ skill: skill("正義の力で", [coin(), coin({ sinkingP: 3 }), coin({ sinkingC: 2 })]) }],
      S3: [{ skill: skill("アルカナ･ピアース", [coin(), coin({ sinkingC: 3 }), coin({ sinkingP: 4 })]) }],
    },
    turnStart: [
      { effect: { sinkingP: 2, prob: H } }, // 加護: マッチ終了時に沈潜2(1ターン1回)
      { effect: { sinkingP: 3, sinkingC: 3 }, turns: [4, 8] }, // 涙で研ぎ澄ます3を消耗して沈潜3・回数3
    ],
    notes: ["精神力0以上の加護状態で戦うものとする", "涙で研ぎ澄ます3は守備スキルで溜め、4・8ターン目に消耗するとみる"],
  },
  {
    code: "0115",
    name: "蜘蛛の巣人差し指の親方",
    skills: {
      S1: [
        {
          skill: skill("凍りついた血を三百三十巻きつけて", [coin(), coin({ self: { breathP: 2 }, sinkingP: 2 })], {
            onUse: { self: { breathC: 2 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill(
            "音のしない手を拍き愉しみ、声を出さず憂く貫き",
            [coin(), coin({ sinkingP: 3 }), coin({ self: { breathC: 2 }, sinkingC: 1 })],
            { onUse: { self: { breathP: 3 } } },
          ),
        },
      ],
      S3: [
        {
          skill: skill(
            "刃を立て刀を笑いたまえ、落葉の匂のように滝を泣きたまえ",
            [
              coin(),
              coin({ self: { breathP: 3 } }),
              coin({ sinkingP: 3 }),
              coin([{ sinkingC: 3 }, { self: { breathC: 1 }, crit: true }], { unbreakable: true }),
            ],
            { onUse: { self: { breathC: 3, breathP: 2 } } },
          ),
        },
      ],
    },
    // 代行[ヘルメス]9で「Furioso-Replica」。1ターン最大(解禁段階+2)なので5ターン目・10ターン目とみる
    overrides: [
      {
        turns: [5, 10],
        skill: skill(
          "Furioso-Replica",
          [
            coin([{ sinkingP: 1, prob: 0.5 }, { self: { breathP: 1 }, prob: 0.5 }], { times: 8 }),
            coin([{ sinkingP: 1, prob: 0.5 }, { sinkingC: 3, burnP: 5 }]),
          ],
          { unbreakable: true, onUse: { self: { breathP: 3, breathC: 3 } } },
        ),
      },
    ],
    notes: ["武器のランダム効果と指令の印のダメージ量補正は扱わない", "Furiosoの火傷5(次のターン)は最終コインで付与する"],
  },
  {
    code: "0414",
    name: "ロボトミーE.G.O::残香・寂しさ",
    skills: {
      S1: [{ skill: skill("ばぁん。ばぁん。", [coin({ sinkingC: 2 }), coin({ tremorP: 3 })]) }],
      S2: [{ skill: skill("空虚より咲き出す香り", [coin({ sinkingC: 3 }), coin({ tremorC: 2 }), coin({ tremorC: 2 })]) }],
      S3: [
        {
          skill: skill("満開", [
            coin({ sinkingC: 3 }),
            coin({ sinkingP: 4 }),
            coin({ tremorP: 2, burst: 1, trigger: { status: "sinking", countLoss: 0 } }), // 沈潜だけ憂鬱ダメージ
          ]),
        },
      ],
    },
    followUps: [
      {
        // 花びら30(1ターン最大15)で「恍惚とした終末」。2〜3ターンに1回
        label: "恍惚とした終末",
        skill: skill("恍惚とした終末", [
          coin({ sinkingP: 3, tremorP: 3, burst: 1, trigger: { status: "sinking", countLoss: 0 } }),
        ]),
        trigger: "self-hit",
        prob: 0.4,
        from: 2,
        unopposed: true,
      },
    ],
    support: {
      label: "春の誕生",
      bonus: { label: "なし" },
      effectPerTurn: { tremorP: 2, burst: 1 }, // 最も速い味方の沈潜付与で振動2+振動爆発(1ターン1回)
    },
    notes: ["残香・孤独の被ダメージ増加は扱わない"],
  },
  {
    code: "0813",
    name: "定事務所代表",
    skills: {
      S1: [
        {
          skill: skill("鶴斬り", [
            coin([{ sinkingC: 1 }, { sinkingC: 1, prob: H }]),
            coin([{ tremorC: 1 }, { tremorC: 1, prob: H }]),
          ]),
        },
      ],
      S2: [
        {
          skill: skill("芒流し", [
            coin([{ sinkingP: 2 }, { sinkingP: 1, prob: H }]),
            coin([{ tremorP: 2 }, { tremorP: 1, prob: H }]),
            coin(),
          ]),
        },
      ],
      S3: [
        {
          skill: skill("桜閃", [
            coin([{ tremorC: 2, sinkingC: 2 }, { sinkingC: 1, prob: H }]),
            coin([{ tremorP: 3, sinkingP: 3 }, { tremorC: 1, prob: H }]),
            coin({ convert: "崩壊" }),
          ]),
        },
      ],
    },
    followUps: [
      {
        // 光札威力5か回数0で「光斬」。3ターンに1回ほど
        label: "光斬",
        skill: skill("光斬", [coin({ tremorC: 1, sinkingC: 1 }, { times: 4 }), coin({ burst: 2 })]),
        trigger: "self-hit",
        prob: 0.33,
        unopposed: true,
      },
    ],
    notes: ["組札がそろったときの振動爆発は扱わない"],
  },
  {
    code: "0214",
    name: "人差し指遂行者：【紙片】",
    skills: {
      S1: [
        {
          skill: skill(
            "指令に従い、確実に。",
            [coin({ self: { breathP: 1 } }), coin([{ sinkingP: 1 }, { sinkingP: 1, crit: true }])],
            { onUse: { self: { breathC: 2 } } },
          ),
        },
      ],
      S2: [
        {
          skill: skill(
            "指令を遂行しつつ修行します",
            [coin({ self: { breathP: 2 } }), coin({ sinkingP: 1 }), coin([{ sinkingP: 1 }, { sinkingC: 2, crit: true }])],
            { onUse: { self: { breathP: 3, breathC: 2 } } },
          ),
        },
      ],
      S3: [
        {
          // 指令の加護6以上(3ターン目〜)で全コイン破壊不能
          skill: skill(
            "指令に従い貴方を処断いたします。",
            [coin({ self: { breathP: 1 } }), coin({ sinkingP: 1 }), coin([{ sinkingP: 1 }, { sinkingC: 3, crit: true }])],
            { onUse: { self: { breathC: 3, breathP: 3 } }, unbreakable: true },
          ),
        },
      ],
    },
    turnStart: [{ effect: { sinkingP: 1, self: { breathP: 1 } }, from: 2 }], // 遂行者の剣: 呼吸1を得て沈潜1
    bonuses: [{ label: "指令の加護9", sinkingP: 1, from: 5 }],
    notes: ["指令は毎ターン遂行できるものとし、加護9を5ターン目からとする"],
  },
  {
    code: "0710",
    name: "ワイルドハント",
    skills: {
      S1: [{ skill: skill("斬首", [coin(), coin({ sinkingP: 3 })]) }],
      S2: [{ skill: skill("追悼行進", [coin(), coin({ sinkingP: 2 }), coin({ sinkingP: 3 })]) }],
      S3: [
        {
          skill: skill("レクイエム", [coin([{ sinkingC: 4 }, { sinkingC: 2, prob: 0.5 }]), coin({ sinkingP: 3 })]),
          until: 6,
        },
        {
          // 守備スキルでデュラハンを得て、2回目のS3は強化版
          skill: skill("悲嘆し、哀嘆し、破綻せよ", [
            coin({ sinkingP: 5, sinkingC: 2 }),
            coin({ trigger: { status: "sinking", cap: 30, countLoss: 0 } }),
          ]),
          from: 7,
        },
      ],
    },
    support: {
      label: "哭け、ただ哭け",
      // 精神力の無い対象へのスキルで付与する沈潜威力・回数+1(1ターン2回)
      bonus: { label: "哭け、ただ哭け", sinkingP: 1, sinkingC: 1, limit: 2 },
    },
    notes: ["棺・デュラハンのダメージ量補正は扱わない"],
  },
  {
    code: "1114",
    name: "LCAウアジェト先鋒三隊隊長",
    skills: {
      S1: [{ skill: skill("ケペシュ剣術", [coin({ sinkingC: 1, tremorC: 1 }), coin()]) }],
      S2: [{ skill: skill("蜃気楼切削", [coin({ sinkingC: 2 }), coin({ tremorC: 1 }), coin({ sinkingP: 2, tremorP: 2 })]) }],
      S3: [
        {
          // LCA亀裂弾を消耗したコインは、消耗した数だけ付与量が増える
          skill: skill("先鋒で終わらせる", [
            coin({ sinkingC: 4, tremorC: 4 }),
            coin({ sinkingP: 2 }),
            coin({ sinkingP: 4, burst: 1 }),
          ]),
        },
      ],
    },
    notes: ["シュトの亀裂(特殊沈潜)は扱わない"],
  },
  {
    code: "0314",
    name: "人差し指代行者-開花E.G.O::代行",
    skills: {
      S1: [
        {
          skill: skill("頭を潰す", [coin({ sinkingP: 2 }), coin([{ self: { breathP: 1 } }, { self: { breathC: 1 }, crit: true }])], {
            onUse: { self: { breathC: 2 } },
          }),
          until: 1,
        },
        // 2ターン目から開花E.G.O::代行
        {
          skill: skill("この手で代わりに…", [coin({ sinkingP: 2 }), coin([{ sinkingC: 1 }, { self: { breathC: 1 }, crit: true }])], {
            onUse: { self: { breathC: 2 } },
          }),
          from: 2,
        },
      ],
      S2: [
        {
          skill: skill(
            "し、静かになされよ",
            [coin({ sinkingP: 1 }), coin({ sinkingP: 2 }), coin([{ self: { breathC: 1 } }, { sinkingC: 1, crit: true }])],
            { onUse: { self: { breathP: 3 } } },
          ),
          until: 1,
        },
        {
          skill: skill(
            "代行:刻む",
            [coin({ sinkingP: 2 }), coin({ sinkingP: 2 }), coin([{ self: { breathC: 1 } }, { sinkingC: 1, crit: true }])],
            { onUse: { self: { breathP: 3 } } },
          ),
          from: 2,
        },
      ],
      S3: [
        {
          skill: skill(
            "代行：抹殺",
            [coin({ sinkingP: 1 }), coin({ sinkingP: 1 }), coin({ sinkingP: 1 }), coin([{ sinkingP: 1 }, { sinkingC: 2, crit: true }])],
            { unbreakable: true, onUse: { self: { breathC: 3, breathP: 2 } } },
          ),
        },
      ],
    },
    notes: ["開花E.G.O::代行は2ターン目からとする", "当然の信心の呼吸獲得+1は扱わない"],
  },
  {
    code: "0912",
    name: "黒獣-巳",
    skills: {
      S1: [
        {
          skill: skill("巳閃", [coin({ ruptureP: 1 }), coin([{ ruptureP: 1 }, { ruptureP: 2, crit: true }])], {
            onUse: { self: { breathC: 2 } },
          }),
        },
      ],
      S2: [
        {
          skill: skill("巳の牙", [coin({ ruptureP: 1 }), coin({ ruptureC: 1 }), coin()], {
            onUse: { ruptureC: 2, self: { breathC: 2 }, prob: H },
          }),
        },
      ],
      S3: [
        {
          skill: skill("絶命巳乱", [coin({ self: { breathC: 2 } }), coin({ self: { breathP: 2 } }), coin({ ruptureC: 1 }, { times: 2 })]),
        },
      ],
    },
    turnStart: [{ effect: { self: { breathP: 3, breathC: 2 } }, from: 2 }], // 巳腕
    notes: ["呪殺【毒】は扱わない", "S3最終コインのクリティカル再使用は1回とみる"],
  },
  {
    code: "0110",
    name: "ロボトミーE.G.O::厳粛な哀悼",
    // 蝶は沈潜とは別の特殊沈潜(最大15)。S3最終コインの「対象の全ての蝶だけ憂鬱ダメージ」を固定ダメージで近似し、
    // 蝶そのものは沈潜として数えない
    skills: {
      S1: [{ skill: skill("往にし者へ祝辞を", [coin(), coin()], { onUse: { sinkingC: 2, prob: H } }) }],
      S2: [{ skill: skill("残りし者へ厳粛な哀悼を", [coin(), coin()], { onUse: { sinkingC: 1, prob: H } }) }],
      S3: [
        {
          skill: skill("葬儀はイサンより、以上。", [coin(), coin(), coin(), coin({ flatDmg: { kind: "sinking", amount: 15 } })], {
            onUse: { sinkingC: 3, prob: H },
          }),
        },
      ],
    },
    notes: ["蝶は沈潜と別扱い。S3の蝶ダメージは15(蝶が半分ほど溜まった状態)で近似", "蝶が被弾時に攻撃者の精神力を削る効果は扱わない"],
  },
  {
    code: "0807",
    name: "奥歯ボートセンターフィクサー",
    skills: {
      S1: [{ skill: skill("破砕準備", [coin(), coin({ sinkingC: 2 })]) }],
      S2: [{ skill: skill("炸裂", [coin({ tremorC: 3 }), coin({ sinkingP: 6 })]) }],
      S3: [{ skill: skill("過激な判断", [coin({ sinkingC: 5 }), coin({ sinkingP: 3 }), coin({ sinkingP: 3 })]) }],
    },
    // 振動がある対象への攻撃的中ごとに沈潜回数+1(上限の記載なし)
    bonuses: [{ label: "クラップ破砕", perHit: { sinkingC: 1, min: { tremorC: 1 } } }],
    notes: ["自分の振動回数(自己バフ)は扱わない"],
  },
  {
    code: "0209",
    name: "ワザリング・ハイツ バトラー",
    skills: {
      S1: [{ skill: skill("押収", [coin(), coin({ sinkingP: 2 })]) }],
      S2: [{ skill: skill("招かざる客の出迎え", [coin(), coin({ sinkingC: 3 })]) }],
      // 最終コイン: 次のターンに邸宅の木霊2、対象に木霊があれば沈潜回数+3
      S3: [{ skill: skill("接客道四式 封心", [coin({ sinkingC: 3 }), coin(), coin(), coin([{ echoNext: 2 }, { sinkingC: 3, needEcho: true }])]) }],
    },
    turnStart: [{ effect: { sinkingP: 2 } }], // バトラー式対応: マッチ勝利時に沈潜1(1ターン3回)
    notes: ["邸宅の木霊は付与された数値のターンだけ続くものとする(効果文に持続の記載が無いため)"],
  },
  {
    code: "1108",
    name: "ワザリング・ハイツチーフバトラー",
    skills: {
      S1: [{ skill: skill("ノック", [coin(), coin({ sinkingP: 2 })]) }],
      S2: [{ skill: skill("埃はたき", [coin(), coin({ sinkingP: 3 }), coin({ sinkingP: 2 })], { onUse: { sinkingC: 2, prob: H } }) }],
      S3: [
        {
          skill: skill(
            "奥様の意のままに",
            [coin(), coin(), coin(), coin([{ echoNext: 3 }, { trigger: { status: "sinking", cap: 30, countLoss: 0 }, needEcho: true }])],
            { onUse: { sinkingC: 3, prob: H } },
          ),
        },
      ],
    },
    notes: ["邸宅の木霊がある対象へは沈潜威力ぶん(最大30)の憂鬱ダメージ"],
  },
  {
    code: "1209",
    name: "エドガー家 継承者",
    skills: {
      S1: [{ skill: skill("セイバースラッシュ", [coin({ sinkingP: 3 })]) }],
      S2: [{ skill: skill("ルミーズ", [coin(), coin({ sinkingC: 3 })], { onUse: { sinkingC: 2, prob: H } }) }],
      S3: [{ skill: skill("悪夢狩り", [coin({ sinkingP: 1 }), coin({ sinkingP: 1 }), coin({ sinkingP: 1 }), coin()]) }],
    },
    notes: ["S3最終コインの沈潜吸収(沈潜を10減らす)は扱わない"],
  },
];
