import { useEffect, useRef, useState } from "react";
import { activeSectionIndex, tocId, tocLabel } from "../toc";
import "./page-toc.css";

interface TocItem {
  id: string;
  label: string;
}

// 目次を出す最小の節数。節が少ないページでは目次がかえって邪魔になる
const MIN_ITEMS = 3;

/** 固定ヘッダーと目次の下端(px)。節へ移動するときと現在地の判定に使う */
function stickyBottom(nav: HTMLElement | null): number {
  const header = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
  return header + (nav?.getBoundingClientRect().height ?? 0) + 8;
}

/**
 * ページ内目次。置いた場所の親要素から、見出し(.section-title)付きの節(section.section-block)を読み取って並べる。
 * 人格詳細などは本文を後から読み込むため、親要素の変化を監視して作り直す。
 */
export default function PageToc({ label = "ページ内の目次" }: { label?: string }) {
  const navRef = useRef<HTMLElement>(null);
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState(0);

  // 節の読み取り。DOM の変化(外部の状態)に合わせて目次を作り直す
  useEffect(() => {
    const root = navRef.current?.parentElement;
    if (!root) return;
    const scan = () => {
      const next: TocItem[] = [];
      root.querySelectorAll<HTMLElement>("section.section-block").forEach((section, i) => {
        const heading = section.querySelector<HTMLElement>(".section-title");
        if (!heading) return;
        // 英字ラベルの無い見出し(編成ページなど)は、和文だけで載せ、id は並び順から作る
        const en = heading.querySelector<HTMLElement>(".section-title-en")?.textContent ?? "";
        section.id ||= en ? tocId(en) : `sec-${i + 1}`;
        next.push({ id: section.id, label: tocLabel(heading.textContent ?? "", en) });
      });
      // 内容が同じなら state を変えず、余計な再描画を避ける
      setItems((current) =>
        current.length === next.length && current.every((item, i) => item.id === next[i].id && item.label === next[i].label)
          ? current
          : next
      );
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // スクロールに合わせて現在地を更新する
  useEffect(() => {
    if (items.length < MIN_ITEMS) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const tops = items.map(({ id }) => document.getElementById(id)?.getBoundingClientRect().top ?? Infinity);
      setActive(activeSectionIndex(tops, stickyBottom(navRef.current)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  // 横スクロールになる幅では、現在地の項目が見える位置まで送る
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }, [active]);

  function jump(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    const top = window.scrollY + target.getBoundingClientRect().top - stickyBottom(navRef.current) + 1;
    window.scrollTo({ top, behavior: "smooth" });
  }

  // 節が少ないときも nav 自体は残す(親要素の監視に ref が要るため)。中身だけ出さない
  const shown = items.length >= MIN_ITEMS;
  return (
    <nav ref={navRef} className={`page-toc${shown ? "" : " is-empty"}`} aria-label={label} hidden={!shown}>
      {shown && (
        <ol>
          {items.map((item, i) => (
            <li key={item.id}>
              <button type="button" aria-current={i === active ? "true" : undefined} onClick={() => jump(item.id)}>
                {item.label}
              </button>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
