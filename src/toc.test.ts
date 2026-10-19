import { test } from "node:test";
import assert from "node:assert/strict";
import { activeSectionIndex, tocId, tocLabel } from "./toc.ts";

test("tocLabel: 英字ラベルを除いた和文を使い、和文が無ければ英字を使う", () => {
  assert.equal(tocLabel("SKILLSスキル", "SKILLS"), "スキル");
  assert.equal(tocLabel("GUIDE 組み方と回し方", "GUIDE"), "組み方と回し方");
  assert.equal(tocLabel("SYNERGY", "SYNERGY"), "SYNERGY");
});

test("tocId: 英字ラベルから id を作る", () => {
  assert.equal(tocId("SKILLS"), "sec-skills");
  assert.equal(tocId(" Team Examples "), "sec-team-examples");
});

test("activeSectionIndex: 固定部分の下端を越えた最後の節を現在地にする", () => {
  const offset = 120;
  assert.equal(activeSectionIndex([300, 900, 1500], offset), 0);
  assert.equal(activeSectionIndex([100, 600, 1200], offset), 0);
  assert.equal(activeSectionIndex([-500, 120, 700], offset), 1);
  assert.equal(activeSectionIndex([-1500, -800, 50], offset), 2);
  assert.equal(activeSectionIndex([], offset), 0);
});
