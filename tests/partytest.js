// Tests for engines/party-engine.js (Quizfahrt, Stadt-Land-Fluss) and engines/quiz-questions.js. Usage: node tests/partytest.js
const path = require("path");
const { ZQuiz, ZSlf } = require(path.resolve(__dirname, "../engines/party-engine.js"));
const Q = require(path.resolve(__dirname, "../engines/quiz-questions.js"));
let ok = true;
const check = (name, cond, extra) => { if(!cond){ ok = false; console.log("FAIL", name, extra || ""); } else console.log("PASS", name); };

// question bank: every question in 3 languages with 4 different answers, 6 categories with 8 questions
const bad = Q.filter(q => !ZQuiz.CATS.includes(q.cat) || ["de", "en", "ar"].some(l => !Array.isArray(q[l]) || q[l].length !== 5 || q[l].some(s => !String(s).trim()) || new Set(q[l].slice(1)).size !== 4));
check(`question bank complete (${Q.length})`, !bad.length, bad.map(q => q.de && q.de[0]).join(" | "));
check("8 questions per category", ZQuiz.CATS.every(c => Q.filter(q => q.cat === c).length === 8));
check("Leben in Deutschland is there", Q.some(q => q.cat === "lid"));
const g = ZQuiz.newGame(Q, 1234);
check("6 different questions, one per category", g.qs.length === 6 && new Set(g.qs.map(q => q.i)).size === 6 && new Set(g.qs.map(q => Q[q.i].cat)).size === 6);
check("same seed, same game", JSON.stringify(ZQuiz.newGame(Q, 1234)) === JSON.stringify(g) && JSON.stringify(ZQuiz.newGame(Q, 99)) !== JSON.stringify(g));
check("answers are shuffled", new Set(g.qs.map(q => q.order.join(""))).size > 1);
let s = g; g.qs.forEach(q => { s = ZQuiz.answer(s, "w", q.order.indexOf(0)); s = ZQuiz.answer(s, "b", (q.order.indexOf(0) + 1) % 4); });
check("scoring and winner", ZQuiz.score(s, "w") === 6 && ZQuiz.score(s, "b") === 0 && ZQuiz.status(s).winner === "w");
check("no extra answers", ZQuiz.answer(s, "w", 0) === s);
let right = 0; for(let i = 0; i < 2000; i++){ const q = g.qs[i % 6]; if(ZQuiz.correct(q, ZQuiz.cpuChoice(q, "normal"))) right++; }
check(`normal computer is right about 80% (${Math.round(right / 20)}%)`, right / 2000 > 0.7 && right / 2000 < 0.9);

// Stadt-Land-Fluss
check("letters are the same on both phones", ZSlf.letter("de", 77, 2) === ZSlf.letter("de", 77, 2));
check("letters come from the list", [0, 1, 2, 3, 4].every(r => ZSlf.LETTERS.ar.includes(ZSlf.letter("ar", 5, r))));
check("valid German answer, umlaut counts", ZSlf.valid("de", "A", "Aachen") && ZSlf.valid("de", "A", "Ärztin") && !ZSlf.valid("de", "B", "Aachen") && !ZSlf.valid("de", "A", "A"));
check("Arabic ignores the article", ZSlf.valid("ar", "ق", "القاهرة") && ZSlf.valid("ar", "ا", "أسوان"));
const pts = ZSlf.points("de", "B", ["Berlin", "Belgien", "", "Ben", "Biber", "Bäcker"], ["Berlin", "Brasilien", "Bode", "", "Bär", "Bäcker"], [4]);
check("points 5 same / 10 different / 0 empty / 20 alone / 0 rejected", pts.join() === "5,10,0,20,0,5", pts.join());
console.log(ok ? "ALL PARTY TESTS OK" : "PARTY TESTS FAILED");
process.exit(ok ? 0 : 1);
