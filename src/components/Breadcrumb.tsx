import { Fragment } from "react";
import { Link } from "./Link";

export interface BreadcrumbItem {
  label: string;
  /** 省略した項目は現在のページとして扱う */
  to?: string;
}

/**
 * 下層ページ共通のパンくず。先頭の「ホーム」は自動で付ける。
 * SEO の構造化データ(BreadcrumbList)も同じ items から出せるよう、表示はデータだけで決める。
 */
export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const all: BreadcrumbItem[] = [{ label: "ホーム", to: "/" }, ...items];
  return (
    <nav className="breadcrumb" aria-label="パンくずリスト">
      {all.map((item, i) => (
        <Fragment key={`${i}-${item.label}`}>
          {i > 0 && <span aria-hidden="true">/</span>}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
