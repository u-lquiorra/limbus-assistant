import { useId } from "react";
import { GLYPH_H, cellsToPath, layoutLine } from "../logo";

const CELL = 10;
const PAD_X = 14; // 帯の左右の余白(px、マスの大きさ基準)
const PAD_Y = 10;
const LINE_GAP = 6;

/**
 * サイトロゴ。暗い赤の帯に、金〜橙のブロック文字を濃い赤で縁取って描く。
 * 行ごとに中央そろえ。文字は SVG なので、拡大しても荒れない。
 * 装飾なので読み上げからは外し、呼び出し側でリンクや見出しの名前を付ける。
 */
export default function SiteLogo({ lines, className }: { lines: string[]; className?: string }) {
  const id = useId().replace(/:/g, "");
  const laid = lines.map(layoutLine);
  const textW = Math.max(...laid.map((l) => l.width)) * CELL;
  const lineH = GLYPH_H * CELL;
  const width = textW + PAD_X * 2;
  const height = lineH * lines.length + LINE_GAP * (lines.length - 1) + PAD_Y * 2;
  const path = laid
    .map((l, i) => cellsToPath(l.cells, CELL, PAD_X + (textW - l.width * CELL) / 2, PAD_Y + i * (lineH + LINE_GAP)))
    .join("");

  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe066" />
          <stop offset="0.55" stopColor="#f5b52e" />
          <stop offset="1" stopColor="#d9612a" />
        </linearGradient>
        <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a120c" />
          <stop offset="1" stopColor="#2a0806" />
        </linearGradient>
        {/* 擦れた質感: ノイズで文字の塗りをところどころ暗くする */}
        <filter id={`${id}-grunge`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.6" result="spots" />
          <feComposite in="SourceGraphic" in2="spots" operator="in" />
        </filter>
      </defs>
      <rect width={width} height={height} fill={`url(#${id}-band)`} />
      <rect x="1.5" y="1.5" width={width - 3} height={height - 3} fill="none" stroke="#8a2a14" strokeWidth="1.5" />
      <g filter={`url(#${id}-grunge)`}>
        <path d={path} fill={`url(#${id}-fill)`} stroke="#5a0d08" strokeWidth="6" strokeLinejoin="miter" paintOrder="stroke" />
      </g>
    </svg>
  );
}
