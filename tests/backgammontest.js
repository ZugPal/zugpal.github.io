// Tests for engines/backgammon-engine.js. Usage: node tests/backgammontest.js
const path = require("path");
const B = require(path.resolve(__dirname, "../engines/backgammon-engine.js"));
let ok = true;
const check = (name, cond, extra) => { if(!cond){ ok = false; console.log("FAIL", name, extra || ""); } else console.log("PASS", name); };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const empty = (turn, dice) => { const st = B.newGame(1); st.b = Array(25).fill(0); st.bar = { w: 0, b: 0 }; st.off = { w: 0, b: 0 }; st.turn = turn || "w"; st.dice = dice; return st; };

let g = B.newGame(5);
check("start: 15 checkers each, 167 pips", g.b.reduce((s, v) => s + Math.max(0, v), 0) === 15 && -g.b.reduce((s, v) => s + Math.min(0, v), 0) === 15 && B.pips(g, "w") === 167 && B.pips(g, "b") === 167);
check("same seed, same dice", JSON.stringify(B.roll(42, 3)) === JSON.stringify(B.roll(42, 3)) && B.newGame(9).dice.every(d => d >= 1 && d <= 6));
g.dice = [3, 1];
check("opening 3-1 can make the 5 point", B.moves(g).includes("8/5,6/5") || B.moves(g).includes("6/5,8/5"), B.moves(g).slice(0, 5).join(" "));
g.dice = [6, 6];
check("doubles give four moves", B.moves(g).every(m => m.split(",").length === 4));

// must use both dice when possible
let s = empty("w", [6, 1]); s.b[8] = 1; s.b[2] = -2;   // 8/2 blocked, but 8/7/1 works
check("uses both dice if possible", B.moves(s).every(m => m.split(",").length === 2), B.moves(s).join(" "));
// only one die playable -> must play the larger one
s = empty("w", [5, 2]); s.b[10] = 1; s.b[3] = -2; s.b[8] = -2; s.b[1] = -2;   // 10/5 ok then 5/3 blocked; 10/8 blocked
check("only one die: the larger is played", B.moves(s).join() === "10/5", B.moves(s).join(" "));
// bar first
s = empty("w", [3, 4]); s.bar.w = 1; s.b[13] = 5; s.b[22] = -2;   // 25-3=22 blocked, 25-4=21 ok
check("must enter from the bar first", B.moves(s).every(m => m.startsWith("bar/21")), B.moves(s).join(" "));
s = empty("w", [3, 3]); s.bar.w = 1; s.b[22] = -2; s.b[13] = 2;
check("blocked on the bar: pass", B.moves(s).join() === "pass" && B.apply(s, "pass").turn === "b");
// hitting a blot
s = empty("w", [2, 1]); s.b[13] = 2; s.b[11] = -1; s.b[24] = -2;
const hit = B.moves(s).find(m => m.includes("13/11*"));
check("hits a blot", !!hit && B.apply(s, hit).bar.b === 1, B.moves(s).join(" "));
// bearing off
s = empty("w", [6, 5]); s.b[3] = 1; s.b[2] = 1; s.off.w = 13;
const end = B.apply(s, B.moves(s)[0]);
check("bear off with higher dice and win", B.status(end).winner === "w", B.moves(s).join(" "));
s = empty("w", [6, 1]); s.b[13] = 1; s.b[3] = 14;
check("no bearing off before all are home", !B.moves(s).some(m => m.includes("off")));
// black moves the other way
s = empty("b", [2, 1]); s.b[1] = -1;
check("black moves upwards", B.moves(s).some(m => m === "1/3,3/4" || m === "1/2,2/4"), B.moves(s).join(" "));
// full games end, checkers never lost
let wins = 0;
for(let i = 1; i <= 60; i++){
  let st = B.newGame(i), n = 0;
  while(!B.status(st).over && n++ < 2000){ const m = B.bestMove(st, st.turn === "w" ? "normal" : "easy", rnd); const nx = B.apply(st, m); if(!nx){ check("legal computer move", false, m); break; } st = nx; }
  const tot = p => (p === "w" ? st.b.reduce((a, v) => a + Math.max(0, v), 0) : -st.b.reduce((a, v) => a + Math.min(0, v), 0)) + st.bar[p] + st.off[p];
  if(!B.status(st).over || tot("w") !== 15 || tot("b") !== 15){ check("game " + i + " ends with 15+15 checkers", false, tot("w") + "/" + tot("b")); break; }
  if(B.status(st).winner === "w") wins++;
}
check("60 computer games end correctly", true);
check(`normal beats easy most of the time (${wins}/60)`, wins >= 40);
console.log(ok ? "ALL BACKGAMMON TESTS OK" : "BACKGAMMON TESTS FAILED");
process.exit(ok ? 0 : 1);
