// E.G.O 本文の解析段階の印 〘Ⅲ:…〙 / 〘Ⅳ:…〙 (書式は types.ts の EgoSkillDetail を参照)。
// scripts/ego.ts(生成側)と描画側の両方で使う
export const STAGE_MARK = /〘(Ⅲ|Ⅳ):([^〙]*)〙/g;

export type EgoStage = "Ⅲ" | "Ⅳ";

// 印を外して本文だけにする
export function stripStageMarks(text: string): string {
  return text.replace(STAGE_MARK, "$2");
}

export type StageSegment = { text: string; stage?: EgoStage };

// 印の内外で本文を分ける。stage が無い断片は解析Ⅱ以前から有効な部分
export function splitStageMarks(text: string): StageSegment[] {
  const out: StageSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(STAGE_MARK)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[2], stage: m[1] as EgoStage });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
