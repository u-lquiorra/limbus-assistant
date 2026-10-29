import { Link } from "./Link";
import { getEgo, getPersona } from "../data/loader";
import type { GuideSection as GuideSectionData, InlineSegment } from "../guide";
import { asset } from "../lib";
import type { Keyword } from "../types";
import { decorate } from "./decorate";
import { useContext, type ReactNode } from "react";
import { scrollToSection } from "./scrollToSection";
import { LanguageContext, translateKeywordName, translateOfficialName, translateText } from "../i18n/text";
import { parseInline } from "../guide";

// 攻略ガイド(src/data/guides/**/*.md)の描画。人格ページ・E.G.O ページで共通。
// ガイドは見出しで枠を分けて表示できる(E.G.O は「解析」「編成・相性」を別の枠にする)

export function InlineText({ segments, keywords }: { segments: InlineSegment[]; keywords: Keyword[] }) {
  const language = useContext(LanguageContext);
  const source = segments.map((segment) => segment.text).join("");
  const translation = translateText(source, language);
  const localized = translation === source ? segments : parseInline(translation);
  // 英訳済みの正式名に残る漢字だけを拾い、名前を二重に英訳しない。
  const localizedKeywords = language === "en" && translation !== source
    ? keywords.map((keyword) => {
      const official = translateOfficialName(keyword.term, language);
      const term = official.includes(keyword.term)
        ? official
        : translateKeywordName(keyword.term, keyword.desc, language);
      return term !== keyword.term && term.includes(keyword.term)
        ? { term, desc: translateText(keyword.desc, language) }
        : keyword;
    })
    : keywords;
  return (
    <>
      {localized.map((s, i) => {
        // 人格・E.G.O 詳細ページへのリンク([表示名](persona:コード) / [表示名](ego:コード))
        const href = s.persona ? `/persona/${s.persona}` : s.ego ? `/ego/${s.ego}` : undefined;
        const content = href ? (
          <Link className="guide-link" to={href}>
            {s.text}
          </Link>
        ) : (
          decorate(s.text, localizedKeywords, false)
        );
        return s.strong ? <strong key={i}>{content}</strong> : <span key={i}>{content}</span>;
      })}
    </>
  );
}

// 攻略ガイド(src/data/guides/ego/<code>.md)は見出しで3つの枠に振り分ける。
// 「解析」は本文から分けた枠、「編成・相性」は人格ページへのリンク付きでパッシブの下に置く
export const ANALYSIS_HEADING = "解析";
export const SYNERGY_HEADING = "編成・相性";

// ガイド内の目次から飛ぶ先の見出しの id(並び順から作る)
const guideSectionId = (index: number) => `guide-sec-${index + 1}`;

function GuideListItem({
  item,
  keywords,
  withThumbs,
  children,
}: {
  item: InlineSegment[];
  keywords: Keyword[];
  withThumbs?: boolean;
  children?: ReactNode;
}) {
  const linked = withThumbs ? item.find((seg) => seg.persona || seg.ego) : undefined;
  const href = linked?.persona ? `/persona/${linked.persona}` : linked?.ego ? `/ego/${linked.ego}` : undefined;
  const image = linked?.persona
    ? getPersona(linked.persona)?.status.image
    : linked?.ego
      ? getEgo(linked.ego)?.ego.image
      : undefined;
  return (
    <li className={href ? "synergy-item" : undefined}>
      {href && (
        <Link to={href} className="synergy-thumb" tabIndex={-1} aria-hidden="true">
          {image ? <img src={asset(image)} alt="" width={44} height={44} loading="lazy" /> : null}
        </Link>
      )}
      <div>
        <InlineText segments={item} keywords={keywords} />
        {children}
      </div>
    </li>
  );
}

/** 平らに並んだ項目を、深さ(depths)をもとに「親の項目 + 子の項目」へまとめる */
function groupItems(items: InlineSegment[][], depths?: number[]) {
  const groups: { item: InlineSegment[]; children: InlineSegment[][] }[] = [];
  items.forEach((item, i) => {
    const parent = groups.at(-1);
    if (depths?.[i] && parent) parent.children.push(item);
    else groups.push({ item, children: [] });
  });
  return groups;
}

