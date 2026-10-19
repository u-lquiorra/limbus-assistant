---
name: limbus-guide
description: Limbus Company の人格・E.G.O・囚人の攻略ガイドを作成・更新するときに使う。人格コードや人格名・E.G.O名・囚人名を指定した使い方・立ち回り・編成相性の解説、既存ガイドの修正が対象。
---

# Limbus 攻略ガイド（Codex）

執筆手順・情報源・テンプレートは Claude Code と共通管理する。
作業前に [共通の執筆手順](../../../.claude/skills/limbus-guide/SKILL.md) を読み、その指示に従う。

## Codex での読み替え

- 共通手順の `references/battle-system.md` は、共通手順のファイルを基準に解決する。
  実体は [バトルシステム](../../../.claude/skills/limbus-guide/references/battle-system.md)。
- データ・ガイド・キャッシュ・スクリプトのパスはリポジトリルートを基準にする。
- `Read` / `Grep` / `Glob` の記述は、Codex のファイル読み込み・`rg`・`rg --files` に読み替える。
- 検証は `.codex/agents/` の `guide-strategy-reviewer` と `guide-fact-checker` に委譲する。
  各担当には対象人格コードと保存済みガイドのパスを渡し、共通手順に従って指摘を解消・再検証する。
- サブエージェントを利用できない環境では、両担当の定義を読んで観点別に照合し、独立したレビューを実行できなかったことを報告する。実行していない検証を完了扱いにしない。

共通手順やレビュー基準を変更するときは `.claude/` 側の参照元を更新し、この入口に本文を複製しない。
