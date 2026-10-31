// Word games: "Buchstabenzug" / Letter Train (guess letter by letter, 7 coaches), plus the chat sheet and chat cards
// for both word games. Zugwort itself lives in zugwort.js. Online with a match through chat cards (same system as chess):
//   zw:<gid>:<coop|race>-<lang>   invite (sender starts; both phones derive the same word from <gid>)
//   zg:<gid>:<word>               a guess
//   lt:<gid>:<code>               Letter Train invite; <code> is "<lang>|<word>" lightly scrambled (sender picked the word)
//   lg:<gid>:<letter>             a guessed letter (only the receiver guesses)
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, hasContact, parseMsg, t, toast } from "./util.js";

const WLANGS = ["de", "en", "ar"];
const GID = /^[A-Za-z0-9]{4,12}$/;
const newGid = () => Math.random().toString(36).slice(2, 10);
const wordLang = () => WLANGS.includes(S.wordLang) ? S.wordLang : (WLANGS.includes(S.lang) ? S.lang : "de");
const dirOf = lang => lang === "ar" ? "rtl" : "ltr";
const scramble = s => btoa(unescape(encodeURIComponent(s))).split("").reverse().join("");
function unscramble(s){ try{ return decodeURIComponent(escape(atob(String(s).split("").reverse().join("")))); }catch(e){ return ""; } }

/* ---------------- Online state, replayed from the chat like chess ---------------- */
function onlineLt(gid){
  let inv = null, st = null;
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type==="lt" && p.val===gid && !inv){
      const [lang, word] = unscramble(p.extra).split("|"); const w = ZWord.norm(lang, word);
      if(WLANGS.includes(lang) && ZWord.isWord(lang, w, 3, 12)){ inv = {setter:x.mine, lang, word}; st = ZLetters.newGame(w); }
    }
    if(p.type==="lg" && p.val===gid && inv && x.mine !== inv.setter){ const c = ZWord.norm(inv.lang, p.extra)[0]; if(c && ZWord.alphabet(inv.lang).includes(c)) st = ZLetters.guess(st, c); }
  }
  return inv ? {...inv, st} : null;
}
function ltState(){ const l = S.lt; if(!l) return null; return l.mode==="cpu" ? {lang:l.lang, st:l.st, setter:false, word:l.word} : onlineLt(l.gid); }

/* ---------------- Pieces of UI ---------------- */
function keyboard(lang, prefix, marks, tried){
  const rows = ZWord.KEYS[lang].map((r, i) => {
    const keys = Array.from(r).map(c => {
      const m = marks ? marks[c] : (tried && tried.has(c) ? "used" : "");
      return `<button class="key${m ? " " + m : ""}" data-act="${prefix}Key" data-arg="${esc(c)}"${tried && tried.has(c) ? " disabled" : ""}>${esc(c)}</button>`;
    }).join("");
    const last = i === ZWord.KEYS[lang].length - 1 && prefix === "zw";
    return `<div class="krow">${last ? `<button class="key wide" data-act="zwEnter" aria-label="${t("enterKey")}">${t("enterKey")}</button>` : ""}${keys}${last ? `<button class="key wide" data-act="zwDel" aria-label="${t("delKey")}">⌫</button>` : ""}</div>`;
  }).join("");
  return `<div class="keyboard" dir="${dirOf(lang)}">${rows}</div>`;
}
function langChips(act){
  return `<div class="seg" role="group" aria-label="${t("wordLang")}"><span class="small" style="align-self:center">${t("wordLang")}</span>${WLANGS.map(l =>
    `<button class="chip" data-act="${act}" data-arg="${l}" aria-pressed="${wordLang()===l}">${{de:"Deutsch",en:"English",ar:"العربية"}[l]}</button>`).join("")}</div>`;
}
function train(left, max){
  const coaches = Array.from({length:max}, (_, i) => `<span class="coach${i < left ? "" : " gone"}"></span>`).join("");
  return `<div class="train" role="img" aria-label="${t("ltLeft",{n:left})}"><span class="loco"></span>${coaches}</div>`;
}