export function GuideBlocks({
  sections,
  keywords,
  withThumbs,
  toc,
  sectioned,
}: {
  sections: GuideSectionData[];
  keywords: Keyword[];
  withThumbs?: boolean; // 箇条書きの先頭の人格・E.G.O リンクに、小さな画像を添える(編成・相性用)
  toc?: boolean; // 先頭にガイド内の見出しへの目次を出す(長いガイド用)
  sectioned?: boolean; // 見出しの区切りと箇条書きの階層を強める(編成ガイド用)
}) {
  const headed = sections.filter((sec) => sec.heading);
  return (
    <div className={sectioned ? "guide guide-sectioned" : "guide"}>
      {toc && headed.length > 0 && (
        <nav className="guide-toc" aria-label="ガイドの目次">
          <p className="guide-toc-title">目次</p>
          <ol>
            {sections.map((sec, i) =>
              sec.heading ? (
                <li key={sec.heading}>
                  <button type="button" onClick={() => scrollToSection(guideSectionId(i))}>
                    {sec.heading}
                  </button>
                </li>
              ) : null
            )}
          </ol>
        </nav>
      )}
      {sections.map((sec, i) => (
        <div key={sec.heading} className="guide-part">
          {sec.heading && (
            <h3 className="guide-heading" id={toc ? guideSectionId(i) : undefined}>
              {sec.heading}
            </h3>
          )}
          {sec.blocks.map((b, j) =>
            b.type === "p" ? (
              <p key={j}>
                <InlineText segments={b.text} keywords={keywords} />
              </p>
            ) : b.type === "h" ? (
              <h4 key={j} className="guide-subheading">
                <InlineText segments={b.text} keywords={keywords} />
              </h4>
            ) : (
              <ul key={j}>
                {groupItems(b.items, b.depths).map((group, k) => (
                  <GuideListItem key={k} item={group.item} keywords={keywords} withThumbs={withThumbs}>
                    {group.children.length > 0 && (
                      <ul className="guide-sublist">
                        {group.children.map((child, m) => (
                          <GuideListItem key={m} item={child} keywords={keywords} withThumbs={withThumbs} />
                        ))}
                      </ul>
                    )}
                  </GuideListItem>
                ))}
              </ul>
            )
          )}
        </div>
      ))}
    </div>
  );
}

// 攻略ガイド(本文)の枠。人格ページ・E.G.O ページで共通
export function GuideSection({
  sections,
  keywords,
  updated,
  title = "ギミックと使い方",
  note = "下のスキル・パッシブの効果文をもとにした解説。",
  withThumbs,
  toc,
  sectioned,
}: {
  sections: GuideSectionData[];
  keywords: Keyword[];
  updated?: string;
  title?: string;
  note?: string;
  withThumbs?: boolean;
  toc?: boolean;
  sectioned?: boolean;
}) {
  return (
    <section className="section-block">
      <header className="section-header">
        <h2 className="section-title">
          <span className="section-title-en">GUIDE</span>
          {title}
        </h2>
      </header>
      <GuideBlocks sections={sections} keywords={keywords} withThumbs={withThumbs} toc={toc} sectioned={sectioned} />
      <p className="section-note">
        {note}
        {updated && `(更新日: ${updated})`}
      </p>
    </section>
  );
}

export function ExtraSection({
  en,
  title,
  section,
  keywords,
  withThumbs,
}: {
  en: string;
  title: string;
  section: GuideSectionData;
  keywords: Keyword[];
  withThumbs?: boolean;
}) {
  return (
    <section className="section-block">
      <header className="section-header">
        <h2 className="section-title">
          <span className="section-title-en">{en}</span>
          {title}
        </h2>
      </header>
      {/* 枠の見出しと重なるため、ブロックの見出しは出さない */}
      <GuideBlocks sections={[{ ...section, heading: "" }]} keywords={keywords} withThumbs={withThumbs} />
    </section>
  );
}
