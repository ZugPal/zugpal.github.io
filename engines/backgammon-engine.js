/* Zugpal Backgammon / Tavla (no doubling cube). Points 1..24 from white's view: b[p] > 0 white checkers, < 0 black.
   White moves 24 -> 1 and bears off below 1; black moves 1 -> 24 and bears off above 24. bar/off counts per colour.
   A turn is all checker moves for one roll, e.g. "24/18,13/11"; "bar/22", "3/off"; "pass" when nothing can be played.
   Rules: use as many dice as possible; if only one die can be used, the larger one where possible; doubles give 4 moves;
   checkers on the bar must enter first; bear off only when all 15 are home; a single opposing checker (blot) is hit.
   Dice come from a seeded generator: same seed, same rolls on both phones of an online game. */
const ZBackgammon = (function(){
  function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function roll(seed, n){ const r = rng((seed + Math.imul(n + 1, 2654435761)) >>> 0); r(); return [1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6)]; }
  const other = p => p === "w" ? "b" : "w";
  function newGame(seed){
    const b = Array(25).fill(0);
    b[24] = 2; b[13] = 5; b[8] = 3; b[6] = 5; b[1] = -2; b[12] = -5; b[17] = -3; b[19] = -5;
    const st = { b, bar: { w: 0, b: 0 }, off: { w: 0, b: 0 }, turn: "w", seed: (seed || 1) >>> 0, n: 0, dice: null, last: null };
    st.dice = roll(st.seed, 0);
    return st;
  }
  const own = (st, p, i) => p === "w" ? st.b[i] > 0 : st.b[i] < 0;
  const count = (st, p, i) => p === "w" ? Math.max(0, st.b[i]) : Math.max(0, -st.b[i]);
  const allHome = (st, p) => st.bar[p] === 0 && st.b.every((v, i) => i === 0 || !own(st, p, i) || (p === "w" ? i <= 6 : i >= 19));
  // one checker move with die d; returns [move string, new state] or null
  function step(st, p, from, d){
    const dir = p === "w" ? -1 : 1;
    let to;
    if(from === "bar"){ if(st.bar[p] === 0) return null; to = p === "w" ? 25 - d : d; }
    else { if(st.bar[p] > 0 || !own(st, p, from)) return null; to = from + dir * d; }
    const b = st.b.slice(), bar = { ...st.bar }, off = { ...st.off }, sgn = p === "w" ? 1 : -1;
    if(to < 1 || to > 24){
      if(from === "bar" || !allHome(st, p)) return null;
      const exact = p === "w" ? from === d : 25 - from === d;
      if(!exact){ // a higher die may bear off the farthest checker only
        const farther = p === "w" ? b.some((v, i) => i > from && i <= 6 && v > 0) : b.some((v, i) => i < from && i >= 19 && v < 0);
        if(farther) return null;
      }
      b[from] -= sgn; off[p]++;
      return [`${from}/off`, { ...st, b, bar, off }];
    }
    if(p === "w" ? b[to] < -1 : b[to] > 1) return null;      // blocked by 2+ opposing checkers
    let hit = false;
    if(p === "w" ? b[to] === -1 : b[to] === 1){ b[to] = 0; bar[other(p)]++; hit = true; }
    if(from === "bar") bar[p]--; else b[from] -= sgn;
    b[to] += sgn;
    return [`${from}/${to}${hit ? "*" : ""}`, { ...st, b, bar, off }];
  }
  const key = st => st.b.join(",") + "|" + st.bar.w + "," + st.bar.b + "|" + st.off.w + "," + st.off.b;
  // every way to play the roll (in any order) that follows the "use the most dice / larger die" rules,
  // with the board after each single move (for showing a turn step by step)
  function paths(st){
    if(status(st).over || !st.dice) return [];
    const p = st.turn, [d1, d2] = st.dice, orders = d1 === d2 ? [[d1, d1, d1, d1]] : [[d1, d2], [d2, d1]];
    let all = [], best = 0, bestDie = 0;
    function rec(s, dice, used, moves, states){
      let moved = false;
      if(dice.length){
        const froms = s.bar[p] > 0 ? ["bar"] : [...Array(24).keys()].map(i => i + 1).filter(i => own(s, p, i));
        for(const f of new Set(froms)){
          const r = step(s, p, f, dice[0]); if(!r) continue;
          moved = true; rec(r[1], dice.slice(1), used.concat([dice[0]]), moves.concat([r[0]]), states.concat([r[1]]));
        }
      }
      if(!moved || !dice.length){
        const n = used.length, big = Math.max(0, ...used);
        if(n > best || (n === best && big > bestDie)){ best = n; bestDie = big; all = []; }
        if(n === best && big === bestDie && n > 0) all.push({ move: moves.join(","), steps: moves, states, st: s });
      }
    }
    for(const o of orders) rec(st, o, [], [], []);
    return all;
  }
  // distinct end positions (one way to reach each)
  function turns(st){ const m = new Map(); for(const p of paths(st)){ const k = key(p.st); if(!m.has(k)) m.set(k, p); } return [...m.values()]; }
  function moves(st){ const t = turns(st); return status(st).over ? [] : t.length ? t.map(x => x.move) : ["pass"]; }
  function next(st, s){ const n = st.n + 1; return { ...s, turn: other(st.turn), n, dice: roll(st.seed, n), last: null }; }
  function apply(st, m){
    if(status(st).over) return null;
    const t = paths(st);
    if(m === "pass") return t.length ? null : { ...next(st, st), last: "pass" };
    const hit = t.find(x => x.move === m);
    return hit ? { ...next(st, hit.st), last: m } : null;
  }
  function status(st){
    if(st.off.w === 15) return { over: true, winner: "w" };
    if(st.off.b === 15) return { over: true, winner: "b" };
    return { over: false, winner: null };
  }
  const pips = (st, p) => st.b.reduce((s, v, i) => s + (p === "w" ? Math.max(0, v) * i : Math.max(0, -v) * (25 - i)), 0) + st.bar[p] * 25;
  function evalFor(s, p){
    const op = other(p), sgn = p === "w" ? 1 : -1;
    let v = (pips(s, op) - pips(s, p)) + 12 * (s.off[p] - s.off[op]) + 8 * (s.bar[op] - s.bar[p]);
    for(let i = 1; i <= 24; i++){
      const c = s.b[i] * sgn;
      if(c === 1){ // blot: how exposed is it?
        const ahead = p === "w" ? s.b.slice(1, i).some(x => x < 0) || s.bar[op] > 0 : s.b.slice(i + 1).some(x => x > 0) || s.bar[op] > 0;
        if(ahead) v -= 6 + (p === "w" ? (25 - i) : i) / 6;
      }
      if(c >= 2){ v += 3; const home = p === "w" ? i <= 6 : i >= 19; if(home) v += 3; }
    }
    return v;
  }
  // easy: any legal turn; normal: best position after the turn
  function bestMove(st, level, rnd){
    rnd = rnd || Math.random;
    const t = turns(st); if(!t.length) return "pass";
    if(level === "easy") return t[Math.floor(rnd() * t.length)].move;
    let best = t[0].move, bv = -Infinity;
    for(const x of t){ const v = evalFor(x.st, st.turn) + rnd() * 0.01; if(v > bv){ bv = v; best = x.move; } }
    return best;
  }
  return { newGame, moves, apply, status, bestMove, pips, roll, turns, paths };
})();
if(typeof module !== "undefined") module.exports = ZBackgammon;
