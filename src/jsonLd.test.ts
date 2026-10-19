import { test } from "node:test";
import assert from "node:assert/strict";
import { jsonLdScript } from "./jsonLd.ts";

test("jsonLdScript: script タグを閉じる文字列をエスケープし、JSON として読み戻せる", () => {
  const data = { "@type": "Article", headline: "</script><b>A&B</b>" };
  const html = jsonLdScript(data);
  assert.equal(html.match(/<\/script>/g)?.length, 1, "閉じタグは末尾の1つだけ");
  const inner = html.replace(/^<script type="application\/ld\+json">/, "").replace(/<\/script>$/, "");
  assert.deepEqual(JSON.parse(inner), data);
});
