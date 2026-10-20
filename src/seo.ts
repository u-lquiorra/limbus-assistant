// ページごとの title・description・canonical と、静的 HTML を書き出すルートの一覧。
// 静的 HTML の生成(scripts/prerender.tsx)と、画面遷移後の書き換え(App の PageMeta)の両方で使う
import { characterList, getCharacter, getEgo, getPersona, getTeam, peekEgoGuide, peekGuide, peekTeamGuide, teams } from "./data/loader";
import { guideSummary } from "./guide";
import { bossGuides, getBossGuide } from "./bosses";
import { getGlossaryTerm, glossaryTerms } from "./glossary";

export const SITE_NAME = "Limbus Assistant";
/** 公開先。canonical と sitemap の絶対 URL に使う(末尾の / なし) */
export const SITE_URL = "https://u-lquiorra.github.io/limbus-assistant";

const DEFAULT_DESCRIPTION =
  "リンバス(Limbus Company)の非公式攻略データベース。人格・E.G.Oの性能と使い方、編成例、ボス攻略、用語辞典を日本語でまとめている。";

export interface PageMeta {
  title: string;
  description: string;
  /** 検索結果に載せないページ(検索結果ページ・見つからないページ) */
  noindex?: boolean;
}

// description は検索結果で途切れない長さに収める
function clip(text: string, max = 120): string {
  const plain = text.replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}

// 検索で最も使われる略称「リンバス」を、全ページの title の先頭に入れる
const TITLE_PREFIX = "【リンバス】";

function withSite(title: string): string {
  return `${TITLE_PREFIX}${title}｜${SITE_NAME}`;
}

/** title から接頭辞とサイト名を除いたページ名(パンくず・記事の見出しに使う) */
export function plainTitle(title: string): string {
  return title.replace(TITLE_PREFIX, "").split("｜")[0];
}

const notFound = (what: string): PageMeta => ({ title: withSite(`${what}が見つからない`), description: DEFAULT_DESCRIPTION, noindex: true });

const STATIC_PAGES: Record<string, PageMeta> = {
  "/": { title: `${SITE_NAME}｜リンバス(Limbus Company)攻略データベース`, description: DEFAULT_DESCRIPTION },
  "/teams": {
    title: withSite("編成例一覧｜火傷・出血・破裂など"),
    description: "リンバス(Limbus Company)の編成例。火傷・出血・破裂・沈潜・呼吸・振動・充電などキーワードごとの組み方と、人格・E.G.Oの役割をまとめている。",
  },
  "/beginner": {
    title: withSite("初心者ガイド"),
    description: "リンバス(Limbus Company)を始めたばかりの人向けのガイド。ストーリーの進め方、育成、日課、交換の優先度を順番に案内する。",
  },
  "/reroll": {
    title: withSite("リセマラガイド｜おすすめ人格と終了ライン"),
    description: "リンバス(Limbus Company)のリセマラガイド。おすすめの人格・E.G.Oと選ぶ理由、どこで終えてよいかの目安、手順をまとめている。",
  },
  "/bosses": {
    title: withSite("ボス攻略一覧"),
    description: "リンバス(Limbus Company)のボス攻略一覧。詰まりやすい戦闘の負け方と対処、敵のスキル・パッシブ、おすすめの編成を章順にまとめている。",
  },
  "/glossary": {
    title: withSite("用語辞典"),
    description: "リンバス(Limbus Company)の用語辞典。マッチ・精神力・耐性・状態異常・E.G.Oなど、戦闘の仕組みを例つきで解説する。",
  },
  "/search": { title: withSite("サイト内検索"), description: DEFAULT_DESCRIPTION, noindex: true },
};

