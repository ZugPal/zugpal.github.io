/* Zugpal Arabic/Turkish Dama. Squares 0..63, index = row*8 + col. Row 0 is white's back row.
   Pieces: "w","b" (men), "W","B" (kings), or null. White moves toward higher rows. */
const ZDama = (function(){
  const color = p => p ? p.toLowerCase() : null;
  const isKing = p => p === "W" || p === "B";
  const at = (r, c) => (r < 0 || r > 7 || c < 0 || c > 7) ? -1 : r*8 + c;

  function newGame(){
    const b = new Array(64).fill(null);
    for(let c = 0; c < 8; c++){ b[8 + c] = "w"; b[16 + c] = "w"; b[40 + c] = "b"; b[48 + c] = "b"; }
    return { b, turn:"w", quiet:0 };
  }

  // Directions for a piece: men go forward + sideways; kings go all four.
  function dirs(p){
    if(isKing(p)) return [[1,0],[-1,0],[0,1],[0,-1]];
    return color(p) === "w" ? [[1,0],[0,1],[0,-1]] : [[-1,0],[0,1],[0,-1]];
  }

  // All capture sequences starting from sq. Captured pieces are removed as they are jumped.
  function captures(b, sq, piece){
    const results = [];
    const me = color(piece), king = isKing(piece);
    function dfs(board, pos, path, taken, lastDir){
      let extended = false;
      const r0 = Math.floor(pos / 8), c0 = pos % 8;
      for(const [dr, dc] of dirs(piece)){
        if(lastDir && dr === -lastDir[0] && dc === -lastDir[1]) continue; // no 180 degree turn
        if(king){
          let r = r0 + dr, c = c0 + dc;
          while(at(r, c) >= 0 && !board[at(r, c)]){ r += dr; c += dc; }
          const victim = at(r, c);
          if(victim < 0 || color(board[victim]) === me || !board[victim]) continue;
          let r2 = r + dr, c2 = c + dc;
          while(at(r2, c2) >= 0 && !board[at(r2, c2)]){
            const land = at(r2, c2), nb = board.slice(); nb[victim] = null; nb[pos] = null; nb[land] = piece;
            extended = true; dfs(nb, land, path.concat(land), taken.concat(victim), [dr, dc]);
            r2 += dr; c2 += dc;
          }
        } else {
          const victim = at(r0 + dr, c0 + dc), land = at(r0 + 2*dr, c0 + 2*dc);
          if(victim < 0 || land < 0 || !board[victim] || color(board[victim]) === me || board[land]) continue;
          const nb = board.slice(); nb[victim] = null; nb[pos] = null; nb[land] = piece;
          extended = true; dfs(nb, land, path.concat(land), taken.concat(victim), [dr, dc]);
        }
      }
      if(!extended && taken.length) results.push({path, taken});
    }
    dfs(b, sq, [sq], [], null);
    return results;
  }

  function legal(st){
    const b = st.b, me = st.turn;
    let caps = [];
    for(let sq = 0; sq < 64; sq++) if(color(b[sq]) === me) caps = caps.concat(captures(b, sq, b[sq]));
    if(caps.length){
      const max = Math.max(...caps.map(m => m.taken.length));
      const seen = new Set();
      return caps.filter(m => m.taken.length === max).filter(m => { const k = m.path.join("-") + "|" + m.taken.slice().sort((x,y)=>x-y).join(","); if(seen.has(k)) return false; seen.add(k); return true; });
    }
    const out = [];
    for(let sq = 0; sq < 64; sq++){
      const p = b[sq]; if(color(p) !== me) continue;
      const r0 = Math.floor(sq / 8), c0 = sq % 8;
      for(const [dr, dc] of dirs(p)){
        let r = r0 + dr, c = c0 + dc;
        while(at(r, c) >= 0 && !b[at(r, c)]){ out.push({path:[sq, at(r, c)], taken:[]}); if(!isKing(p)) break; r += dr; c += dc; }
      }
    }
    return out;
  }

  function apply(st, m){
    const b = st.b.slice(), from = m.path[0], to = m.path[m.path.length - 1];
    let p = b[from]; b[from] = null; m.taken.forEach(i => { b[i] = null; });
    const row = Math.floor(to / 8);
    if(p === "w" && row === 7) p = "W";
    if(p === "b" && row === 0) p = "B";
    b[to] = p;
    return { b, turn: st.turn === "w" ? "b" : "w", quiet: m.taken.length ? 0 : st.quiet + 1 };
  }

  function status(st){
    const mine = st.b.filter(p => color(p) === st.turn).length;
    const moves = mine ? legal(st) : [];
    const lost = mine === 0 || moves.length === 0;
    return { over: lost || st.quiet >= 80, winner: lost ? (st.turn === "w" ? "b" : "w") : null, draw: !lost && st.quiet >= 80, mustCapture: moves.length > 0 && moves[0].taken.length > 0 };
  }

  const key = m => m.path.join("-");
  function fromKey(st, k){ if(!/^\d{1,2}(-\d{1,2}){1,20}$/.test(String(k))) return null; return legal(st).find(m => key(m) === k) || null; }

  function evaluate(st){
    let s = 0;
    for(let i = 0; i < 64; i++){ const p = st.b[i]; if(!p) continue;
      const row = Math.floor(i / 8);
      let v = isKing(p) ? 320 : 100 + (color(p) === "w" ? row : 7 - row) * 4;
      s += color(p) === "w" ? v : -v; }
    return s;
  }
  function search(st, depth, alpha, beta){
    const moves = legal(st);
    if(moves.length === 0) return st.turn === "w" ? -100000 - depth : 100000 + depth;
    if(depth === 0) return evaluate(st);
    if(st.turn === "w"){ let v = -Infinity;
      for(const m of moves){ v = Math.max(v, search(apply(st, m), depth - 1, alpha, beta)); alpha = Math.max(alpha, v); if(beta <= alpha) break; } return v; }
    let v = Infinity;
    for(const m of moves){ v = Math.min(v, search(apply(st, m), depth - 1, alpha, beta)); beta = Math.min(beta, v); if(beta <= alpha) break; }
    return v;
  }
  function bestMove(st, depth){
    const moves = legal(st); if(!moves.length) return null;
    for(let i = moves.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [moves[i], moves[j]] = [moves[j], moves[i]]; }
    let best = moves[0], bv = st.turn === "w" ? -Infinity : Infinity;
    for(const m of moves){ const v = search(apply(st, m), depth - 1, -Infinity, Infinity);
      if(st.turn === "w" ? v > bv : v < bv){ bv = v; best = m; } }
    return best;
  }

  return { newGame, legal, apply, status, key, fromKey, bestMove, isKing, color };
})();
if(typeof module !== "undefined") module.exports = ZDama;
