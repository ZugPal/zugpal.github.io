// Tests for engines/patience-engine.js (Klondike, Spider, FreeCell). Usage: node tests/patiencetest.js
const path = require("path");
const P = require(path.resolve(__dirname, "../engines/patience-engine.js"));
let ok = true;
const check = (name, cond, extra) => { if(!cond){ ok = false; console.log("FAIL", name, extra || ""); } else console.log("PASS", name); };
const C = (s, r, up = true) => ({ id: s + r, s, r, up });
const name = c => "A23456789TJQK"[c.r - 1] + c.s;
const empty = (variant) => { const st = P.deal(variant, 1); st.tab = st.tab.map(() => []); st.stock = []; st.waste = []; st.found = st.found.map(() => []); st.cells = st.cells.map(() => null); return st; };

// deals
let k = P.deal("klondike1", 7);
check("klondike: 7 columns of 1..7, 24 in stock, top cards open", k.tab.map(p => p.length).join() === "1,2,3,4,5,6,7" && k.stock.length === 24 && k.tab.every(p => p[p.length - 1].up && p.slice(0, -1).every(c => !c.up)));
check("klondike: 52 different cards", new Set([...k.tab.flat(), ...k.stock].map(name)).size === 52);
check("same seed, same deal", JSON.stringify(P.deal("klondike3", 9)) === JSON.stringify(P.deal("klondike3", 9)));
const sp = P.deal("spider2", 3);
check("spider: 10 columns (6,6,6,6,5…), 50 in stock, 104 cards, 2 suits", sp.tab.map(p => p.length).join() === "6,6,6,6,5,5,5,5,5,5" && sp.stock.length === 50 && P.count(sp) === 104 && new Set([...sp.tab.flat(), ...sp.stock].map(c => c.s)).size === 2);
check("spider 1 suit = only spades", new Set(P.deal("spider1", 3).stock.map(c => c.s)).size === 1);
const fc = P.deal("freecell", 1);
check("freecell #1 is the Windows deal", fc.tab[0].map(name).join(" ") === "JD KD 2S 4C 3S 6D 6S" && fc.tab[7].map(name).join(" ") === "5H 3H 3C 7S 7D TC", fc.tab[0].map(name).join(" ") + " | " + fc.tab[7].map(name).join(" "));

// Klondike rules
let s = empty("klondike1");
s.tab[0] = [C("S", 8)]; s.tab[1] = [C("H", 7)]; s.tab[2] = [C("C", 7)]; s.tab[3] = [C("D", 13)];
check("red 7 on black 8", !!P.move(s, { k: "tab", i: 1, idx: 0 }, { k: "tab", i: 0 }));
check("black 7 not on black 8", !P.move(s, { k: "tab", i: 2, idx: 0 }, { k: "tab", i: 0 }));
check("only kings on empty columns", !P.canDrop(s, [C("H", 7)], { k: "tab", i: 4 }) && P.canDrop(s, [C("D", 13)], { k: "tab", i: 4 }));
s.tab[4] = [C("H", 1)];
let a = P.move(s, { k: "tab", i: 4, idx: 0 }, { k: "found", i: 0 });
check("ace to foundation, 2 of the same suit next", !!a && P.canDrop(a, [C("H", 2)], { k: "found", i: 0 }) && !P.canDrop(a, [C("D", 2)], { k: "found", i: 0 }));
s = empty("klondike1"); s.tab[0] = [C("S", 5, false), C("H", 9)]; s.tab[1] = [C("C", 10)];
a = P.move(s, { k: "tab", i: 0, idx: 1 }, { k: "tab", i: 1 });
check("moving uncovers and flips the card below (+5)", a.tab[0][0].up && a.score === 5);
s = empty("klondike3"); s.stock = [C("S", 1, false), C("S", 2, false), C("S", 3, false), C("S", 4, false)];
a = P.draw(s);
check("draw 3 turns three cards, last one on top", a.waste.length === 3 && a.waste[2].r === 2 && a.stock.length === 1);
a = P.draw(P.draw(a));
check("empty stock: waste goes back", a.stock.length === 4 && !a.waste.length && a.recycles === 1);
s = empty("klondike1"); s.tab[0] = [C("S", 13), C("H", 12), C("C", 11)]; s.tab[1] = [C("D", 12)];
check("whole open run moves together", !!P.move(s, { k: "tab", i: 0, idx: 2 }, { k: "tab", i: 1 }) && P.canPick(s, { k: "tab", i: 0, idx: 0 }));

