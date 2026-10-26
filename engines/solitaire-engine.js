/* Zugpal Solitaire (Klondike, draw 1). Card: {s:"S|H|D|C", r:1..13, up:bool} */
const ZSol = (function(){
  const red = c => c.s === "H" || c.s === "D";
  function deal(){
    const deck = [];
    for(const s of ["S","H","D","C"]) for(let r = 1; r <= 13; r++) deck.push({s, r, up:false});
    for(let i = deck.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    const tab = [];
    for(let i = 0; i < 7; i++){ const pile = deck.splice(0, i + 1); pile[pile.length - 1].up = true; tab.push(pile); }
    return { tab, stock: deck, waste: [], found: [[],[],[],[]], moves: 0 };
  }
  const clone = g => JSON.parse(JSON.stringify(g));
  const top = a => a[a.length - 1];

  function canFound(card, pile){ const t = top(pile); return t ? (t.s === card.s && card.r === t.r + 1) : card.r === 1; }
  function canTab(card, pile){ const t = top(pile); return t ? (t.up && red(t) !== red(card) && card.r === t.r - 1) : card.r === 13; }

  // src: {kind:"waste"} | {kind:"tab", i, idx} | {kind:"found", i}
  function cardsFrom(g, src){
    if(src.kind === "waste") return g.waste.length ? [top(g.waste)] : [];
    if(src.kind === "found") return g.found[src.i].length ? [top(g.found[src.i])] : [];
    const pile = g.tab[src.i]; if(src.idx < 0 || src.idx >= pile.length || !pile[src.idx].up) return [];
    return pile.slice(src.idx);
  }
  function remove(g, src, n){
    if(src.kind === "waste") g.waste.pop();
    else if(src.kind === "found") g.found[src.i].pop();
    else { g.tab[src.i].splice(g.tab[src.i].length - n, n); const t = top(g.tab[src.i]); if(t) t.up = true; }
  }
  // dst: {kind:"tab", i} | {kind:"found", i}
  function move(g, src, dst){
    const cards = cardsFrom(g, src); if(!cards.length) return null;
    if(dst.kind === "found"){ if(cards.length !== 1 || !canFound(cards[0], g.found[dst.i]) || src.kind === "found") return null; }
    else { if(src.kind === "tab" && src.i === dst.i) return null; if(!canTab(cards[0], g.tab[dst.i])) return null; }
    const n = clone(g); const moved = cardsFrom(n, src).map(c => Object.assign({}, c, {up:true}));
    remove(n, src, moved.length);
    if(dst.kind === "found") n.found[dst.i].push(moved[0]); else n.tab[dst.i].push(...moved);
    n.moves = g.moves + 1; return n;
  }
  function autoFound(g, src){
    const cards = cardsFrom(g, src); if(cards.length !== 1) return null;
    for(let i = 0; i < 4; i++){ const n = move(g, src, {kind:"found", i}); if(n) return n; }
    return null;
  }
  function draw(g){
    const n = clone(g);
    if(n.stock.length){ const c = n.stock.pop(); c.up = true; n.waste.push(c); }
    else if(n.waste.length){ n.stock = n.waste.reverse().map(c => Object.assign(c, {up:false})); n.waste = []; }
    else return null;
    n.moves = g.moves + 1; return n;
  }
  const won = g => g.found.every(f => f.length === 13);
  // When everything is face up and the stock is empty, finish automatically.
  function canAutoFinish(g){ return !g.stock.length && !g.waste.length && g.tab.every(p => p.every(c => c.up)) && !won(g); }
  function autoFinish(g){
    let n = g, guard = 0;
    while(!won(n) && guard++ < 200){
      let moved = false;
      for(let i = 0; i < 7 && !moved; i++){ const p = n.tab[i]; if(!p.length) continue; const r = autoFound(n, {kind:"tab", i, idx:p.length - 1}); if(r){ n = r; moved = true; } }
      if(!moved) break;
    }
    return n;
  }
  return { deal, move, autoFound, draw, won, canAutoFinish, autoFinish, red, cardsFrom };
})();
if(typeof module !== "undefined") module.exports = ZSol;
