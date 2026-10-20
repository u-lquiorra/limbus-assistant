// ビルド後に全ルートの静的 HTML を dist/ へ書き出す。あわせて 404.html・sitemap.xml・robots.txt を作る。
// 前提: `vite build`(dist/)と `vite build --ssr src/entry-server.tsx --outDir dist-server` が済んでいること
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const serverDir = join(root, "dist-server");

interface ServerEntry {
  render(pathname: string): Promise<string>;
  pageMeta(pathname: string): { title: string; description: string; noindex?: boolean };
  canonicalUrl(pathname: string): string;
  prerenderRoutes(): string[];
  logoSvg(): string;
  structuredDataTags(pathname: string, ogImage: string): string;
  lastModified(pathname: string): string | undefined;
  pageImage(pathname: string): string | undefined;
  SITE_URL: string;
}

const OG_IMAGE = "og-image.png";
const OG_W = 1200;
const OG_H = 630;

/**
 * OGP 画像(1200×630 の PNG)を作る。トップと同じロゴを中央に置き、背景はサイトと同じ暗い茶の地に銅色の光を重ねる。
 * SNS の多くは SVG の og:image を表示しないため、ロゴの SVG を PNG に変換する
 */
async function writeOgImage(svg: string): Promise<void> {
  // useId 由来の id にコロンが入ると、SVG 単体として読むときに参照が切れることがあるため置き換える
  const logo = await sharp(Buffer.from(svg.replace(/:/g, "_")), { density: 300 }).resize({ width: 880 }).png().toBuffer();
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
      <defs><radialGradient id="g" cx="50%" cy="50%" r="60%">
        <stop offset="0" stop-color="#3a1a0a"/><stop offset="1" stop-color="#0b0806"/>
      </radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <rect x="18" y="18" width="${OG_W - 36}" height="${OG_H - 36}" fill="none" stroke="#cb7c30" stroke-opacity="0.55" stroke-width="2"/>
    </svg>`
  );
  const { height = 0 } = await sharp(logo).metadata();
  await sharp(background)
    .composite([{ input: logo, left: Math.round((OG_W - 880) / 2), top: Math.round((OG_H - height) / 2) }])
    .png()
    .toFile(join(dist, OG_IMAGE));
}

const entry = (await import(pathToFileURL(join(serverDir, "entry-server.js")).href)) as ServerEntry;
const template = await readFile(join(dist, "index.html"), "utf8");
await writeOgImage(entry.logoSvg());
const ogImageUrl = `${entry.SITE_URL}/${OG_IMAGE}`;

// HTML 属性・本文に入れる文字をエスケープする(タイトルや説明はデータ由来のため)
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface OgImage {
  url: string;
  width: number;
  height: number;
  /** 正方形に近い画像は大きいカードだと切れるため、小さいカード(summary)で出す */
  card: "summary" | "summary_large_image";
}

const imageSizes = new Map<string, { width: number; height: number } | null>();

/** ページ固有の画像(人格・E.G.O・ボス)があればそれを、無ければサイト共通の OGP 画像を使う */
async function ogImageFor(pathname: string): Promise<OgImage> {
  const path = entry.pageImage(pathname);
  if (path) {
    if (!imageSizes.has(path)) {
      // 画像が無い・読めない場合は共通画像に戻す(原因はログに残す)
      const size = await sharp(join(dist, path))
        .metadata()
        .then((m) => (m.width && m.height ? { width: m.width, height: m.height } : null))
        .catch((e: unknown) => {
          console.error(`OGP 画像を読めない: ${path}`, e);
          return null;
        });
      imageSizes.set(path, size);
    }
    const size = imageSizes.get(path);
    if (size) return { url: `${entry.SITE_URL}/${path}`, ...size, card: "summary" };
  }
  return { url: ogImageUrl, width: OG_W, height: OG_H, card: "summary_large_image" };
}

async function headTags(pathname: string): Promise<{ title: string; tags: string }> {
  const meta = entry.pageMeta(pathname);
  const url = entry.canonicalUrl(pathname);
  const image = await ogImageFor(pathname);
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="robots" content="${meta.noindex ? "noindex" : "index,follow"}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="${pathname === "/" ? "website" : "article"}" />`,
    `<meta property="og:site_name" content="Limbus Assistant" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image.url)}" />`,
    `<meta property="og:image:width" content="${image.width}" />`,
    `<meta property="og:image:height" content="${image.height}" />`,
    `<meta name="twitter:card" content="${image.card}" />`,
    // 構造化データ。ガイドの更新日を先読み結果から取るため、render の後に呼ぶこと
    entry.structuredDataTags(pathname, image.url),
  ]
    .filter(Boolean)
    .join("\n    ");
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
// sitemap の lastmod。ガイドの更新日は先読みの後に分かるため、各ページの生成時に集める
const lastmods = new Map<string, string>();
let failed = 0;
for (const pathname of routes) {
  try {
    const body = await entry.render(pathname);
    const { title, tags } = await headTags(pathname);
    const lastmod = entry.lastModified(pathname);
    if (lastmod) lastmods.set(pathname, lastmod);
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
const notFound = await headTags("/__not-found__");
await writeFile(join(dist, "404.html"), fill(template, "", notFound.title, notFound.tags));

const indexable = routes.filter((p) => !entry.pageMeta(p).noindex);
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...indexable.map((p) => {
    const lastmod = lastmods.get(p);
    return `  <url><loc>${escapeHtml(entry.canonicalUrl(p))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
  }),
  "</urlset>",
  "",
].join("\n");
await writeFile(join(dist, "sitemap.xml"), sitemap);
await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${entry.SITE_URL}/sitemap.xml\n`);

await rm(serverDir, { recursive: true, force: true });
console.log(`静的 HTML: ${routes.length - failed}/${routes.length} ページ、sitemap: ${indexable.length} 件`);
if (failed) process.exit(1);
