// ページ内の節へ移動する処理。ページ内目次(PageToc)とガイド内の目次で共通

/** 固定ヘッダーと目次の下端(px)。節へ移動するときと現在地の判定に使う */
export function stickyBottom(nav: HTMLElement | null): number {
  const header = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
  return header + (nav?.getBoundingClientRect().height ?? 0) + 8;
}

/**
 * id の要素が、固定ヘッダーと目次に隠れない位置に来るようにスクロールする。
 * nav を省くと、ページ内目次(.page-toc)が表示されていればその高さを差し引く
 */
export function scrollToSection(id: string, nav?: HTMLElement | null): void {
  const target = document.getElementById(id);
  if (!target) return;
  const toc = nav === undefined ? document.querySelector<HTMLElement>(".page-toc:not([hidden])") : nav;
  const top = window.scrollY + target.getBoundingClientRect().top - stickyBottom(toc) + 1;
  window.scrollTo({ top, behavior: "smooth" });
}
