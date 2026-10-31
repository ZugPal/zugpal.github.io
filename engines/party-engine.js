/* Zugpal party games.
   ZQuiz = "Quizfahrt": 6 questions picked from ZQuestions with a seed (same game on both phones), answers shuffled per game.
   ZSlf  = Stadt-Land-Fluss for 2: same letter per round from the seed; points 20 (only you), 10 (different), 5 (same), 0 (empty, wrong letter, rejected). */
const ZSeed = (function(){
  function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(s){ let h = 2166136261; for(const c of String(s)){ h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function shuffle(a, r){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  return { rng, hash, shuffle };
})();

const ZQuiz = (function(){
  const CATS = ["lid", "geo", "rail", "nature", "lang", "mix"];
  // questions: indexes into the bank; answers: order of the 4 options (option 0 in the bank is always the right one)
  function newGame(bank, seed, count){
    const r = ZSeed.rng(seed), n = count || 6;
    const byCat = CATS.map(c => ZSeed.shuffle(bank.map((q, i) => q.cat === c ? i : -1).filter(i => i >= 0), r));
    const picks = []; let k = 0;
    while(picks.length < n && byCat.some(l => l.length)){ const l = byCat[k++ % byCat.length]; if(l.length) picks.push(l.shift()); }
    return { qs: picks.map(i => ({ i, order: ZSeed.shuffle([0, 1, 2, 3], r) })), answers: { w: [], b: [] } };
  }
  // choice = position on screen (0..3); correct if it shows bank option 0
  const correct = (q, choice) => q.order[choice] === 0;
  /* The duel (new games): 3 rounds, each round one category picked by the wheel from the seed, 3 questions per round. */
  function newDuel(bank, seed){
    const r = ZSeed.rng(seed), cats = ZSeed.shuffle(CATS, r).slice(0, 3), qs = [];
    cats.forEach(c => ZSeed.shuffle(bank.map((q, i) => q.cat === c ? i : -1).filter(i => i >= 0), r).slice(0, 3).forEach(i => qs.push({ i, order: ZSeed.shuffle([0, 1, 2, 3], r) })));
    return { qs, rounds: cats, per: 3, answers: { w: [], b: [] } };
  }
  // choice 4 = time ran out (counts as wrong)
  function answer(st, p, choice){
    const a = st.answers[p]; if(a.length >= st.qs.length || !(choice >= 0 && choice <= 4)) return st;
    return { ...st, answers: { ...st.answers, [p]: a.concat([choice]) } };
  }
  const score = (st, p) => st.answers[p].filter((c, i) => correct(st.qs[i], c)).length;
  function status(st){
    const done = p => st.answers[p].length >= st.qs.length;
    if(!done("w") || !done("b")) return { over: false, winner: null };
    const w = score(st, "w"), b = score(st, "b");
    return { over: true, winner: w > b ? "w" : b > w ? "b" : null };
  }
  // computer: right with a chance depending on the level
  const cpuChoice = (q, level, rnd) => (rnd || Math.random)() < ({ easy: 0.45, medium: 0.65, normal: 0.75, hard: 0.88 }[level] || 0.65) ? q.order.indexOf(0) : Math.floor((rnd || Math.random)() * 4);
  // 50:50 joker: two wrong positions to hide
  const fifty = (q, rnd) => ZSeed.shuffle([0, 1, 2, 3].filter(p => q.order[p] !== 0), () => (rnd || Math.random)()).slice(0, 2);
  return { CATS, newGame, newDuel, correct, answer, score, status, cpuChoice, fifty };
})();

const ZSlf = (function(){
  const LETTERS = { de: "ABDEFGHIKLMNOPRSTUW", en: "ABCDEFGHIJKLMNOPRSTW", ar: "ابتجحدرسشصعفقكلمنهو" };
  const CATS = 6;   // city, country, river, first name, animal, job
  const letter = (lang, seed, round) => { const L = Array.from(LETTERS[lang] || LETTERS.de); return L[Math.floor(ZSeed.rng(seed + round * 7919)() * L.length)]; };
  function norm(lang, s){
    s = String(s || "").trim();
    if(lang === "ar") return s.replace(/[ً-ْـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/^ال(?=.)/, "").replace(/ى/g, "ي").replace(/ة$/, "ه");
    return s.toLocaleUpperCase(lang === "de" ? "de-DE" : "en-US").replace(/\s+/g, " ").replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ß/g, "SS");
  }
  // first letter counts (German umlauts count as their base letter: Ärzte -> A); Arabic ignores the article ال
  function valid(lang, L, answer){
    const n = norm(lang, answer); if(n.length < 2) return false;
    const first = lang === "ar" ? n[0] : n[0];
    return first === norm(lang, L)[0];
  }
  // points for one player's answers vs the other's; rejected = array of category indexes the other player rejected
  function points(lang, L, mine, theirs, rejected){
    return Array.from({ length: CATS }, (_, i) => {
      const okA = valid(lang, L, mine[i]) && !(rejected || []).includes(i);
      if(!okA) return 0;
      const okB = valid(lang, L, theirs[i]);
      if(!okB) return 20;
      return norm(lang, mine[i]) === norm(lang, theirs[i]) ? 5 : 10;
    });
  }
  return { LETTERS, CATS, letter, norm, valid, points };
})();
if(typeof module !== "undefined") module.exports = { ZSeed, ZQuiz, ZSlf };
