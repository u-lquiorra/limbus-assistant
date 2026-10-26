import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const texts = new Set<string>();
const pages: Record<string, string[]> = {};
let currentPage = new Set<string>();
const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;
const add = (text: string) => { if (japanese.test(text) && !/^(https?:|images\/)/.test(text)) { texts.add(text); currentPage.add(text); } };
function strings(value: unknown) {
  if (typeof value === "string") add(value);
  else if (Array.isArray(value)) value.forEach(strings);
  else if (value && typeof value === "object") Object.values(value).forEach(strings);
}
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { render, prerenderRoutes, pageMeta } = await server.ssrLoadModule("/src/entry-server.tsx");
  const { structuredData } = await server.ssrLoadModule("/src/seo.ts");
  const { setTranslationCollector } = await server.ssrLoadModule("/src/i18n/text.ts");
  setTranslationCollector(add);
  const routes: string[] = prerenderRoutes().filter((p: string) => !/^\/en(?:\/|$)/.test(p));
  for (const [i, path] of routes.entries()) {
    currentPage = new Set();
    await render(path);
    strings(pageMeta(path));
    strings(structuredData(path, "https://limbus-assistant.com/og-image.png"));
    pages[path] = [...currentPage];
    if (i % 50 === 0) console.log(`表示テキスト収集: ${i}/${routes.length} (${texts.size}件)`);
  }
  for (const path of ["/search?q=火傷", "/search?q=不存在", "/glossary?page=2", "/keywords?trait=剣契", "/egos?sin=wrath", "/missing"]) await render(path);
  await mkdir(".cache/english", { recursive: true });
  const content = JSON.stringify([...texts].sort(), null, 2) + "\n";
  await writeFile(".cache/english/source-text.json", content);
  await writeFile(".cache/english/page-text.json", JSON.stringify(pages, null, 2) + "\n");
  await writeFile(".cache/english/export-manifest.json", JSON.stringify({ kind: "rendered-public-page-text", sha256: createHash("sha256").update(content).digest("hex"), pages: routes, textCount: texts.size, note: "公開ページの描画結果と検索向けメタデータだけを収集。ソースファイル・非公開docsは収集しない。" }, null, 2) + "\n");
  console.log(`収集完了: ${texts.size}件、${[...texts].reduce((n, s) => n + s.length, 0)}文字`);
} finally { await server.close(); }
