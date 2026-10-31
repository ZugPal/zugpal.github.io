/* Zugpal chess rules. Squares 0..63, index = rank*8 + file (rank 0 = rank 1, file 0 = a).
   Pieces: "wP","wN","wB","wR","wQ","wK","bP",... or null. */
const ZChess = (function(){
  const FILES = "abcdefgh";
  const N_OFF = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
  const K_OFF = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  const DIAG = [[1,1],[1,-1],[-1,1],[-1,-1]];
  const ORTH = [[1,0],[-1,0],[0,1],[0,-1]];
  const sqName = i => FILES[i % 8] + (Math.floor(i / 8) + 1);
  const sqIndex = s => (parseInt(s[1], 10) - 1) * 8 + FILES.indexOf(s[0]);
  const at = (f, r) => (f < 0 || f > 7 || r < 0 || r > 7) ? -1 : r * 8 + f;

  function newGame(){
    const b = new Array(64).fill(null);
    const back = ["R","N","B","Q","K","B","N","R"];
    for(let f = 0; f < 8; f++){ b[f] = "w" + back[f]; b[8 + f] = "wP"; b[48 + f] = "bP"; b[56 + f] = "b" + back[f]; }
    return { b, turn:"w", castle:{wK:true, wQ:true, bK:true, bQ:true}, ep:-1, half:0, full:1 };
  }

  function fromFen(fen){
    const [pos, turn, cas, ep, half, full] = fen.split(" ");
    const b = new Array(64).fill(null); const rows = pos.split("/");
    for(let i = 0; i < 8; i++){ let f = 0; const r = 7 - i;
      for(const ch of rows[i]){ if(/\d/.test(ch)) f += +ch; else { b[r*8+f] = (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase(); f++; } } }
    return { b, turn, castle:{wK:cas.includes("K"), wQ:cas.includes("Q"), bK:cas.includes("k"), bQ:cas.includes("q")},
      ep: ep === "-" ? -1 : sqIndex(ep), half: +half || 0, full: +full || 1 };
  }

  function attacked(st, sq, by){
    const b = st.b, f0 = sq % 8, r0 = Math.floor(sq / 8);
    const pr = by === "w" ? r0 - 1 : r0 + 1;
    for(const df of [-1, 1]){ const i = at(f0 + df, pr); if(i >= 0 && b[i] === by + "P") return true; }
    for(const [df, dr] of N_OFF){ const i = at(f0 + df, r0 + dr); if(i >= 0 && b[i] === by + "N") return true; }
    for(const [df, dr] of K_OFF){ const i = at(f0 + df, r0 + dr); if(i >= 0 && b[i] === by + "K") return true; }
    for(const [dirs, kinds] of [[DIAG, "BQ"], [ORTH, "RQ"]]){
      for(const [df, dr] of dirs){ let f = f0 + df, r = r0 + dr;
        while(f >= 0 && f < 8 && r >= 0 && r < 8){ const p = b[r*8+f];
          if(p){ if(p[0] === by && kinds.includes(p[1])) return true; break; }
          f += df; r += dr; } }
    }
    return false;
  }

  function pseudo(st){
    const b = st.b, me = st.turn, opp = me === "w" ? "b" : "w", out = [];
    const add = (from, to, extra) => out.push(Object.assign({from, to}, extra || {}));
    for(let sq = 0; sq < 64; sq++){
      const p = b[sq]; if(!p || p[0] !== me) continue;
      const f0 = sq % 8, r0 = Math.floor(sq / 8), t = p[1];
      if(t === "P"){
        const dir = me === "w" ? 1 : -1, start = me === "w" ? 1 : 6, last = me === "w" ? 7 : 0;
        const one = at(f0, r0 + dir);
        const pushTo = (to, extra) => { if(Math.floor(to / 8) === last) for(const pr of ["Q","R","B","N"]) add(sq, to, Object.assign({promo:pr}, extra)); else add(sq, to, extra); };
        if(one >= 0 && !b[one]){ pushTo(one);
          const two = at(f0, r0 + 2*dir); if(r0 === start && !b[two]) add(sq, two, {double:true}); }
        for(const df of [-1, 1]){ const to = at(f0 + df, r0 + dir); if(to < 0) continue;
          if(b[to] && b[to][0] === opp) pushTo(to, {capture:true});
          else if(to === st.ep) add(sq, to, {ep:true, capture:true}); }
      } else if(t === "N" || t === "K"){
        for(const [df, dr] of (t === "N" ? N_OFF : K_OFF)){ const to = at(f0 + df, r0 + dr);
          if(to >= 0 && (!b[to] || b[to][0] === opp)) add(sq, to, b[to] ? {capture:true} : null); }
        if(t === "K"){
          const r = me === "w" ? 0 : 7;
          if(sq === r*8 + 4 && !attacked(st, sq, opp)){
            if(st.castle[me + "K"] && !b[r*8+5] && !b[r*8+6] && b[r*8+7] === me + "R" && !attacked(st, r*8+5, opp) && !attacked(st, r*8+6, opp)) add(sq, r*8+6, {castle:"K"});
            if(st.castle[me + "Q"] && !b[r*8+3] && !b[r*8+2] && !b[r*8+1] && b[r*8] === me + "R" && !attacked(st, r*8+3, opp) && !attacked(st, r*8+2, opp)) add(sq, r*8+2, {castle:"Q"});
          }
        }
      } else {
        const dirs = t === "B" ? DIAG : t === "R" ? ORTH : DIAG.concat(ORTH);
        for(const [df, dr] of dirs){ let f = f0 + df, r = r0 + dr;
          while(f >= 0 && f < 8 && r >= 0 && r < 8){ const to = r*8+f;
            if(!b[to]) add(sq, to); else { if(b[to][0] === opp) add(sq, to, {capture:true}); break; }
            f += df; r += dr; } }
      }
    }
    return out;
  }

  function apply(st, m){
    const b = st.b.slice(), me = st.turn, opp = me === "w" ? "b" : "w", p = b[m.from];
    const castle = Object.assign({}, st.castle);
    b[m.to] = m.promo ? me + m.promo : p; b[m.from] = null;
    if(m.ep) b[m.to + (me === "w" ? -8 : 8)] = null;
    if(m.castle){ const r = me === "w" ? 0 : 7;
      if(m.castle === "K"){ b[r*8+5] = b[r*8+7]; b[r*8+7] = null; } else { b[r*8+3] = b[r*8]; b[r*8] = null; } }
    if(p[1] === "K"){ castle[me + "K"] = false; castle[me + "Q"] = false; }
    const touch = s => { if(s === 0) castle.wQ = false; if(s === 7) castle.wK = false; if(s === 56) castle.bQ = false; if(s === 63) castle.bK = false; };
    touch(m.from); touch(m.to);
    return { b, turn:opp, castle, ep: m.double ? (m.from + m.to) / 2 : -1,
      half: (p[1] === "P" || m.capture) ? 0 : st.half + 1, full: st.full + (me === "b" ? 1 : 0) };
  }

  const kingSq = (st, c) => st.b.indexOf(c + "K");
  function inCheck(st, c){ c = c || st.turn; return attacked(st, kingSq(st, c), c === "w" ? "b" : "w"); }
  function legal(st){ const me = st.turn; return pseudo(st).filter(m => !inCheck(apply(st, m), me)); }

  function insufficient(st){
    const ps = st.b.filter(Boolean).filter(p => p[1] !== "K");
    if(ps.length === 0) return true;
    return ps.length === 1 && (ps[0][1] === "B" || ps[0][1] === "N");
  }
  function status(st){
    const moves = legal(st), check = inCheck(st);
    return { check, mate: check && moves.length === 0, stalemate: !check && moves.length === 0,
      draw: (!check && moves.length === 0) || st.half >= 100 || insufficient(st), over: moves.length === 0 || st.half >= 100 || insufficient(st) };
  }

  const uci = m => sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : "");
  function fromUci(st, u){
    if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(String(u))) return null;
    const from = sqIndex(u.slice(0,2)), to = sqIndex(u.slice(2,4)), pr = u[4] ? u[4].toUpperCase() : null;
    return legal(st).find(m => m.from === from && m.to === to && (m.promo || null) === (m.promo ? (pr || "Q") : null)) || null;
  }

  /* Computer opponent: alpha-beta on material + simple position bonuses */
  const VAL = {P:100, N:320, B:330, R:500, Q:900, K:0};
  function evaluate(st){
    let s = 0;
    for(let i = 0; i < 64; i++){ const p = st.b[i]; if(!p) continue;
      const f = i % 8, r = Math.floor(i / 8); let v = VAL[p[1]];
      const center = 3.5 - Math.max(Math.abs(3.5 - f), Math.abs(3.5 - r));
      if(p[1] === "N" || p[1] === "B") v += center * 8;
      if(p[1] === "P") v += (p[0] === "w" ? r - 1 : 6 - r) * 8 + (f > 1 && f < 6 ? center * 4 : 0);
      s += p[0] === "w" ? v : -v; }
    return s;
  }
  function search(st, depth, alpha, beta){
    const moves = legal(st);
    if(moves.length === 0) return inCheck(st) ? (st.turn === "w" ? -100000 - depth : 100000 + depth) : 0;
    if(depth === 0) return evaluate(st);
    moves.sort((a, b2) => (b2.capture ? 1 : 0) - (a.capture ? 1 : 0));
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

  /* Standard algebraic notation, e.g. "Nf3", "exd5", "O-O", "e8=Q+", "Nbd2", "R1a3", "Qxf7#" */
  function san(st, m){
    if(m.castle) return (m.castle === "K" ? "O-O" : "O-O-O") + suffix(st, m);
    const p = st.b[m.from][1], to = sqName(m.to);
    let s = "";
    if(p === "P"){ s = (m.capture ? sqName(m.from)[0] + "x" : "") + to + (m.promo ? "=" + m.promo : ""); }
    else {
      const others = legal(st).filter(o => o.to === m.to && o.from !== m.from && st.b[o.from][1] === p);
      let dis = "";
      if(others.length){
        const f = sqName(m.from)[0], r = sqName(m.from)[1];
        if(!others.some(o => sqName(o.from)[0] === f)) dis = f;
        else if(!others.some(o => sqName(o.from)[1] === r)) dis = r;
        else dis = f + r;
      }
      s = p + dis + (m.capture ? "x" : "") + to;
    }
    return s + suffix(st, m);
  }
  function suffix(st, m){ const n = apply(st, m), s = status(n); return s.mate ? "#" : s.check ? "+" : ""; }
  // position fingerprint for threefold repetition
  const key = st => st.b.map(p => p || "-").join("") + st.turn + ["wK","wQ","bK","bQ"].filter(k => st.castle[k]).join("") + st.ep;

  /* Stronger opponent: negamax + alpha-beta, captures searched to the end (quiescence), piece-square tables,
     iterative deepening with a time limit. Levels: easy (1 ply, noisy), medium (2), hard (3), expert (up to 2 s). */
  const PST = {
    P:[0,0,0,0,0,0,0,0, 5,10,10,-20,-20,10,10,5, 5,-5,-10,0,0,-10,-5,5, 0,0,0,20,20,0,0,0, 5,5,10,25,25,10,5,5, 10,10,20,30,30,20,10,10, 50,50,50,50,50,50,50,50, 0,0,0,0,0,0,0,0],
    N:[-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,5,5,0,-20,-40, -30,5,10,15,15,10,5,-30, -30,0,15,20,20,15,0,-30, -30,5,15,20,20,15,5,-30, -30,0,10,15,15,10,0,-30, -40,-20,0,0,0,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    B:[-20,-10,-10,-10,-10,-10,-10,-20, -10,5,0,0,0,0,5,-10, -10,10,10,10,10,10,10,-10, -10,0,10,10,10,10,0,-10, -10,5,5,10,10,5,5,-10, -10,0,5,10,10,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    R:[0,0,0,5,5,0,0,0, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 5,10,10,10,10,10,10,5, 0,0,0,0,0,0,0,0],
    Q:[-20,-10,-10,-5,-5,-10,-10,-20, -10,0,5,0,0,0,0,-10, -10,5,5,5,5,5,0,-10, 0,0,5,5,5,5,0,-5, -5,0,5,5,5,5,0,-5, -10,0,5,5,5,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    K:[20,30,10,0,0,10,30,20, 20,20,0,0,0,0,20,20, -10,-20,-20,-20,-20,-20,-20,-10, -20,-30,-30,-40,-40,-30,-30,-20, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30],
    KE:[-50,-30,-30,-30,-30,-30,-30,-50, -30,-30,0,0,0,0,-30,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-20,-10,0,0,-10,-20,-30, -50,-40,-30,-20,-20,-30,-40,-50]
  };
  function evaluate2(st){
    let s = 0, mat = 0;
    for(let i = 0; i < 64; i++){ const p = st.b[i]; if(p && p[1] !== "K" && p[1] !== "P") mat += VAL[p[1]]; }
    const endgame = mat <= 1400;
    for(let i = 0; i < 64; i++){ const p = st.b[i]; if(!p) continue;
      const idx = p[0] === "w" ? i : (7 - Math.floor(i / 8)) * 8 + (i % 8);
      const t = p[1] === "K" && endgame ? "KE" : p[1];
      const v = VAL[p[1]] + PST[t][idx];
      s += p[0] === "w" ? v : -v; }
    return st.turn === "w" ? s : -s;
  }
  const order = (st, ms) => ms.map(m => ({ m, k: (m.capture ? 10 * (VAL[(st.b[m.to] || "xP")[1]] || 100) - VAL[st.b[m.from][1]] / 10 : 0) + (m.promo ? 800 : 0) }))
    .sort((a, b) => b.k - a.k).map(x => x.m);
  class Timeout {}
  function think(st, level, rnd){
    rnd = rnd || Math.random;
    const moves = legal(st); if(!moves.length) return null;
    const lim = { easy: [1, 0], medium: [2, 0], hard: [3, 0], expert: [7, 2000] }[level] || [2, 0];
    const deadline = lim[1] ? Date.now() + lim[1] : Infinity; let nodes = 0;
    function q(s, alpha, beta, ply){
      if((++nodes & 1023) === 0 && Date.now() > deadline) throw new Timeout();
      const stand = evaluate2(s); if(stand >= beta) return beta; if(stand > alpha) alpha = stand;
      if(ply > 8) return alpha;
      for(const m of order(s, legal(s).filter(m => m.capture || m.promo))){
        const v = -q(apply(s, m), -beta, -alpha, ply + 1);
        if(v >= beta) return beta; if(v > alpha) alpha = v;
      }
      return alpha;
    }
    function nega(s, depth, alpha, beta, ply){
      if((++nodes & 1023) === 0 && Date.now() > deadline) throw new Timeout();
      const ms = legal(s);
      if(!ms.length) return inCheck(s) ? -100000 + ply : 0;
      if(s.half >= 100 || insufficient(s)) return 0;
      if(depth <= 0) return q(s, alpha, beta, 0);
      let best = -Infinity;
      for(const m of order(s, ms)){
        const v = -nega(apply(s, m), depth - 1, -beta, -alpha, ply + 1);
        if(v > best) best = v; if(v > alpha) alpha = v; if(alpha >= beta) break;
      }
      return best;
    }
    let bestMove = moves[Math.floor(rnd() * moves.length)], prev = null;
    for(let d = 1; d <= lim[0]; d++){
      try{
        let alpha = -Infinity, bm = null, bv = -Infinity;
        const ms = order(st, moves); if(prev){ ms.splice(ms.indexOf(prev), 1); ms.unshift(prev); }
        for(const m of ms){
          // easy/medium score every move fully, so the random factor never promotes a move that was only cut off
          const noisy = level === "easy" || level === "medium";
          let v = -nega(apply(st, m), d - 1, -Infinity, noisy ? Infinity : -alpha, 1);
          if(level === "easy") v += (rnd() - 0.5) * 240; else if(level === "medium") v += (rnd() - 0.5) * 40;
          if(v > bv){ bv = v; bm = m; } if(v > alpha) alpha = v;
        }
        bestMove = prev = bm;
        if(bv > 90000) break;
      }catch(e){ if(e instanceof Timeout) break; throw e; }
    }
    return bestMove;
  }

  return { newGame, fromFen, legal, apply, status, inCheck, uci, fromUci, bestMove, sqName, sqIndex, san, key, think, evaluate: evaluate2 };
})();
if(typeof module !== "undefined") module.exports = ZChess;
