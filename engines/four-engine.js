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
  return { W, H, newGame, moves, apply, status, bestMove };
})();
if(typeof module !== "undefined") module.exports = ZFour;
