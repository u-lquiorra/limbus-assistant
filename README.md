# Limbus Assistant

スマホゲーム『Limbus Company』の攻略情報を閲覧できる非公式ファンアプリです。
キャラクター表記は韓国版/グローバル版/日本語版で異なりますが、本アプリでは日本語版に統一しています。

サイト: https://u-lquiorra.github.io/limbus-assistant/

実装方針と担当範囲は[開発計画](docs/development-plan.md)を参照してください。

データ出典: [LimbusCompany攻略Wiki (wikiwiki.jp/lcbwiki)](https://wikiwiki.jp/lcbwiki/)

## 開発

```bash
npm install
npm run dev
```

## データの再取得(スクレイピング)

wikiwiki.jp/lcbwiki のキャラクターページから人格のステータス・スキル・パッシブ情報を取得し、
`src/data/*.json` に書き出します。サーバー負荷軽減のため1キャラクターごとに1秒待機します。

```bash
npm run scrape
```

特定のキャラクターだけ更新したい場合:

```bash
npm run scrape -- "イサン"
```

## E.G.Oのデータとガイド

囚人ページの「E.G.O一覧」と各E.G.Oの個別ページも `npm run scrape` で取得します(キャッシュ名は `ego-<コード>`)。
E.G.Oのコード(例 `0108`)は人格コードと4桁が重なる別物です。

- `src/data/egos/<コード>.json`: スキル・パッシブ・必要資源・耐性・専用効果。囚人JSONの `egos[]` に一覧用の要約を持つ
- イラストは `public/images/egos/<コード>.webp`
- 効果文の `〘Ⅲ:…〙` / `〘Ⅳ:…〙` は解析Ⅲ・Ⅳで追加・変化する部分。解析Ⅴがある一部のE.G.Oは `earlier` に解析Ⅰ〜Ⅳの状態を持つ
- 画面は `/ego/:コード`(囚人ページの下部に一覧)。ガイドは `src/data/guides/ego/<コード>.md` で、見出しの「解析」「編成・相性」は別の枠に表示される
- ガイド本文の `[表示名](persona:人格コード)` は人格詳細ページへのリンクになる

ガイドの書き方と検証の手順は `limbus-guide` スキルの「第6章 E.G.O ガイド」を参照してください。

## ビルド

```bash
npm run build
```

## 用語辞典のデータ更新

共通の解説は `src/data/glossary.json` と `src/data/glossary-systems.json` で編集します。
辞典は共通の仕組みを対象とします。人格固有の効果・パッシブの説明は人格詳細ページの用語解説に掲載します。
収録状況と次の拡充候補は[共通用語のチェックリスト](docs/glossary-coverage.md)で管理します。光の苗木の各能力は1ページにまとめています。

```bash
npm test
npm run build
```

辞典の内容を変更したら、根拠資料との照合と用語辞典レビューを実施します。

`npm test` は、用語・節IDの重複、関連用語・正式名リンク・出典の整合性に加え、実際の初心者ガイドと全用語ページを描画して内部リンク・目次・見出しの参照先を確認します。人格・E.G.Oガイドの対象コード、人格リンク、参照JSONの存在も確認します。外部サイトの到達確認や説明内容のファクトチェックは別途必要です。

## Claude Code / Codex の攻略ガイド支援

ボス攻略の追加方法とファイル構成は[ボス攻略の追加・更新](docs/boss-guide-authoring.md)を参照してください。

両方で `limbus-guide` スキルと、人格ガイド・用語辞典のレビュー担当を使えます。

| 用途 | Claude Code | Codex |
|---|---|---|
| ガイド執筆 | `.claude/skills/limbus-guide/SKILL.md` | `.agents/skills/limbus-guide/SKILL.md` |
| 事実確認 | `.claude/agents/guide-fact-checker.md` | `.codex/agents/guide-fact-checker.toml` |
| 勝ち筋レビュー | `.claude/agents/guide-strategy-reviewer.md` | `.codex/agents/guide-strategy-reviewer.toml` |
| 用語辞典レビュー | `.claude/agents/glossary-reviewer.md` | `.codex/agents/glossary-reviewer.toml` |

手順・バトルシステム資料・レビュー基準の本文は `.claude/` 側を共通の参照元とし、Codex 用の定義から読み込みます。基準の変更は参照元に反映してください。
Codex のレビュー担当は親のモデル・推論設定を引き継ぎます。

Codex では、例えば `$limbus-guide 人格0103の攻略ガイドを更新して` と依頼します。
スキルが一覧に出ない場合や追加したエージェントを認識しない場合は、Codex のセッションを再起動してください。
サブエージェントを利用できない環境では、スキルの指示に従って観点別に照合し、その制約を報告します。

用語辞典は「`glossary-reviewer` に `src/data/glossary.json` の全用語を独立レビューさせて」のように依頼します。ID（例：`match`、`sanity`）を指定すれば対象を絞れます。
担当は根拠ページを実際に読んで、仕様・数値例・条件・例外・検索語とリンクを確認し、原稿を変更せずに結果を返します。
レビュー記録は `docs/reviews/` に保存し、対象ファイルのSHA-256・用語別判定・根拠・未確認事項を残します。原稿を変更したら再レビューが必要です。
AIの資料照合は、ゲーム内実証・人による承認と区別します。独立した担当を実行できなかった場合は、その旨を記録します。
共通用語・人格固有の用語・検索語の扱いは [用語辞典の編集方針](docs/glossary-authoring.md) を参照してください。

## デプロイ

`main` ブランチへのpushで GitHub Actions (`.github/workflows/deploy.yml`) が自動的に
GitHub Pages へビルド・公開します。リポジトリの Settings → Pages で
Source を "GitHub Actions" に設定してください。
