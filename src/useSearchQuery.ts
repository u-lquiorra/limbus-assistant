import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * 検索語を URL の ?q= と同期する。結果を開いて「戻る」で帰ったときに検索結果を復元するため。
 * 日本語入力の変換中は URL を書き換えず、確定してから反映する。
 * 戻り値の boxProps はそのまま SearchBox に渡す。
 */
export function useSearchQuery() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [value, setValue] = useState(query);
  // URL 側の変化(戻る・リンクから開き直す)を入力欄へ反映するため、最後に合わせた値を覚えておく
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setValue(query);
  }
  const composing = useRef(false);

  function updateUrl(next: string) {
    setParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next.trim()) params.set("q", next);
        else params.delete("q");
        return params;
      },
      { replace: true }
    );
  }

  return {
    value,
    boxProps: {
      value,
      onChange: (next: string) => {
        setValue(next);
        if (!composing.current) updateUrl(next);
      },
      onCompositionStart: () => {
        composing.current = true;
      },
      onCompositionEnd: (next: string) => {
        composing.current = false;
        setValue(next);
        updateUrl(next);
      },
    },
  };
}
