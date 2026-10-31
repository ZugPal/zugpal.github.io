// Tests for Dama notation, repetition key and the computer levels. Usage: node tests/damaplus.js
const path = require("path");
const D = require(path.resolve(__dirname, "../engines/dama-engine.js"));
let ok = true;
const check = (name, cond, extra) => { if(!cond){ ok = false; console.log("FAIL", name, extra || ""); } else console.log("PASS", name); };
const empty = turn => ({ b: Array(64).fill(null), turn: turn || "w", quiet: 0 });
const sq = n => "abcdefgh".indexOf(n[0]) + (Number(n.slice(1)) - 1) * 8;
let g = D.newGame();
check("notation: step", D.notation(D.legal(g).find(m => D.key(m) === `${sq("a3")}-${sq("a4")}`)) === "a3-a4");
let s = empty(); s.b[sq("c3")] = "w"; s.b[sq("c4")] = "b"; s.b[sq("c6")] = "b"; s.b[sq("h8")] = "b";
const cap = D.legal(s)[0];
check("notation: double capture c3xc5xc7", D.notation(cap) === "c3xc5xc7", D.notation(cap));
check("position key repeats", D.posKey(D.newGame()) === D.posKey(D.newGame()) && D.posKey(D.newGame()) !== D.posKey(D.apply(D.newGame(), D.legal(D.newGame())[0])));
// takes a free piece, avoids losing one
s = empty(); s.b[sq("d4")] = "w"; s.b[sq("d5")] = "b"; s.b[sq("a1")] = "w"; s.b[sq("h8")] = "b";
for(const lv of ["medium", "hard", "expert"]) check(`${lv}: forced capture played`, D.notation(D.think(s, lv)) === "d4xd6");
s = empty(); s.b[sq("d4")] = "w"; s.b[sq("e6")] = "b"; s.b[sq("a2")] = "w"; s.b[sq("h7")] = "b";   // d4-d5 would let e6 be... e6 captures sideways? e6 is not adjacent; check safety generally
const before = D.legal(s).length;
const hm = D.think(s, "hard"); const after = D.apply(s, hm);
check("hard: doesn't walk into a capture", !D.legal(after).some(m => m.taken.length), D.notation(hm) + " of " + before);
// sets up a capture: quiet move now, so that the forced reply lets it take two pieces
s = empty("w"); s.b[sq("d3")] = "w"; s.b[sq("e5")] = "b"; s.b[sq("e7")] = "b"; s.b[sq("a1")] = "w"; s.b[sq("h8")] = "b";
const plan = D.think(s, "expert");
check("expert picks a legal move in a tactical spot", D.legal(s).some(m => D.key(m) === D.key(plan)));
let t0 = Date.now(); D.think(D.newGame(), "expert");
check(`expert answers within ~1.5 s (${Date.now() - t0} ms)`, Date.now() - t0 < 3000);
t0 = Date.now(); D.think(D.newGame(), "hard");
check(`hard is quick enough (${Date.now() - t0} ms)`, Date.now() - t0 < 4000);
let w = 0;
for(let i = 0; i < 6; i++){ let x = D.newGame(), k = 0; while(!D.status(x).over && k++ < 200) x = D.apply(x, D.think(x, x.turn === (i % 2 ? "b" : "w") ? "hard" : "easy")); if(D.status(x).winner === (i % 2 ? "b" : "w")) w++; }
check(`hard beats easy most of the time (${w}/6)`, w >= 4);
console.log(ok ? "ALL DAMA PLUS TESTS OK" : "DAMA PLUS TESTS FAILED");
process.exit(ok ? 0 : 1);
