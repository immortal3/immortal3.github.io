(function () {
  var DICT = {}, dictReady = false;
  var PUZZLES = [
    { start: "fold", goal: "gold", moves: 3, pw: "BFB", sol: ["fold", "bold", "sold", "gold"] },
    { start: "cell", goal: "tall", moves: 3, pw: "FBF", sol: ["cell", "fell", "fall", "tall"] },
    { start: "gift", goal: "fist", moves: 3, pw: "FFB", sol: ["gift", "lift", "list", "fist"] },
    { start: "tight", goal: "night", moves: 5, pw: "BBFFF", sol: ["tight", "right", "fight", "light", "might", "night"] }
  ];
  var cur = 0, groups = [], tiles = [];
  var $ = function (id) { return document.getElementById(id); };

  function diffIdx(a, b) {
    if (a.length !== b.length) return -2;
    var idx = -1, n = 0;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) { idx = i; n++; }
    return n === 1 ? idx : -1;
  }
  function fb(a, b, i) { return b.charCodeAt(i) > a.charCodeAt(i) ? "F" : "B"; }

  function chip(w) { var s = document.createElement("span"); s.className = "wmt-chip"; s.textContent = w; return s; }
  function arrow(t) {
    var a = document.createElement("span"); a.className = "wmt-arrow"; a.setAttribute("data-tr", t);
    a.innerHTML = '<span class="a-sym">&rarr;</span><span class="a-fb"></span>'; return a;
  }
  function mkTile() {
    var t = document.createElement("input");
    t.type = "text"; t.className = "wmt-tile"; t.maxLength = 1; t.autocomplete = "off"; t.spellcheck = false;
    t.setAttribute("aria-label", "letter");
    t.addEventListener("input", function () {
      t.value = t.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 1);
      render();
      if (t.value) { var nx = tiles[tiles.indexOf(t) + 1]; if (nx) nx.focus(); }
    });
    t.addEventListener("keydown", function (ev) {
      var i = tiles.indexOf(t);
      if (ev.key === "Backspace" && !t.value) { var pv = tiles[i - 1]; if (pv) { pv.focus(); ev.preventDefault(); } }
      else if (ev.key === "ArrowLeft") { var pv2 = tiles[i - 1]; if (pv2) { pv2.focus(); ev.preventDefault(); } }
      else if (ev.key === "ArrowRight") { var nx2 = tiles[i + 1]; if (nx2) { nx2.focus(); ev.preventDefault(); } }
    });
    return t;
  }

  function buildLine() {
    var p = PUZZLES[cur], wl = p.start.length, line = $("wmt-line");
    line.innerHTML = ""; groups = []; tiles = [];
    line.appendChild(chip(p.start));
    for (var i = 1; i <= p.moves; i++) {
      line.appendChild(arrow(i));
      if (i === p.moves) { line.appendChild(chip(p.goal)); continue; }
      var g = { el: document.createElement("span"), tiles: [] };
      g.el.className = "wmt-word";
      for (var j = 0; j < wl; j++) { var t = mkTile(); g.tiles.push(t); tiles.push(t); g.el.appendChild(t); }
      groups.push(g); line.appendChild(g.el);
    }
    var cells = $("wmt-pwcells"); cells.innerHTML = "";
    for (var m = 0; m < p.moves; m++) { var c = document.createElement("span"); c.className = "wmt-cell"; c.textContent = "·"; cells.appendChild(c); }
  }

  function words() {
    var p = PUZZLES[cur], w = [p.start];
    for (var i = 0; i < groups.length; i++) w.push(groups[i].tiles.map(function (t) { return t.value; }).join(""));
    w.push(p.goal); return w;
  }

  function row(ok, name, detail) {
    var cls = ok ? "ok" : "no", sym = ok ? "✓" : "✕";
    return '<div class="wmt-row"><span class="wmt-ic ' + cls + '">' + sym + '</span><code>' + name +
           '</code>' + (detail ? '<span class="wmt-detail">' + detail + '</span>' : '') + '</div>';
  }

  function render() {
    var p = PUZZLES[cur], wl = p.start.length, w = words();
    groups.forEach(function (g, gi) {
      var i = gi + 1, prev = w[i - 1], val = w[i], complete = val.length === wl;
      g.el.classList.remove("ok", "bad");
      if (complete) g.el.classList.add((!dictReady || DICT[val] === 1) && diffIdx(prev, val) === 1 ? "ok" : "bad");
      g.tiles.forEach(function (t, j) {
        t.classList.toggle("hot", !!(val[j] && prev[j] && val[j] !== prev[j]));
      });
    });
    document.querySelectorAll("#wm-try .wmt-arrow").forEach(function (a) {
      var t = parseInt(a.getAttribute("data-tr"), 10), L = w[t - 1], R = w[t], fbEl = a.querySelector(".a-fb");
      fbEl.classList.remove("bad");
      if (L && R && L.length === wl && R.length === wl) {
        var d = diffIdx(L, R);
        if (d >= 0) { fbEl.textContent = fb(L, R, d); } else { fbEl.textContent = "✕"; fbEl.classList.add("bad"); }
      } else fbEl.textContent = "";
    });
    var cs = $("wmt-pwcells").children;
    for (var j = 0; j < p.moves; j++) {
      var L = w[j], R = w[j + 1], d = (L.length === wl && R.length === wl) ? diffIdx(L, R) : -2;
      if (d >= 0) { cs[j].textContent = fb(L, R, d); cs[j].classList.add("wmt-set"); }
      else { cs[j].textContent = "·"; cs[j].classList.remove("wmt-set"); }
    }
    grade(w, p);
  }

  function grade(path, p) {
    var wl = p.start.length;
    var fmt = path.length >= 2 && path.every(function (x) { return /^[a-z]+$/.test(x) && x.length === path[0].length; });
    var starts = path[0] === p.start, goal = path[path.length - 1] === p.goal;
    var within = (path.length - 1) <= p.moves, exact = (path.length - 1) === p.moves;
    var oneLetter = path.length >= 2, computed = "";
    for (var i = 0; i < path.length - 1; i++) {
      var d = diffIdx(path[i], path[i + 1]);
      if (d < 0) { oneLetter = false; computed = null; break; }
      computed += path[i + 1].charCodeAt(d) > path[i].charCodeAt(d) ? "F" : "B";
    }
    var validWords = !dictReady || path.every(function (x) { return DICT[x] === 1; });
    var lenOk = path.every(function (x) { return x.length === wl; });
    var pwMatch = oneLetter && computed === p.pw;
    var full = fmt && starts && goal && exact && oneLetter && validWords && lenOk && pwMatch;
    $("wmt-verdict").textContent = full ? "✓ solved" : "";
    $("wmt-checks").innerHTML =
      row(fmt, "valid_format") + row(starts, "starts_correctly") + row(goal, "reaches_goal") +
      row(within, "within_max_moves") + row(exact, "exact_moves") + row(oneLetter, "one_letter_changes") +
      row(validWords, "all_valid_words") + row(lenOk, "correct_word_length") +
      row(pwMatch, "password_matches", computed ? "got " + computed : "");
  }

  function setup() {
    var p = PUZZLES[cur];
    $("wmt-moves").textContent = p.moves; $("wmt-pw").textContent = p.pw;
    buildLine(); render();
  }

  $("wmt-reset").addEventListener("click", function () { tiles.forEach(function (t) { t.value = ""; }); render(); if (tiles[0]) tiles[0].focus(); });
  $("wmt-sol").addEventListener("click", function () {
    var s = PUZZLES[cur].sol;
    groups.forEach(function (g, gi) { var word = s[gi + 1]; g.tiles.forEach(function (t, j) { t.value = word[j]; }); });
    render();
  });
  $("wmt-new").addEventListener("click", function () { cur = (cur + 1) % PUZZLES.length; setup(); if (tiles[0]) tiles[0].focus(); });

  setup();

  // load the word list on demand (a wordfreq top-50k english list, 4- and 5-letter words)
  fetch("/static/wordmaze-dict.json")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      Object.keys(d).forEach(function (len) { d[len].forEach(function (w) { DICT[w] = 1; }); });
      dictReady = true; render();
    })
    .catch(function () { /* offline: leave words unchecked rather than wrongly invalid */ });
})();
