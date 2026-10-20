import { test } from "node:test";
import assert from "node:assert/strict";
import { activeNavItem } from "./nav.ts";

test("activeNavItem: 囚人・人格・E.G.O のページは囚人一覧を選択中にする", () => {
  assert.equal(activeNavItem("/"), "/");
  assert.equal(activeNavItem("/character/イサン"), "/");
  assert.equal(activeNavItem("/persona/1001"), "/");
  assert.equal(activeNavItem("/ego/20101"), "/");
});

test("activeNavItem: 一覧と下層ページは同じ項目を選択中にする", () => {
  assert.equal(activeNavItem("/teams"), "/teams");
  assert.equal(activeNavItem("/teams/burn"), "/teams");
  assert.equal(activeNavItem("/keywords"), "/teams");
  assert.equal(activeNavItem("/keywords/rupture"), "/teams");
  assert.equal(activeNavItem("/bosses/ricardo"), "/bosses");
  assert.equal(activeNavItem("/glossary/poise"), "/glossary");
  assert.equal(activeNavItem("/beginner"), "/beginner");
  assert.equal(activeNavItem("/reroll"), "/reroll");
});

test("activeNavItem: 前方一致だけの別パスや未知のパスは選択しない", () => {
  assert.equal(activeNavItem("/teamsx"), undefined);
  assert.equal(activeNavItem("/unknown"), undefined);
});
