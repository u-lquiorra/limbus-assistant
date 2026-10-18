import { Link } from "react-router-dom";
import { getPersona } from "../data/loader";
import type { GuideSection as GuideSectionData, InlineSegment } from "../guide";
import { asset } from "../lib";
import type { Keyword } from "../types";
import { decorate } from "./decorate";

// 攻略ガイド(src/data/guides/**/*.md)の描画。人格ページ・E.G.O ページで共通。
// ガイドは見出しで枠を分けて表示できる(E.G.O は「解析」「編成・相性」を別の枠にする)

export function InlineText({ segments, keywords }: { segments: InlineSegment[]; keywords: Keyword[] }) {
  return (
    <>
      {segments.map((s, i) => {
        // 人格詳細ページへのリンク([表示名](persona:コード))
        const content = s.persona ? (
          <Link className="guide-link" to={`/persona/${s.persona}`}>
            {s.text}
          </Link>
        ) : (
          decorate(s.text, keywords, false)
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

export function GuideBlocks({
  sections,
  keywords,
  withThumbs,
}: {
  sections: GuideSectionData[];
  keywords: Keyword[];
  withThumbs?: boolean; // 箇条書きの人格リンクに、人格の小さな画像を添える(編成・相性用)
}) {
  return (
    <div className="guide">
      {sections.map((sec) => (
        <div key={sec.heading} className="guide-part">
          {sec.heading && <h3 className="guide-heading">{sec.heading}</h3>}
          {sec.blocks.map((b, i) =>
            b.type === "p" ? (
              <p key={i}>
                <InlineText segments={b.text} keywords={keywords} />
              </p>
            ) : (
              <ul key={i}>
                {b.items.map((item, j) => {
                  const code = withThumbs ? item.find((seg) => seg.persona)?.persona : undefined;
                  const image = code ? getPersona(code)?.status.image : undefined;
                  return (
                    <li key={j} className={code ? "synergy-item" : undefined}>
                      {code && (
                        <Link to={`/persona/${code}`} className="synergy-thumb" tabIndex={-1} aria-hidden="true">
                          {image ? <img src={asset(image)} alt="" width={44} height={44} loading="lazy" /> : null}
                        </Link>
                      )}
                      <div>
                        <InlineText segments={item} keywords={keywords} />
                      </div>
                    </li>
                  );
                })}
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
}: {
  sections: GuideSectionData[];
  keywords: Keyword[];
  updated?: string;
}) {
  return (
    <section className="section-block">
      <header className="section-header">
        <h2 className="section-title">
          <span className="section-title-en">GUIDE</span>
          ギミックと使い方
        </h2>
      </header>
      <GuideBlocks sections={sections} keywords={keywords} />
      <p className="section-note">
        下のスキル・パッシブの効果文をもとにした解説。
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
