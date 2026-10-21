import { forwardRef } from "react";
import { Link as RouterLink, type LinkProps } from "react-router-dom";
import { withTrailingSlash } from "../sitePath";

/**
 * サイト内リンク。react-router の Link と同じ使い方で、文字列の to の末尾に / を付ける(理由は sitePath.ts)。
 * サイト内のリンクは react-router-dom から直接ではなく、この部品から import する(sitePath.test.ts が検査する)
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, ...props }, ref) {
  return <RouterLink ref={ref} to={typeof to === "string" ? withTrailingSlash(to) : to} {...props} />;
});
