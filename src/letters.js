// Buchstabenzug / Letter Train, our hangman without gallows, modelled on the popular hangman apps: pick a theme,
// guess letter by letter; right letters pop into place, every wrong letter uncouples the last coach, which rolls away.
// Find the word and the train leaves with a whistle; lose all coaches and the word is shown in red. Three levels
// (9, 7 or 5 coaches), a hint that costs a coach, statistics, two players on one phone (one types a secret word, the
// other guesses), online with a match, and a real keyboard works too. Rules: engines/words-engine.js (ZLetters),
// words and themes: engines/wordlists.js.
// Online chat cards (unchanged): lt:<gid>:<code> ("<lang>|<word>" lightly scrambled, sender picked the word), lg:<gid>:<letter>.
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, hasContact, parseMsg, t, toast } from "./util.js";

const WLANGS = ["de", "en", "ar"], CATS = ["all", "travel", "food", "nature", "animals", "home", "free"], LEVELS = { easy: 9, normal: 7, hard: 5 };
const GID = /^[A-Za-z0-9]{4,12}$/;
const store = { get(k, d){ try{ const v = localStorage.getItem("zugpal.lt." + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("zugpal.lt." + k, JSON.stringify(v)); }catch(e){} } };
const newGid = () => Math.random().toString(36).slice(2, 10);
const wordLang = () => WLANGS.includes(S.wordLang) ? S.wordLang : (WLANGS.includes(S.lang) ? S.lang : "de");
const dirOf = lang => lang === "ar" ? "rtl" : "ltr";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const scramble = s => btoa(unescape(encodeURIComponent(s))).split("").reverse().join("");
function unscramble(s){ try{ return decodeURIComponent(escape(atob(String(s).split("").reverse().join("")))); }catch(e){ return ""; } }
const listOf = (lang, cat) => cat && cat !== "all" && ZWords[lang].cats[cat] ? ZWords[lang].cats[cat] : ZWords[lang].long;
const catOfWord = (lang, word) => Object.keys(ZWords[lang].cats).find(c => ZWords[lang].cats[c].some(w => ZWord.norm(lang, w).join("") === word.join("")));

/* ---------------- State ---------------- */
function onlineLt(gid){
  let inv = null, st = null;
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type === "lt" && p.val === gid && !inv){
      const [lang, word] = unscramble(p.extra).split("|"); const w = ZWord.norm(lang, word);
      if(WLANGS.includes(lang) && ZWord.isWord(lang, w, 3, 12)){ inv = { setter: x.mine, lang, word }; st = ZLetters.newGame(w); }
    }
    if(p.type === "lg" && p.val === gid && inv && x.mine !== inv.setter){ const c = ZWord.norm(inv.lang, p.extra)[0]; if(c && ZWord.alphabet(inv.lang).includes(c)) st = ZLetters.guess(st, c); }
  }
  return inv ? { ...inv, st } : null;
}
function ltState(){
  const l = S.lt; if(!l) return null;
  if(l.mode === "online") return onlineLt(l.gid);
  if(l.mode === "local" && l.phase === "pick") return { lang: l.lang, st: null, setter: false };
  return { lang: l.lang, st: l.st, setter: false };
}
function newCpu(lang, cat, level){
  const list = listOf(lang, cat), word = ZWord.norm(lang, list[Math.floor(Math.random() * list.length)]);
  return { mode: "cpu", lang, cat, level, st: ZLetters.newGame(word, LEVELS[level] || 7) };
}
// remember what was on screen, so a new wrong letter, a new right letter or the end can be animated once
function track(l, st){
  if(!st){ l.prev = null; return; }
  const s = ZLetters.status(st), now = Date.now(), key = st.word.join("") + "|" + st.max;
  if(!l.prev || l.prev.key !== key || st.tried.length < l.prev.tried){ l.prev = { key, tried: st.tried.length, wrong: s.wrong, left: s.left, over: s.over }; return; }
  if(st.tried.length > l.prev.tried){
    const c = st.tried[st.tried.length - 1];
    if(s.left < l.prev.left){ l.goneAt = now; l.goneIndex = s.left; }
    if(st.word.includes(c)){ l.hitAt = now; l.hit = c; }
  }
  if(s.over && !l.prev.over){
    l.endAt = now;
    if(l.mode === "cpu"){ const k = "stats", x = store.get(k, { played: 0, won: 0, streak: 0, best: 0 }); x.played++; if(s.won){ x.won++; x.streak++; x.best = Math.max(x.best, x.streak); } else x.streak = 0; store.set(k, x); }
    const g = l; setTimeout(() => { if(S.lt === g && S.screen === "letters"){ S.ltEnd = true; render(); } }, reduced() ? 300 : 1900);
    setTimeout(() => { if(S.lt === g) render(); }, 1700);
  }
  l.prev = { key, tried: st.tried.length, wrong: s.wrong, left: s.left, over: s.over };
}

