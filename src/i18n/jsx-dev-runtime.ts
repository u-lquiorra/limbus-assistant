import { jsxDEV as reactJsxDEV, Fragment } from "react/jsx-dev-runtime";
import { jsx, jsxs } from "./jsx-runtime";
export { Fragment };
export type { JSX } from "react/jsx-runtime";
// 開発時も本番と同じ翻訳処理を通す。
export const jsxDEV: typeof reactJsxDEV = (type, props, key, isStaticChildren) => (isStaticChildren ? jsxs : jsx)(type, props, key);