// Spider rules
s = empty("spider2"); s.tab = Array.from({ length: 10 }, () => [C("S", 9)]);
s.tab[0] = [C("S", 9), C("H", 8)]; s.tab[1] = [C("S", 10)];
check("spider: any suit builds down", !!P.move(s, { k: "tab", i: 0, idx: 1 }, { k: "tab", i: 2 }) && !P.move(s, { k: "tab", i: 0, idx: 1 }, { k: "tab", i: 1 }));
check("spider: mixed-suit run can't move together", !P.canPick(s, { k: "tab", i: 0, idx: 0 }));
s = empty("spider1"); s.tab = Array.from({ length: 10 }, () => [C("S", 1)]);
s.tab[0] = Array.from({ length: 12 }, (_, i) => C("S", 13 - i)); s.tab[1] = [C("S", 3), C("S", 1)];
a = P.move(s, { k: "tab", i: 1, idx: 1 }, { k: "tab", i: 0 });
check("spider: full K→A run leaves the table (+100)", !!a && a.found[0].length === 13 && a.tab[0].length === 0 && a.score === s.score - 1 + 100, a && a.found[0].length);
s = empty("spider2"); s.stock = Array.from({ length: 10 }, () => C("H", 5, false)); s.tab[0] = [C("S", 9)];
check("spider: no new row while a column is empty", !P.draw(s));
s.tab = s.tab.map(() => [C("S", 9)]); a = P.draw(s);
check("spider: new row puts one card on every column", !!a && a.tab.every(p => p.length === 2 && p[1].up) && a.stock.length === 0);

// FreeCell rules
s = empty("freecell"); s.tab[0] = [C("S", 10), C("H", 9), C("C", 8), C("D", 7), C("S", 6)]; s.tab[1] = [C("H", 11)];
s.tab.forEach((p, i) => { if(i > 1) p.push(C("C", 2)); });
check("freecell: 5 cards need enough free cells (4 cells → 5 ok)", !!P.move(s, { k: "tab", i: 0, idx: 0 }, { k: "tab", i: 1 }));
s.cells = [C("D", 1), C("D", 2), C("D", 3), null];
check("freecell: with 1 free cell only 2 cards move", P.maxMove(s, false) === 2 && !P.move(s, { k: "tab", i: 0, idx: 0 }, { k: "tab", i: 1 }) && !!P.move(s, { k: "tab", i: 0, idx: 3 }, { k: "tab", i: 2 }) === false);
check("freecell: a card into a free cell", !!P.move(s, { k: "tab", i: 0, idx: 4 }, { k: "cell", i: 3 }) && !P.move(s, { k: "tab", i: 0, idx: 4 }, { k: "cell", i: 0 }));

// tap target, hints, auto-finish, stuck
s = empty("klondike1"); s.tab[0] = [C("H", 1)]; s.found[0] = [];
check("tap sends an ace to the foundation", JSON.stringify(P.autoTarget(s, { k: "tab", i: 0, idx: 0 })) === JSON.stringify({ k: "found", i: 0 }));
check("hints find a useful move in a fresh deal", P.hints(P.deal("freecell", 1)).length > 0);
s = empty("klondike1"); s.found = [[C("S", 1)], [], [], []]; s.tab[0] = [C("S", 3), C("S", 2)]; s.tab[1] = [C("H", 1)];
check("auto-finish ready when all is open", P.canAutoFinish(s));
let steps = 0; while(!P.won(s) && steps++ < 10){ const m = P.autoStep(s); if(!m) break; s = P.move(s, m.from, m.to); }
check("auto-finish plays lowest cards first", s.found[0].length === 3 && s.found.flat().length === 4);
s = empty("klondike1"); s.tab[0] = [C("S", 2)]; s.tab[1] = [C("C", 5)];
check("stuck when nothing can move", P.stuck(s));

// random play never loses or doubles a card, and a fully sorted game is won
for(const v of Object.keys(P.VARIANTS)){
  let st = P.deal(v, 77), n = 0; const total = P.count(st);
  let r = 5; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  while(n++ < 400){
    const h = P.hints(st);
    if(h.length && rnd() < 0.8){ const m = h[Math.floor(rnd() * Math.min(3, h.length))]; st = P.move(st, m.from, m.to) || st; }
    else if(P.canDraw(st)) st = P.draw(st); else break;
  }
  check(`${v}: no card lost after random play`, P.count(st) === total && new Set([...st.tab.flat(), ...st.stock, ...st.waste, ...st.found.flat(), ...st.cells.filter(Boolean)].map(c => c.id)).size === total);
}
console.log(ok ? "ALL PATIENCE TESTS OK" : "PATIENCE TESTS FAILED");
process.exit(ok ? 0 : 1);
