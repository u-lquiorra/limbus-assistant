import { Children, forwardRef, useContext, type ReactNode } from "react";
import { Link as RouterLink, type LinkProps } from "react-router-dom";
import { withTrailingSlash } from "../sitePath";
import { LanguageContext, translateText } from "../i18n/text";
import { languagePath } from "../i18n/path";

/**
 * サイト内リンク。react-router の Link と同じ使い方で、文字列の to の末尾に / を付ける(理由は sitePath.ts)。
 * サイト内のリンクは react-router-dom から直接ではなく、この部品から import する(sitePath.test.ts が検査する)
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps & { localize?: boolean }>(function Link({ to, localize = true, children, ...props }, ref) {
  const language = useContext(LanguageContext);
  const translateChildren = (value: ReactNode): ReactNode => Children.map(value, (child) => typeof child === "string" && localize ? translateText(child, language) : child);
  const target = typeof to === "string"
    ? withTrailingSlash(localize ? languagePath(to, language) : to)
    : { ...to, ...(to.pathname ? { pathname: withTrailingSlash(localize ? languagePath(to.pathname, language) : to.pathname) } : {}) };
  return <RouterLink ref={ref} to={target} {...props} title={props.title ? translateText(props.title, language) : undefined} aria-label={props["aria-label"] ? translateText(props["aria-label"], language) : undefined}>{translateChildren(children)}</RouterLink>;
});
