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

## ビルド

```bash
npm run build
```

## デプロイ

`main` ブランチへのpushで GitHub Actions (`.github/workflows/deploy.yml`) が自動的に
GitHub Pages へビルド・公開します。リポジトリの Settings → Pages で
Source を "GitHub Actions" に設定してください。
