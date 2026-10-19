import { useId } from "react";

// 太い縦画と狭い内側の空きで、密度を持たせた長体のステンシル。
const LETTERS: Record<string, { width: number; path: string }> = {
  L: { width: 30, path: "M0 0h13v130h4V90h13v54H0Z" },
  I: { width: 14, path: "M0 0h14v144H0Z" },
  M: { width: 47, path: "M0 144V0h47v144H34V13h-4v111H17V13h-4v131Z" },
  B: { width: 35, path: "M0 0h35v65l-5 7 5 7v65H0Zm15 14v51h5V14Zm0 65v51h5V79Z" },
  U: { width: 35, path: "M0 0h14v130h7V0h14v144H0Z" },
  S: { width: 35, path: "M0 0h35v51H21V14H14v51h21v79H0V93h14v37h7V79H0Z" },
  A: { width: 35, path: "M0 144V0h35v144H21V87H14v57ZM14 14v59h7V14Z" },
  T: { width: 34, path: "M0 0h34v14H24v130H10V14H0Z" },
  N: { width: 37, path: "M0 144V0h14l9 71V0h14v144H23L14 73v71Z" },
};

function wordPath(word: string, spacing: number) {
  let x = 0;
  const letters = [...word].map((letter, index) => {
    if (letter === " ") { x += 15; return null; }
    const glyph = LETTERS[letter];
    if (!glyph) throw new Error(`ロゴに未定義の文字: ${letter}`);
    const result = <path key={index} d={glyph.path} transform={`translate(${x} 0)`} />;
    x += glyph.width + spacing;
    return result;
  });
  return { letters, width: x - spacing };
}

/** フォントに依存しない、長体の活字を使ったワードマーク。名前は呼び出し側で付ける。 */
export default function SiteLogo({ lines, className }: { lines: string[]; className?: string }) {
  const id = useId().replace(/:/g, "");
  const stacked = lines.length > 1;
  const words = lines.map((line) => wordPath(line.toUpperCase(), 4));
  const width = stacked ? 560 : words[0].width;
  const height = stacked ? 313 : 72;

  return (
    <svg className={className} viewBox={`-3 -3 ${width + 6} ${height + 6}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-gold`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width * 0.18} y2={height}>
          <stop offset="0" stopColor="#b38722" />
          <stop offset="0.16" stopColor="#f6d45a" />
          <stop offset="0.4" stopColor="#d7a62b" />
          <stop offset="0.57" stopColor="#f2ce4b" />
          <stop offset="0.8" stopColor="#ce9a27" />
          <stop offset="1" stopColor="#9e6a1e" />
        </linearGradient>
        {/* 静止した斜めの反射帯。傷のマスクを共有し、欠けた部分には光を乗せない。 */}
        <linearGradient id={`${id}-sheen`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2={height * 0.65}>
          <stop offset="0.12" stopColor="#fff5c2" stopOpacity="0" />
          <stop offset="0.3" stopColor="#fff5c2" stopOpacity="0.08" />
          <stop offset="0.37" stopColor="#fff5c2" stopOpacity="0.48" />
          <stop offset="0.43" stopColor="#fff5c2" stopOpacity="0.12" />
          <stop offset="0.55" stopColor="#fff5c2" stopOpacity="0" />
          <stop offset="0.77" stopColor="#fff5c2" stopOpacity="0.16" />
          <stop offset="0.89" stopColor="#fff5c2" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-pitting`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.48" numOctaves="3" seed="17" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 -9.3" />
        </filter>
        <filter id={`${id}-chips`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.12 0.25" numOctaves="2" seed="9" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  18 0 0 0 -12.8" />
        </filter>
        {/* 摩耗を数か所に集め、無傷の金属面を広く残す。境界はぼかして馴染ませる。 */}
        <radialGradient id={`${id}-wear-falloff`}>
          <stop offset="0" stopColor="white" />
          <stop offset="0.35" stopColor="white" stopOpacity="0.85" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-wear-areas`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <g fill={`url(#${id}-wear-falloff)`}>
            <ellipse cx="19" cy="137" rx="58" ry="35" />
            <ellipse cx="205" cy="23" rx="83" ry="42" />
            <ellipse cx="530" cy="104" rx="48" ry="52" />
            <ellipse cx="179" cy="290" rx="52" ry="28" opacity="0.5" />
          </g>
        </mask>
        <mask id={`${id}-wear`} maskUnits="userSpaceOnUse" x="-3" y="-3" width={width + 6} height={height + 6}>
          <rect x="-3" y="-3" width={width + 6} height={height + 6} fill="white" />
          <rect width={width} height={height} filter={`url(#${id}-pitting)`} opacity="0.04" />
          <g mask={`url(#${id}-wear-areas)`}>
            <rect width={width} height={height} filter={`url(#${id}-pitting)`} opacity={stacked ? 0.5 : 0.16} />
            <rect width={width} height={height} filter={`url(#${id}-chips)`} opacity={stacked ? 0.7 : 0.25} />
          </g>
          <g stroke="#000" fill="none" opacity="0.5">
            <path d="m2 32 15 2 6-3m47 99 8-3 11 1m30-106 10 4 8-2m30 77 9-4 13 2m36-47 6 2 12-4m47 92 11-2 7 3m49-114 9 3 4-2m26 96 13-4 6 1m18-73 9 2 14-3m-364 158 5 2 11-1m111 4 9-2 6 1m102-6 11 3" strokeWidth="1.1" opacity="0.8" />
            <path d="m77 4-2 24m111 39-1 15m102-67-2 31m82 126-1 24m89-149-2 18m37 70-1 25" strokeWidth="0.7" opacity="0.65" />
          </g>
          <path d="m111 0 6 0-2 4-3 2Zm417 137 5-1-2 4-3 1ZM3 180l4 2-2 5H0Z" fill="#000" opacity="0.8" />
        </mask>
        <g id={`${id}-letters`} fillRule="evenodd">
        {words.map((word, i) => {
          const rowHeight = stacked ? (i === 0 ? 160 : 144) : 72;
          const rowWidth = width;
          const top = i === 0 ? 0 : 169;
          return <g key={i} transform={`translate(${(width - rowWidth) / 2} ${top}) scale(${rowWidth / word.width} ${rowHeight / 144})`}>{word.letters}</g>;
        })}
        </g>
      </defs>
      <g mask={`url(#${id}-wear)`}>
        <use href={`#${id}-letters`} fill={`url(#${id}-gold)`} />
        <use href={`#${id}-letters`} fill={`url(#${id}-sheen)`} />
      </g>
    </svg>
  );
}