/* ---------------- Pieces of UI ---------------- */
function keyboard(lang, st, setter){
  const rows = ZWord.KEYS[lang].map(r => `<div class="krow">${Array.from(r).map(c => {
    const used = st.tried.includes(c), m = used ? (st.word.includes(c) ? " g" : " x") : "";
    return `<button class="key${m}" data-act="ltKey" data-arg="${esc(c)}"${used || setter ? " disabled" : ""}>${esc(c)}</button>`; }).join("")}</div>`).join("");
  return `<div class="keyboard" dir="${dirOf(lang)}">${rows}</div>`;
}
function train(l, st){
  const s = ZLetters.status(st), now = Date.now(), el = n => now - (n || 0);
  let coaches = "";
  for(let i = st.max - 1; i >= 0; i--){                 // the last coach is drawn first (left), the locomotive last (right)
    if(i < s.left) coaches += `<span class="lcoach c${i % 3}"><i></i><i></i></span>`;
    else if(i === l.goneIndex && el(l.goneAt) < 1100) coaches += `<span class="lcoach c${i % 3} roll" style="animation-delay:${-el(l.goneAt)}ms"><i></i><i></i></span>`;
  }
  const depart = s.won && l.endAt ? `depart" style="animation-delay:${400 - el(l.endAt)}ms` : s.lost ? "stuck" : "";
  return `<div class="ltrack" role="img" aria-label="${t("ltLeft", { n: s.left })}"><div class="ltrain ${depart}">${coaches}<span class="lloco"><i class="cab"></i><i class="chim"></i>${s.won ? `<i class="puff"></i><i class="puff p2"></i>` : ""}</span></div></div>`;
}
function slots(l, st, lang, reveal){
  const s = ZLetters.status(st), view = ZLetters.view(st), now = Date.now();
  return `<div class="slots" dir="${dirOf(lang)}">${st.word.map((c, i) => {
    const hit = view[i] && c === l.hit && now - (l.hitAt || 0) < 500;
    const cls = view[i] ? (hit ? " hit" : "") : s.lost ? " miss" : "";
    return `<span class="slot${cls}">${view[i] ? esc(c) : reveal || s.lost ? `<span class="ghost">${esc(c)}</span>` : ""}</span>`; }).join("")}</div>`;
}
const chips = (act, list, cur, cls) => `<div class="seg ltchips${cls ? " " + cls : ""}">${list.map(([v, txt]) => `<button class="chip" data-act="${act}" data-arg="${v}" aria-pressed="${cur === v}">${txt}</button>`).join("")}</div>`;

