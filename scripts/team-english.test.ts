import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { bindTeamCopy, teamCopySources } from "./lib/team-english";
import { parseGuide, parseInline, type InlineSegment } from "../src/guide";

test("編成の英訳は原文更新を検出し、全段落の人格・E.G.Oリンクを保つ", async () => {
  const compiled = JSON.parse(await readFile("src/i18n/messages.en.json", "utf8"));
  const links = (segments: InlineSegment[]) => segments.filter(s => s.persona || s.ego).map(s => `${s.persona ? "persona" : "ego"}:${s.persona ?? s.ego}`).sort();
  for (const file of (await readdir("src/i18n/direct")).filter(file => /^team-.+\.json$/.test(file))) {
    const source = JSON.parse(await readFile(`src/i18n/direct/${file}`, "utf8"));
    if (source.kind !== "team-copy") continue;
    const sources = await teamCopySources(source.id);
    const messages = bindTeamCopy(sources, source.entries);
    for (const [ja, en] of Object.entries(messages)) assert.equal(compiled.messages[ja], en);
    const key = Object.keys(source.entries)[0];
    assert.throws(() => bindTeamCopy({ ...sources, [key]: `${sources[key]} 更新` }, source.entries), /原文が更新/);
    const guide = parseGuide(await readFile(source.sourceGuide, "utf8"));
    for (const section of guide.sections) for (const block of section.blocks) for (const segments of block.type === "p" ? [block.text] : block.items) {
      const ja = segments.map(s => s.text).join("");
      const en = compiled.messages[ja];
      assert(en, `${file}: 段落の英訳が無い`);
      assert.deepEqual(links(parseInline(en)), links(segments), `${file}: リンク先が異なる`);
    }
  }
});
