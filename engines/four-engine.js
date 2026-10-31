/* Zugpal "Vier in einer Reihe" (four in a row). 7 columns x 6 rows, index = row*7 + col, row 0 = bottom.
   Players "w" (starts) and "b". A move is the column as a string "0".."6". */
const ZFour = (function(){
  const W = 7, H = 6;
  const LINES = (() => {
    const L = [];
    for(let r = 0; r < H; r++) for(let c = 0; c < W; c++) for(const [dc, dr] of [[1,0],[0,1],[1,1],[1,-1]]){
      const cells = [];
      for(let k = 0; k < 4; k++){ const rr = r + dr*k, cc = c + dc*k; if(rr < 0 || rr >= H || cc < 0 || cc >= W) break; cells.push(rr*W + cc); }
      if(cells.length === 4) L.push(cells);
    }
    return L;
  })();
  const newGame = () => ({ b: Array(W*H).fill(null), turn: "w", last: null, n: 0 });
  function winLine(b){ for(const l of LINES){ const p = b[l[0]]; if(p && p === b[l[1]] && p === b[l[2]] && p === b[l[3]]) return { p, line: l }; } return null; }
  function status(st){
    const w = winLine(st.b);
    if(w) return { over: true, winner: w.p, line: w.line };
    return { over: st.n >= W*H, winner: null, line: null };
  }
  function moves(st){ if(status(st).over) return []; const r = []; for(let c = 0; c < W; c++) if(!st.b[(H-1)*W + c]) r.push(String(c)); return r; }
  function apply(st, m){
    const c = Number(m); if(!(c >= 0 && c < W) || String(c) !== String(m)) return null;
    let r = 0; while(r < H && st.b[r*W + c]) r++;
    if(r >= H) return null;
    const b = st.b.slice(); b[r*W + c] = st.turn;
    return { b, turn: st.turn === "w" ? "b" : "w", last: r*W + c, n: st.n + 1 };
  }
  function evalFor(b, me){
    const op = me === "w" ? "b" : "w"; let s = 0;
    for(const l of LINES){
      let m = 0, o = 0; for(const i of l){ if(b[i] === me) m++; else if(b[i] === op) o++; }
      if(m && !o) s += m === 3 ? 40 : m === 2 ? 4 : 1; else if(o && !m) s -= o === 3 ? 40 : o === 2 ? 4 : 1;
    }
    for(let r = 0; r < H; r++){ if(b[r*W + 3] === me) s += 3; else if(b[r*W + 3] === op) s -= 3; }
    return s;
  }
  const order = ms => ms.sort((x, y) => Math.abs(3 - x) - Math.abs(3 - y));
  function negamax(st, d, a, beta){
    const s = status(st);
    if(s.over) return s.winner ? -100000 - d : 0;   // the player who just moved won
    if(d === 0) return evalFor(st.b, st.turn);
    let best = -Infinity;
    for(const m of order(moves(st))){
      const v = -negamax(apply(st, m), d - 1, -beta, -a);
      if(v > best) best = v; if(v > a) a = v; if(a >= beta) break;
    }
    return best;
  }
  // easy: looks 2 moves ahead with some randomness; normal: 6 moves ahead
  function bestMove(st, level, rnd){
    rnd = rnd || Math.random;
    const ms = order(moves(st)); if(!ms.length) return null;
    const depth = level === "easy" ? 2 : 6;
    let best = ms[0], bv = -Infinity;
    for(const m of ms){
      const v = -negamax(apply(st, m), depth - 1, -Infinity, Infinity) + (level === "easy" ? rnd() * 25 : 0);
      if(v > bv){ bv = v; best = m; }
    }
    return best;
  }
  /* Stronger opponent for the new board: negamax on a mutable board, wins checked around the last disc,
     centre columns first, transposition table, iterative deepening with a time limit.
     Levels: easy (sometimes misses a threat), medium (4 plies), hard (8 plies), expert (up to 1.5 s). */
  const ORDER = [3, 2, 4, 1, 5, 0, 6];
  const Z = (() => { let s = 99991; const r = () => (s = (s * 48271) % 2147483647); return [0, 1].map(() => Array.from({ length: W*H }, () => r())); })();
  class Timeout {}
  function think(st, level, rnd){
    rnd = rnd || Math.random;
    const ms = moves(st); if(!ms.length) return null; if(ms.length === 1) return ms[0];
    const lim = { easy: [rnd() < .35 ? 1 : 2, 0], medium: [4, 0], hard: [8, 0], expert: [42, 1500] }[level] || [4, 0];
    const noise = level === "easy" ? 70 : level === "medium" ? 12 : 0;
    const b = st.b.slice(), h = Array.from({ length: W }, (_, c) => { let r = 0; while(r < H && b[r*W + c]) r++; return r; });
    let key = 0, nodes = 0, filled = st.n; b.forEach((p, i) => { if(p) key ^= Z[p === "w" ? 0 : 1][i]; });
    const deadline = lim[1] ? Date.now() + lim[1] : Infinity, tt = new Map();
    const wins = (i, p) => { const r = Math.floor(i / W), c = i % W;
      for(const [dc, dr] of [[1,0],[0,1],[1,1],[1,-1]]){ let n = 1;
        for(const s of [1, -1]){ let rr = r + dr*s, cc = c + dc*s; while(rr >= 0 && rr < H && cc >= 0 && cc < W && b[rr*W + cc] === p){ n++; rr += dr*s; cc += dc*s; } }
        if(n >= 4) return true; }
      return false; };
    const put = (c, p) => { const i = h[c]*W + c; b[i] = p; h[c]++; filled++; key ^= Z[p === "w" ? 0 : 1][i]; return i; };
    const take = (c, p) => { h[c]--; const i = h[c]*W + c; b[i] = null; filled--; key ^= Z[p === "w" ? 0 : 1][i]; };
    function nega(p, depth, alpha, beta, ply){
      if((++nodes & 1023) === 0 && Date.now() > deadline) throw new Timeout();
      const q = p === "w" ? "b" : "w";
      for(const c of ORDER) if(h[c] < H){ const i = put(c, p), w = wins(i, p); take(c, p); if(w) return 100000 - ply; }
      if(filled >= W*H - 1) return 0;
      if(depth <= 0) return evalFor(b, p);
      const k = key * 2 + (p === "w" ? 0 : 1), hit = tt.get(k);
      if(hit && hit.d >= depth){ if(hit.f === 0) return hit.v; if(hit.f < 0 && hit.v <= alpha) return hit.v; if(hit.f > 0 && hit.v >= beta) return hit.v; }
      const a0 = alpha; let best = -Infinity;
      for(const c of ORDER){ if(h[c] >= H) continue;
        put(c, p); const v = -nega(q, depth - 1, -beta, -alpha, ply + 1); take(c, p);
        if(v > best) best = v; if(v > alpha) alpha = v; if(alpha >= beta) break; }
      tt.set(k, { d: depth, v: best, f: best <= a0 ? -1 : best >= beta ? 1 : 0 });
      return best;
    }
    const me = st.turn, op = me === "w" ? "b" : "w";
    let bestMv = ms[Math.floor(rnd() * ms.length)], prev = null;
    for(let d = 1; d <= lim[0]; d++){
      try{
        let bv = -Infinity, bm = null, alpha = -Infinity;
        const order = ORDER.filter(c => h[c] < H); if(prev !== null){ order.splice(order.indexOf(prev), 1); order.unshift(prev); }
        for(const c of order){
          const i = put(c, me); let v;
          if(wins(i, me)) v = 100000; else v = filled >= W*H ? 0 : -nega(op, d - 1, -Infinity, noise ? Infinity : -alpha, 1);
          take(c, me);
          if(noise) v += (rnd() - .5) * noise * 2;
          if(v > bv){ bv = v; bm = c; } if(v > alpha) alpha = v;
        }
        bestMv = String(bm); prev = bm;
        if(Math.abs(bv) > 90000) break;
      }catch(e){ if(e instanceof Timeout) break; throw e; }
    }
    return bestMv;
  }
  return { W, H, LINES, newGame, moves, apply, status, bestMove, think };
})();
if(typeof module !== "undefined") module.exports = ZFour;