/** パス(basename を除いたもの)からページ情報を作る */
export function pageMeta(pathname: string): PageMeta {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (STATIC_PAGES[path]) return STATIC_PAGES[path];
  const [, kind, raw] = path.split("/");
  const id = raw ? decodeURIComponent(raw) : "";

  switch (kind) {
    case "character": {
      const character = getCharacter(id);
      if (!character) return notFound("囚人");
      return {
        title: withSite(`${character.name}の人格一覧`),
        description: clip(`リンバス(Limbus Company)の囚人「${character.name}」の人格・E.G.O一覧。人格ごとのスキル・耐性・速度を比べられる。`),
      };
    }
    case "persona": {
      const ctx = getPersona(id);
      if (!ctx) return notFound("人格");
      const { status, character } = ctx;
      return {
        title: withSite(`${status.name} ${character.name}の性能と使い方`),
        // ガイドの「ひとことで」を入れて、ページごとに固有の説明文にする(先読み前は定型文のみ)
        description: clip(
          `リンバスの人格「${status.name} ${character.name}」。${guideSummary(peekGuide(id)) ?? ""}スキル・パッシブ・耐性と、相性のいい人格・E.G.O・編成も解説。`
        ),
      };
    }
    case "ego": {
      const ctx = getEgo(id);
      if (!ctx) return notFound("E.G.O");
      const { ego, character } = ctx;
      return {
        title: withSite(`${ego.name} ${character.name}のE.G.Oの性能と使い方`),
        description: clip(
          `リンバスの${character.name}のE.G.O「${ego.name}」(${ego.rank})。${guideSummary(peekEgoGuide(id)) ?? ""}スキル・解析段階ごとの変化と、相性のいい人格も解説。`
        ),
      };
    }
    case "teams": {
      const team = getTeam(id);
      if (!team) return notFound("編成");
      return {
        title: withSite(`${team.name}の組み方と編成例`),
        description: clip(
          `リンバスの${team.name}。${guideSummary(peekTeamGuide(id)) ?? ""}編成例と、優先枠・自由枠・裏置きの人格の役割も解説。`
        ),
      };
    }
    case "bosses": {
      const boss = getBossGuide(id);
      if (!boss) return notFound("ボス攻略");
      return {
        title: withSite(`${boss.stage} ${boss.name}の攻略`),
        description: clip(`リンバス(Limbus Company)${boss.stage}「${boss.name}」の攻略。${boss.lead}`),
      };
    }
    case "glossary": {
      const term = getGlossaryTerm(id);
      if (!term) return notFound("用語");
      return {
        title: withSite(`${term.name}とは｜用語辞典`),
        description: clip(`リンバス(Limbus Company)の用語「${term.name}」の解説。${term.summary}`),
      };
    }
  }
  return notFound("ページ");
}

/** 静的 HTML を書き出すルート(basename を除いたパス)。動的な ID は全データから列挙する */
export function prerenderRoutes(): string[] {
  const personaCodes = characterList.flatMap((c) => getCharacter(c.name)?.statuses.map((s) => s.code) ?? []);
  const egoCodes = characterList.flatMap((c) => getCharacter(c.name)?.egos?.map((e) => e.code) ?? []);
  return [
    ...Object.keys(STATIC_PAGES),
    ...characterList.map((c) => `/character/${encodeURIComponent(c.name)}`),
    ...personaCodes.map((code) => `/persona/${code}`),
    ...egoCodes.map((code) => `/ego/${code}`),
    ...teams.map((t) => `/teams/${t.id}`),
    ...bossGuides.map((b) => `/bosses/${b.id}`),
    ...glossaryTerms.map((t) => `/glossary/${t.id}`),
  ];
}

/**
 * canonical に使う絶対 URL。GitHub Pages は `/persona/1001` を `/persona/1001/` へ転送するため、
 * 転送の要らない末尾 / 付きにそろえる
 */
export function canonicalUrl(pathname: string): string {
  const path = pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
  return SITE_URL + path;
}

// ---- 構造化データ(JSON-LD) ----

export interface Crumb {
  name: string;
  /** basename を除いたパス */
  path: string;
}

const HOME: Crumb = { name: "ホーム", path: "/" };
const SECTION_CRUMBS: Record<string, Crumb> = {
  teams: { name: "編成例", path: "/teams" },
  bosses: { name: "ボス攻略", path: "/bosses" },
  glossary: { name: "用語辞典", path: "/glossary" },
};

