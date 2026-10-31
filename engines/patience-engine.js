/* Zugpal Solitaire collection: Klondike (draw 1 / draw 3), Spider (1, 2 or 4 suits) and FreeCell.
   Cards: {id, s:"S|H|D|C", r:1..13, up}. A place is {k:"tab"|"waste"|"cell"|"found"|"stock", i, idx}.
   Klondike: build down in alternating colours, only kings on empty columns, foundations up by suit from the ace.
   Spider: build down regardless of suit, but only same-suit runs move together; a full king-to-ace run of one suit
   goes off by itself; dealing a new row needs every column filled.
   FreeCell: all cards open, 4 free cells, build down in alternating colours; how many cards move at once depends
   on free cells and empty columns. Deals use the Windows FreeCell numbering (game #1 is the same as on Windows). */
const ZPatience = (function(){
  const VARIANTS = {
    klondike1: { type: "klondike", draw: 1 }, klondike3: { type: "klondike", draw: 3 },
    spider1: { type: "spider", suits: 1 }, spider2: { type: "spider", suits: 2 }, spider4: { type: "spider", suits: 4 },
    freecell: { type: "freecell" }
  };
  const red = c => c.s === "H" || c.s === "D";
  function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, r){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const base = () => ({ tab: [], stock: [], waste: [], found: [], cells: [], moves: 0, score: 0, recycles: 0 });

  function deal(variant, seed){
    const v = VARIANTS[variant] || VARIANTS.klondike1; seed = (seed >>> 0) || 1;
    const st = { ...base(), variant: VARIANTS[variant] ? variant : "klondike1", type: v.type, draw: v.draw || 1, seed };
    if(v.type === "freecell"){
      // Windows FreeCell deal (Microsoft's random number generator)
      let s = seed; const rand = () => { s = (Math.imul(s, 214013) + 2531011) & 0x7fffffff; return s >> 16; };
      const deck = Array.from({ length: 52 }, (_, i) => i);
      st.tab = Array.from({ length: 8 }, () => []);
      for(let i = 0; i < 52; i++){
        const left = 52 - i, j = rand() % left, c = deck[j]; deck[j] = deck[left - 1];
        st.tab[i % 8].push({ id: c, s: "CDHS"[c % 4], r: Math.floor(c / 4) + 1, up: true });
      }
      st.cells = [null, null, null, null]; st.found = [[], [], [], []];
      return st;
    }
    const r = rng(seed);
    if(v.type === "spider"){
      const suits = v.suits === 1 ? "SSSS" : v.suits === 2 ? "SHSH" : "SHDC";
      const cards = []; let id = 0;
      for(let d = 0; d < 2; d++) for(const s of suits) for(let k = 1; k <= 13; k++) cards.push({ id: id++, s, r: k, up: false });
      const deck = shuffle(cards, r);
      st.tab = Array.from({ length: 10 }, (_, i) => deck.splice(0, i < 4 ? 6 : 5));
      st.tab.forEach(p => { p[p.length - 1].up = true; });
      st.stock = deck; st.found = Array.from({ length: 8 }, () => []); st.score = 500;
      return st;
    }
    const deck = shuffle([..."SHDC"].flatMap((s, si) => Array.from({ length: 13 }, (_, k) => ({ id: si * 13 + k, s, r: k + 1, up: false }))), r);
    st.tab = Array.from({ length: 7 }, (_, i) => deck.splice(0, i + 1));
    st.tab.forEach(p => { p[p.length - 1].up = true; });
    st.stock = deck; st.found = [[], [], [], []];
    return st;
  }

  const copy = st => ({ ...st, tab: st.tab.map(p => p.slice()), stock: st.stock.slice(), waste: st.waste.slice(), found: st.found.map(p => p.slice()), cells: st.cells.slice() });
  const top = p => p[p.length - 1];
  function cardsAt(st, from){
    if(!from) return [];
    if(from.k === "tab"){ const p = st.tab[from.i] || []; return from.idx >= 0 && from.idx < p.length ? p.slice(from.idx) : []; }
    if(from.k === "waste") return st.waste.length ? [top(st.waste)] : [];
    if(from.k === "cell") return st.cells[from.i] ? [st.cells[from.i]] : [];
    if(from.k === "found") return st.type !== "spider" && st.found[from.i] && st.found[from.i].length ? [top(st.found[from.i])] : [];
    return [];
  }
  function isRun(type, cards){
    for(let i = 0; i < cards.length; i++){
      if(!cards[i].up) return false;
      if(i === 0) continue;
      const a = cards[i - 1], b = cards[i];
      if(a.r !== b.r + 1) return false;
      if(type === "spider" ? a.s !== b.s : red(a) === red(b)) return false;
    }
    return true;
  }
  const freeCells = st => st.cells.filter(c => !c).length;
  const emptyCols = st => st.tab.filter(p => !p.length).length;
  // FreeCell "supermove": (free cells + 1) * 2^(empty columns), one fewer empty column counts if the target is empty
  const maxMove = (st, toEmpty) => (freeCells(st) + 1) * Math.pow(2, Math.max(0, emptyCols(st) - (toEmpty ? 1 : 0)));
  function canPick(st, from){ const cards = cardsAt(st, from); return cards.length > 0 && isRun(st.type, cards); }
  function canDrop(st, cards, to){
    if(!cards.length || !to) return false;
    const first = cards[0];
    if(to.k === "found"){
      if(st.type === "spider" || cards.length !== 1) return false;
      const f = st.found[to.i]; if(!f) return false;
      return f.length ? top(f).s === first.s && top(f).r + 1 === first.r : first.r === 1;
    }
    if(to.k === "cell") return st.type === "freecell" && cards.length === 1 && !st.cells[to.i] && to.i >= 0 && to.i < 4;
    if(to.k === "tab"){
      const p = st.tab[to.i]; if(!p) return false;
      if(st.type === "freecell" && cards.length > maxMove(st, !p.length)) return false;
      if(!p.length) return st.type !== "klondike" || first.r === 13;
      const t = top(p); if(!t.up || t.r !== first.r + 1) return false;
      return st.type === "spider" || red(t) !== red(first);
    }
    return false;
  }
  const same = (a, b) => a && b && a.k === b.k && a.i === b.i;
  // finished king-to-ace runs of one suit leave the table (Spider)
  function clearRuns(st, i){
    const p = st.tab[i]; if(p.length < 13) return;
    const run = p.slice(-13);
    if(run[0].r === 13 && isRun("spider", run)){
      st.tab[i] = p.slice(0, -13);
      const slot = st.found.findIndex(f => !f.length); st.found[slot] = run; st.score += 100;
      flipTop(st, i);
    }
  }
  function flipTop(st, i){
    const p = st.tab[i], t = top(p);
    if(t && !t.up){ p[p.length - 1] = { ...t, up: true }; if(st.type === "klondike") st.score += 5; return true; }
    return false;
  }
  function move(st, from, to){
    if(same(from, to)) return null;
    const cards = cardsAt(st, from);
    if(!canPick(st, from) || !canDrop(st, cards, to)) return null;
    const n = copy(st);
    if(from.k === "tab") n.tab[from.i] = n.tab[from.i].slice(0, from.idx);
    else if(from.k === "waste") n.waste.pop();
    else if(from.k === "cell") n.cells[from.i] = null;
    else if(from.k === "found") n.found[from.i] = n.found[from.i].slice(0, -1);
    if(to.k === "tab") n.tab[to.i] = n.tab[to.i].concat(cards);
    else if(to.k === "found") n.found[to.i] = n.found[to.i].concat(cards);
    else if(to.k === "cell") n.cells[to.i] = cards[0];
    if(from.k === "tab") flipTop(n, from.i);
    if(n.type === "klondike"){
      if(from.k === "waste") n.score += to.k === "found" ? 10 : 5;
      else if(from.k === "tab" && to.k === "found") n.score += 10;
      else if(from.k === "found") n.score = Math.max(0, n.score - 15);
    }
    if(n.type === "spider"){ n.score = Math.max(0, n.score - 1); if(to.k === "tab") clearRuns(n, to.i); }
    n.moves++;
    return n;
  }
  function canDraw(st){
    if(st.type === "klondike") return st.stock.length > 0 || st.waste.length > 0;
    if(st.type === "spider") return st.stock.length > 0 && st.tab.every(p => p.length > 0);
    return false;
  }
  function draw(st){
    if(!canDraw(st)) return null;
    const n = copy(st);
    if(st.type === "klondike"){
      if(n.stock.length){ const k = Math.min(n.draw, n.stock.length); const got = n.stock.splice(n.stock.length - k, k).reverse().map(c => ({ ...c, up: true })); n.waste = n.waste.concat(got); }
      else { n.stock = n.waste.slice().reverse().map(c => ({ ...c, up: false })); n.waste = []; n.recycles++; if(n.draw === 1) n.score = Math.max(0, n.score - 100); }
    } else {
      for(let i = 0; i < 10; i++){ const c = n.stock.pop(); n.tab[i] = n.tab[i].concat([{ ...c, up: true }]); }
      for(let i = 0; i < 10; i++) clearRuns(n, i);
      n.score = Math.max(0, n.score - 1);
    }
    n.moves++;
    return n;
  }
  function places(st){ // every place a card could go
    const p = st.tab.map((_, i) => ({ k: "tab", i }));
    if(st.type !== "spider") st.found.forEach((_, i) => p.push({ k: "found", i }));
    if(st.type === "freecell") st.cells.forEach((_, i) => p.push({ k: "cell", i }));
    return p;
  }
  function sources(st){
    const s = [];
    st.tab.forEach((p, i) => p.forEach((c, idx) => { if(c.up && isRun(st.type, p.slice(idx))) s.push({ k: "tab", i, idx }); }));
    if(st.waste.length) s.push({ k: "waste" });
    st.cells.forEach((c, i) => { if(c) s.push({ k: "cell", i }); });
    return s;
  }
  // Useful moves, best first: to the foundation, moves that uncover a card or empty a column, then the rest.
  function hints(st){
    const out = [];
    for(const from of sources(st)){
      const cards = cardsAt(st, from);
      for(const to of places(st)){
        if(from.k === "tab" && to.k === "tab" && from.i === to.i) continue;
        if(!canDrop(st, cards, to)) continue;
        let w = 0;
        if(to.k === "found") w = 100 - cards[0].r;
        else if(from.k === "tab"){
          const below = st.tab[from.i][from.idx - 1];
          const destEmpty = to.k !== "found" && to.k !== "cell" && !st.tab[to.i].length;
          if(from.idx === 0){ if(destEmpty || to.k === "cell") continue; w = 40; }                    // empties a column
          else if(!below.up) w = 60;                                                                     // uncovers a card
          else if(!isRun(st.type, st.tab[from.i].slice(from.idx - 1))) w = st.type === "spider" && below.r === cards[0].r + 1 ? 35 : 20;
          else continue;                                                                                 // just shuffles a run around
          if(destEmpty && to.k === "tab") w -= 15;
          if(to.k === "cell") w = 5;
          if(st.type === "spider" && to.k === "tab" && st.tab[to.i].length && top(st.tab[to.i]).s === cards[0].s) w += 10;
        } else if(from.k === "waste") w = to.k === "tab" && !st.tab[to.i].length ? 10 : 30;
        else if(from.k === "cell") w = to.k === "tab" && !st.tab[to.i].length ? 8 : 25;
        out.push({ from, to, w });
      }
    }
    return out.sort((a, b) => b.w - a.w);
  }
  // Where a tapped card goes: foundation first, then a column that takes it (non-empty before empty), then a free cell
  function autoTarget(st, from){
    const cards = cardsAt(st, from); if(!cards.length || !canPick(st, from)) return null;
    const ps = places(st), ok = to => !(from.k === "tab" && to.k === "tab" && to.i === from.i) && canDrop(st, cards, to);
    return ps.find(to => to.k === "found" && ok(to)) || ps.find(to => to.k === "tab" && st.tab[to.i].length && ok(to))
      || ps.find(to => to.k === "tab" && ok(to)) || ps.find(to => to.k === "cell" && ok(to)) || null;
  }
  const won = st => st.type === "spider" ? st.found.every(f => f.length === 13) : st.found.reduce((n, f) => n + f.length, 0) === 52;
  function canAutoFinish(st){
    if(st.type === "spider" || won(st)) return false;
    const open = st.type === "klondike" ? !st.stock.length && !st.waste.length && st.tab.every(p => p.every(c => c.up))
      : st.tab.every(p => p.every((c, i) => i === 0 || p[i - 1].r >= c.r));      // FreeCell: every column already sorted
    return open && !!autoStep(st);
  }
  function autoStep(st){ // the next card to the foundation, lowest first
    const cand = [];
    st.tab.forEach((p, i) => { if(p.length) cand.push({ k: "tab", i, idx: p.length - 1 }); });
    if(st.waste.length) cand.push({ k: "waste" });
    st.cells.forEach((c, i) => { if(c) cand.push({ k: "cell", i }); });
    let best = null;
    for(const from of cand){
      const c = cardsAt(st, from)[0];
      const to = st.found.map((_, i) => ({ k: "found", i })).find(t => canDrop(st, [c], t));
      if(to && (!best || c.r < best.r)) best = { from, to, r: c.r };
    }
    return best;
  }
  // No move left: nothing useful on the table and the stock can't help any more
  function stuck(st){
    if(won(st)) return false;
    if(hints(st).length) return false;
    if(st.type === "spider") return !canDraw(st) && !sources(st).some(f => places(st).some(t => !(f.k === "tab" && t.i === f.i) && canDrop(st, cardsAt(st, f), t)));
    if(st.type === "klondike"){
      const pile = st.stock.concat(st.waste);
      return !pile.some(c => places(st).some(t => canDrop(st, [{ ...c, up: true }], t)));
    }
    return !sources(st).some(f => places(st).some(t => !(f.k === "tab" && t.k === "tab" && t.i === f.i) && canDrop(st, cardsAt(st, f), t)));
  }
  const count = st => st.tab.flat().length + st.stock.length + st.waste.length + st.found.flat().length + st.cells.filter(Boolean).length;
  return { VARIANTS, red, deal, cardsAt, isRun, canPick, canDrop, move, draw, canDraw, hints, autoTarget, won, canAutoFinish, autoStep, stuck, maxMove, count };
})();
if(typeof module !== "undefined") module.exports = ZPatience;
