// 構造化データ(JSON-LD)を <script> に埋め込む文字列にする。
// 本文にデータ由来の文字が入るため、</script> で抜けられないよう < > & を Unicode エスケープする
// (置換後の文字列は「\」「u003c」の6文字。JSON として読み戻すと元の文字に戻る)
const ESCAPES: Record<string, string> = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" };

export function jsonLdScript(data: unknown): string {
  const json = JSON.stringify(data).replace(/[<>&]/g, (c) => ESCAPES[c]);
  return `<script type="application/ld+json">${json}</script>`;
}
