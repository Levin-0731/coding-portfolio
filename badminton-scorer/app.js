(function () {
  var KEY = "badminton-scorer-v1";
  var R = BadmintonRules;
  var timer = 0;
  var state = {
    screen: "home",
    draft: blankDraft(),
    live: null,
    summary: null,
    history: [],
  };

  function blankDraft() {
    return {
      format: "singles",
      bestOf: 3,
      a0: "",
      a1: "",
      b0: "",
      b1: "",
      serverSide: 0,
      serverPlayer: 0,
      receiverPlayer: 0,
    };
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    }).replace(/\n/g, "&#10;");
  }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      state.history = Array.isArray(raw.history) ? raw.history : [];
      state.live = raw.live || null;
      if (state.live) state.screen = "live";
    } catch (err) {
      state.history = [];
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify({
      history: state.history.slice(0, 50),
      live: state.live,
    }));
  }

  function namesOf(draft) {
    var singles = draft.format === "singles";
    var a = [draft.a0.trim() || (singles ? "选手 A" : "选手 A1")];
    var b = [draft.b0.trim() || (singles ? "选手 B" : "选手 B1")];
    if (!singles) {
      a.push(draft.a1.trim() || "选手 A2");
      b.push(draft.b1.trim() || "选手 B2");
    }
    return [a, b];
  }

  function sideLabel(sides, index) {
    return sides[index].players.join(" / ");
  }

  function currentGame(live) {
    return live.games[live.games.length - 1];
  }

  function projected(live, game) {
    return R.projectGame(game, live.format);
  }

  function gamesWon(live) {
    var won = [0, 0];
    live.games.forEach(function (game) {
      var view = projected(live, game);
      if (view.finished) won[view.winner] += 1;
    });
    return won;
  }

  function swapCount(live) {
    var last = currentGame(live);
    var lastDone = projected(live, last).finished;
    var finished = 0;
    live.games.forEach(function (game) {
      if (projected(live, game).finished) finished += 1;
    });
    var mid = !lastDone && last.endsSeen ? 1 : 0;
    return finished + mid + live.manualSwaps;
  }

  function refreshFlags(live, game) {
    var score = projected(live, game).score;
    if (Math.max(score[0], score[1]) < 11) {
      game.intervalSeen = false;
      game.endsSeen = false;
    }
  }

  function newGame(serverSide, rightPlayers) {
    return {
      serverSide: serverSide,
      rightPlayers: rightPlayers.slice(),
      events: [],
      intervalSeen: false,
      endsSeen: false,
    };
  }

  function startMatch() {
    var draft = state.draft;
    var people = namesOf(draft);
    var rightPlayers = [0, 0];
    rightPlayers[draft.serverSide] = draft.serverPlayer;
    rightPlayers[1 - draft.serverSide] = draft.receiverPlayer;
    state.live = {
      id: Date.now().toString(36),
      startedAt: Date.now(),
      format: draft.format,
      bestOf: draft.bestOf,
      sides: [{ players: people[0] }, { players: people[1] }],
      manualSwaps: 0,
      games: [newGame(draft.serverSide, rightPlayers)],
      rest: null,
      next: null,
    };
    state.screen = "live";
    save();
    paint();
  }

  function archive(abandoned) {
    var live = state.live;
    var won = gamesWon(live);
    var need = R.winsNeeded(live.bestOf);
    var winner = null;
    if (won[0] >= need) winner = 0;
    else if (won[1] >= need) winner = 1;
    var summary = {
      id: live.id,
      startedAt: live.startedAt,
      endedAt: Date.now(),
      format: live.format,
      bestOf: live.bestOf,
      sides: live.sides,
      winner: winner,
      abandoned: Boolean(abandoned) && winner === null,
      games: live.games.map(function (game) {
        return projected(live, game).score.slice();
      }),
    };
    state.history = [summary].concat(state.history.filter(function (item) {
      return item.id !== summary.id;
    })).slice(0, 50);
    state.summary = summary;
    state.live = null;
    state.screen = "summary";
    save();
    paint();
  }

  function addPoint(side) {
    var live = state.live;
    if (!live || live.rest) return;
    var game = currentGame(live);
    var before = projected(live, game);
    if (before.finished) return;
    game.events.push(side);
    var after = projected(live, game);
    if (after.finished) {
      var won = gamesWon(live);
      var need = R.winsNeeded(live.bestOf);
      if (won[0] >= need || won[1] >= need) {
        archive(false);
        return;
      }
      live.rest = { kind: "between", endsAt: Date.now() + 120000 };
      live.next = { serverSide: after.winner, rightPlayers: [0, 0] };
      save();
      paint();
      return;
    }
    var maxScore = Math.max(after.score[0], after.score[1]);
    if (!game.intervalSeen && maxScore >= 11) {
      game.intervalSeen = true;
      var deciding = live.games.length === live.bestOf || live.bestOf === 1;
      var kind = "interval";
      if (deciding && !game.endsSeen) {
        game.endsSeen = true;
        kind = "interval-ends";
      }
      live.rest = { kind: kind, endsAt: Date.now() + 60000 };
    }
    save();
    paint();
  }

  function undo() {
    var live = state.live;
    if (!live) return;
    if (live.rest && live.rest.kind === "between") {
      live.rest = null;
      live.next = null;
    }
    var game = currentGame(live);
    if (!game.events.length) {
      if (live.games.length === 1) return;
      live.games.pop();
      game = currentGame(live);
    }
    if (!game.events.length) return;
    game.events.pop();
    if (live.rest && live.rest.kind !== "between") live.rest = null;
    refreshFlags(live, game);
    save();
    paint();
  }

  function continueRest() {
    var live = state.live;
    if (!live || !live.rest) return;
    if (live.rest.kind === "between") {
      live.games.push(newGame(live.next.serverSide, live.next.rightPlayers));
      live.next = null;
    }
    live.rest = null;
    save();
    paint();
  }

  function clock(endsAt) {
    var left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    var min = String(Math.floor(left / 60)).padStart(2, "0");
    var sec = String(left % 60).padStart(2, "0");
    return min + ":" + sec;
  }

  function choice(act, value, current, label) {
    var on = String(current) === String(value);
    return '<button type="button" class="choice" data-act="' + act + '" data-value="' + value + '" aria-pressed="' + on + '">' + esc(label) + "</button>";
  }

  function renderHome() {
    var items = state.history.map(function (item) {
      var when = new Date(item.endedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
      var title = sideLabel(item.sides, 0) + " 对 " + sideLabel(item.sides, 1);
      var line = item.games.map(function (score) { return score[0] + "-" + score[1]; }).join("，");
      var result = item.winner === null ? "未完成" : sideLabel(item.sides, item.winner) + " 胜";
      return '<button type="button" class="match" data-act="open" data-id="' + esc(item.id) + '"><span><strong>' + esc(title) + "</strong><br><span class=\"muted nums\">" + esc(line) + " · " + esc(result) + '</span></span><span class="muted nums">' + esc(when) + "</span></button>";
    }).join("");
    var list = items
      ? '<div class="list">' + items + "</div>"
      : "<p>还没有比赛。记一场单打或双打，比分、发球区和局点会按规则自动算。</p>";
    return '<div class="narrow stack"><p class="kicker">羽毛球</p><h1>计分</h1>' + list + '<div><button type="button" class="btn primary" data-act="setup">开始一场</button></div></div>';
  }

  function renderSetup() {
    var d = state.draft;
    var doubles = d.format === "doubles";
    var people = namesOf(d);
    var serverButtons = people[d.serverSide].map(function (name, index) {
      return choice("server-player", index, d.serverPlayer, name);
    }).join("");
    var receiverButtons = doubles ? people[1 - d.serverSide].map(function (name, index) {
      return choice("receiver-player", index, d.receiverPlayer, name);
    }).join("") : "";
    return '<div class="narrow stack"><button type="button" class="btn" data-act="home">返回</button><h1>新比赛</h1>'
      + '<div class="row" role="group" aria-label="项目">' + choice("format", "singles", d.format, "单打") + choice("format", "doubles", d.format, "双打") + "</div>"
      + '<div class="row" role="group" aria-label="赛制">' + choice("best", 1, d.bestOf, "一局定胜负") + choice("best", 3, d.bestOf, "三局两胜") + choice("best", 5, d.bestOf, "五局三胜") + "</div>"
      + "<label>一方<input data-field=\"a0\" type=\"text\" value=\"" + esc(d.a0) + "\" placeholder=\"" + (doubles ? "选手 A1" : "选手 A") + "\"></label>"
      + (doubles ? "<label>一方搭档<input data-field=\"a1\" type=\"text\" value=\"" + esc(d.a1) + '" placeholder="选手 A2"></label>' : "")
      + "<label>另一方<input data-field=\"b0\" type=\"text\" value=\"" + esc(d.b0) + "\" placeholder=\"" + (doubles ? "选手 B1" : "选手 B") + "\"></label>"
      + (doubles ? "<label>另一方搭档<input data-field=\"b1\" type=\"text\" value=\"" + esc(d.b1) + '" placeholder="选手 B2"></label>' : "")
      + "<p class=\"kicker\">谁先发球</p><div class=\"row\">" + choice("server-side", 0, d.serverSide, people[0][0]) + choice("server-side", 1, d.serverSide, people[1][0]) + "</div>"
      + (doubles ? "<p class=\"kicker\">发球人</p><div class=\"row\">" + serverButtons + "</div><p class=\"kicker\">接发人，开局站右区</p><div class=\"row\">" + receiverButtons + "</div>" : "")
      + '<div><button type="button" class="btn primary" data-act="start">开始</button></div></div>';
  }

  function renderSide(live, view, side, rest) {
    var serving = view.server.side === side;
    var serverPlayer = serving ? view.server.player : -1;
    var marks = "";
    if (!view.finished) {
      var completed = gamesWon(live);
      R.pointSituation(view.score, completed, live.bestOf).forEach(function (mark) {
        if (mark.side === side) marks = mark.kind === "match" ? "赛点" : "局点";
      });
    }
    var names = live.sides[side].players.map(function (name, index) {
      var cls = index === serverPlayer ? "serve-name" : "";
      return '<span class="' + cls + '">' + esc(name) + "</span>";
    }).join("");
    var court = serving && !view.finished ? (view.server.court === "right" ? "右区发球" : "左区发球") : "";
    var tag = [marks, court].filter(Boolean).join(" · ");
    return '<button type="button" class="side' + (serving ? " is-server" : "") + '" data-act="add" data-side="' + side + '"'
      + (rest ? " disabled" : "")
      + ' aria-label="给' + esc(sideLabel(live.sides, side)) + "加一分，当前 " + view.score[side] + ' 分">'
      + '<span class="players">' + names + "</span>"
      + '<span class="mark">' + esc(tag) + "</span>"
      + '<span class="score nums">' + view.score[side] + "</span></button>";
  }

  function renderRest(live) {
    var rest = live.rest;
    var title = "11 分技术暂停";
    var detail = "60 秒后继续";
    if (rest.kind === "interval-ends") {
      title = "11 分，双方交换场地";
      detail = "暂停 60 秒，换边后继续";
    }
    if (rest.kind === "between") {
      var done = projected(live, currentGame(live));
      title = sideLabel(live.sides, done.winner) + " 拿下本局";
      detail = "局间休息 120 秒，下一局交换场地";
    }
    var picker = "";
    if (rest.kind === "between") {
      var next = live.next;
      var a = sideLabel(live.sides, 0);
      var b = sideLabel(live.sides, 1);
      picker = '<p class="kicker">下一局谁发球</p><div class="row">'
        + choice("next-side", 0, next.serverSide, a) + choice("next-side", 1, next.serverSide, b) + "</div>";
      if (live.format === "doubles") {
        var servers = live.sides[next.serverSide].players.map(function (name, index) {
          return choice("next-server", index, next.rightPlayers[next.serverSide], name);
        }).join("");
        var other = 1 - next.serverSide;
        var receivers = live.sides[other].players.map(function (name, index) {
          return choice("next-receiver", index, next.rightPlayers[other], name);
        }).join("");
        picker += '<p class="kicker">发球人</p><div class="row">' + servers + '</div><p class="kicker">接发人，开局站右区</p><div class="row">' + receivers + "</div>";
      }
    }
    return '<section class="banner"><p class="kicker">' + esc(detail) + "</p><h1>" + esc(title) + '</h1><p class="clock nums">' + clock(rest.endsAt) + '</p>' + picker + '<div><button type="button" class="btn primary" data-act="continue">继续</button></div></section>';
  }

  function renderLive() {
    var live = state.live;
    var game = currentGame(live);
    var view = projected(live, game);
    var flip = swapCount(live) % 2 === 1;
    var order = flip ? [1, 0] : [0, 1];
    var best = { 1: "一局定胜负", 3: "三局两胜", 5: "五局三胜" }[live.bestOf];
    var prev = live.games.slice(0, -1).map(function (item) {
      var score = projected(live, item).score;
      return score[0] + "-" + score[1];
    }).join("  ");
    var rest = live.rest ? renderRest(live) : "";
    return '<div class="head"><div><p class="kicker">第 ' + live.games.length + " 局 · " + best + "</p><h1>" + esc(sideLabel(live.sides, 0)) + " 对 " + esc(sideLabel(live.sides, 1)) + '</h1><p class="muted nums">' + esc(prev) + "</p></div></div>"
      + '<div class="court" aria-live="polite">' + renderSide(live, view, order[0], Boolean(live.rest)) + renderSide(live, view, order[1], Boolean(live.rest)) + "</div>"
      + rest
      + '<div class="bar"><button type="button" class="btn" data-act="undo">撤销</button><button type="button" class="btn" data-act="swap">交换场地</button><button type="button" class="btn" data-act="end">结束</button></div>';
  }

  function renderSummary() {
    var item = state.summary;
    var title = item.winner === null ? "比赛结束" : sideLabel(item.sides, item.winner) + " 胜";
    var line = item.games.map(function (score) { return score[0] + "-" + score[1]; }).join("，");
    var minutes = Math.round((item.endedAt - item.startedAt) / 60000);
    var timeLabel = minutes < 1 ? "不到 1 分钟" : minutes + " 分钟";
    var text = sideLabel(item.sides, 0) + " 对 " + sideLabel(item.sides, 1) + "\n" + line + "\n" + title;
    return '<div class="narrow stack"><button type="button" class="btn" data-act="home">返回</button><p class="kicker">' + (item.format === "doubles" ? "双打" : "单打") + " · " + timeLabel + '</p><h1>' + esc(title) + '</h1><p class="nums">' + esc(line) + '</p><div class="row"><button type="button" class="btn" data-act="copy" data-text="' + esc(text) + '">复制比分</button><button type="button" class="btn primary" data-act="setup">再记一场</button></div></div>';
  }

  function render() {
    if (state.screen === "setup") return renderSetup();
    if (state.screen === "live" && state.live) return renderLive();
    if (state.screen === "summary" && state.summary) return renderSummary();
    return renderHome();
  }

  function paint() {
    clearInterval(timer);
    document.getElementById("app").innerHTML = render();
    if (state.live && state.live.rest) timer = setInterval(paint, 1000);
  }

  function onClick(event) {
    var el = event.target.closest("[data-act]");
    if (!el) return;
    var act = el.dataset.act;
    if (act === "home") {
      state.screen = "home";
      paint();
    } else if (act === "setup") {
      state.screen = "setup";
      paint();
    } else if (act === "format") {
      state.draft.format = el.dataset.value;
      state.draft.serverPlayer = 0;
      state.draft.receiverPlayer = 0;
      paint();
    } else if (act === "best") {
      state.draft.bestOf = Number(el.dataset.value);
      paint();
    } else if (act === "server-side") {
      state.draft.serverSide = Number(el.dataset.value);
      state.draft.serverPlayer = 0;
      state.draft.receiverPlayer = 0;
      paint();
    } else if (act === "server-player") {
      state.draft.serverPlayer = Number(el.dataset.value);
      paint();
    } else if (act === "receiver-player") {
      state.draft.receiverPlayer = Number(el.dataset.value);
      paint();
    } else if (act === "start") {
      startMatch();
    } else if (act === "add") {
      addPoint(Number(el.dataset.side));
    } else if (act === "undo") {
      undo();
    } else if (act === "swap") {
      state.live.manualSwaps += 1;
      save();
      paint();
    } else if (act === "continue") {
      continueRest();
    } else if (act === "next-side") {
      state.live.next.serverSide = Number(el.dataset.value);
      save();
      paint();
    } else if (act === "next-server") {
      state.live.next.rightPlayers[state.live.next.serverSide] = Number(el.dataset.value);
      save();
      paint();
    } else if (act === "next-receiver") {
      var other = 1 - state.live.next.serverSide;
      state.live.next.rightPlayers[other] = Number(el.dataset.value);
      save();
      paint();
    } else if (act === "end") {
      if (window.confirm("结束这场比赛？当前比分会记入历史。")) archive(true);
    } else if (act === "open") {
      state.summary = state.history.find(function (item) { return item.id === el.dataset.id; });
      state.screen = "summary";
      paint();
    } else if (act === "copy") {
      var text = el.dataset.text;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          el.textContent = "已复制";
        }, function () {
          window.prompt("复制这段比分", text);
        });
      } else {
        window.prompt("复制这段比分", text);
      }
    }
  }

  function onInput(event) {
    var field = event.target.dataset.field;
    if (!field) return;
    state.draft[field] = event.target.value;
    if (state.screen !== "setup") return;
    var caret = event.target.selectionStart;
    paint();
    var next = document.querySelector('[data-field="' + field + '"]');
    if (!next) return;
    next.focus();
    if (caret !== null) next.setSelectionRange(caret, caret);
  }

  function onKey(event) {
    if (state.screen !== "live" || !state.live || state.live.rest) return;
    if (event.target.closest("input, textarea")) return;
    var flip = swapCount(state.live) % 2 === 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") event.preventDefault();
    if (event.key === "ArrowLeft") addPoint(flip ? 1 : 0);
    if (event.key === "ArrowRight") addPoint(flip ? 0 : 1);
    if (event.key === "Backspace") {
      event.preventDefault();
      undo();
    }
  }

  document.getElementById("app").addEventListener("click", onClick);
  document.getElementById("app").addEventListener("input", onInput);
  document.addEventListener("keydown", onKey);
  load();
  paint();
})();
