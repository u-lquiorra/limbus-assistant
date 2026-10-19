// サイトロゴのブロック文字。ゲームのロゴのような太く角張った字形を、線の太さ2マス・高さ8マスで定義する。
// "#" が塗るマス。文字幅は行の長さで決まる。ロゴに使う文字だけを持つ

const GLYPHS: Record<string, string[]> = {
  A: ["#######", "#######", "##...##", "#######", "#######", "##...##", "##...##", "##...##"],
  B: ["######.", "######.", "##..##.", "#######", "##...##", "##...##", "#######", "#######"],
  I: ["######", "######", "..##..", "..##..", "..##..", "..##..", "######", "######"],
  L: ["##.....", "##.....", "##.....", "##.....", "##.....", "##.....", "#######", "#######"],
  M: ["##....##", "###..###", "########", "##.##.##", "##....##", "##....##", "##....##", "##....##"],
  N: ["##...##", "###..##", "####.##", "##.####", "##..###", "##...##", "##...##", "##...##"],
  S: ["#######", "#######", "##.....", "#######", "#######", ".....##", "#######", "#######"],
  T: ["######", "######", "..##..", "..##..", "..##..", "..##..", "..##..", "..##.."],
  U: ["##...##", "##...##", "##...##", "##...##", "##...##", "##...##", "#######", "#######"],
};

export const GLYPH_H = 8;
const LETTER_GAP = 1;
const SPACE_W = 3;

export interface LogoCells {
  /** 塗るマスの座標(マス単位) */
  cells: [number, number][];
  width: number;
}

/** 1行の文字列を、塗るマスの一覧と行の幅(マス単位)に変換する。未定義の文字は例外にする */
export function layoutLine(text: string): LogoCells {
  const cells: [number, number][] = [];
  let x = 0;
  [...text.toUpperCase()].forEach((ch, i) => {
    if (i > 0) x += LETTER_GAP;
    if (ch === " ") {
      x += SPACE_W - LETTER_GAP;
      return;
    }
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`ロゴに未定義の文字: ${ch}`);
    glyph.forEach((row, y) => [...row].forEach((c, dx) => c === "#" && cells.push([x + dx, y])));
    x += glyph[0].length;
  });
  return { cells, width: x };
}

/** マスの一覧を、1つの SVG パスにする(縁取りを塗りの下に描けるよう1要素にまとめる) */
export function cellsToPath(cells: [number, number][], size: number, offsetX = 0, offsetY = 0): string {
  return cells.map(([x, y]) => `M${offsetX + x * size} ${offsetY + y * size}h${size}v${size}h-${size}z`).join("");
}
