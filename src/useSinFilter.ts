import { useSearchParams } from "react-router-dom";
import { formatSinFilter, parseSinFilter } from "./egoFilter";

/** 罪悪属性の絞り込みの選択を、URL(?sin=wrath,pride)と同期して読み書きする(E.G.O 一覧・サポートパッシブ一覧) */
export function useSinFilter(): [string[], (sins: string[]) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = parseSinFilter(searchParams.get("sin"));
  const update = (sins: string[]) => {
    const value = formatSinFilter(sins);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("sin", value);
        else next.delete("sin");
        return next;
      },
      { replace: true, preventScrollReset: true }
    );
  };
  return [selected, update];
}
