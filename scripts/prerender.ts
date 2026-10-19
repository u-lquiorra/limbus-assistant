// ビルド後に全ルートの静的 HTML を dist/ へ書き出す。あわせて 404.html・sitemap.xml・robots.txt を作る。
// 前提: `vite build`(dist/)と `vite build --ssr src/entry-server.tsx --outDir dist-server` が済んでいること
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const serverDir = join(root, "dist-server");

interface ServerEntry {
  render(pathname: string): Promise<string>;
  pageMeta(pathname: string): { title: string; description: string; noindex?: boolean };
  canonicalUrl(pathname: string): string;
  prerenderRoutes(): string[];
  SITE_URL: string;
}

const entry = (await import(pathToFileURL(join(serverDir, "entry-server.js")).href)) as ServerEntry;
const template = await readFile(join(dist, "index.html"), "utf8");

// HTML 属性・本文に入れる文字をエスケープする(タイトルや説明はデータ由来のため)
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function headTags(pathname: string): { title: string; tags: string } {
  const meta = entry.pageMeta(pathname);
  const url = entry.canonicalUrl(pathname);
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="robots" content="${meta.noindex ? "noindex" : "index,follow"}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="${pathname === "/" ? "website" : "article"}" />`,
    `<meta property="og:site_name" content="Limbus Assistant" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join("\n    ");
  return { title: meta.title, tags };
}

function fill(html: string, body: string, title: string, tags: string, pathname = ""): string {
  const titleTag = /<title>[^<]*<\/title>/;
  const descTag = /<meta name="description"[^>]*\/>/;
  const rootTag = '<div id="root"></div>';
  if (!titleTag.test(html) || !descTag.test(html) || !html.includes(rootTag)) {
    throw new Error("index.html の title・description・#root が想定の形ではない");
  }
  return html
    .replace(titleTag, `<title>${escapeHtml(title)}</title>`)
    .replace(descTag, tags)
    .replace(rootTag, `<div id="root" data-path="${escapeHtml(pathname)}">${body}</div>`);
}

const routes = entry.prerenderRoutes();
let failed = 0;
for (const pathname of routes) {
  try {
    const body = await entry.render(pathname);
    const { title, tags } = headTags(pathname);
    // /persona/1001 → dist/persona/1001/index.html(GitHub Pages はディレクトリの index.html を返す)
    const dir = join(dist, ...decodeURIComponent(pathname).split("/").filter(Boolean));
    await mkdir(dir, { recursive: true });
    // data-path: ブラウザ側で、この HTML が今のパスのものか確かめてから引き継ぐため
    await writeFile(join(dir, "index.html"), fill(template, body, title, tags, pathname));
  } catch (e) {
    failed++;
    console.error(`静的 HTML の生成に失敗した: ${pathname}`, e);
  }
}

// 存在しないパス用。本文は空にして、ブラウザ側の描画で「見つからない」を出す
const notFound = headTags("/__not-found__");
await writeFile(join(dist, "404.html"), fill(template, "", notFound.title, notFound.tags));

const indexable = routes.filter((p) => !entry.pageMeta(p).noindex);
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...indexable.map((p) => `  <url><loc>${escapeHtml(entry.canonicalUrl(p))}</loc></url>`),
  "</urlset>",
  "",
].join("\n");
await writeFile(join(dist, "sitemap.xml"), sitemap);
await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${entry.SITE_URL}/sitemap.xml\n`);

await rm(serverDir, { recursive: true, force: true });
console.log(`静的 HTML: ${routes.length - failed}/${routes.length} ページ、sitemap: ${indexable.length} 件`);
if (failed) process.exit(1);