/* ---------------- Screens ---------------- */
function lettersScreen(){
  const l = S.lt, ls = ltState(); if(!l || !ls) return null;
  const online = l.mode === "online", lang = ls.lang;
  const name = online ? esc((peerOf(l.peerId) || { first_name: l.peerName || "" }).first_name) : "";
  const head = `<div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${online ? "chat" : "games"}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("ltName")}</div><div class="small">${online ? name : l.mode === "local" ? t("daLocal") : t("ltCat_" + (l.cat || "all"))}</div></div>
      <button class="iconbtn" data-act="ltHelpOpen" aria-label="${t("tkRules")}">?</button>
      ${l.mode === "cpu" ? `<button class="iconbtn" data-act="ltStats" aria-label="${t("zwStatsT")}">📊︎</button>` : ""}</div>
    ${online ? onlineInfo("lt", l) : chips("ltMode", [["cpu", t("ltSolo")], ["local", t("daLocal")]], l.mode)}`;
  if(l.mode === "local" && l.phase === "pick") return `<div class="screen ltscreen">${head}
    <div class="card"><div class="pname">${t("ltLocalPick")}</div><div class="small">${t("ltLocalPickD")}</div>
      <div class="field"><input type="password" id="ltSecret" data-bind="ltSecret" maxlength="12" autocomplete="off" autocapitalize="characters" dir="auto" aria-label="${t("ltLocalPick")}" value="${esc(S.draft.ltSecret || "")}"></div>
      <button class="btn" data-act="ltLocalStart">${t("ltLocalGo")}</button></div>
    ${langRow(l)}</div>`;
  const st = ls.st; track(l, st);
  const s = ZLetters.status(st), word = st.word.join("");
  let line;
  if(ls.setter) line = s.won ? t("ltTheyWon", { name }) : s.lost ? t("ltTheyLost", { name }) : t("ltSetterView", { name });
  else line = s.won ? t("ltWon") : s.lost ? t("ltLost", { w: esc(word) }) : t("ltLeft", { n: s.left });
  const cat = l.mode === "cpu" ? catOfWord(lang, st.word) : null;
  return `<div class="screen ltscreen">${head}
    ${l.mode === "cpu" ? chips("ltCat", CATS.map(c => [c, t("ltCat_" + c)]), l.cat || "all", "ltthemes") : ""}
    <div class="cstatus zwline" role="status" aria-live="polite">${line}</div>
    ${train(l, st)}
    ${cat ? `<div class="ltcat"><span class="tag">${t("ltTheme")}: ${t("ltCat_" + cat)}</span></div>` : ""}
    ${slots(l, st, lang, ls.setter)}
    ${ls.setter ? `<div class="small">${t("ltTried")}: ${esc(st.tried.join(" ")) || "–"}</div>` : keyboard(lang, st, false)}
    <div class="row" style="flex-wrap:wrap">
      ${!online && !s.over ? `<button class="btn ghost small" data-act="ltHint"${s.left < 2 ? " disabled" : ""}>💡︎ ${t("ltHintB")}</button>` : ""}
      ${l.mode === "cpu" ? `<button class="btn ghost small" data-act="ltNew">${t("zwNewWord")}</button>` : l.mode === "local" ? `<button class="btn ghost small" data-act="ltSwap">${t("ltSwap")}</button>` : `<button class="btn ghost small" data-act="wordSheet" data-arg="lt">${t("newGame")}</button><button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button>`}
    </div>
    ${l.mode === "cpu" ? chips("ltLevel", Object.keys(LEVELS).map(k => [k, t("ltLevel_" + k)]), l.level || "normal") : ""}
    ${online ? "" : langRow(l)}
  </div>`;
}
function langRow(l){
  return `<div class="seg" role="group" aria-label="${t("wordLang")}"><span class="small" style="align-self:center">${t("wordLang")}</span>${WLANGS.map(x =>
    `<button class="chip" data-act="ltLang" data-arg="${x}" aria-pressed="${l.lang === x}">${{ de: "Deutsch", en: "English", ar: "العربية" }[x]}</button>`).join("")}</div>`;
}
function ltOverlay(){
  const l = S.lt; if(!l) return "";
  if(S.ltHelp) return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel"><h2>${t("tkRules")}</h2><p>${t("ltRules")}</p>
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="ltClose">${t("close")}</button></div></div></div>`;
  if(S.ltEnd || S.ltStatsOpen){
    const ls = ltState(), st = ls && ls.st, s = st && ZLetters.status(st), end = S.ltEnd && s && s.over;
    const x = store.get("stats", { played: 0, won: 0, streak: 0, best: 0 });
    const stats = l.mode === "cpu" ? `<div class="zwstats"><div><b>${x.played}</b><span>${t("zwPlayed")}</span></div><div><b>${x.played ? Math.round(x.won / x.played * 100) : 0}</b><span>${t("zwWinPct")}</span></div><div><b>${x.streak}</b><span>${t("zwStreak")}</span></div><div><b>${x.best}</b><span>${t("zwBest")}</span></div></div>` : "";
    const who = l.mode === "local" ? (s && s.won ? t("ltLocalWon") : t("ltLocalLost")) : "";
    return `<div class="sheet center" role="dialog" aria-modal="true"><div class="panel zwend"><h2>${!end ? t("zwStatsT") : s.won ? t("ltWonT") : t("ltLostT")}</h2>
      ${end ? `<div class="ltword${s.won ? "" : " lost"}" dir="${dirOf(ls.lang)}">${st.word.map(c => `<span>${esc(c)}</span>`).join("")}</div>${who ? `<p>${who}</p>` : ""}` : ""}
      ${stats}
      ${end && l.mode === "cpu" ? `<button class="btn" data-act="ltNew">${t("zwNewWord")}</button>` : ""}
      ${end && l.mode === "local" ? `<button class="btn" data-act="ltSwap">${t("ltSwap")}</button>` : ""}
      ${end && l.mode === "online" && !ls.setter ? `<button class="btn" data-act="wordSheet" data-arg="lt">${t("ltYourTurn")}</button>` : ""}
      <button class="link" data-act="ltClose">${t("close")}</button></div></div>`;
  }
  return "";
}

/* ---------------- Actions ---------------- */
function openLt(l){ S.lt = l; S.ltEnd = false; S.ltStatsOpen = false; S.screen = "letters"; render(); }
const lettersActions = {
  ltCpu(){ const c = store.get("last", {}); openLt(newCpu(wordLang(), CATS.includes(c.cat) ? c.cat : "all", LEVELS[c.level] ? c.level : "normal")); },
  ltMode(m){
    const lang = S.lt && S.lt.lang || wordLang();
    if(m === "local"){ S.draft.ltSecret = ""; openLt({ mode: "local", lang, phase: "pick" }); }
    else lettersActions.ltCpu();
  },
  ltCat(c){ if(!CATS.includes(c) || !S.lt) return; store.set("last", { cat: c, level: S.lt.level }); openLt(newCpu(S.lt.lang, c, S.lt.level || "normal")); },
  ltLevel(v){ if(!LEVELS[v] || !S.lt) return; store.set("last", { cat: S.lt.cat, level: v }); openLt(newCpu(S.lt.lang, S.lt.cat, v)); },
  ltNew(){ const l = S.lt; if(!l) return; openLt(newCpu(l.lang, l.cat || "all", l.level || "normal")); },
  ltLang(x){
    if(!WLANGS.includes(x)) return; S.wordLang = x; const l = S.lt;
    if(l && l.mode === "local"){ S.draft.ltSecret = ""; openLt({ mode: "local", lang: x, phase: "pick" }); }
    else openLt(newCpu(x, l && l.cat || "all", l && l.level || "normal"));
  },
  ltKey(c){
    const l = S.lt, ls = ltState(); if(!l || !ls || !ls.st || ls.setter || ZLetters.status(ls.st).over) return;
    if(!ZWord.alphabet(ls.lang).includes(c) || ls.st.tried.includes(c)) return;
    if(l.mode === "online") sendBody(CARD + "lg:" + l.gid + ":" + c);
    else { l.st = ZLetters.guess(l.st, c); render(); }
    if(!ls.st.word.includes(c)) try{ navigator.vibrate && navigator.vibrate(40); }catch(e){}
    setTimeout(() => { if(S.lt === l) render(); }, 1150);        // let the rolling coach finish
  },
  ltHint(){
    const l = S.lt; if(!l || l.mode === "online" || !l.st) return;
    const s = ZLetters.status(l.st); if(s.over) return; if(s.left < 2) return toast(t("ltHintNo"));
    l.st = ZLetters.hint(l.st); render(); setTimeout(() => { if(S.lt === l) render(); }, 1150);
  },
  ltLocalStart(){
    const l = S.lt; if(!l || l.mode !== "local") return;
    const raw = String(S.draft.ltSecret || "").trim(), w = ZWord.norm(l.lang, raw);
    if(!ZWord.isWord(l.lang, w, 3, 12) || hasContact(raw)) return toast(t("ltBadWord"));
    S.draft.ltSecret = ""; openLt({ mode: "local", lang: l.lang, phase: "guess", st: ZLetters.newGame(w, 7) });
  },
  ltSwap(){ const l = S.lt; S.draft.ltSecret = ""; openLt({ mode: "local", lang: l && l.lang || wordLang(), phase: "pick" }); },
  ltStats(){ S.ltStatsOpen = true; render(); },
  ltHelpOpen(){ S.ltHelp = true; render(); },
  ltClose(){ S.ltHelp = false; S.ltEnd = false; S.ltStatsOpen = false; render(); },
  ltOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); openLt({ mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name }); },
  ltInvite(){
    const lang = wordLang(), raw = String(S.draft.ltWord || "").trim(), w = ZWord.norm(lang, raw);
    if(!ZWord.isWord(lang, w, 3, 12) || hasContact(raw)) return toast(t("ltBadWord"));
    const gid = newGid(), m = peerOf(S.chatWith);
    S.wordSheet = null; S.draft.ltWord = "";
    sendBody(CARD + "lt:" + gid + ":" + scramble(lang + "|" + w.join("")));
    openLt({ mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name });
  }
};
// a real keyboard works too
if(typeof document !== "undefined") document.addEventListener("keydown", e => {
  if(S.screen !== "letters" || !S.lt || e.ctrlKey || e.metaKey || e.altKey || S.ltEnd || S.ltHelp || S.ltStatsOpen) return;
  if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const ls = ltState(); if(!ls || !ls.st || !e.key || e.key.length !== 1) return;
  const c = ZWord.norm(ls.lang, e.key)[0]; if(c && ZWord.alphabet(ls.lang).includes(c)){ e.preventDefault(); lettersActions.ltKey(c); }
});

export { lettersActions, lettersScreen, ltOverlay };
