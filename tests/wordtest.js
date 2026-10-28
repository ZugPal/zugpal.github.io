// Tests for engines/words-engine.js and engines/wordlists.js. Usage: node tests/wordtest.js
const path = require("path");
const { ZWord, ZLetters } = require(path.resolve(__dirname, "../engines/words-engine.js"));
const ZWords = require(path.resolve(__dirname, "../engines/wordlists.js"));
let ok = true;
const check = (name, cond, extra) => { if(!cond){ ok = false; console.log("FAIL", name, extra || ""); } else console.log("PASS", name); };
const w = (lang, s) => ZWord.norm(lang, s);

// Word lists: right length and alphabet, no duplicates (after normalising)
for(const lang of ["de", "en", "ar"]){
  const five = ZWords[lang].five.map(x => w(lang, x)), long = ZWords[lang].long.map(x => w(lang, x));
  const bad5 = ZWords[lang].five.filter((x, i) => !ZWord.isWord(lang, five[i], 5, 5));
  const badL = ZWords[lang].long.filter((x, i) => !ZWord.isWord(lang, long[i], 4, 13));
  check(`${lang}: all five-letter words valid (${five.length})`, !bad5.length, bad5.join(" "));
  check(`${lang}: all long words valid (${long.length})`, !badL.length, badL.join(" "));
  const keys = five.map(x => x.join(""));
  check(`${lang}: no duplicate five-letter words`, new Set(keys).size === keys.length, keys.filter((k, i) => keys.indexOf(k) !== i).join(" "));
  check(`${lang}: enough words`, five.length >= 60 && long.length >= 25);
  const keyLetters = new Set(ZWord.KEYS[lang].join(""));
  check(`${lang}: keyboard has every letter`, ZWord.alphabet(lang).every(c => keyLetters.has(c)), ZWord.alphabet(lang).filter(c => !keyLetters.has(c)).join(""));
}

// Arabic normalisation
check("ar: hamza forms fold", w("ar", "أزهار").join("") === "ازهار" && w("ar", "إبريق").join("") === "ابريق");
check("ar: vowel marks dropped", w("ar", "مَدْرَسَة").join("") === "مدرسة");
check("de: umlauts upper-cased", w("de", "glück").join("") === "GLÜCK");

// Scoring incl. repeated letters
const sc = (a, g) => ZWord.score(w("en", a), w("en", g)).join("");
check("score all right", sc("TRAIN", "TRAIN") === "ggggg");
check("score mixed", sc("TRAIN", "RAINS") === "yyyyx", sc("TRAIN", "RAINS"));
check("score repeated guess letter counts once", sc("CRANE", "EERIE") === "xxyxg", sc("CRANE", "EERIE"));
check("score repeated answer letter", sc("APPLE", "PAPER") === "yygyx", sc("APPLE", "PAPER"));

// Game flow
let st = ZWord.newGame(w("en", "TRAIN"));
st = ZWord.play(st, w("en", "PLANT"));
check("play keeps going", !st.over && st.rows.length === 1);
check("short guess ignored", ZWord.play(st, w("en", "TRA")).rows.length === 1);
st = ZWord.play(st, w("en", "TRAIN"));
check("win ends game", st.won && st.over);
let lose = ZWord.newGame(w("en", "TRAIN")); for(let i = 0; i < 6; i++) lose = ZWord.play(lose, w("en", "OCEAN"));
check("six misses end game", lose.over && !lose.won && lose.rows.length === 6);
check("keyboard colours", ZWord.keys(st).T === "g" && ZWord.keys(st).P === "x");

// Same word on both phones
check("pick is deterministic", ZWord.pick(ZWords.de.five, "ab12") === ZWord.pick(ZWords.de.five, "ab12"));

// Computer player solves (normal) nearly always within 6; easy still plays legal words
for(const lang of ["de", "en", "ar"]){
  const list = ZWords[lang].five.map(x => w(lang, x));
  let solved = 0, total = 0;
  for(const ans of list){
    let g = ZWord.newGame(ans);
    while(!g.over){ g = ZWord.play(g, ZWord.solve(list, g.rows, "normal")); }
    total++; if(g.won) solved++;
  }
  check(`${lang}: normal computer solves ${solved}/${total}`, solved / total >= 0.95);
  let e = ZWord.newGame(list[3]); let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  while(!e.over) e = ZWord.play(e, ZWord.solve(list, e.rows, "easy", rnd));
  check(`${lang}: easy computer finishes a game`, e.over);
}

// Letter Train (hangman)
let h = ZLetters.newGame(w("de", "ZUG"));
h = ZLetters.guess(h, "Z"); h = ZLetters.guess(h, "Q"); h = ZLetters.guess(h, "Q");
check("letters: wrong counted once", ZLetters.status(h).wrong === 1);
check("letters: view shows found", ZLetters.view(h).join(",") === "Z,,");
h = ZLetters.guess(ZLetters.guess(h, "U"), "G");
check("letters: win", ZLetters.status(h).won && ZLetters.status(h).over);
let l = ZLetters.newGame(w("en", "ZUG")); "ABCDEFH".split("").forEach(c => { l = ZLetters.guess(l, c); });
check("letters: 7 wrong loses", ZLetters.status(l).lost && ZLetters.guess(l, "Z").tried.length === 7);

console.log(ok ? "ALL WORD TESTS OK" : "WORD TESTS FAILED");
process.exit(ok ? 0 : 1);
