// 破裂編成の人格プロファイル(内部データ。画面には出さない)。前提は burn.ts の冒頭と同じ
import type { Effect, Profile } from "../types.ts";
import { coin, skill } from "./helpers.ts";

// 呪殺【迅速】: 速度10以上の攻撃で破裂が発動するたびに1減って破裂回数+1、0で破裂威力ぶんの暴食ダメージ。
// 基本値3なので「破裂回数+3と、破裂威力ぶんの追加ダメージ1回」で近似する(重ねがけ不可は扱わない)
const swift: Effect = { ruptureC: 3, trigger: { status: "rupture", countLoss: 0 } };
// 呪殺【破】: 0になるとき破裂威力ぶんの暴食ダメージ
const breakCurse: Effect = { trigger: { status: "rupture", countLoss: 0 } };

// 黒獣の基本S3。鴻園の君主の「黒獣たちよ、応えろ」で尊命が出ると一方攻撃する
const BEASTS_IN_RUPTURE = 4; // 破裂編成の黒獣(卯筆頭・午筆頭・卯良秀・卯ウーティス)

export const RUPTURE_PROFILES: Profile[] = [
  {
    code: "0613",
    name: "鴻園の君主",
    skills: {
      S1: [{ skill: skill("道を拓きたいものだ", [coin({ self: { breathC: 3 } }), coin({ ruptureC: 2 })]) }],
      S2: [
        {
          skill: skill(
            "汚血絶志竟成",
            [
              coin({ ruptureC: 1 }),
              coin({ self: { breathC: 2 } }),
              coin({ ruptureP: 1 }, { unbreakable: true }),
              coin({ ruptureP: 2 }, { unbreakable: true }),
            ],
            { onUse: { self: { breathP: 3 } } },
          ),
        },
      ],
      S3: [
        {
          skill: skill("黒獣たちよ、応えろ", [coin()], {
            unbreakable: true,
            onUse: { self: { breathP: 5, breathC: 3 } },
          }),
        },
      ],
    },
    followUps: [
      {
        // 尊命の後に使う
        label: "君主の道を拓こうぞ",
        skill: skill("君主の道を拓こうぞ", [coin({ ruptureC: 1 }), coin({ ruptureP: 2 })]),
        trigger: { code: "0613", slots: ["S3"] },
        unopposed: true,
      },
    ],
    notes: ["尊命で呼び出す黒獣は、編成内の黒獣から等確率で1人とする", "黒獣丸染・全ての黒獣の主の自己強化は扱わない"],
  },
  {
    code: "0212",
    name: "黒獣-卯 筆頭",
    skills: {
      S1: [
        { skill: skill("瞬歩", [coin({ ruptureP: 1 }), coin({ ruptureC: 1 })], { onUse: { ruptureC: 1, prob: 0.7 } }), until: 1 },
        // 速度10以上(脚力【卯】のクイック5、2ターン目〜)でコイン再使用
        {
          skill: skill("瞬歩", [coin({ ruptureP: 1 }), coin({ ruptureC: 1 }, { times: 2 })], {
            onUse: { ruptureC: 1, prob: 0.7 },
          }),
          from: 2,
        },
      ],
      S2: [
        {
          skill: skill("道を切り拓きます、主君。", [coin({ ruptureC: 1 }), coin({ ruptureP: 1 })], {
            onUse: { ruptureC: 1, prob: 0.7 },
          }),
        },
      ],
      S3: [
        {
          skill: skill(
            "目でも耳でも追えぬように。",
            [coin([{ ruptureC: 1 }, swift]), coin({ ruptureP: 1 }), coin({ ruptureP: 3 }, { times: 2 })],
            { onUse: { ruptureC: 2, prob: 0.7 } },
          ),
          until: 6,
        },
        {
          // 天究星刀10以上(呪殺の発動で溜まる)で奥義
          skill: skill(
            "黒獣 卯 奥義-雲解顕現",
            [coin([{ ruptureC: 1 }, swift, breakCurse]), coin({ ruptureP: 1 }), coin({ ruptureP: 3 }, { times: 2 })],
            { onUse: { ruptureC: 2, self: { breathP: 20, breathC: 4 }, prob: 0.7 } },
          ),
          from: 7,
        },
      ],
    },
    followUps: [
      {
        label: "尊命",
        skill: skill("目でも耳でも追えぬように。", [coin([{ ruptureC: 1 }, swift]), coin({ ruptureP: 1 }), coin({ ruptureP: 3 }, { times: 2 })]),
        trigger: { code: "0613", slots: ["S3"] },
        prob: 1 / BEASTS_IN_RUPTURE,
        unopposed: true,
      },
    ],
    notes: ["速度10以上の条件は2ターン目から満たすとする", "マッチ勝利時の破裂回数増加は7割で近似"],
  },
  {
    code: "0114",
    name: "黒獣-午 筆頭",
    skills: {
      S1: [{ skill: skill("切り伏せん", [coin({ ruptureP: 2 }), coin({ ruptureC: 1, tremorP: 2 })]) }],
      S2: [
        {
          skill: skill("月刀撃", [
            coin({ ruptureC: 2, tremorP: 3 }),
            coin([{ burst: 1 }, { ruptureP: 3, prob: 0.6 }, { concussion: 1, prob: 0.4 }]), // 呪殺があれば破裂3、なければ脳震盪1
          ]),
        },
      ],
      S3: [
        {
          // 敵陣走破3以上で全コイン破壊不能
          skill: skill("先鋒走破", [coin({ ruptureP: 2, tremorP: 2 }), coin({ tremorC: 1 }), coin({ burst: 1, concussion: 2, prob: 0.7 })], {
            unbreakable: true,
          }),
          until: 6,
        },
        {
          skill: skill(
            "黒風馬脚月斬",
            [coin({ ruptureP: 3, tremorP: 4 }), coin({ ruptureC: 2, tremorC: 2 }), coin({ concussion: 1 }), coin({ burst: 2 })],
            { unbreakable: true, onUse: { concussion: 1, prob: 0.7 } },
          ),
          from: 7,
        },
      ],
    },
    followUps: [
      {
        label: "尊命",
        skill: skill("先鋒走破", [coin({ ruptureP: 2, tremorP: 2 }), coin({ tremorC: 1 }), coin({ burst: 1 })]),
        trigger: { code: "0613", slots: ["S3"] },
        prob: 1 / BEASTS_IN_RUPTURE,
        unopposed: true,
      },
    ],
    notes: ["脚力【午】の攻撃前振動付与と、号令(味方のマッチ威力+1・防御レベル+2)は扱わない", "敵陣走破5の強化S3は2回目のS3から"],
  },
  {
    code: "0411",
    name: "黒獣-卯",
    skills: {
      S1: [
        { skill: skill("瞬歩", [coin({ ruptureP: 1 }), coin({ ruptureC: 1 })], { onUse: { ruptureC: 1, prob: 0.7 } }), until: 1 },
        {
          skill: skill("瞬歩", [coin({ ruptureP: 1 }), coin({ ruptureC: 1 }, { times: 2 })], {
            onUse: { ruptureC: 1, prob: 0.7 },
          }),
          from: 2,
        },
      ],
      S2: [
        {
          skill: skill("刻まれた通り", [coin({ ruptureP: 1, ruptureC: 1 }), coin({ ruptureP: 1 })], {
            onUse: { ruptureC: 1, prob: 0.7 },
          }),
        },
      ],
      S3: [
        {
          skill: skill(
            "呪いが刻まれた剣をブッ刺してやろう",
            [coin([{ ruptureC: 1 }, swift]), coin({ ruptureP: 1 }), coin({ ruptureP: 3 }, { times: 2 })],
            { onUse: { ruptureC: 2, prob: 0.7 } },
          ),
        },
      ],
    },
    followUps: [
      {
        label: "尊命",
        skill: skill("呪いが刻まれた剣をブッ刺してやろう", [
          coin([{ ruptureC: 1 }, swift]),
          coin({ ruptureP: 1 }),
          coin({ ruptureP: 3 }, { times: 2 }),
        ]),
        trigger: { code: "0613", slots: ["S3"] },
        prob: 1 / BEASTS_IN_RUPTURE,
        unopposed: true,
      },
    ],
    notes: ["速度10以上の条件は2ターン目から満たすとする"],
  },
  {
    code: "1112",
    name: "黒獣-卯(ウーティス)",
    skills: {
      S1: [
        { skill: skill("瞬歩", [coin({ ruptureP: 1 }), coin({ ruptureP: 1 })]), until: 1 },
        { skill: skill("瞬歩", [coin({ ruptureP: 1 }), coin({ ruptureP: 1 }, { times: 2 })]), from: 2 },
      ],
      S2: [
        {
          skill: skill("刺殺", [coin({ ruptureC: 1 }), coin({ ruptureC: 1 })], {
            onUse: { ruptureC: 1, prob: 0.3 }, // 一方攻撃時
          }),
        },
      ],
      S3: [
        {
          skill: skill("刻呪殺剣", [coin([{ ruptureP: 1 }, swift]), coin({ ruptureP: 1 }), coin({ ruptureP: 1 }, { times: 2 })], {
            onUse: { ruptureC: 2, prob: 0.3 },
          }),
        },
      ],
    },
    followUps: [
      {
        label: "尊命",
        skill: skill("刻呪殺剣", [coin([{ ruptureP: 1 }, swift]), coin({ ruptureP: 1 }), coin({ ruptureP: 1 }, { times: 2 })], {
          onUse: { ruptureC: 2 },
        }),
        trigger: { code: "0613", slots: ["S3"] },
        prob: 1 / BEASTS_IN_RUPTURE,
        unopposed: true,
      },
    ],
    notes: ["一方攻撃時の破裂回数増加は3割で近似(尊命の追撃は一方攻撃)"],
  },
  {
    code: "0511",
    name: "西部センク協会3課",
    skills: {
      S1: [
        {
          // 速度差ぶんの破裂(最大3)は2とみる
          skill: skill("アレ", [coin({ self: { breathC: 1 } }), coin({ ruptureP: 3 })], {
            onUse: { self: { breathC: 2 } },
            sustainRupture: true,
          }),
        },
      ],
      S2: [
        {
          skill: skill(
            "フォント",
            [coin({ self: { breathC: 2 } }), coin({ self: { breathP: 2 } }), coin({ ruptureP: 4, ruptureC: 2 })],
            { onUse: { self: { breathC: 2 }, prob: 0.7 }, sustainRupture: true },
          ),
        },
      ],
      S3: [
        {
          skill: skill("サリュー", [coin(), coin(), coin()], {
            onUse: { self: { breathP: 10 }, prob: 0.7 }, // マッチ勝利時に呼吸5、集中攻撃があれば+5
            sustainRupture: true,
          }),
        },
      ],
    },
    notes: ["クリティカルダメージ量の追加補正は扱わない"],
  },
  {
    code: "0910",
    name: "北部ヂェーヴィチ協会3課",
    skills: {
      S1: [{ skill: skill("デリバリーキャリア-崩壊ナイフ", [coin(), coin({ ruptureP: 3 })], { sustainRupture: true }) }],
      S2: [{ skill: skill("デリバリーキャリア-ガジェット射出", [coin(), coin(), coin()], { sustainRupture: true }) }],
      S3: [
        {
          // デリバリーキャリア20以上(4ターン目〜)で破裂回数+5。破裂維持中は最後のコインを再使用
          skill: skill("ポルー！ちょっと頑張って！", [coin(), coin({ ruptureC: 5 }), coin(undefined, { times: 2 })], {
            sustainRupture: true,
          }),
        },
      ],
    },
    notes: ["デリバリーキャリアによるダメージ量増加と防御レベル減少は扱わない"],
  },
];
