import { Children, useContext, type ElementType, type ReactNode } from "react";
import { jsx as reactJsx, jsxs as reactJsxs, Fragment } from "react/jsx-runtime";
import { LanguageContext, translateText } from "./text";
export { Fragment };
export type { JSX } from "react/jsx-runtime";

function LocalizedElement({ tag, attributes }: { tag: ElementType; attributes: Record<string, unknown> }) {
  const language = useContext(LanguageContext);
  const props = { ...attributes };
  const children = (value: unknown): unknown => typeof value === "string" ? translateText(value, language) : Array.isArray(value) ? Children.map(value as ReactNode[], (child) => typeof child === "string" ? translateText(child, language) : child) : value;
  if (tag !== "script" && tag !== "style" && tag !== "code") {
    props.children = children(props.children);
    for (const key of ["title", "alt", "placeholder", "aria-label", "data-label"]) {
      if (typeof props[key] === "string") props[key] = translateText(props[key], language);
    }
    // option の暗黙の値を英訳で変えず、既存の絞り込み処理と一致させる。
    if (tag === "option" && props.value === undefined && typeof attributes.children === "string") props.value = attributes.children;
  }
  return (Array.isArray(props.children) ? reactJsxs : reactJsx)(tag, props);
}
function wrap(runtime: typeof reactJsx): typeof reactJsx {
  return (type, props, key) => typeof type === "string" || type === Fragment
    ? runtime(LocalizedElement, { tag: type, attributes: props }, key)
    : runtime(type, props, key);
}
export const jsx = wrap(reactJsx);
export const jsxs = wrap(reactJsxs);
