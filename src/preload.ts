// ルートの描画に必要な遅延データを先に読み込む。
// 静的 HTML の生成時と、その HTML を引き継ぐ最初の描画(hydrate)の前に呼び、
// 両者が同じ内容を描くようにする(読み込み中の表示と食い違うと hydrate が失敗する)
import { keywordPersonas, loadEgoDetail, loadEgoGuide, loadEgoSynergies, loadGuide, loadPersonaDetail, loadTeamGuide } from "./data/loader";
import { SYNERGY_HEADING } from "./components/GuideView";
import { getKeywordPage } from "./keywordPages";
import { loadBossGuide } from "./bosses";
import { preloadPage } from "./routes";

export async function preloadRoute(pathname: string): Promise<void> {
  const [, kind, raw] = pathname.split("/");
  const id = raw ? decodeURIComponent(raw) : "";
  // ページのコード自体も遅延読み込みなので、データと並べて読み込む。
  // 失敗しても画面側の Suspense が読み直すため、ここではログだけ残して先へ進む
  const pageCode = preloadPage(pathname).catch((e: unknown) => console.error(`ページの読み込みに失敗した: ${pathname}`, e));
  if (!id) return pageCode;
  // 読み込みに失敗しても、ページ側の useEffect が読み直して概要表示に切り替えるため、ここでは握りつぶさずログだけ残す
  const settle = (promises: Promise<unknown>[]) =>
    Promise.allSettled(promises).then((results) =>
      results.forEach((r) => r.status === "rejected" && console.error(`先読みに失敗した: ${pathname}`, r.reason))
    );
  if (kind === "persona") await settle([loadPersonaDetail(id), loadGuide(id), loadEgoSynergies(id, SYNERGY_HEADING)]);
  else if (kind === "ego") await settle([loadEgoDetail(id), loadEgoGuide(id)]);
  else if (kind === "teams") await settle([loadTeamGuide(id)]);
  else if (kind === "bosses") await settle([loadBossGuide(id)]);
  else if (kind === "keywords") {
    // 一覧の各人格に、ガイドの「ひとことで」を添えるため
    const page = getKeywordPage(id);
    if (page) await settle(keywordPersonas(page.keyword).map((s) => loadGuide(s.code)));
  }
  await pageCode;
}
