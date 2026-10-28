// Builds library/catalog.json and copies the Project Gutenberg EPUBs into library/books/.
// Usage: node tools/build-catalog.js <dir with picks.json, librivox-picks.json and dl/<id>.epub|txt>
// picks.json comes from Gutenberg's official catalogue (pg_catalog.csv); every person on a book (author,
// translator, illustrator, editor) must have died before 1956, so the work is public domain in the EU too.
const fs = require("fs"), path = require("path");
const SRC = process.argv[2], ROOT = path.join(__dirname, "..");
const picks = require(path.join(SRC, "picks.json")), audio = require(path.join(SRC, "librivox-picks.json"));
const arWords = require(path.join(ROOT, "library", "wikisource-words.json"));
const WPM = { de: 170, en: 220, ar: 150 };                       // relaxed reading speed, incl. learners
const EASY = new Set([7810, 7888, 9158, 17161, 8923]);           // easier German (around B1)
const COLLECTION = new Set([21989, 7810, 9158, 49871, 2776, 902, 2781, 1732, 1661, 2814, 6638, "ar-kalila", "ar-manfaluti"]);
const AUDIO_FOR = { 2689: 22367, 539: 17161, 11094: 29376, 2975: 2320, 173: 74008, 1599: 21989, 391: 2776, 421: 902, 585: 2781, 3839: 9158 };

function person(s){ // "Kafka, Franz, 1883-1924 [Translator]" -> {name:"Franz Kafka", dates:"1883–1924", role}
  const m = /^(.*?),\s*([^,\d]*?)(?:,\s*([^,\d][^,]*?))?,\s*(\d{3,4})\??-(\d{3,4})\??(?:\s*\[(.+)\])?$/.exec(s.trim());
  if(!m) return { name: s.trim(), dates: "", role: "" };
  const first = (m[2] || "").replace(/\(.*\)/, "").trim();
  return { name: (first ? first + " " : "") + m[1].trim(), dates: `${m[4]}–${m[5]}`, role: m[6] || "" };
}
function words(txt){
  const s = txt.indexOf("*** START OF"), e = txt.indexOf("*** END OF");
  const body = txt.slice(s > 0 ? txt.indexOf("\n", s) : 0, e > 0 ? e : undefined);
  return body.split(/\s+/).filter(w => /\p{L}/u.test(w)).length;
}
const books = [];
fs.mkdirSync(path.join(ROOT, "library", "books"), { recursive: true });
for(const p of picks){
  const people = p.authors.split(/;\s*/).filter(Boolean).map(person);
  const author = people.find(x => !x.role) || people[0];
  const w = words(fs.readFileSync(path.join(SRC, "dl", p.id + ".txt"), "utf8"));
  fs.copyFileSync(path.join(SRC, "dl", p.id + ".epub"), path.join(ROOT, "library", "books", `pg${p.id}.epub`));
  books.push({ id: "pg" + p.id, file: `library/books/pg${p.id}.epub`, title: p.title.replace(/\s*:\s*/, ": "), author: author.name, dates: author.dates,
    others: people.filter(x => x.role).map(x => `${x.name} (${x.dates}), ${x.role}`), lang: p.lang, words: w, minutes: Math.max(1, Math.round(w / WPM[p.lang])),
    easy: EASY.has(p.id), collection: COLLECTION.has(p.id),
    source: "Project Gutenberg", sourceUrl: `https://www.gutenberg.org/ebooks/${p.id}`,
    licence: "Public domain. The EPUB is the unchanged Project Gutenberg file and includes the Project Gutenberg License." });
}
const AR = {
  "ar-gibran-wings": { title: "الأجنحة المتكسرة", author: "جبران خليل جبران", dates: "1883–1931", url: "https://ar.wikisource.org/wiki/الأجنحة_المتكسرة" },
  "ar-kalila": { title: "كليلة ودمنة (مختارات)", author: "ابن المقفع", dates: "ت. نحو 759", url: "https://ar.wikisource.org/wiki/كليلة_ودمنة" },
  "ar-manfaluti": { title: "النظرات (مختارات)", author: "مصطفى لطفي المنفلوطي", dates: "1876–1924", url: "https://ar.wikisource.org/wiki/النظرات" }
};
for(const { key, words: w } of arWords){
  const a = AR[key];
  books.push({ id: key, file: `library/books/${key}.epub`, title: a.title, author: a.author, dates: a.dates, others: [], lang: "ar", words: w,
    minutes: Math.max(1, Math.round(w / WPM.ar)), easy: false, collection: COLLECTION.has(key), source: "ويكي مصدر / Wikisource", sourceUrl: a.url,
    licence: "Public domain. Text from Arabic Wikisource, converted to EPUB by Zugpal without changes (credits page inside)." });
}
for(const a of audio){
  const b = books.find(x => x.id === "pg" + AUDIO_FOR[a.id]); if(!b) throw new Error("no book for audio " + a.id);
  b.audio = { librivoxId: a.id, title: a.title, page: a.page, minutes: Math.round(a.secs / 60), readers: [...new Set(a.sections.map(s => s.reader).filter(Boolean))],
    parts: a.sections.map(s => ({ title: s.title, url: s.url.replace(/^https?:\/\/(www\.)?archive\.org/, "https://archive.org"), minutes: Math.round(s.secs / 60) })),
    licence: "LibriVox recording, public domain (librivox.org). Streamed from archive.org." };
}
books.sort((x, y) => x.minutes - y.minutes);
fs.writeFileSync(path.join(ROOT, "library", "catalog.json"), JSON.stringify({ updated: "2026-10-28", books }, null, 1));
console.log(books.length, "books,", books.filter(b => b.audio).length, "with audio;", books.filter(b => b.minutes <= 15).length, "≤15 min;",
  books.map(b => `${b.minutes}′ ${b.title.slice(0, 28)}`).join(" | "));
