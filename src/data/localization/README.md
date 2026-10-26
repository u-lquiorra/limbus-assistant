# 日英固有名詞辞書

`names.json` は日英のゲーム内名を対応させる辞書。表示切替への組み込みは `src/i18n/README.md` を参照する。
第三者によるゲームのローカライズデータの公開ミラーから、名前だけを取り込む。
本文・効果説明・台詞は含めない。取得元を公式配信元とは扱わない。

## 参照方法

- `key` は取得元ファイル・ゲーム内ID・強化段階の組。参照にはこのキーを使う。
- `ja` と `en` は日英の名前。改行・連続空白と装飾タグだけを整理し、綴りや句読点は保持する。
- `category` は `character` / `persona` / `ego` / `skill` / `passive` / `status` / `enemy` / `ego-gift` / `term`。
- 人格は `title`（人格の名称）、その他は `name` を使用する。囚人名は `character` の別項目になる。
- スキルは同一IDでも段階によって名前が変わり得るため `level` を持つ。同名・別IDの項目も保持する。
- `provenance.revisions` と `sourceFile` から取得元の行を確認できる。
  URL は `https://github.com/x1bViolet/Limbus-Localization-Files/blob/<revision>/<sourceFile>`。
- `game-localization-mirror-paired` は同一ファイル・ID・段階での日英結合を表す。公式配信元での確認済み、または人手での全件レビュー済みという意味ではない。

日本語だけで辞書を検索すると同名異義の候補が返る場合がある。先頭の候補を自動採用しない。
人格・E.G.Oは種類とコード、スキルは所有者とゲーム内ID・段階を指定して参照する。
元データの略記（例: 属性名）もそのまま残るため、UI向けの正式な長い表記が必要なら別途確認する。

## 現在のサイトとの対応

`coverage.json` の `references` に、囚人・人格・E.G.O・スキル・パッシブ・用語辞典の見出し・ボス名との対応を記録する。

- `matched`: 表記が一致し、候補の英訳が一種類。
- `ambiguous`: 表記は一致するが、英訳が複数。文脈を確認して採用キーを決める。
- `unresolved`: 表記一致なし。未翻訳や表記差を推測で埋めない。

人格・E.G.Oはサイトコードから得たゲーム内IDと日本語名の両方が合う場合だけ対応させる。
スキル・パッシブの `matched` は名前による候補で、所有者との対応を確定したものではない。
用語辞典には一般用語・攻略上の俗称も含むため、すべてがゲーム内の名前と一致するわけではない。
`missing` は片言語にしかないファイル・空ファイル・対応する英語名がないレコードを記録する。

## 再生成

```sh
npx tsx scripts/import-name-dictionary.ts
# 取得済みの同じデータから、ネットワークを使わず再生成
npx tsx scripts/import-name-dictionary.ts --offline
```

取得ファイルは `.cache/name-dictionary/` に保存する。実行場所はリポジトリ直下。
更新時はスクリプト内の日英両方のリビジョンを変更し、生成差分と対応状況を確認する。
取得失敗・未知の構造では処理を失敗させ、不完全な辞書で上書きしない。

指定された Fandom は今回の本文取得が失敗したため、辞書項目の確認済み出典には含めていない。
未対応語を補う際の候補: https://limbuscompany.fandom.com/wiki/Limbus_Company_Wiki
Fandom や既存の取得記事で個別確認した名前を追加する際は、そのページURLと確認方法も残す。
