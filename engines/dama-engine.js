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

  /* Notation: squares a1..h8 (a1 = white's left corner), "c3-c4" for a step, "c3xc5xe5" for captures */
  const sqName = i => "abcdefgh"[i % 8] + (Math.floor(i / 8) + 1);
  const notation = m => m.path.map(sqName).join(m.taken.length ? "x" : "-");
  const posKey = st => st.b.map(p => p || "-").join("") + st.turn;

  /* Stronger opponent: negamax + alpha-beta, captures first, iterative deepening with a time limit.
     Levels: easy (2 plies, noisy), medium (3), hard (5), expert (up to 1.5 s). */
  function evaluate2(st){
    let s = 0, wk = 0, bk = 0, wm = 0, bm = 0;
    for(let i = 0; i < 64; i++){ const p = st.b[i]; if(!p) continue;
      const row = Math.floor(i / 8), col = i % 8, w = color(p) === "w";
      let v;
      if(isKing(p)){ v = 300; w ? wk++ : bk++; }
      else { const adv = w ? row : 7 - row; v = 100 + adv * adv * 1.5 + (col > 1 && col < 6 ? 4 : 0) + ((w ? row === 1 : row === 6) ? 6 : 0); w ? wm++ : bm++; }
      s += w ? v : -v; }
    const total = wk + bk + wm + bm, lead = (wk * 3 + wm) - (bk * 3 + bm);
    if(total < 10) s += lead * 15;       // trade down when ahead
    return st.turn === "w" ? s : -s;
  }
  class Timeout {}
  function think(st, level, rnd){
    rnd = rnd || Math.random;
    const moves = legal(st); if(!moves.length) return null;
    if(moves.length === 1) return moves[0];
    const lim = { easy: [2, 0], medium: [3, 0], hard: [5, 0], expert: [12, 1500] }[level] || [3, 0];
    const deadline = lim[1] ? Date.now() + lim[1] : Infinity, noisy = level === "easy" || level === "medium"; let nodes = 0;
    function nega(s, depth, alpha, beta, ply){
      if((++nodes & 511) === 0 && Date.now() > deadline) throw new Timeout();
      const ms = legal(s);
      if(!ms.length) return -100000 + ply;
      if(s.quiet >= 80) return 0;
      if(depth <= 0 && !ms[0].taken.length) return evaluate2(s);   // keep looking while captures are forced
      if(depth <= -6) return evaluate2(s);
      let best = -Infinity;
      for(const m of ms){
        const v = -nega(apply(s, m), depth - 1, -beta, -alpha, ply + 1);
        if(v > best) best = v; if(v > alpha) alpha = v; if(alpha >= beta) break;
      }
      return best;
    }
    let bestMove = moves[Math.floor(rnd() * moves.length)], prev = null;
    for(let d = 1; d <= lim[0]; d++){
      try{
        let alpha = -Infinity, bm = null, bv = -Infinity;
        const ms = moves.slice(); if(prev){ ms.splice(ms.indexOf(prev), 1); ms.unshift(prev); }
        for(const m of ms){
          let v = -nega(apply(st, m), d - 1, -Infinity, noisy ? Infinity : -alpha, 1);
          if(level === "easy") v += (rnd() - 0.5) * 160; else if(level === "medium") v += (rnd() - 0.5) * 30;
          if(v > bv){ bv = v; bm = m; } if(v > alpha) alpha = v;
        }
        bestMove = prev = bm;
        if(bv > 90000) break;
      }catch(e){ if(e instanceof Timeout) break; throw e; }
    }
    return bestMove;
  }

  return { newGame, legal, apply, status, key, fromKey, bestMove, isKing, color, sqName, notation, posKey, think };
})();
if(typeof module !== "undefined") module.exports = ZDama;
