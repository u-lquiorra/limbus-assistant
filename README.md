# Limbus Assistant

スマホゲーム『Limbus Company』の攻略情報を閲覧できる非公式ファンアプリです。
キャラクター表記は韓国版/グローバル版/日本語版で異なりますが、本アプリでは日本語版に統一しています。

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

## デプロイ

`main` ブランチへのpushで GitHub Actions (`.github/workflows/deploy.yml`) が自動的に
GitHub Pages へビルド・公開します。リポジトリの Settings → Pages で
Source を "GitHub Actions" に設定してください。
