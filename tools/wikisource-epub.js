// Builds EPUB files for the library from public-domain works on Arabic Wikisource (official MediaWiki API).
// Usage: node tools/wikisource-epub.js   -> library/books/<key>.epub
// Each book gets a credits page with the source pages, author dates and licence note.
const fs = require("fs"), path = require("path"), JSZip = require("jszip");
const OUT = path.join(__dirname, "..", "library", "books");
const API = "https://ar.wikisource.org/w/api.php";
const H = { headers: { "User-Agent": "Zugpal library builder (https://zugpal.github.io)" } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const WORKS = [
  { key: "ar-gibran-wings", title: "الأجنحة المتكسرة", author: "جبران خليل جبران", dates: "1883–1931", base: "الأجنحة المتكسرة", chapters: null },
  { key: "ar-kalila", title: "كليلة ودمنة (مختارات)", author: "ابن المقفع", dates: "توفي نحو 759م", base: "كليلة ودمنة",
    chapters: ["باب الحمامة المطوقة", "باب القرد والغيلم", "باب الجرذ والسنور", "باب السائح والصائغ", "باب الناسك والضيف", "باب الحمامة والثعلب ومالك الحزين"] },
  { key: "ar-manfaluti", title: "النظرات (مختارات)", author: "مصطفى لطفي المنفلوطي", dates: "1876–1924", base: "النظرات",
    chapters: ["الغد", "مناجاة القمر", "الغَنيُّ والفقير", "الرحمة", "الصدق والكذب", "الصياد", "الجمال", "البخيل", "البعوض والإنسان", "مدينة السعادة"] }
];

async function parse(page){
  const j = await (await fetch(`${API}?action=parse&format=json&prop=text&page=${encodeURIComponent(page)}`, H)).json();
  if(!j.parse) throw new Error("missing page " + page);
  return j.parse.text["*"];
}
const decode = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// keep only the running text: paragraphs and poem lines, without headers, navigation, notes and references
function paragraphs(html){
  html = html.replace(/<(table|style|sup|div class="ws-noexport|span class="mw-editsection)[\s\S]*?<\/(table|style|sup|div|span)>/g, "");
  const out = [];
  for(const m of html.matchAll(/<(p|dd)[^>]*>([\s\S]*?)<\/\1>/g)){
    const txt = decode(m[2].replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();
    if(txt && !/^\[?\d+\]?$/.test(txt)) out.push(txt);
  }
  return out;
}
const xhtml = (title, body) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="ar" xml:lang="ar" dir="rtl">
<head><meta charset="utf-8"/><title>${esc(title)}</title></head><body dir="rtl">${body}</body></html>`;

async function build(w){
  let chapters = w.chapters;
  if(!chapters){
    const main = await parse(w.base);
    chapters = [...new Set([...main.matchAll(/href="\/wiki\/([^"#]+)"/g)].map(m => decodeURIComponent(m[1]).replace(/_/g, " "))
      .filter(x => x.startsWith(w.base + "/")).map(x => x.slice(w.base.length + 1)))];
  }
  const parts = [];
  for(const c of chapters){ await sleep(800); parts.push({ title: c, paras: paragraphs(await parse(w.base + "/" + c)) }); }
  const words = parts.reduce((n, p) => n + p.paras.join(" ").split(/\s+/).filter(Boolean).length, 0);
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  const items = [], spine = [], nav = [];
  parts.forEach((p, i) => {
    const f = `c${i + 1}.xhtml`;
    zip.file("OEBPS/" + f, xhtml(p.title, `<h2>${esc(p.title)}</h2>` + p.paras.map(t => `<p>${esc(t).replace(/\n/g, "<br/>")}</p>`).join("")));
    items.push(`<item id="c${i + 1}" href="${f}" media-type="application/xhtml+xml"/>`); spine.push(`<itemref idref="c${i + 1}"/>`);
    nav.push(`<li><a href="${f}">${esc(p.title)}</a></li>`);
  });
  const src = chapters.map(c => `https://ar.wikisource.org/wiki/${encodeURIComponent((w.base + "/" + c).replace(/ /g, "_"))}`);
  zip.file("OEBPS/credits.xhtml", xhtml("المصدر", `<h2>المصدر والترخيص</h2><p>${esc(w.title)} — ${esc(w.author)} (${esc(w.dates)}).</p>
    <p>نص في الملك العام، مأخوذ من ويكي مصدر العربية (ar.wikisource.org). أعدّه Zugpal في كتاب إلكتروني دون تغيير النص.</p>
    <p>Public domain text from Arabic Wikisource; author died more than 70 years ago. Converted to EPUB by Zugpal without changing the text.</p>
    <ul>${src.map(u => `<li>${esc(decodeURIComponent(u))}</li>`).join("")}</ul>`));
  items.push(`<item id="credits" href="credits.xhtml" media-type="application/xhtml+xml"/>`); spine.push(`<itemref idref="credits"/>`);
  zip.file("OEBPS/nav.xhtml", xhtml(w.title, `<nav epub:type="toc"><h1>${esc(w.title)}</h1><ol>${nav.join("")}<li><a href="credits.xhtml">المصدر</a></li></ol></nav>`));
  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" dir="rtl">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">zugpal-${w.key}</dc:identifier><dc:title>${esc(w.title)}</dc:title>
<dc:creator>${esc(w.author)}</dc:creator><dc:language>ar</dc:language><dc:rights>Public domain</dc:rights><dc:source>https://ar.wikisource.org/wiki/${encodeURIComponent(w.base)}</dc:source>
<meta property="dcterms:modified">2026-10-28T00:00:00Z</meta></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${items.join("")}</manifest>
<spine page-progression-direction="rtl">${spine.join("")}</spine></package>`);
  fs.mkdirSync(OUT, { recursive: true });
  const buf = await zip.generateAsync({ type: "nodebuffer", mimeType: "application/epub+zip" });
  fs.writeFileSync(path.join(OUT, w.key + ".epub"), buf);
  console.log(w.key, parts.length, "chapters,", words, "words,", buf.length, "bytes");
  return { key: w.key, words };
}
(async () => { const res = []; for(const w of WORKS) res.push(await build(w)); fs.writeFileSync(path.join(__dirname, "..", "library", "wikisource-words.json"), JSON.stringify(res, null, 1)); })();