/** パンくず(画面の Breadcrumb と同じ階層)。存在しないページは空 */
export function breadcrumbs(pathname: string): Crumb[] {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return [HOME];
  const [, kind, raw] = path.split("/");
  const id = raw ? decodeURIComponent(raw) : "";
  const self = (name: string): Crumb => ({ name, path });
  const characterCrumb = (name: string): Crumb => ({ name, path: `/character/${encodeURIComponent(name)}` });

  if (!id) {
    const meta = STATIC_PAGES[path];
    return meta ? [HOME, self(plainTitle(meta.title))] : [];
  }
  switch (kind) {
    case "character": {
      const c = getCharacter(id);
      return c ? [HOME, characterCrumb(c.name)] : [];
    }
    case "persona": {
      const ctx = getPersona(id);
      return ctx ? [HOME, characterCrumb(ctx.character.name), self(ctx.status.name)] : [];
    }
    case "ego": {
      const ctx = getEgo(id);
      return ctx ? [HOME, characterCrumb(ctx.character.name), self(ctx.ego.name)] : [];
    }
    case "teams": {
      const team = getTeam(id);
      return team ? [HOME, SECTION_CRUMBS.teams, self(team.name)] : [];
    }
    case "bosses": {
      const boss = getBossGuide(id);
      return boss ? [HOME, SECTION_CRUMBS.bosses, self(`${boss.stage} ${boss.name}`)] : [];
    }
    case "glossary": {
      const term = getGlossaryTerm(id);
      return term ? [HOME, SECTION_CRUMBS.glossary, self(term.name)] : [];
    }
  }
  return [];
}

const PUBLISHER = { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` };

/**
 * ページの構造化データ。updated はガイドの更新日など、描画前に読み込んだデータから渡す(無ければ省く)。
 * FAQPage は現在一般サイトではリッチリザルトの対象外のため使わない
 */
export function structuredData(pathname: string, ogImage: string, updated?: string): object[] {
  const meta = pageMeta(pathname);
  if (meta.noindex) return [];
  const url = canonicalUrl(pathname);
  const crumbs = breadcrumbs(pathname);
  const result: object[] = [];

  if (crumbs.length > 1) {
    result.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: canonicalUrl(c.path) })),
    });
  }

  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const [, kind, raw] = path.split("/");
  const id = raw ? decodeURIComponent(raw) : "";

  if (path === "/") {
    result.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      alternateName: "リンバス攻略 Limbus Assistant",
      url,
      inLanguage: "ja",
      description: meta.description,
      publisher: PUBLISHER,
    });
    return result;
  }

  if (kind === "glossary" && id) {
    const term = getGlossaryTerm(id);
    if (term) {
      result.push({
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        name: term.name,
        alternateName: term.aliases.length ? term.aliases : undefined,
        description: term.summary,
        url,
        inDefinedTermSet: { "@type": "DefinedTermSet", name: `${SITE_NAME} 用語辞典`, url: canonicalUrl("/glossary") },
      });
    }
    return result;
  }

  // 解説ページは記事として扱う。更新日はガイド・ボス攻略の確認日から
  const articleKinds = ["persona", "ego", "teams", "bosses"];
  const isArticle = (id && articleKinds.includes(kind)) || path === "/beginner" || path === "/reroll";
  if (isArticle) {
    const date = updated ?? (kind === "bosses" ? getBossGuide(id)?.checkedAt : undefined);
    result.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: plainTitle(meta.title),
      description: meta.description,
      url,
      mainEntityOfPage: url,
      image: ogImage,
      inLanguage: "ja",
      ...(date ? { dateModified: date } : {}),
      author: PUBLISHER,
      publisher: PUBLISHER,
      about: { "@type": "VideoGame", name: "Limbus Company", alternateName: "リンバスカンパニー" },
    });
  }
  return result;
}
