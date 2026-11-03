import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const sandbox = {};
vm.runInNewContext(readFileSync(new URL("./rules.js", import.meta.url), "utf8"), sandbox);
const { isGameWon, projectGame, pointSituation } = sandbox.BadmintonRules;
const same = (actual, expected) => assert.equal(JSON.stringify(actual), JSON.stringify(expected));

function play(format, serverSide, rightPlayers, events) {
  return projectGame(
    { serverSide, rightPlayers, events },
    format,
  );
}

test("21 分且净胜 2 分才结束，29 平后先到 30", () => {
  assert.equal(isGameWon(21, 19), true);
  assert.equal(isGameWon(21, 20), false);
  assert.equal(isGameWon(22, 20), true);
  assert.equal(isGameWon(20, 18), false);
  assert.equal(isGameWon(29, 29), false);
  assert.equal(isGameWon(30, 29), true);
  assert.equal(isGameWon(30, 28), true);
});

test("单打发球区随发球方分数奇偶变化，得分方成为发球方", () => {
  const start = play("singles", 0, [0, 0], []);
  same(start.server, { side: 0, player: 0, court: "right" });

  const one = play("singles", 0, [0, 0], [0]);
  same(one.score, [1, 0]);
  same(one.server, { side: 0, player: 0, court: "left" });

  const lost = play("singles", 0, [0, 0], [0, 1]);
  same(lost.score, [1, 1]);
  same(lost.server, { side: 1, player: 0, court: "left" });
});

test("双打：连续得分的是同一个发球员换区，接发得分后由对方对应半区的人发球", () => {
  const first = play("doubles", 0, [0, 0], [0]);
  assert.equal(first.server.side, 0);
  assert.equal(first.server.player, 0);
  assert.equal(first.server.court, "left");

  const received = play("doubles", 0, [0, 0], [0, 1]);
  same(received.score, [1, 1]);
  assert.equal(received.server.side, 1);
  assert.equal(received.server.player, 1);
  assert.equal(received.server.court, "left");

  const held = play("doubles", 0, [0, 0], [0, 1, 1]);
  same(held.score, [1, 2]);
  assert.equal(held.server.side, 1);
  assert.equal(held.server.player, 1);
  assert.equal(held.server.court, "right");
});

test("一局结束后不再计分", () => {
  const events = Array(21).fill(0);
  events.push(1);
  const game = play("singles", 0, [0, 0], events);
  same(game.score, [21, 0]);
  assert.equal(game.finished, true);
  assert.equal(game.winner, 0);
});

test("局点与赛点", () => {
  same(pointSituation([20, 19], [0, 0], 3), [{ side: 0, kind: "game" }]);
  same(pointSituation([20, 20], [0, 0], 3), []);
  same(pointSituation([20, 19], [1, 0], 3), [{ side: 0, kind: "match" }]);
  same(pointSituation([29, 29], [1, 1], 3), [
    { side: 0, kind: "match" },
    { side: 1, kind: "match" },
  ]);
  same(pointSituation([29, 28], [0, 0], 3), [{ side: 0, kind: "game" }]);
});
