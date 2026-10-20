import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// 画面端からの余白と、用語との間隔(px)
const EDGE = 16;
const GAP = 6;

// 効果文中の用語。押すと説明を開く。
// スマホでは title のツールチップが出ないため、ゲーム内と同じく押して確認できるようにする。
// マウスでは乗せるだけでも開く(以前の title ツールチップの代わり)
export default function KeywordTerm({ term, desc }: { term: string; desc?: string }) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const id = useId();
  const open = pinned || hovered;

  // 押して開いたときは、外側を押すか Esc で閉じる。別の用語を押すと、こちらは外側扱いで閉じる
  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !popoverRef.current?.contains(target)) setPinned(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinned]);

  // PC では用語の真下に置き、画面の右端からはみ出す分は左へずらす。
  // スマホでは CSS で画面下に固定する(position: fixed)ので、位置は計算しない
  useLayoutEffect(() => {
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!open || !button || !popover) return;
    if (getComputedStyle(popover).position !== "absolute") return;
    const anchor = button.getBoundingClientRect();
    const maxLeft = document.documentElement.clientWidth - EDGE - popover.offsetWidth;
    const left = Math.max(EDGE, Math.min(anchor.left, maxLeft));
    popover.style.top = `${anchor.bottom + window.scrollY + GAP}px`;
    popover.style.left = `${left + window.scrollX}px`;
  }, [open]);

  if (!desc) return <span className="fx-keyword">{term}</span>;
  // 親要素の overflow や transform に切られないよう、開いたときだけ body 直下に描画する
  // (静的 HTML の生成時は閉じているので、ボタンだけが出力される)
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="fx-keyword"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        // 開かなくても読み上げで説明が分かるようにする(静的 HTML にも説明が残る)
        aria-description={desc}
        onClick={() => setPinned((v) => !v)}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      >
        {term}
      </button>
      {open &&
        createPortal(
          <span ref={popoverRef} id={id} className="fx-popover" role="tooltip">
            <strong>{term}</strong>
            <span>{desc}</span>
          </span>,
          document.body
        )}
    </>
  );
}
