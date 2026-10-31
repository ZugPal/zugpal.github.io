// Tests for chess notation, repetition key and the computer levels. Usage: node tests/chessplus.js
const path = require("path");
const C = require(path.resolve(__dirname, "../engines/chess-engine.js"));
let ok = true;
const check = (name, cond, extra) => { if(!cond){ ok = false; console.log("FAIL", name, extra || ""); } else console.log("PASS", name); };
const play = (st, list) => list.reduce((s, u) => C.apply(s, C.fromUci(s, u)), st);
const sanOf = (st, u) => C.san(st, C.fromUci(st, u));
let g = C.newGame();
check("san: e4, Nf3", sanOf(g, "e2e4") === "e4" && sanOf(g, "g1f3") === "Nf3");
g = play(C.newGame(), ["e2e4", "d7d5"]);
check("san: pawn capture exd5", sanOf(g, "e4d5") === "exd5");
g = C.fromFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
check("san: castling", sanOf(g, "e1g1") === "O-O" && sanOf(g, "e1c1") === "O-O-O");
g = C.fromFen("8/4P3/8/8/8/8/k7/4K3 w - - 0 1");
check("san: promotion", sanOf(g, "e7e8q") === "e8=Q" && sanOf(g, "e7e8n") === "e8=N");
g = C.fromFen("4k3/8/8/8/8/8/8/1N1NK3 w - - 0 1");
check("san: knights on b1 and d1 to c3 -> Nbc3", sanOf(g, "b1c3") === "Nbc3" && sanOf(g, "d1c3") === "Ndc3");
g = C.fromFen("4k3/8/8/8/R7/8/8/R3K3 w - - 0 1");
check("san: rooks on a1 and a4 to a2 -> R1a2", sanOf(g, "a1a2") === "R1a2", sanOf(g, "a1a2"));
g = C.fromFen("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1");
check("san: mate sign", sanOf(g, "a1a8") === "Ra8#");
g = C.fromFen("4k3/8/8/8/8/8/8/R3K3 w - - 0 1");
check("san: check sign", sanOf(g, "a1a8") === "Ra8+");
const a = play(C.newGame(), ["g1f3", "g8f6", "f3g1", "f6g8"]);
check("repetition key: same position, same key", C.key(a) === C.key(C.newGame()));
for(const level of ["medium", "hard", "expert"]){
  const t = Date.now(), m = C.think(C.fromFen("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1"), level);
  check(`${level}: finds mate in one (${Date.now() - t} ms)`, C.uci(m) === "a1a8");
}
const hang = C.fromFen("rnb1kbnr/pppp1ppp/8/4p3/3qP3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 0 1");   // black queen attacked by nothing yet; just check no blunder of the queen
const hm = C.think(hang, "hard"); const after = C.apply(hang, hm);
const qLost = C.legal(after).some(m => m.capture && after.b[m.to] === "bQ");
check("hard: doesn't leave its queen hanging", !qLost, C.uci(hm));
const take = C.fromFen("4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1");
check("hard: takes a free queen", C.uci(C.think(take, "hard")) === "d2d5");
let t0 = Date.now(); C.think(C.newGame(), "expert");
check(`expert answers within ~2 s (${Date.now() - t0} ms)`, Date.now() - t0 < 3500);
t0 = Date.now(); C.think(C.fromFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1"), "hard");
check(`hard in a busy position is quick enough (${Date.now() - t0} ms)`, Date.now() - t0 < 4000);
// levels play legal games to the end
let st = C.newGame(), n = 0;
while(!C.status(st).over && n++ < 120){ const m = C.think(st, n % 2 ? "easy" : "medium"); st = C.apply(st, m); }
check("easy vs medium plays legal moves", n > 10);
console.log(ok ? "ALL CHESS PLUS TESTS OK" : "CHESS PLUS TESTS FAILED");
process.exit(ok ? 0 : 1);
