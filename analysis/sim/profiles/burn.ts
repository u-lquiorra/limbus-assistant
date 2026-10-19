// 火傷評価用の人格プロファイル(内部データ。画面には出さない)。
// 出典は src/data/personas/<code>.json の効果文。同期化Ⅳの値を採る。
// ボス1体(単体・1部位)を相手にした近似で、「敵2名へ」「ランダムな敵へ」はすべて同じ対象に入るものとして扱う。
// 資源(保有・共鳴)や数値の溜まり具合で決まる条件は、何ターン目から満たすかで近似し、notes に書く。
import type { Effect, Profile } from "../types.ts";
import { coin, skill } from "./helpers.ts";

// 発動したものとして扱う追加ダメージ(夜明事務所の「対象の火傷威力だけ憤怒ダメージ、最大10」)。回数は減らない
const morgen = (requires: string[]): Effect => ({ trigger: { status: "burn", cap: 10, countLoss: 0 }, requires });

export const BURN_PROFILES: Profile[] = [
  // ---------------- 物理火傷型 ----------------
  {
    code: "1211",
    name: "炎拳事務所生存者",
    skills: {
      S1: [{ skill: skill("火炎放射", [coin({ burnP: 2 }), coin({ burnC: 2 })]) }],
      // 燃料消耗の追加分(火傷威力が最も低い敵2名へ火傷2、回数が最も低い敵の回数+1)も単体ボスでは同じ対象に入る
      S2: [{ skill: skill("汚れた血一滴すら残さず焼き尽くしてやる", [coin({ burnP: 4 }), coin({ burnC: 3 })]) }],
      S3: [{ skill: skill("炎拳", [coin({ burnP: 2, burnC: 1 }), coin({ burnP: 2, burnC: 1 }), coin()]) }],
    },
    notes: ["12区産燃料は戦闘中に尽きないものとして扱う(過熱燃料でも効果は同じ)"],
  },
  {
    code: "0714",
    name: "黒獣-酉 筆頭",
    skills: {
      S1: [
        {
          skill: skill("啄んでやる", [coin(), coin({ ruptureP: 1 }), coin([{ burnP: 1 }, { ruptureC: 1, prob: 0.7 }])], {
            onUse: { burnP: 1, burnC: 1, prob: 0.6 }, // マッチ開始時。ボス戦ではマッチにならない攻撃もあるので6割
          }),
        },
      ],
      S2: [
        {
          skill: skill(
            "爪で引き裂いてやる",
            [coin([{ ruptureP: 1 }, { burnC: 1, prob: 0.7 }]), coin([{ burnP: 1 }, { ruptureC: 1, prob: 0.7 }]), coin()],
            { onUse: { burnP: 1, burnC: 1, prob: 0.6 } },
          ),
        },
      ],
      S3: [
        {
          skill: skill("血炎乱舞", [coin({ burnP: 2 }), coin({ burnP: 2 }), coin({ burnP: 2 }), coin({ ruptureC: 3 })]),
          until: 3,
        },
        {
          // 血闘本能20(1ターン最大10)が溜まる4ターン目以降は強化S3
          skill: skill(
            "血天下鷄舞乱刀",
            [coin({ ruptureC: 2 }), coin({ burnC: 2 }), coin({ ruptureP: 2 }), coin({ burnP: 2 }, { times: 2 })],
            { unbreakable: true },
          ),
          from: 4,
        },
      ],
    },
    // 血炎(S3使用で3、ターン終了ごとに1減少)で基本スキルの火傷・破裂威力+1
    bonuses: [{ label: "血炎", burnP: 1, ruptureP: 1, turns: [4, 5, 10, 11] }],
    notes: ["自傷・自分の火傷は扱わない", "表面的中は表の確率70%で近似"],
  },
  {
    code: "0916",
    name: "蜘蛛の巣親指の親方",
    skills: {
      S1: [
        {
          skill: skill("コルピ・ディ・タッリョ", [
            coin({ burnP: 1, tremorP: 1 }),
            coin({ burnC: 1, tremorC: 1 }),
          ]),
        },
      ],
      S2: [
        {
          skill: skill("喜んでこの弾丸で撃ち抜いてやろう", [
            coin({ burnP: 2, tremorP: 2 }),
            coin({ tremorP: 1, tremorC: 1 }),
            coin({ burst: 1 }),
          ]),
        },
      ],
      S3: [
        {
          skill: skill("セッチォナトゥラ・デッレ・エレファンテ", [
            coin({ burnP: 2, tremorP: 2 }),
            coin({ burnC: 2, tremorC: 2 }),
            coin({ convert: "灼熱" }),
            coin({ burst: 3 }), // 消耗した加速弾だけ追加発動(最大2回)
          ]),
        },
      ],
    },
    // 予知眼(30、1ターン最大10減少)が4ターン目に尽き、次のターンに「処分」とシン(心)-不名誉。過熱から戻って再び尽きるのを11ターン目とみる
    overrides: [
      {
        turns: [5, 11],
        skill: skill(
          "処分",
          [
            coin({ burnP: 2, tremorP: 2 }),
            coin({ burnP: 2, tremorP: 2 }),
            coin({ burnC: 3, tremorC: 3 }),
            coin({ convert: "灼熱" }),
            coin({ burst: 4 }), // 加速弾の消滅数だけ追加発動(最大3回)
          ],
          { unbreakable: true },
        ),
      },
    ],
    bonuses: [{ label: "シン(心)-不名誉", burnP: 1, burnC: 1, tremorP: 1, tremorC: 1, turns: [5, 11] }],
    followUps: [
      {
        // 予知眼がある間、一方攻撃・マッチ敗北で「予知」→ 全回避で「セッチォナトゥラ・デル・コニリオ」の一方攻撃
        label: "予知",
        skill: skill("セッチォナトゥラ・デル・コニリオ", [coin({ burnC: 1, tremorC: 2 }), coin({ burst: 1 })]),
        trigger: "turn",
        prob: 0.4,
        from: 1,
        until: 4,
        unopposed: true,
      },
      {
        label: "予知(2周目)",
        skill: skill("セッチォナトゥラ・デル・コニリオ", [coin({ burnC: 1, tremorC: 2 }), coin({ burst: 1 })]),
        trigger: "turn",
        prob: 0.4,
        from: 7,
        until: 10,
        unopposed: true,
      },
    ],
    notes: [
      "加速弾は常に足りるものとし、S2は「喜んでこの弾丸で撃ち抜いてやろう」を使う",
      "予知の反撃は予知眼がある間に4割の確率で出るものとする",
    ],
  },
  {
    code: "0415",
    name: "蜘蛛の巣の刀",
    // 時空間残像分裂: 毎ターン開始時にランダムな敵へ残影 → 単体ボスでは常に残影があり、基本攻撃スキルが全て破壊不能
    skills: {
      S1: [
        {
          skill: skill(
            "三連",
            [
              coin([{ self: { breathP: 1 } }, { bleedC: 2, crit: true }]),
              coin([{ self: { breathP: 2 } }, { burnC: 1, crit: true }]),
              coin([{ self: { breathP: 2 } }, { bleedP: 2, crit: true }]),
            ],
            { unbreakable: true, onUse: { self: { breathC: 3 } } },
          ),
        },
      ],
      S2: [
        {
          skill: skill(
            "三連-残",
            [
              coin([{ self: { breathP: 2 } }, { bleedP: 1, crit: true }]),
              coin([{ burnP: 2 }, { bleedP: 1, crit: true }]),
              coin([{ burnP: 2 }, { bleedP: 2, crit: true }]),
            ],
            { unbreakable: true, onUse: { self: { breathC: 3 } } },
          ),
        },
      ],
      S3: [
        {
          skill: skill(
            "空間斬",
            [
              coin([
                { bleedP: 3, burnP: 3 },
                { trigger: { status: "burn" }, crit: true },
                { trigger: { status: "bleed" }, crit: true },
              ]),
            ],
            { unbreakable: true, onUse: { self: { breathP: 5 } } },
          ),
        },
      ],
    },
    notes: ["クリティカルは自分の呼吸で判定する", "剣痕・もつれ・地慧星、S3の追加斬撃ダメージは扱わない"],
  },
  {
    code: "0112",
    name: "南部リウ協会3課",
    skills: {
      S1: [
        {
          skill: skill("炎斬", [
            coin([{ burnP: 1 }, { burnP: 1, prob: 0.65 }]),
            coin([{ burnP: 1 }, { burnP: 1, prob: 0.65 }]),
          ]),
        },
      ],
      S2: [
        {
          skill: skill("正面突破", [coin({ burnP: 2 }), coin({ burnP: 2 }), coin({ burnC: 2, min: { burnP: 6 } })]),
        },
      ],
      S3: [
        {
          skill: skill("剣の流れ", [
            coin({ burnP: 1 }),
            coin({ burnP: 1 }),
            coin({ burnP: 2 }),
            coin({ trigger: { status: "burn", cap: 30, countLoss: 2 } }),
          ]),
        },
      ],
    },
    notes: ["表面的中は表の確率65%で近似"],
  },
  {
    code: "0514",
    name: "ロボトミーE.G.O::ホーネット【変調】",
    skills: {
      S1: [{ skill: skill("威嚇射撃", [coin({ burnP: 2 }), coin({ bleedP: 2 })]) }],
      S2: [{ skill: skill("E.G.O変調-散弾", [coin({ burnC: 1 }), coin({ bleedC: 2 }), coin({ burnC: 1 })]) }],
      S3: [
        {
          skill: skill("臨床実験-粉塵灼熱", [
            coin({ burnP: 3 }),
            coin({ bleedP: 2 }),
            coin({ bleedP: 2 }),
            // 胞子が最大なら(火傷威力×胞子÷10)の憤怒ダメージ、火傷回数-1。その後に回数+1
            coin([{ trigger: { status: "burn", scale: 1.5 }, prob: 0.8 }, { burnC: 1, bleedC: 2 }], { unbreakable: true }),
          ]),
        },
      ],
    },
    // 胞子: ターン終了時、5につき火傷回数+1。S1・S2で2ターン目には10前後溜まる
    turnEnd: [{ effect: { burnC: 2 }, from: 2 }],
    notes: ["胞子弾は再装填で足りるものとする", "S3最終コインの条件(胞子最大)は8割で満たすものとする"],
  },
  {
    code: "0311",
    name: "東部センク協会3課",
    skills: {
      S1: [
        {
          skill: skill("発勁", [coin({ burnP: 1 }), coin([{ burnP: 1 }, { burnC: 1, crit: true }])], {
            onUse: { self: { breathC: 3 } },
          }),
        },
      ],
      S2: [
        {
          // マッチ勝利時に呼吸3。7割で近似
          skill: skill("草炎掌", [coin({ self: { breathC: 2 } }), coin({ burnP: 2 }), coin({ burnP: 2 })], {
            onUse: { self: { breathP: 3 }, prob: 0.7 },
          }),
        },
      ],
      S3: [
        {
          skill: skill("一手頼み申す", [coin({ burnP: 1 }), coin({ burnP: 1 }), coin({ burnP: 2 }), coin()], {
            onUse: { self: { breathP: 5 }, prob: 0.7 },
          }),
        },
      ],
    },
    notes: ["クリティカルは自分の呼吸で判定する", "点穴・速度差のコイン威力は扱わない"],
  },
  {
    code: "0604",
    name: "南部リウ協会5課",
    skills: { S1: [], S2: [], S3: [] }, // 裏置き専用として扱う
    support: {
      label: "暖かいですよね？",
      // 精神力が最も高い味方1名の、攻撃スキルで付与する火傷回数+1。憤怒×4保有が条件なので2ターン目から
      bonus: { label: "暖かいですよね？", burnC: 1, from: 2 },
    },
    notes: ["サポートパッシブのみ。効果を受ける味方は編成側で指定する"],
  },

  // ---------------- 夜明組 ----------------
  {
    code: "1009",
    name: "夜明事務所フィクサー(シンクレア)",
    skills: {
      S1: [
        { skill: skill("猛烈な突進", [coin({ burnP: 2 })]), until: 3 },
        // 不安定E.G.O状態では表面的中でコイン再使用(精神力が高いので表の確率85%)
        { skill: skill("猛烈な突進", [coin({ burnP: 2 }), coin({ burnP: 2, prob: 0.85 })]), from: 4 },
      ],
      S2: [
        {
          skill: skill("茜さす剣", [
            coin({ burnC: 1 }),
            coin({ burnC: 1 }),
            // 正午(夜明ファウストが戦場にいる): 最終コイン的中時、火傷15以上なら発動
            coin([{ burnC: 1 }, { trigger: { status: "burn" }, min: { burnP: 15 }, requires: ["0216"] }]),
          ]),
        },
      ],
      S3: [
        { skill: skill("烙印", [coin({ burnP: 3 }), coin({ burnP: 3 })]), until: 3 },
        {
          // 不安定E.G.O状態(精神力40以上で変身。夜明の精神力回復込みで4ターン目)では「燃えたぎる一撃」
          skill: skill("燃えたぎる一撃", [
            // 効果文の順: 火傷10以上なら火傷2(憤怒共鳴なら回数+1) → 火傷10 → 正午: 的中時に火傷を発動
            coin([{ burnP: 2, burnC: 1, min: { burnP: 10 } }, { burnP: 10 }, { trigger: { status: "burn" }, requires: ["0216"] }]),
          ]),
          from: 4,
        },
      ],
    },
    bonuses: [
      // スティグマ工房武器/激情(憤怒×5保有): 自分がスキルで付与する火傷威力と回数+1(1ターン6回)
      { label: "スティグマ工房武器/激情", burnP: 1, burnC: 1, limit: 6, from: 2 },
      // 不安定な激情: 攻撃的中時に火傷1
      { label: "不安定な激情", perHit: { burnP: 1 }, from: 4 },
    ],
    notes: [
      "不安定E.G.O状態は4ターン目からとする",
      "正午の「燃えたぎる一撃」は全コイン破壊不能だが、1コインなので扱いは同じ(破壊不能指定は省略)",
    ],
  },
  {
    code: "0216",
    name: "夜明事務所フィクサー(ファウスト)",
    skills: {
      S1: [
        { skill: skill("黎明の閃光", [coin({ burnP: 2, burnC: 1 }), coin({ tremorP: 1 })]), until: 1 },
        // 炎蝶の棺20以上で最終コインを再使用(再使用コイン的中時、シンクレアがいれば火傷威力分の追加ダメージ)
        {
          skill: skill("黎明の閃光", [
            coin({ burnP: 2, burnC: 1 }),
            coin({ tremorP: 1 }),
            coin([{ tremorP: 1 }, morgen(["1009"])]),
          ]),
          from: 2,
        },
      ],
      S2: [
        {
          // 棺10につき最終コイン再使用(最大2)。再使用的中時に火傷1、振動爆発(スキルごとに1回)
          skill: skill("蝶斬り", [
            coin({ burnC: 2, tremorC: 2 }),
            coin({ tremorP: 1 }),
            coin([{ tremorP: 1, burnP: 1, burst: 1 }, morgen(["1009"])]),
            coin([{ tremorP: 1, burnP: 1 }, morgen(["1009"])]),
          ]),
        },
      ],
      S3: [
        {
          skill: skill(
            "射出",
            [
              coin({ tremorP: 3 }),
              coin({ convert: "灼熱" }),
              coin({ burst: 1 }),
              coin([{ burnP: 1, burst: 1 }, morgen(["1009"])]),
              coin([{ burnP: 1, burst: 1 }, morgen(["1009"])]),
            ],
            { onUse: { burnC: 2, tremorC: 2 } }, // 棺10につき対象の火傷回数・振動回数+1(棺20前後)
          ),
          until: 6,
        },
        {
          // 棺30(防御で溜めて2回目のS3)で「射出-正午」。的中ごとに火傷1か振動1
          skill: skill(
            "射出-正午",
            [
              coin([{ burnP: 1, prob: 0.5 }, { tremorP: 1, prob: 0.5 }, { convert: "灼熱" }]),
              coin([{ burnP: 1, prob: 0.5 }, { tremorP: 1, prob: 0.5 }]),
              coin([{ burnP: 1, prob: 0.5 }, { tremorP: 1, prob: 0.5 }, { burst: 1 }], { times: 3 }),
            ],
            { onUse: { burnC: 3, tremorC: 3 }, unbreakable: true },
          ),
          from: 7,
        },
      ],
    },
    bonuses: [{ label: "戦闘感覚", burnP: 1, burnC: 1, from: 10 }],
    followUps: [
      {
        label: "連携",
        skill: skill("連携", [coin({ tremorC: 1 }), coin({ burnC: 1 })]),
        trigger: { code: "1216", slots: ["S3"] },
        unopposed: true,
      },
      {
        label: "連携",
        skill: skill("連携", [coin({ tremorC: 1 }), coin({ burnC: 1 })]),
        trigger: { code: "1009", slots: ["S3"] },
        unopposed: true,
      },
    ],
    notes: [
      "炎蝶の棺は2ターン目に20前後、2回目のS3(9ターン目)で30とみる",
      "射出-正午の再使用(最大2回)はコインⅢの的中3回として扱う",
      "混乱をきっかけにした連携は扱わない",
    ],
  },
  {
    code: "1216",
    name: "夜明事務所代表",
    skills: {
      S1: [
        { skill: skill("黎明の閃光", [coin({ burnP: 1, tremorC: 2 }), coin({ burnP: 1 })]), until: 2 },
        {
          // 暁の火20以上で破壊不能の2コインが1つ追加(シンクレアがいれば火傷威力分の追加ダメージ)
          skill: skill("黎明の閃光", [
            coin({ burnP: 1, tremorC: 2 }),
            coin({ burnP: 1 }),
            coin([{ burnP: 1 }, morgen(["1009"])], { unbreakable: true }),
          ]),
          from: 3,
        },
      ],
      S2: [
        {
          skill: skill("茜さす剣", [
            coin({ burnP: 2 }),
            coin({ burnP: 1, tremorP: 1 }),
            coin({ burnC: 1, tremorC: 1 }),
          ]),
          until: 2,
        },
        {
          skill: skill("茜さす剣", [
            coin({ burnP: 2 }),
            coin({ burnP: 1, tremorP: 1 }),
            coin({ burnC: 1, tremorC: 1 }),
            coin([{ burnC: 1, tremorC: 1, burst: 1 }, morgen(["1009"])], { unbreakable: true }),
          ]),
          from: 3,
        },
      ],
      S3: [
        {
          skill: skill(
            "夜明けを裂く剣",
            [
              coin({ burnP: 3 }),
              coin({ tremorP: 3 }),
              coin({ burnC: 2, tremorC: 2 }),
              coin({ convert: "灼熱", burst: 1 }),
            ],
            { unbreakable: true },
          ),
          until: 6,
        },
        {
          skill: skill(
            "明け方",
            [
              coin({ burnC: 3, tremorC: 3 }),
              coin({ tremorP: 5 }),
              coin({ burnP: 5 }),
              coin({ convert: "灼熱", burst: 1, trigger: { status: "burn" } }),
            ],
            { unbreakable: true },
          ),
          from: 7,
        },
      ],
    },
    bonuses: [
      // 暁の火: 10以上で基本スキルの火傷威力+1、20以上で火傷回数+1
      { label: "暁の火10", burnP: 1, from: 2 },
      { label: "暁の火20", burnC: 1, from: 3 },
    ],
    followUps: [
      {
        label: "モルゲンフォイヤ",
        skill: skill("黎明の閃光", [coin({ burnP: 1, tremorC: 2 }), coin({ burnP: 1 })]),
        trigger: { code: "0216", slots: ["S3"] },
        unopposed: true,
      },
      {
        label: "モルゲンフォイヤ",
        skill: skill("黎明の閃光", [coin({ burnP: 1, tremorC: 2 }), coin({ burnP: 1 })]),
        trigger: { code: "1009", slots: ["S3"] },
        unopposed: true,
      },
    ],
    notes: ["暁の火は2ターン目に10、3ターン目に20、2回目のS3(9ターン目)で30とみる"],
  },

  // ---------------- 親指組 ----------------
  {
    code: "0716",
    name: "蜘蛛の巣親指の子方",
    skills: {
      S1: [{ skill: skill("パレルモ・スパーダ", [coin({ burnP: 2 }), coin({ tremorP: 1 })]) }],
      S2: [
        {
          skill: skill("コルピ・ソッターニ", [
            coin({ burnP: 2, burnC: 2 }),
            coin({ tremorP: 2, tremorC: 2 }),
            coin({ burst: 1 }), // 対象に決闘高潮があれば(1ターン目の終わりから常にある)
          ]),
        },
      ],
      S3: [
        {
          // 決闘高潮5(1ターン最大3)で「セッチォナトゥラ・デル・チェルヴォ」
          skill: skill(
            "セッチォナトゥラ・デル・チェルヴォ",
            [
              coin({ burnP: 4, burnC: 3 }),
              coin({ tremorP: 4, tremorC: 3 }),
              coin(),
              coin({ convert: "灼熱", burst: 3 }),
            ],
            { unbreakable: true },
          ),
        },
      ],
    },
    followUps: [
      {
        // 必死の奮戦: 親方に予知眼がある間、子方が基本スキルを当てると「パレルモ・スパーダ」で一方攻撃
        label: "必死の奮戦",
        skill: skill("パレルモ・スパーダ", [coin({ burnP: 2 }), coin({ tremorP: 1 })]),
        trigger: "self-hit",
        requires: ["0916"],
        from: 1,
        until: 4,
        unopposed: true,
      },
      {
        label: "必死の奮戦(2周目)",
        skill: skill("パレルモ・スパーダ", [coin({ burnP: 2 }), coin({ tremorP: 1 })]),
        trigger: "self-hit",
        requires: ["0916"],
        from: 7,
        until: 10,
        unopposed: true,
      },
    ],
    notes: ["決闘高潮は3ターン目に5溜まり、S3は常にチェルヴォとして撃つものとする"],
  },
  {
    code: "0512",
    name: "東部親指カポIIII",
    skills: {
      S1: [
        // 1ターン目に守備スキルを装着して、ターン終了時に猛虎標弾8発を装填する運用を想定
        { skill: skill("二連斬-【爆】", [coin({ tremorP: 1 }), coin({ tremorP: 2, burnP: 2 })]), until: 1 },
        // 猛虎標弾がある間(2〜6ターン目): 全コイン破壊不能、弾丸を消耗するコインの火傷威力・回数+2
        {
          skill: skill("二連斬-【爆】", [coin({ tremorP: 1 }), coin({ tremorP: 2, burnP: 4 })], { unbreakable: true }),
          from: 2,
          until: 6,
        },
        // 弾切れ後は弾丸コインの火傷付与が発動しない
        { skill: skill("二連斬-【爆】", [coin({ tremorP: 1 }), coin({ tremorP: 2 })]), from: 7 },
      ],
      S2: [
        {
          skill: skill("三連撃-【爆】", [
            coin({ tremorP: 1 }),
            coin({ tremorP: 2, burnP: 2 }),
            coin({ tremorC: 2, burnC: 2, burst: 1 }),
          ]),
          until: 1,
        },
        {
          skill: skill(
            "三連撃-【爆】",
            [coin({ tremorP: 1 }), coin({ tremorP: 2, burnP: 4 }), coin({ tremorC: 2, burnC: 4, burst: 1 })],
            { unbreakable: true },
          ),
          from: 2,
          until: 6,
        },
        {
          skill: skill("三連撃-【爆】", [coin({ tremorP: 1 }), coin({ tremorP: 2 }), coin({ tremorC: 2, burst: 1 })]),
          from: 7,
        },
      ],
      S3: [
        {
          skill: skill(
            "超絶猛虎殺撃乱斬",
            [
              coin({ tremorP: 3 }),
              coin({ tremorC: 3 }),
              coin({ burnP: 5 }),
              coin({ burnC: 5 }),
              coin({ convert: "灼熱", burst: 3 }),
            ],
            { unbreakable: true },
          ),
          until: 6,
        },
        {
          skill: skill("快刀亂麻", [coin({ tremorP: 3 }), coin({ tremorC: 3 }), coin({ convert: "灼熱", burst: 1 })]),
          from: 7,
        },
      ],
    },
    bonuses: [
      { label: "天退星", tremorP: 1, tremorC: 1, from: 2, until: 5 },
      { label: "シン(心)-天退星", tremorP: 2, tremorC: 2, from: 6 },
    ],
    notes: [
      "猛虎標弾8発は2〜6ターン目で撃ち切るとみる(S1:1発、S2:2発、S3:3発)",
      "弾切れ後(7ターン目〜)は弾丸コインの火傷付与が発動しない",
    ],
  },

  // ---------------- 黒炎型 ----------------
  {
    code: "1107",
    name: "ロボトミーE.G.O::魔弾",
    skills: {
      S1: [{ skill: skill("着火", [coin({ blackFlameNext: 1 }), coin({ burnFromBlackFlame: true })]) }],
      // 魔弾はS2・S3・守備で1ずつ増える(最大7)。S2は魔弾が4未満のとき+1して、次のターンに魔弾だけ黒炎
      S2: [
        { skill: skill("魔弾起爆", [coin({ blackFlameNext: 2 }), coin({ burnFromBlackFlame: true })]), until: 4 },
        { skill: skill("魔弾起爆", [coin({ blackFlameNext: 4 }), coin({ burnFromBlackFlame: true })]), from: 5 },
      ],
      S3: [
        { skill: skill("魔弾射撃", [coin({ blackFlameNext: 3 })]), until: 6 },
        { skill: skill("魔弾射撃", [coin({ blackFlameNext: 6 })]), from: 7 },
      ],
    },
    notes: [
      "黒炎はターン終了時に(黒炎×火傷威力)の傲慢ダメージ。火傷由来のダメージとして数える",
      "魔弾は3ターン目に3、9ターン目に6とみる。黒炎の防御レベル減少と、射手のパイプの呼吸は扱わない",
    ],
  },
  {
    code: "0806",
    name: "南部リウ協会4課",
    skills: {
      S1: [{ skill: skill("丹脚", [coin({ burnP: 1 }), coin({ burnP: 1 })]) }],
      S2: [{ skill: skill("正面突破", [coin({ burnP: 1 }), coin({ burnP: 1 }), coin({ burnC: 2, min: { burnP: 6 } })]) }],
      S3: [{ skill: skill("裡門頂肘", [coin({ burnP: 1 }), coin({ burnP: 1 }), coin({ burnC: 2 }), coin()]) }],
    },
    notes: ["打撃ダメージ量の補正は扱わない"],
  },
];

