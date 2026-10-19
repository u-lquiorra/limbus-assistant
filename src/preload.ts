// ルートの描画に必要な遅延データを先に読み込む。
// 静的 HTML の生成時と、その HTML を引き継ぐ最初の描画(hydrate)の前に呼び、
// 両者が同じ内容を描くようにする(読み込み中の表示と食い違うと hydrate が失敗する)
import { loadEgoDetail, loadEgoGuide, loadEgoSynergies, loadGuide, loadPersonaDetail, loadTeamGuide } from "./data/loader";
import { SYNERGY_HEADING } from "./components/GuideView";

export async function preloadRoute(pathname: string): Promise<void> {
  const [, kind, raw] = pathname.split("/");
  const id = raw ? decodeURIComponent(raw) : "";
  if (!id) return;
  // 読み込みに失敗しても、ページ側の useEffect が読み直して概要表示に切り替えるため、ここでは握りつぶさずログだけ残す
  const settle = (promises: Promise<unknown>[]) =>
    Promise.allSettled(promises).then((results) =>
      results.forEach((r) => r.status === "rejected" && console.error(`先読みに失敗した: ${pathname}`, r.reason))
    );
  if (kind === "persona") await settle([loadPersonaDetail(id), loadGuide(id), loadEgoSynergies(id, SYNERGY_HEADING)]);
  else if (kind === "ego") await settle([loadEgoDetail(id), loadEgoGuide(id)]);
  else if (kind === "teams") await settle([loadTeamGuide(id)]);
}
