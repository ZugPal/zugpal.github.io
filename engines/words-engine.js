/* Zugpal word games.
   ZWord    = "Zugwort": guess a 5-letter word in 6 tries (our own game and name). Marks: "g" right place, "y" in the word, "x" not in it.
   ZLetters = "Buchstabenzug" / "Letter Train": guess a word letter by letter; every wrong letter uncouples one of 7 coaches.
   Words are arrays of letters after norm(), so Arabic, German umlauts and English all work the same way. */
const ZWord = (function(){
  const ALPHA = {
    de: "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ",
    en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ar: "ابتثجحخدذرزسشصضطظعغفقكلمنهويةء"
  };
  const KEYS = {
    de: ["QWERTZUIOPÜ", "ASDFGHJKLÖÄ", "YXCVBNM"],
    en: ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"],
    ar: ["ضصثقفغعهخحج", "شسيبلاتنمكط", "ءرزوةدذظ"]
  };
  // Arabic: drop vowel marks and tatweel, fold alef/hamza/ya variants so "أزهار" and "ازهار" are the same word.
  function norm(lang, s){
    s = String(s || "").trim();
    if(lang === "ar"){
      s = s.replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
    } else s = s.toLocaleUpperCase(lang === "de" ? "de-DE" : "en-US");
    return Array.from(s);
  }
  const alphabet = lang => Array.from(ALPHA[lang] || ALPHA.en);
  const isWord = (lang, letters, min, max) => letters.length >= min && letters.length <= max && letters.every(c => ALPHA[lang].includes(c));
  function word5(lang, s){ const w = norm(lang, s); return isWord(lang, w, 5, 5) ? w : null; }

  // Marks for one guess; repeated letters only count as often as they appear in the answer.
  function score(answer, guess){
    const marks = Array(guess.length).fill("x"), left = {};
    answer.forEach((c, i) => { if(guess[i] === c) marks[i] = "g"; else left[c] = (left[c] || 0) + 1; });
    guess.forEach((c, i) => { if(marks[i] !== "g" && left[c] > 0){ marks[i] = "y"; left[c]--; } });
    return marks;
  }
  function newGame(answer, maxTries){ return { answer: answer.slice(), rows: [], max: maxTries || 6, won: false, over: false }; }
  function play(st, guess){
    if(st.over || !guess || guess.length !== st.answer.length) return st;
    const marks = score(st.answer, guess), rows = st.rows.concat([{ guess: guess.slice(), marks }]);
    const won = marks.every(m => m === "g");
    return { answer: st.answer, rows, max: st.max, won, over: won || rows.length >= st.max };
  }
  // Best mark per letter, for colouring the keyboard
  function keys(st){
    const rank = { g: 3, y: 2, x: 1 }, out = {};
    st.rows.forEach(r => r.guess.forEach((c, i) => { if(!out[c] || rank[r.marks[i]] > rank[out[c]]) out[c] = r.marks[i]; }));
    return out;
  }
  // Computer player. history: [{guess, marks}]. "normal" uses all clues and picks the most informative candidate;
  // "easy" ignores yellow clues and guesses at random among what is left.
  function solve(words, history, level, rnd){
    rnd = rnd || Math.random;
    const easyFits = (w, h) => h.guess.every((c, i) => {
      if(h.marks[i] === "g") return w[i] === c;
      if(h.marks[i] === "x" && !h.guess.some((d, j) => d === c && h.marks[j] !== "x")) return !w.includes(c);
      return true;
    });
    const fits = w => history.every(h => level === "easy" ? easyFits(w, h) : score(w, h.guess).join("") === h.marks.join(""));
    let cand = words.filter(fits);
    if(!cand.length) cand = words;
    if(level === "easy") return cand[Math.floor(rnd() * cand.length)];
    const freq = {};
    cand.forEach(w => new Set(w).forEach(c => { freq[c] = (freq[c] || 0) + 1; }));
    let best = cand[0], bestScore = -1;
    for(const w of cand){ const s = [...new Set(w)].reduce((a, c) => a + freq[c], 0); if(s > bestScore){ best = w; bestScore = s; } }
    return best;
  }
  // Same word on both phones from a shared game id
  function hash(s){ let h = 2166136261; for(const c of String(s)){ h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
  const pick = (list, seed) => list[hash(seed) % list.length];
  return { norm, alphabet, isWord, word5, score, newGame, play, keys, solve, hash, pick, KEYS };
})();

const ZLetters = (function(){
  function newGame(word, maxWrong){ return { word: word.slice(), tried: [], max: maxWrong || 7, hints: 0 }; }
  function guess(st, letter){
    if(!letter || st.tried.includes(letter) || status(st).over) return st;
    return { word: st.word, tried: st.tried.concat([letter]), max: st.max, hints: st.hints || 0 };
  }
  // A hint shows one missing letter and costs a coach (only while at least two are left)
  function hint(st, rnd){
    const s = status(st); if(s.over || s.left < 2) return st;
    const miss = [...new Set(st.word.filter(c => !st.tried.includes(c)))]; if(!miss.length) return st;
    const c = miss[Math.floor((rnd || Math.random)() * miss.length)];
    return { word: st.word, tried: st.tried.concat([c]), max: st.max - 1, hints: (st.hints || 0) + 1 };
  }
  const view = st => st.word.map(c => st.tried.includes(c) ? c : null);
  function status(st){
    const wrong = st.tried.filter(c => !st.word.includes(c)).length;
    const won = st.word.every(c => st.tried.includes(c));
    return { wrong, left: st.max - wrong, won, lost: !won && wrong >= st.max, over: won || wrong >= st.max };
  }
  return { newGame, guess, hint, view, status };
})();
if(typeof module !== "undefined") module.exports = { ZWord, ZLetters };
