// Offline library: public-domain short works (Project Gutenberg, Arabic Wikisource) and LibriVox audiobooks.
// Catalogue: library/catalog.json (built by tools/build-catalog.js). Books are EPUBs on our own site; "Download"
// stores the file in IndexedDB so it opens without internet. Audiobooks stream from archive.org (LibriVox) and
// can be downloaded the same way. The reader (epub.js) and the player live outside #app, so polling can't close them.
import { sendBody } from "./chat.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, t, toast } from "./util.js";

/* ---------------- Storage (IndexedDB) ---------------- */
let dbp = null;
function db(){
  if(!dbp) dbp = new Promise((ok, fail) => {
    const r = indexedDB.open("zugpal-library", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
  });
  return dbp;
}
async function idb(mode, fn){
  const d = await db();
  return new Promise((ok, fail) => { const tx = d.transaction("files", mode), st = tx.objectStore("files"); const req = fn(st); tx.oncomplete = () => ok(req && req.result); tx.onerror = () => fail(tx.error); });
}
const getFile = key => idb("readonly", s => s.get(key));
const putFile = (key, blob) => idb("readwrite", s => s.put(blob, key));
const delFile = key => idb("readwrite", s => s.delete(key));
const allKeys = () => idb("readonly", s => s.getAllKeys());

/* ---------------- Catalogue ---------------- */
async function loadCatalog(){
  if(!S.lib) S.lib = { books: null, shelf: "short", lang: "all", stored: new Set(), busy: {} };
  if(S.lib.books) return;
  try{
    const c = await (await fetch("library/catalog.json")).json();
    S.lib.books = c.books;
    S.lib.stored = new Set(await allKeys().catch(() => []));
  }catch(e){ console.error(e); S.lib.books = []; toast(t("netError")); }
  render();
}
const bookById = id => S.lib && S.lib.books ? S.lib.books.find(b => b.id === id) : null;
const progress = id => { try{ return JSON.parse(localStorage.getItem("zugpal.read." + id) || "null"); }catch(e){ return null; } };
const LANG_NAME = { de: "Deutsch", en: "English", ar: "العربية" };
function mins(n){ return n < 60 ? t("libMin",{n}) : t("libHours",{h:Math.floor(n/60), m:String(n%60).padStart(2,"0")}); }

/* ---------------- Screens ---------------- */
function bookRow(b){
  const p = progress(b.id), tags = [];
  if(b.easy) tags.push(`<span class="tag lang">${t("libEasy")}</span>`);
  if(b.collection) tags.push(`<span class="tag plain">${t("libShortStories")}</span>`);
  if(b.audio) tags.push(`<span class="tag plain">${ICON.mic}${t("libAudio")}</span>`);
  if(S.lib.stored.has(b.id)) tags.push(`<span class="tag">${t("libOffline")}</span>`);
  return `<button class="bookrow" data-act="libBook" data-arg="${esc(b.id)}" lang="${b.lang}">
    <span class="spine ${b.lang}" aria-hidden="true">${esc(b.title.slice(0,1))}</span>
    <span class="grow"><span class="pname" dir="auto">${esc(b.title)}</span><span class="small" dir="auto">${esc(b.author)} · ${mins(b.minutes)}${p && p.pct ? ` · ${Math.round(p.pct*100)} %` : ""}</span>
    ${tags.length ? `<span class="tags">${tags.join("")}</span>` : ""}</span></button>`;
}
function libraryScreen(){
  if(!S.lib || !S.lib.books){ loadCatalog(); return `<div class="screen"><p class="muted">${t("loading")}</p></div>`; }
  const L = S.lib;
  let list = L.books.filter(b => L.lang === "all" || b.lang === L.lang);
  if(L.shelf === "short") list = list.filter(b => b.minutes <= 20 || b.collection);
  if(L.shelf === "easy") list = list.filter(b => b.easy);
  if(L.shelf === "audio") list = list.filter(b => b.audio);
  if(L.shelf === "mine") list = list.filter(b => L.stored.has(b.id) || progress(b.id));
  const shelf = (k, label) => `<button class="chip" data-act="libShelf" data-arg="${k}" aria-pressed="${L.shelf===k}">${label}</button>`;
  const lang = k => `<button class="chip" data-act="libLang" data-arg="${k}" aria-pressed="${L.lang===k}">${k==="all" ? t("libAll") : LANG_NAME[k]}</button>`;
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="go" data-arg="${S.libBack || "checkin"}" aria-label="${t("back")}">${ICON.back}</button><h1 class="grow" style="font-size:26px">${t("libTitle")}</h1></div>
    ${S.lib.pickFor ? `<div class="banner info">${t("libPickHint")}</div>` : `<p class="muted" style="margin:0">${t("libHint")}</p>`}
    <div class="games" role="group">${shelf("short", t("libShelfShort"))}${shelf("easy", t("libShelfEasy"))}${shelf("audio", t("libShelfAudio"))}${shelf("all", t("libShelfAll"))}${shelf("mine", t("libShelfMine"))}</div>
    <div class="seg">${["all","de","en","ar"].map(lang).join("")}</div>
    ${L.shelf === "short" ? `<div class="small">${t("libShortNote")}</div>` : ""}
    <div class="booklist">${list.map(bookRow).join("") || `<div class="empty"><div class="muted">${t("libEmpty")}</div></div>`}</div>
    <button class="link" data-act="go" data-arg="credits" style="align-self:flex-start">${t("libCredits")}</button>
  </div>`;
}
function bookScreen(){
  const b = bookById(S.lib && S.lib.bookId); if(!b) return libraryScreen();
  const L = S.lib, stored = L.stored.has(b.id), busy = L.busy[b.id], p = progress(b.id);
  const audio = b.audio ? `<div class="card"><div class="pname">${ICON.mic} ${t("libListen")} · ${mins(b.audio.minutes)}</div>
      <div class="small">${t("libReadBy",{r:esc(b.audio.readers.join(", "))})} · ${t("libStreamNote")}</div>
      <div class="parts">${b.audio.parts.map((pt, i) => `<button class="chip opt" data-act="libPlay" data-arg="${esc(b.id)}|${i}">▶︎ ${esc(pt.title)} · ${mins(pt.minutes)}${L.stored.has(b.id + "#" + i) ? " · " + t("libOffline") : ""}</button>`).join("")}</div>
      ${b.audio.parts.every((_, i) => L.stored.has(b.id + "#" + i)) ? `<button class="link" data-act="libAudioRemove" data-arg="${esc(b.id)}">${t("libRemoveAudio")}</button>`
        : `<button class="btn ghost small" data-act="libAudioDownload" data-arg="${esc(b.id)}"${L.busy[b.id + "#a"] ? " disabled" : ""}>${L.busy[b.id + "#a"] ? esc(L.busy[b.id + "#a"]) : t("libDownloadAudio")}</button>`}</div>` : "";
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="go" data-arg="library" aria-label="${t("back")}">${ICON.back}</button><div class="grow small">${t("libTitle")}</div></div>
    <div lang="${b.lang}"><h1 dir="auto" style="font-size:26px">${esc(b.title)}</h1><div class="muted" dir="auto">${esc(b.author)}${b.dates ? ` (${esc(b.dates)})` : ""}</div>
      ${b.others.length ? `<div class="small" dir="auto">${esc(b.others.join("; "))}</div>` : ""}</div>
    <div class="tags">${b.easy ? `<span class="tag lang">${t("libEasy")}</span>` : ""}<span class="tag plain">${LANG_NAME[b.lang]}</span><span class="tag plain">${mins(b.minutes)} · ${t("libWords",{n:b.words.toLocaleString(S.lang)})}</span></div>
    <button class="btn" data-act="libRead" data-arg="${esc(b.id)}">${p && p.pct ? t("libContinue",{p:Math.round(p.pct*100)}) : t("libRead")}</button>
    ${stored ? `<button class="link" data-act="libRemove" data-arg="${esc(b.id)}" style="align-self:flex-start">${t("libRemove")}</button>`
      : `<button class="btn ghost" data-act="libDownload" data-arg="${esc(b.id)}"${busy ? " disabled" : ""}>${busy ? t("libDownloading") : t("libDownload")}</button>`}
    ${stored ? `<div class="small">${t("libStoredNote")}</div>` : ""}
    ${audio}
    ${S.lib.pickFor || S.chatWith ? `<button class="btn ghost" data-act="libSend" data-arg="${esc(b.id)}">${ICON.bubble}${t("libTalk")}</button>` : `<div class="small">${t("libTalkHint")}</div>`}
    <div class="small">${t("libSource")}: <a href="${esc(b.sourceUrl)}" target="_blank" rel="noopener">${esc(b.source)}</a>. ${esc(b.licence)}</div>
  </div>`;
}
function creditsScreen(){
  if(!S.lib || !S.lib.books){ loadCatalog(); return `<div class="screen"><p class="muted">${t("loading")}</p></div>`; }
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="go" data-arg="library" aria-label="${t("back")}">${ICON.back}</button><h1 class="grow" style="font-size:24px">${t("libCredits")}</h1></div>
    <p class="small">${t("libCreditsIntro")}</p>
    <div class="card"><div class="pname">${t("libSoftware")}</div><div class="small">epub.js (BSD-2-Clause), JSZip (MIT), Supabase JS (MIT), chess pieces “cburnett” by Colin M.L. Burnett (GPLv2+, via Lichess), Schriften/fonts: Bricolage Grotesque, DM Sans, IBM Plex Sans Arabic (SIL OFL 1.1).</div></div>
    ${S.lib.books.map(b => `<div class="credit" lang="${b.lang}"><div class="pname" dir="auto">${esc(b.title)}</div>
      <div class="small" dir="auto">${esc(b.author)}${b.dates ? " (" + esc(b.dates) + ")" : ""}${b.others.length ? "; " + esc(b.others.join("; ")) : ""}</div>
      <div class="small"><a href="${esc(b.sourceUrl)}" target="_blank" rel="noopener">${esc(b.source)}</a> · ${esc(b.licence)}</div>
      ${b.audio ? `<div class="small"><a href="${esc(b.audio.page)}" target="_blank" rel="noopener">LibriVox</a> · ${esc(b.audio.readers.join(", "))} · ${esc(b.audio.licence)}</div>` : ""}</div>`).join("")}
  </div>`;
}

/* ---------------- Reader (epub.js) ---------------- */
function loadScript(src){ return new Promise((ok, fail) => { if(document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); }); }
let reader = null;
async function openReader(id){
  const b = bookById(id); if(!b) return;
  try{
    await loadScript("vendor/jszip.min.js"); await loadScript("vendor/epub.min.js");
    let data = await getFile(id).catch(() => null);
    if(!data){ const r = await fetch(b.file); if(!r.ok) throw new Error("fetch " + r.status); data = await r.blob(); }
    const buf = await data.arrayBuffer();
    closeReader();
    const rtl = b.lang === "ar";
    const el = document.createElement("div"); el.className = "reader"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    el.innerHTML = `<div class="rbar"><button class="iconbtn" data-act="readerClose" aria-label="${t("close")}">✕</button><div class="grow rtitle" dir="auto">${esc(b.title)}</div>
      <button class="iconbtn" data-act="readerFont" data-arg="-1" aria-label="A-">A−</button><button class="iconbtn" data-act="readerFont" data-arg="1" aria-label="A+">A+</button></div>
      <div class="rview" id="rview"></div>
      <div class="rbar"><button class="btn ghost small" data-act="readerTurn" data-arg="${rtl ? "next" : "prev"}">‹</button><div class="grow small" style="text-align:center" id="rpct"></div><button class="btn ghost small" data-act="readerTurn" data-arg="${rtl ? "prev" : "next"}">›</button></div>`;
    document.body.appendChild(el);
    const book = ePub(buf), dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const rendition = book.renderTo("rview", { width: "100%", height: "100%", flow: "paginated", spread: "none", allowScriptedContent: false });
    rendition.themes.default({ body: { "font-family": rtl ? "'IBM Plex Sans Arabic', system-ui, sans-serif" : "Georgia, 'Times New Roman', serif", "line-height": "1.6",
      color: dark ? "#EAF0ED" : "#15211D", background: dark ? "#0D1412" : "#FBFAF6", padding: "0 6px !important" }, "a": { color: "inherit" } });
    const size = Number(localStorage.getItem("zugpal.readSize") || 110); rendition.themes.fontSize(size + "%");
    reader = { id, book, rendition, size, el };
    const saved = progress(id);
    // first time: start at the story, not at the Project Gutenberg front page (the licence stays in the book)
    await book.ready;
    const start = saved && saved.cfi ? saved.cfi : (b.source === "Project Gutenberg" && book.spine.length > 1 ? book.spine.get(1).href : undefined);
    await rendition.display(start);
    rendition.on("relocated", loc => {
      const pct = book.locations.length() ? book.locations.percentageFromCfi(loc.start.cfi) : (saved && saved.pct) || 0;
      try{ localStorage.setItem("zugpal.read." + id, JSON.stringify({ cfi: loc.start.cfi, pct })); }catch(e){}
      const p = document.getElementById("rpct"); if(p) p.textContent = book.locations.length() ? Math.round(pct * 100) + " %" : "";
    });
    rendition.on("keyup", e => { if(e.key === "ArrowRight") rendition.next(); if(e.key === "ArrowLeft") rendition.prev(); });
    book.ready.then(() => book.locations.generate(1600)).catch(() => {});
  }catch(e){ console.error(e); toast(navigator.onLine === false ? t("libNeedDownload") : t("netError")); }
}
function closeReader(){ if(!reader) return; try{ reader.book.destroy(); }catch(e){} reader.el.remove(); reader = null; render(); }

/* ---------------- Audio player ---------------- */
let player = null;
async function play(id, i){
  const b = bookById(id); if(!b || !b.audio) return; const part = b.audio.parts[i]; if(!part) return;
  if(!player){
    player = document.createElement("div"); player.className = "player";
    player.innerHTML = `<div class="row"><div class="grow small" id="ptitle" dir="auto"></div><button class="iconbtn" data-act="playerClose" aria-label="${t("close")}">✕</button></div><audio id="paudio" controls preload="none"></audio>`;
    document.body.appendChild(player);
    player.querySelector("audio").addEventListener("ended", () => { const c = player.cur; if(c && c.i + 1 < bookById(c.id).audio.parts.length) play(c.id, c.i + 1); });
  }
  const stored = await getFile(id + "#" + i).catch(() => null);
  const a = player.querySelector("audio");
  if(player.objUrl) URL.revokeObjectURL(player.objUrl), player.objUrl = null;
  if(stored){ player.objUrl = URL.createObjectURL(stored); a.src = player.objUrl; } else if(navigator.onLine === false) return toast(t("libNeedDownload")); else a.src = part.url;
  player.cur = { id, i };
  player.querySelector("#ptitle").textContent = `${b.title} · ${part.title}`;
  a.play().catch(() => {});
}

/* ---------------- Actions ---------------- */
async function persist(){ try{ if(navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); }catch(e){} }
const libraryActions = {
  openLibrary(){ S.libBack = S.screen === "chat" ? "chat" : S.screen === "nearby" ? "nearby" : "checkin"; if(S.lib) S.lib.pickFor = null; S.screen = "library"; render(); },
  libPick(){ S.libBack = "chat"; if(!S.lib) S.lib = { books: null, shelf: "short", lang: "all", stored: new Set(), busy: {} }; S.lib.pickFor = S.chatWith; S.screen = "library"; render(); },
  libShelf(k){ S.lib.shelf = k; render(); },
  libLang(k){ S.lib.lang = k; render(); },
  libBook(id){ S.lib.bookId = id; S.screen = "book"; window.scrollTo(0, 0); render(); },
  libOpen(id){ libraryActions.openLibrary(); loadCatalog().then(() => { S.lib.bookId = id; S.screen = "book"; render(); }); },
  libRead(id){ openReader(id); },
  async libDownload(id){
    const b = bookById(id); if(!b) return; S.lib.busy[id] = true; render();
    try{ const r = await fetch(b.file); if(!r.ok) throw new Error(r.status); await putFile(id, await r.blob()); S.lib.stored.add(id); persist(); toast(t("libSaved")); }
    catch(e){ console.error(e); toast(t("netError")); }
    delete S.lib.busy[id]; render();
  },
  async libRemove(id){ await delFile(id).catch(() => {}); S.lib.stored.delete(id); render(); },
  async libAudioDownload(id){
    const b = bookById(id); if(!b || !b.audio) return; const key = id + "#a";
    try{
      for(let i = 0; i < b.audio.parts.length; i++){
        if(S.lib.stored.has(id + "#" + i)) continue;
        S.lib.busy[key] = t("libDownloadingN",{i:i+1, n:b.audio.parts.length}); render();
        const r = await fetch(b.audio.parts[i].url); if(!r.ok) throw new Error(r.status);
        await putFile(id + "#" + i, await r.blob()); S.lib.stored.add(id + "#" + i);
      }
      persist(); toast(t("libSaved"));
    }catch(e){ console.error(e); toast(t("netError")); }
    delete S.lib.busy[key]; render();
  },
  async libAudioRemove(id){ const b = bookById(id); for(let i = 0; i < b.audio.parts.length; i++){ await delFile(id + "#" + i).catch(() => {}); S.lib.stored.delete(id + "#" + i); } render(); },
  libPlay(arg){ const [id, i] = String(arg).split("|"); play(id, Number(i)); },
  playerClose(){ if(player){ player.querySelector("audio").pause(); if(player.objUrl) URL.revokeObjectURL(player.objUrl); player.remove(); player = null; } },
  readerClose(){ closeReader(); },
  readerTurn(dir){ if(reader) dir === "prev" ? reader.rendition.prev() : reader.rendition.next(); },
  readerFont(d){ if(!reader) return; reader.size = Math.min(180, Math.max(80, reader.size + Number(d) * 10)); reader.rendition.themes.fontSize(reader.size + "%"); try{ localStorage.setItem("zugpal.readSize", reader.size); }catch(e){} },
  libSend(id){
    const to = (S.lib && S.lib.pickFor) || S.chatWith; if(!to) return toast(t("libTalkHint"));
    S.chatWith = to; S.lib.pickFor = null; S.screen = "chat"; sendBody(CARD + "book:" + id); render();
  }
};
// Chat card "talk about this story": title, author and a question to start the conversation
const ASK = ["libAsk1", "libAsk2", "libAsk3", "libAsk4"];
function bookCard(p, x, name){
  const id = String(p.val || ""); if(!/^[a-z0-9-]{3,30}$/.test(id)) return "";
  const b = bookById(id); if(!b){ loadCatalog(); return ""; }
  const q = ASK[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % ASK.length];
  return `<div class="gamecard"><span class="lbl">${t("libTalkTitle")}</span><span class="big" dir="auto" lang="${b.lang}">${esc(b.title)}</span>
    <span dir="auto">${esc(b.author)} · ${mins(b.minutes)}</span><span>${x.mine ? t("libSentBy") : t("libSentFrom",{name})} ${t(q)}</span>
    <button class="btn small" style="align-self:center" data-act="libOpen" data-arg="${esc(id)}">${t("libOpenBook")}</button></div>`;
}

export { bookCard, bookScreen, creditsScreen, libraryActions, libraryScreen };
