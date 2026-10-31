/* Zugpal Mau-Mau for 2 players with a 32-card deck (7 to ace). Cards: suit + rank, e.g. "H7", "SJ", "DA"
   (suits C clubs/Kreuz, S spades/Pik, H hearts/Herz, D diamonds/Karo; ranks 7 8 9 T J Q K A).
   Rules: 5 cards each. Play a card with the same suit or rank as the top card.
   7: the next player draws 2, unless they play a 7 too (then 4, ...). 8: the next player is skipped (with 2 players: play again).
   Jack (Bube): can go on anything except a jack, and you wish a suit. No fitting card: draw 1; then play it if it fits, or pass.
   First with no cards wins. Moves: "p<card>", jack "p<card>><suit>" e.g. "pHJ>S", "d" draw, "n" pass.
   The deck is shuffled from a seed so both phones of an online game deal the same cards. */
const ZMau = (function(){
  const SUITS = ["C", "S", "H", "D"], RANKS = ["7", "8", "9", "T", "J", "Q", "K", "A"];
  const deck = () => SUITS.flatMap(s => RANKS.map(r => s + r));
  function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(cards, r){ const a = cards.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const other = p => p === "w" ? "b" : "w";
  function newGame(seed){
    const r = rng(seed || 1), cards = shuffle(deck(), r);
    const hands = { w: cards.slice(0, 5), b: cards.slice(5, 10) };
    let rest = cards.slice(10);
    // the first open card is never a special card, so nobody starts with a penalty
    const i = rest.findIndex(c => !["7", "8", "J"].includes(c[1]));
    const top = rest[i]; rest = rest.slice(0, i).concat(rest.slice(i + 1));
    return { hands, stock: rest, pile: [top], turn: "w", wish: null, sevens: 0, drew: false, seed: (seed || 1) >>> 0, shuffles: 0 };
  }
  const top = st => st.pile[st.pile.length - 1];
  function fits(st, c){
    const t = top(st);
    if(st.sevens > 0) return c[1] === "7";
    if(c[1] === "J") return t[1] !== "J";
    if(st.wish) return c[0] === st.wish;
    return c[0] === t[0] || c[1] === t[1];
  }
  function moves(st){
    if(status(st).over) return [];
    const hand = st.hands[st.turn], out = [];
    const playable = st.drew ? [hand[hand.length - 1]].filter(c => fits(st, c)) : hand.filter(c => fits(st, c));
    for(const c of playable){ if(c[1] === "J") SUITS.forEach(s => out.push("p" + c + ">" + s)); else out.push("p" + c); }
    out.push(st.drew ? "n" : "d");
    return out;
  }
  // take n cards from the stock, reshuffling the played cards (except the top one) when it runs out
  function take(st, n){
    let stock = st.stock.slice(), pile = st.pile.slice(), shuffles = st.shuffles; const got = [];
    for(let i = 0; i < n; i++){
      if(!stock.length && pile.length > 1){ shuffles++; stock = shuffle(pile.slice(0, -1), rng(st.seed + shuffles * 7919)); pile = pile.slice(-1); }
      if(!stock.length) break;
      got.push(stock.shift());
    }
    return { got, stock, pile, shuffles };
  }
  function apply(st, m){
    if(!moves(st).includes(m)) return null;
    const p = st.turn, hands = { w: st.hands.w.slice(), b: st.hands.b.slice() };
    if(m === "d"){
      const n = st.sevens > 0 ? st.sevens * 2 : 1, t = take(st, n);
      hands[p].push(...t.got);
      const base = { ...st, hands, stock: t.stock, pile: t.pile, shuffles: t.shuffles };
      // drawing for 7s ends your turn; a normal draw lets you play the drawn card
      if(st.sevens > 0 || !t.got.length) return { ...base, sevens: 0, drew: false, turn: other(p) };
      return { ...base, drew: true };
    }
    if(m === "n") return { ...st, hands, drew: false, turn: other(p) };
    const [card, wish] = m.slice(1).split(">");
    hands[p].splice(hands[p].indexOf(card), 1);
    const next = { ...st, hands, pile: st.pile.concat([card]), drew: false, wish: card[1] === "J" ? wish : null, sevens: card[1] === "7" ? st.sevens + 1 : 0 };
    next.turn = card[1] === "8" ? p : other(p);
    return next;
  }
  function status(st){
    for(const p of ["w", "b"]) if(!st.hands[p].length) return { over: true, winner: p };
    return { over: false, winner: null };
  }
  // easy: any card that fits; normal: keeps jacks and 7s for the right moment, wishes its strongest suit
  function bestMove(st, level, rnd){
    rnd = rnd || Math.random;
    const ms = moves(st); if(ms.length === 1) return ms[0];
    const plays = ms.filter(m => m[0] === "p");
    if(level === "easy") return plays.length ? plays[Math.floor(rnd() * plays.length)] : ms[0];
    const me = st.turn, hand = st.hands[me], oppCards = st.hands[other(me)].length;
    const bySuit = s => hand.filter(c => c[0] === s && c[1] !== "J").length;
    let best = null, bv = -Infinity;
    for(const m of plays){
      const [card, wish] = m.slice(1).split(">");
      let v = 10;
      if(card[1] === "J") v = hand.length <= 2 ? 30 : -5 + bySuit(wish) * 3;
      else if(card[1] === "7") v = st.sevens > 0 ? 50 : oppCards <= 2 ? 25 : 8;
      else if(card[1] === "8") v = 15;
      v += bySuit(card[0]);
      if(v > bv){ bv = v; best = m; }
    }
    return best || ms[0];
  }
  /* Levels for the new card table: easy (any fitting card), medium (bestMove "normal"), hard (plans the next turn:
     keeps cards that can follow, wishes its strongest suit, saves jacks, uses 7s and 8s when they hurt most).
     It never looks at the other player's cards. */
  const POINTS = { "7": 7, "8": 8, "9": 9, T: 10, J: 20, Q: 3, K: 4, A: 11 };
  const points = cards => cards.reduce((s, c) => s + POINTS[c[1]], 0);
  function think(st, level, rnd){
    rnd = rnd || Math.random;
    if(level === "easy") return bestMove(st, "easy", rnd);
    if(level !== "hard") return bestMove(st, "normal", rnd);
    const ms = moves(st); if(ms.length === 1) return ms[0];
    const me = st.turn, hand = st.hands[me], opp = st.hands[other(me)].length;
    const plays = ms.filter(m => m[0] === "p"); if(!plays.length) return ms[0];
    const suitCount = (cards, s) => cards.filter(c => c[0] === s && c[1] !== "J").length;
    let best = null, bv = -Infinity;
    for(const m of plays){
      const [card, wish] = m.slice(1).split(">"), rest = hand.filter(c => c !== card);
      if(!rest.length) return m;                                            // last card: Mau-Mau
      const after = apply(st, m), follow = rest.filter(c => { const t2 = { ...after, drew: false }; return fits(t2, c); }).length;
      let v = follow * 6 + suitCount(rest, wish || card[0]) * 2 + POINTS[card[1]] * .3;
      if(card[1] === "J") v += rest.length <= 1 ? 40 : -18 + suitCount(rest, wish) * 4;
      if(card[1] === "7") v += st.sevens > 0 ? 60 : opp <= 2 ? 30 : 4 + (rest.some(c => c[1] === "7") ? 6 : 0);
      if(card[1] === "8") v += 12 + follow * 4;
      if(opp === 1 && card[1] === "7") v += 20;
      v += rnd() * .5;
      if(v > bv){ bv = v; best = m; }
    }
    return best;
  }
  return { SUITS, RANKS, deck, newGame, moves, apply, status, bestMove, top, fits, think, points };
})();
if(typeof module !== "undefined") module.exports = ZMau;
