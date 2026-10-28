// Tests for Vier in einer Reihe, Mühle and Mau-Mau. Usage: node tests/classictest.js
const path = require("path");
const ZFour = require(path.resolve(__dirname, "../engines/four-engine.js"));
const ZMuehle = require(path.resolve(__dirname, "../engines/muehle-engine.js"));
const ZMau = require(path.resolve(__dirname, "../engines/maumau-engine.js"));
let ok = true;
const check = (name, cond, extra) => { if(!cond){ ok = false; console.log("FAIL", name, extra || ""); } else console.log("PASS", name); };
const play = (E, st, ms) => ms.reduce((s, m) => s && E.apply(s, m), st);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ---------- Vier in einer Reihe ---------- */
let f = play(ZFour, ZFour.newGame(), ["0","1","0","1","0","1","0"]);
check("four: vertical win", ZFour.status(f).winner === "w");
f = play(ZFour, ZFour.newGame(), ["0","6","1","6","2","6","3"]);
check("four: horizontal win", ZFour.status(f).winner === "w");
f = play(ZFour, ZFour.newGame(), ["0","1","1","2","2","3","2","3","3","6","3"]);
check("four: diagonal win", ZFour.status(f).winner === "w");
f = play(ZFour, ZFour.newGame(), ["3","3","3","3","3","3"]);
check("four: full column refused", ZFour.apply(f, "3") === null && !ZFour.moves(f).includes("3"));
check("four: takes a win", ZFour.bestMove(play(ZFour, ZFour.newGame(), ["0","6","1","6","2","5"]), "normal") === "3");
check("four: blocks a win", ZFour.bestMove(play(ZFour, ZFour.newGame(), ["0","6","1","6","5"]), "normal") === "6" ||
  ZFour.bestMove(play(ZFour, ZFour.newGame(), ["6","0","6","1","6"]), "normal") === "6");
{ let st = ZFour.newGame(), n = 0; while(!ZFour.status(st).over && n++ < 50) st = ZFour.apply(st, ZFour.bestMove(st, "easy", rnd));
  check("four: easy vs easy finishes", ZFour.status(st).over); }
{ const t = Date.now(); ZFour.bestMove(ZFour.newGame(), "normal"); check("four: normal move under 3 s", Date.now() - t < 3000, (Date.now() - t) + "ms"); }

/* ---------- Mühle ---------- */
check("muehle: 24 points, 16 mills", ZMuehle.ADJ.length === 24 && ZMuehle.MILLS.length === 16);
check("muehle: corners have 2 neighbours, outer middles 3, middle-ring middles 4", ZMuehle.ADJ[0].length === 2 && ZMuehle.ADJ[1].length === 3 && ZMuehle.ADJ[9].length === 4);
let m = ZMuehle.newGame();
check("muehle: 24 placements at start", ZMuehle.moves(m).length === 24);
m = play(ZMuehle, m, ["p0", "p8", "p1", "p9"]);
const mill = ZMuehle.moves(m).filter(x => x.startsWith("p2x"));
check("muehle: closing a mill must capture", mill.length === 2 && !ZMuehle.moves(m).includes("p2"), mill.join(","));
m = ZMuehle.apply(m, "p2x8");
check("muehle: capture removes piece", m.b[8] === null && m.hand.b === 7);
// protected pieces: black's mill can't be taken while other black pieces exist
const pr = play(ZMuehle, ZMuehle.newGame(), ["p0", "p16", "p1", "p17", "p13", "p18x13", "p5", "p20"]);
const caps = ZMuehle.moves(pr).filter(x => x.startsWith("p2x"));
check("muehle: pieces in a mill are protected", caps.join() === "p2x20", caps.join());
// moving and flying
const mk = (w, b, turn) => { const st = ZMuehle.newGame(); st.hand = { w: 0, b: 0 }; w.forEach(i => st.b[i] = "w"); b.forEach(i => st.b[i] = "b"); st.turn = turn || "w"; return st; };
let mv = mk([0, 9, 12, 20], [4, 5, 22, 6]);
check("muehle: moves go to neighbours", ZMuehle.moves(mv).every(x => { const [a, b2] = x.slice(1).split("x")[0].split("-").map(Number); return ZMuehle.ADJ[a].includes(b2); }));
let fl = mk([0, 9, 20], [4, 5, 22, 6]);
check("muehle: three pieces may fly", ZMuehle.moves(fl).some(x => x.startsWith("m0-") && !ZMuehle.ADJ[0].includes(+x.split("-")[1].split("x")[0])));
check("muehle: fewer than 3 loses", ZMuehle.status(mk([0, 9], [4, 5, 22], "w")).winner === "b");
let blocked = mk([0, 2, 4, 6], [1, 3, 5, 7, 22], "w");
check("muehle: blocked player loses", ZMuehle.status(blocked).winner === "b");
check("muehle: computer captures when it can", /x/.test(ZMuehle.bestMove(play(ZMuehle, ZMuehle.newGame(), ["p0", "p8", "p1", "p9"]), "normal")));
{ let st = ZMuehle.newGame(), n = 0; while(!ZMuehle.status(st).over && n++ < 300) st = ZMuehle.apply(st, ZMuehle.bestMove(st, n % 2 ? "easy" : "normal", rnd));
  check("muehle: computer game ends", ZMuehle.status(st).over, n + " plies"); }

