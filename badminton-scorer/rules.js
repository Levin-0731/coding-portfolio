/* 羽毛球计分规则（BWF 21 分制）
 * - 每局 21 分，须净胜 2 分；29 平后先到 30 者胜
 * - 单打：发球方分数为偶从右区、为奇从左区
 * - 双打：只有正在发球的一方得分时才交换左右站位；
 *   新分数为偶由右区球员发球，为奇由左区球员发球
 */
(function () {
  var LIMIT = 21;
  var CAP = 30;

  function isGameWon(a, b) {
    var hi = Math.max(a, b);
    var lo = Math.min(a, b);
    if (hi >= CAP) return true;
    return hi >= LIMIT && hi - lo >= 2;
  }

  function projectGame(game, format) {
    var score = [0, 0];
    var serverSide = game.serverSide;
    var courts = [
      { right: game.rightPlayers[0], left: 1 - game.rightPlayers[0] },
      { right: game.rightPlayers[1], left: 1 - game.rightPlayers[1] },
    ];
    var finished = false;
    var i;
    for (i = 0; i < game.events.length; i += 1) {
      if (finished) break;
      var side = game.events[i];
      if (format === "doubles" && serverSide === side) {
        var court = courts[side];
        courts[side] = { right: court.left, left: court.right };
      }
      score[side] += 1;
      serverSide = side;
      finished = isGameWon(score[0], score[1]);
    }
    var serveCourt = score[serverSide] % 2 === 0 ? "right" : "left";
    var player = format === "doubles" ? courts[serverSide][serveCourt] : 0;
    return {
      score: score,
      finished: finished,
      winner: finished ? (score[0] > score[1] ? 0 : 1) : null,
      server: { side: serverSide, player: player, court: serveCourt },
    };
  }

  function winsNeeded(bestOf) {
    return Math.ceil(bestOf / 2);
  }

  function pointSituation(score, gamesWon, bestOf) {
    var need = winsNeeded(bestOf);
    var marks = [];
    var side;
    for (side = 0; side < 2; side += 1) {
      var next = score.slice();
      next[side] += 1;
      if (!isGameWon(next[0], next[1]) || next[side] < next[1 - side]) continue;
      marks.push({
        side: side,
        kind: gamesWon[side] + 1 >= need ? "match" : "game",
      });
    }
    return marks;
  }

  var api = {
    isGameWon: isGameWon,
    projectGame: projectGame,
    winsNeeded: winsNeeded,
    pointSituation: pointSituation,
  };

  var root = typeof globalThis !== "undefined" ? globalThis : this;
  root.BadmintonRules = api;
})();
