import { lazy, type ComponentType } from "react";

export interface LazyPage {
  (): React.JSX.Element;
  /** ページのコードを読み込む。読み込み済みなら何もしない */
  preload: () => Promise<void>;
}

/**
 * ページのコードを、そのページを開いたときだけ読み込む(最初に読む JS を小さくするため)。
 * React.lazy だけだと、読み込み済みでも最初の描画で一度 Suspense の待機表示になり、
 * 静的 HTML を引き継ぐ描画(hydrate)と中身が食い違う。そこで preload で先に読み込んだら、
 * 以後は読み込んだコンポーネントを直接描く
 */
export function lazyPage(load: () => Promise<ComponentType>): LazyPage {
  let loaded: ComponentType | undefined;
  let pending: Promise<void> | undefined;
  const preload = () =>
    (pending ??= load().then(
      (component) => {
        loaded = component;
      },
      (e: unknown) => {
        // 失敗した読み込みを控えに残さず、次に開いたときに読み直せるようにする
        pending = undefined;
        throw e;
      }
    ));
  const Lazy = lazy(() => preload().then(() => ({ default: loaded! })));
  function Page() {
    const Loaded = loaded;
    return Loaded ? <Loaded /> : <Lazy />;
  }
  return Object.assign(Page, { preload });
}
