/* Zugpal Mühle (nine men's morris). 24 points: index = ring*8 + k, ring 0 outer .. 2 inner,
   k 0..7 clockwise from the top-left corner (0 TL, 1 top middle, 2 TR, 3 right middle, 4 BR, 5 bottom middle, 6 BL, 7 left middle).
   Moves: "p<to>" place, "m<from>-<to>" move, both optionally followed by "x<point>" when a mill captures.
   Rules: 9 pieces each; place all, then move along lines; with 3 pieces left you may jump ("fly");
   a mill (3 in a line) removes an opponent piece that is not in a mill (unless all are);
   fewer than 3 pieces or no legal move loses; 100 plies without a capture is a draw. */
const ZMuehle = (function(){
  const ADJ = Array.from({ length: 24 }, () => []);
  const MILLS = [];
  for(let r = 0; r < 3; r++){
    for(let k = 0; k < 8; k++){ const a = r*8 + k, b = r*8 + (k + 1) % 8; ADJ[a].push(b); ADJ[b].push(a); }
    for(const k of [0, 2, 4, 6]) MILLS.push([r*8 + k, r*8 + k + 1, r*8 + (k + 2) % 8]);
  }
  for(const k of [1, 3, 5, 7]){
    for(let r = 0; r < 2; r++){ ADJ[r*8 + k].push((r + 1)*8 + k); ADJ[(r + 1)*8 + k].push(r*8 + k); }
    MILLS.push([k, 8 + k, 16 + k]);
  }
  const other = p => p === "w" ? "b" : "w";
  const newGame = () => ({ b: Array(24).fill(null), turn: "w", hand: { w: 9, b: 9 }, quiet: 0, last: null });
  const count = (b, p) => b.filter(x => x === p).length;
  const inMill = (b, i) => !!b[i] && MILLS.some(m => m.includes(i) && m.every(j => b[j] === b[i]));
  function captures(b, p){
    const opp = [...b.keys()].filter(i => b[i] === other(p));
    const free = opp.filter(i => !inMill(b, i));
    return free.length ? free : opp;
  }
  function withCaptures(b, to, base, p){
    if(!inMill(b, to)) return [base];
    return captures(b, p).map(c => base + "x" + c);
  }
  function moves(st){
    if(status(st).over) return [];
    const p = st.turn, out = [];
    if(st.hand[p] > 0){
      for(let t = 0; t < 24; t++) if(!st.b[t]){ const b = st.b.slice(); b[t] = p; out.push(...withCaptures(b, t, "p" + t, p)); }
      return out;
    }
    const fly = count(st.b, p) === 3;
    for(let f = 0; f < 24; f++){
      if(st.b[f] !== p) continue;
      const targets = fly ? [...Array(24).keys()].filter(t => !st.b[t]) : ADJ[f].filter(t => !st.b[t]);
      for(const t of targets){ const b = st.b.slice(); b[f] = null; b[t] = p; out.push(...withCaptures(b, t, "m" + f + "-" + t, p)); }
    }
    return out;
  }
  function apply(st, m){ return moves(st).includes(m) ? applyRaw(st, m) : null; }
  function applyRaw(st, m){
    const mm = /^(?:p(\d+)|m(\d+)-(\d+))(?:x(\d+))?$/.exec(m);
    const p = st.turn, b = st.b.slice(), hand = { ...st.hand };
    let to;
    if(mm[1] !== undefined){ to = +mm[1]; b[to] = p; hand[p]--; }
    else { b[+mm[2]] = null; to = +mm[3]; b[to] = p; }
    if(mm[4] !== undefined) b[+mm[4]] = null;
    return { b, turn: other(p), hand, quiet: mm[4] !== undefined ? 0 : st.quiet + 1, last: { to, from: mm[2] !== undefined ? +mm[2] : null, x: mm[4] !== undefined ? +mm[4] : null } };
  }
  function status(st){
    const p = st.turn;
    if(count(st.b, p) + st.hand[p] < 3) return { over: true, winner: other(p) };
    if(st.quiet >= 100) return { over: true, winner: null };
    // no legal move (only possible after placing)
    if(st.hand[p] === 0 && count(st.b, p) > 3){
      const can = st.b.some((x, f) => x === p && ADJ[f].some(t => !st.b[t]));
      if(!can) return { over: true, winner: other(p) };
    }
    return { over: false, winner: null };
  }
  function evalFor(st, me){
    const op = other(me), s = status(st);
    if(s.over) return s.winner === me ? 10000 : s.winner ? -10000 : 0;
    const pieces = (count(st.b, me) + st.hand[me]) - (count(st.b, op) + st.hand[op]);
    let two = 0;
    for(const m of MILLS){ const v = m.map(i => st.b[i]); const a = v.filter(x => x === me).length, o = v.filter(x => x === op).length, e = v.filter(x => !x).length;
      if(a === 2 && e === 1) two++; if(o === 2 && e === 1) two--; }
    const mob = p => st.b.reduce((n, x, f) => n + (x === p ? ADJ[f].filter(t => !st.b[t]).length : 0), 0);
    return pieces * 100 + two * 8 + (mob(me) - mob(op));
  }
  function search(st, d, a, beta, me){
    const ms = moves(st);
    if(d === 0 || !ms.length) return evalFor(st, me);
    const max = st.turn === me;
    let best = max ? -Infinity : Infinity;
    for(const m of ms){
      const v = search(apply(st, m), d - 1, a, beta, me);
      if(max){ if(v > best) best = v; if(v > a) a = v; } else { if(v < best) best = v; if(v < beta) beta = v; }
      if(a >= beta) break;
    }
    return best;
  }
  // easy: one move ahead with randomness; normal: three moves ahead
  function bestMove(st, level, rnd){
    rnd = rnd || Math.random;
    const ms = moves(st); if(!ms.length) return null;
    const depth = level === "easy" ? 1 : 3, me = st.turn;
    let best = ms[0], bv = -Infinity;
    for(const m of ms){
      const v = search(apply(st, m), depth - 1, -Infinity, Infinity, me) + (level === "easy" ? rnd() * 60 : rnd());
      if(v > bv){ bv = v; best = m; }
    }
    return best;
  }
  /* Stronger opponent for the new board: negamax + alpha-beta, captures first, iterative deepening with a time limit.
     Levels: easy (1 ply, noisy), medium (2 plies), hard (4 plies), expert (up to 2 s). */
  const posKey = st => st.b.map(x => x || "-").join("") + st.turn + st.hand.w + st.hand.b;
  class Timeout {}
  function think(st, level, rnd){
    rnd = rnd || Math.random;
    const ms = moves(st); if(!ms.length) return null; if(ms.length === 1) return ms[0];
    const lim = { easy: [1, 0], medium: [2, 0], hard: [4, 1200], expert: [10, 2000] }[level] || [2, 0];
    const noise = level === "easy" ? 90 : level === "medium" ? 10 : 0, deadline = lim[1] ? Date.now() + lim[1] : Infinity;
    let nodes = 0;
    const order = list => list.filter(m => m.includes("x")).concat(list.filter(m => !m.includes("x")));
    function nega(s, depth, alpha, beta, ply){
      if((++nodes & 255) === 0 && Date.now() > deadline) throw new Timeout();
      const stt = status(s);
      if(stt.over) return stt.winner ? -100000 + ply : 0;
      if(depth <= 0) return evalFor(s, s.turn);
      let best = -Infinity;
      for(const m of order(moves(s))){
        const v = -nega(applyRaw(s, m), depth - 1, -beta, -alpha, ply + 1);
        if(v > best) best = v; if(v > alpha) alpha = v; if(alpha >= beta) break;
      }
      return best;
    }
    let bestMv = ms[Math.floor(rnd() * ms.length)], prev = null;
    for(let d = 1; d <= lim[0]; d++){
      try{
        let bv = -Infinity, bm = null, alpha = -Infinity;
        const list = order(ms.slice()); if(prev){ list.splice(list.indexOf(prev), 1); list.unshift(prev); }
        for(const m of list){
          let v = -nega(applyRaw(st, m), d - 1, -Infinity, noise ? Infinity : -alpha, 1);
          if(noise) v += (rnd() - .5) * noise * 2;
          if(v > bv){ bv = v; bm = m; } if(v > alpha) alpha = v;
        }
        bestMv = prev = bm;
        if(Math.abs(bv) > 90000) break;
      }catch(e){ if(e instanceof Timeout) break; throw e; }
    }
    return bestMv;
  }
  return { ADJ, MILLS, newGame, moves, apply, status, bestMove, inMill, count, think, posKey };
})();
if(typeof module !== "undefined") module.exports = ZMuehle;