/* ---------------- Screens ---------------- */
function lettersScreen(){
  const l = S.lt, ls = ltState(); if(!l || !ls) return null;
  const {st, lang} = ls, s = ZLetters.status(st), peer = l.mode==="online" ? (peerOf(l.peerId) || {first_name:l.peerName||""}) : null, name = esc(peer ? peer.first_name : "");
  const word = st.word.join(""), view = ZLetters.view(st);
  let line;
  if(ls.setter) line = s.won ? t("ltTheyWon",{name}) : s.lost ? t("ltTheyLost",{name}) : t("ltSetterView",{name});
  else line = s.won ? t("ltWon") : s.lost ? t("ltLost",{w:esc(word)}) : t("ltLeft",{n:s.left});
  const slots = st.word.map((c, i) => `<span class="slot">${view[i] || (ls.setter || s.over ? `<span class="ghost">${esc(c)}</span>` : "")}</span>`).join("");
  const back = l.mode==="online" ? "chat" : "games";
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${back}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("ltName")}</div><div class="small">${l.mode==="cpu" ? t("againstCpu") : name}</div></div></div>
    <span class="pill${s.over?"":" off"}" style="align-self:flex-start">${line}</span>
    ${l.mode==="online" ? onlineInfo("lt", l) : ""}
    ${train(s.left, st.max)}
    <div class="slots" dir="${dirOf(lang)}">${slots}</div>
    ${ls.setter ? `<div class="small">${t("ltTried")}: ${esc(st.tried.join(" ")) || "–"}</div>` : keyboard(lang, "lt", null, new Set(st.tried))}
    <div class="small">${t("ltHelp")}</div>
    ${l.mode==="cpu" ? `<div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-act="ltCpu">${t("newGame")}</button></div>${langChips("ltLang")}`
      : `<div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-act="wordSheet" data-arg="lt">${t("newGame")}</button><button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button></div>`}
  </div>`;
}
// Small sheet in the chat: choose Zugwort mode, or pick a word for Letter Train
function wordSheet(){
  const w = S.wordSheet; if(!w) return "";
  const m = peerOf(S.chatWith), name = esc(m ? m.first_name : "");
  const body = w.game === "zw"
    ? `<h2>${t("zwName")}</h2>${langChips("wordLangPick")}
       <button class="btn" data-act="zwInvite" data-arg="coop">${t("zwTogether")}</button><div class="small">${t("coopNote")}</div>
       <button class="btn ghost" data-act="zwInvite" data-arg="race">${t("zwRace")}</button><div class="small">${t("raceNote")}</div>`
    : `<h2>${t("ltName")}</h2>${langChips("wordLangPick")}
       <div class="field"><label for="ltWord">${t("ltPick",{name})}</label><input type="text" id="ltWord" data-bind="ltWord" maxlength="12" autocomplete="off" autocapitalize="characters" dir="auto" value="${esc(S.draft.ltWord||"")}">
       <div class="small">${t("ltPickHint")}</div></div>
       <button class="btn" data-act="ltInvite">${t("ltSend")}</button>`;
  return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel">${body}
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="wordSheetClose">${t("cancel")}</button></div></div></div>`;
}

/* ---------------- Actions ---------------- */
const wordActions = {
  ltCpu(){
    const lang = wordLang(), list = ZWords[lang].long, word = ZWord.norm(lang, list[Math.floor(Math.random()*list.length)]);
    S.lt = {mode:"cpu", lang, st:ZLetters.newGame(word)}; S.screen = "letters"; render();
  },
  ltLang(l){ if(WLANGS.includes(l)){ S.wordLang = l; wordActions.ltCpu(); } },
  ltKey(c){
    const l = S.lt, ls = ltState(); if(!l || !ls || ls.setter || ZLetters.status(ls.st).over) return;
    if(!ZWord.alphabet(ls.lang).includes(c) || ls.st.tried.includes(c)) return;
    if(l.mode==="cpu"){ l.st = ZLetters.guess(l.st, c); render(); }
    else { sendBody(CARD + "lg:" + l.gid + ":" + c); render(); }
  },
  ltOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); S.lt = {mode:"online", gid, peerId:S.chatWith, peerName:m && m.first_name}; S.screen = "letters"; render(); },
  ltInvite(){
    const lang = wordLang(), raw = String(S.draft.ltWord||"").trim(), w = ZWord.norm(lang, raw);
    if(!ZWord.isWord(lang, w, 3, 12) || hasContact(raw)) return toast(t("ltBadWord"));
    const gid = newGid(), m = peerOf(S.chatWith);
    S.wordSheet = null; S.draft.ltWord = "";
    sendBody(CARD + "lt:" + gid + ":" + scramble(lang + "|" + w.join("")));
    S.lt = {mode:"online", gid, peerId:S.chatWith, peerName:m && m.first_name}; S.screen = "letters"; render();
  },
  wordSheet(game){ S.wordSheet = {game: game === "lt" ? "lt" : "zw"}; if(S.screen !== "chat"){ S.screen = "chat"; } render(); },
  wordSheetClose(){ S.wordSheet = null; render(); },
  wordLangPick(l){ if(WLANGS.includes(l)){ S.wordLang = l; render(); } }
};
// Chat cards for invites (moves zg/lg stay hidden in the chat)
function wordCard(p, x, name){
  const gid = String(p.val||""); if(!GID.test(gid)) return "";
  if(p.type==="zw") return `<div class="gamecard"><span class="lbl">${t("zwName")}</span><span>${x.mine ? t("zwStartMe") : t("zwStartThem",{name})}</span><button class="btn small" style="align-self:center" data-act="zwOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
  if(p.type==="lt") return `<div class="gamecard"><span class="lbl">${t("ltName")}</span><span>${x.mine ? t("ltStartMe") : t("ltStartThem",{name})}</span><button class="btn small" style="align-self:center" data-act="ltOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
  return "";
}

export { lettersScreen, wordActions, wordCard, wordSheet };