/* ---------- Mau-Mau ---------- */
check("mau: 32 different cards", new Set(ZMau.deck()).size === 32);
let g = ZMau.newGame(42);
check("mau: deal 5 + 5, 1 open, 21 left", g.hands.w.length === 5 && g.hands.b.length === 5 && g.pile.length === 1 && g.stock.length === 21);
check("mau: start card is not 7/8/jack", !["7", "8", "J"].includes(g.pile[0][1]));
check("mau: same seed, same deal", JSON.stringify(ZMau.newGame(42)) === JSON.stringify(g) && JSON.stringify(ZMau.newGame(43)) !== JSON.stringify(g));
const st0 = (hw, hb, topCard, extra) => ({ hands: { w: hw, b: hb }, stock: ["C9", "CT", "CQ", "CK", "CA"], pile: [topCard], turn: "w", wish: null, sevens: 0, drew: false, seed: 5, shuffles: 0, ...(extra || {}) });
let s = st0(["H9", "S9", "DK"], ["C7"], "HQ");
check("mau: same suit or rank fits", ZMau.moves(s).includes("pH9") && !ZMau.moves(s).includes("pS9") && !ZMau.moves(s).includes("pDK") && ZMau.moves(s).includes("d"));
s = ZMau.apply(st0(["H7", "S9"], ["S7", "D9"], "HQ"), "pH7");
check("mau: a 7 makes the next player draw or play a 7", s.sevens === 1 && ZMau.moves(s).join() === "pS7,d");
const s2 = ZMau.apply(s, "pS7");
const s3 = ZMau.apply(s2, "d");
check("mau: 7s add up (draw 4)", s3.hands.w.length === 5 && s3.turn === "b" && s3.sevens === 0, s3.hands.w.join());
s = ZMau.apply(st0(["H8", "H9"], ["S7"], "HQ"), "pH8");
check("mau: 8 skips the other player", s.turn === "w");
s = ZMau.apply(st0(["SJ", "H9"], ["D9"], "HQ"), "pSJ>D");
check("mau: jack wishes a suit", s.wish === "D" && ZMau.moves(s).includes("pD9") && s.turn === "b");
check("mau: no jack on jack", !ZMau.moves(st0(["CJ"], ["D9"], "SJ")).some(x => x.startsWith("pCJ")));
s = ZMau.apply(st0(["S9"], ["D9"], "HQ"), "d");
check("mau: after drawing only the drawn card or pass", s.drew && s.turn === "w" && ZMau.moves(s).every(x => x === "n" || x === "pC9"));
s = ZMau.apply(st0(["H9"], ["D9"], "HQ"), "pH9");
check("mau: empty hand wins", ZMau.status(s).winner === "w");
let rs = st0(["S9"], ["D9"], "HQ", { stock: [], pile: ["C8", "CK", "HQ"] });
rs = ZMau.apply(rs, "d");
check("mau: reshuffles played cards when stock is empty", rs.hands.w.length === 2 && rs.pile.join() === "HQ");
{ let wins = 0;
  for(let i = 1; i <= 200; i++){ let st = ZMau.newGame(i), n = 0;
    while(!ZMau.status(st).over && n++ < 2000) st = ZMau.apply(st, ZMau.bestMove(st, st.turn === "w" ? "normal" : "easy", rnd));
    if(!ZMau.status(st).over){ check("mau: game " + i + " ends", false); break; }
    if(ZMau.status(st).winner === "w") wins++;
    const total = st.hands.w.length + st.hands.b.length + st.stock.length + st.pile.length;
    if(total !== 32){ check("mau: no cards lost in game " + i, false, total); break; } }
  check("mau: 200 computer games end, no cards lost", true);
  check("mau: normal beats easy most of the time (" + wins + "/200)", wins > 100); }

console.log(ok ? "ALL CLASSIC TESTS OK" : "CLASSIC TESTS FAILED");
process.exit(ok ? 0 : 1);
