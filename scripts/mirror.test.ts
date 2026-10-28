// 鏡ダンジョンのパーサーのテスト。wiki のページは大きいので、表の構造だけをまねた HTML で確かめる。
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseFusions, parseGifts, parsePacks } from "./mirror.ts";
import type { MirrorGift } from "../src/types.ts";

const page = (body: string) => `<html><body><div id="body">${body}</div></body></html>`;
const blue = (s: string) => `<span class="wikicolor" style="color:cornflowerblue">${s}</span>`;
const red = (s: string) => `<span class="wikicolor" style="color:crimson">${s}</span>`;
const img = (file: string, alt = file) => `<img src="https://cdn.wikiwiki.jp/to/w/lcbwiki/%E7%94%BB%E5%83%8F/::ref/${file}?rev=x" alt="${alt}">`;

const GIFT_HEADER = `<tr><td></td><td></td><td></td><td></td><td></td><td>+<br>++</td><td>効果</td><td>獲得イベント</td><td></td></tr>`;
const giftRow = (cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;

describe("parseGifts", () => {
  const html = page(`<table>${GIFT_HEADER}
    ${giftRow([
      "001",
      `<a class="anchor" name="HellterflysDream">${img("HellterflysDream.webp", "地獄蝶の夢")}</a>地獄蝶の夢`,
      `<span class="wikicolor" style="color:red">憤怒</span>`,
      "Ⅱ",
      "198",
      `${blue("60")}<br class="spacer">${red("120")}`,
      `<span class="wikicolor" style="color:red">憤怒</span>属性で火傷威力を付与(合計3/${blue("4")}/${red("5")})。<br>次の行`,
      `<a href="/lcbwiki/x#event1">紅炎蛾</a>`,
      "火傷",
    ])}
    ${giftRow([
      "011",
      `<a class="anchor" name="StickyMuck">${img("StickyResin.webp", "粘つくエキス")}</a>粘つくエキス`,
      "暴食",
      "I",
      "合成",
      "強化<br>不可",
      `効果<a class="note_super tooltip" data-tooltip-content="<p>脚注の本文</p><div><a href=&quot;#notefoot_1&quot;>脚注 *1 へ</a></div>">*1</a>`,
      "",
      "-",
    ])}
  </table>`);
  const [a, b] = parseGifts(html);

  test("基本の列を読み、強化段階で変わる値に 〘+:〙〘++:〙 を付ける", () => {
    assert.equal(a.no, "001");
    assert.equal(a.id, "HellterflysDream");
    assert.equal(a.name, "地獄蝶の夢");
    assert.equal(a.sin, "憤怒");
    assert.equal(a.tier, "Ⅱ");
    assert.equal(a.price, 198);
    assert.deepEqual(a.upgradeCost, [60, 120]);
    // 罪悪属性名の色は段階の印にしない
    assert.equal(a.effect, "憤怒属性で火傷威力を付与(合計3/〘+:4〙/〘++:5〙)。\n次の行");
    assert.deepEqual(a.events, ["紅炎蛾"]);
    assert.equal(a.keyword, "火傷");
  });

  test("ID はアンカー名ではなく画像ファイル名から取る(パック表と照合するため)", () => {
    assert.equal(b.id, "StickyResin");
  });

  test("価格が数字でないときは priceNote に残し、半角のランク・強化不可・分類なし・脚注を扱う", () => {
    assert.equal(b.price, null);
    assert.equal(b.priceNote, "合成");
    assert.equal(b.tier, "Ⅰ");
    assert.equal(b.upgradeCost, null);
    assert.equal(b.keyword, null);
    assert.equal(b.effect, "効果");
    assert.deepEqual(b.notes, ["脚注の本文"]);
  });
});

describe("parsePacks", () => {
  const packImg = (id: string) => `<td>${img(`Pack_${id}.png`)}</td>`;
  const gifts = (...ids: string[]) => ids.map((i) => img(`${i}.png`)).join("");
  const fold = (summary: string, inner: string) =>
    `<div class="fold-container"><div class="fold-summary">${summary}</div><div class="fold-content">${inner}</div></div>`;

  const story = fold(
    "ストーリーカードパック",
    `<table>
      <tr><th colspan="3">パック</th></tr>
      <tr>${packImg("A")}${packImg("B")}<td></td></tr>
      <tr><th>パックA</th><th>パック<br>B</th><th>画像なし</th></tr>
      <tr><th colspan="3">出現E.G.Oギフト</th></tr>
      <tr><td colspan="3">${gifts("G1", "G2")}</td></tr>
      <tr><th colspan="3">限定E.G.Oギフト</th></tr>
      <tr><th>なし</th><th>${gifts("L1")}</th><td></td></tr>
      <tr>${packImg("C")}${packImg("D")}</tr>
      <tr><th>パックC</th><th>パックD</th></tr>
      <tr><th colspan="3">出現E.G.Oギフト</th></tr>
      <tr><td colspan="3">${gifts("G3")}</td></tr>
      <tr><th colspan="3">限定E.G.Oギフト</th></tr>
      <tr><th colspan="2">${gifts("L2")}</th></tr>
    </table>`
  );
  const physical = fold(
    "物理属性関連カードパック",
    `<table>
      <tr><th colspan="2">パック</th></tr>
      <tr>${packImg("S1")}${packImg("P1")}</tr>
      <tr><th>斬る1</th><th>貫く1</th></tr>
      <tr>${packImg("S2")}${packImg("P2")}</tr>
      <tr><th>斬る2</th><th>貫く2</th></tr>
      <tr><th colspan="2">出現E.G.Oギフト (共通)</th></tr>
      <tr><td colspan="2">${gifts("C1")}</td></tr>
      <tr><th colspan="2">出現E.G.Oギフト (各種物理属性限定)</th></tr>
      <tr><th>斬撃</th><th>貫通</th></tr>
      <tr><td>${gifts("SL")}</td><td>${gifts("PI")}</td></tr>
    </table>`
  );
  const old = fold(
    "変更前",
    fold("物理属性関連カードパック", fold("嵐の鏡までの内容", `<table><tr><th>パック</th></tr><tr>${packImg("OLD")}</tr><tr><th>古い</th></tr></table>`))
  );
  const packs = parsePacks(page(story + physical + old));
  const get = (name: string) => packs.find((p) => p.name === name);

  test("パック名・画像の ID・分類・共通の出現ギフトを読む", () => {
    assert.deepEqual(get("パックA"), {
      name: "パックA",
      id: "A",
      category: "ストーリーカードパック",
      gifts: ["G1", "G2"],
      limitedGifts: [],
    });
    assert.deepEqual(get("パックB")?.limitedGifts, ["L1"]);
  });

  test("画像も限定ギフトも未掲載のパックは id・limitedGifts を null にする", () => {
    assert.equal(get("画像なし")?.id, null);
    assert.equal(get("画像なし")?.limitedGifts, null);
  });

  test("見出しの無い画像の行から次のグループになり、colspan の限定ギフトは各パックに入る", () => {
    assert.deepEqual(get("パックC")?.gifts, ["G3"]);
    assert.deepEqual(get("パックC")?.limitedGifts, ["L2"]);
    assert.deepEqual(get("パックD")?.limitedGifts, ["L2"]);
  });

  test("属性別ギフトは、各パック名の行の同じ列のパックに入る", () => {
    assert.deepEqual(get("斬る1")?.gifts, ["C1"]);
    assert.deepEqual(get("斬る2")?.limitedGifts, ["SL"]);
    assert.deepEqual(get("貫く1")?.limitedGifts, ["PI"]);
  });

  test("「嵐の鏡までの内容」の古い表は読まない", () => {
    assert.equal(get("古い"), undefined);
    assert.equal(packs.length, 9);
  });
});

describe("parseFusions", () => {
  const gift = (id: string, name: string) => ({ id, name }) as MirrorGift;
  const known = [gift("Paraffin", "融解したパラフィン"), gift("Pot", "万年煮えている釜"), gift("Cookbook", "料理の秘伝書")];
  const html = page(`<table>
    <tr><td>合成元1</td><td></td><td>合成元2</td><td></td><td>合成元3</td><td></td><td>合成ギフト</td></tr>
    <tr><th>Ⅰ融解したパラフィン${img("融解したパラフィン")}</th><td>+</td><th>Ⅱ万年煮えている釜</th><td>+</td><td></td><td>→</td><th>料理の秘伝書${img("Cookbook.webp")}</th></tr>
    <tr><th>Ⅰ欠片シリーズの内1個</th><td>+</td><th>Ⅱ万年煮えている釜</th><td>→</td><th>料理の秘伝書</th></tr>
  </table>`);
  const { fusions, unknown } = parseFusions(html, known);

  test("ランク付きの名前・画像名からギフトの ID に直す", () => {
    assert.deepEqual(fusions, [{ result: "Cookbook", materials: ["Paraffin", "Pot"] }]);
  });

  test("ギフト一覧に無い素材の行は外し、名前を報告する", () => {
    assert.deepEqual(unknown, ["欠片シリーズの内1個"]);
  });
});
