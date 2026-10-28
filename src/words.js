// Word games: "Zugwort" (5 letters, 6 tries) and "Buchstabenzug" / Letter Train (guess letter by letter, 7 coaches).
// Vs computer, and online with a match through chat cards (same system as chess):
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
const fiveList = lang => ZWords[lang].five.map(w => ZWord.norm(lang, w));
const dirOf = lang => lang === "ar" ? "rtl" : "ltr";
const scramble = s => btoa(unescape(encodeURIComponent(s))).split("").reverse().join("");
function unscramble(s){ try{ return decodeURIComponent(escape(atob(String(s).split("").reverse().join("")))); }catch(e){ return ""; } }

/* ---------------- Online state, replayed from the chat like chess ---------------- */
function onlineZw(gid){
  let inv = null; const mine = [], theirs = [], shared = [];
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type==="zw" && p.val===gid && !inv){ const [mode, lang] = String(p.extra||"").split("-"); if(WLANGS.includes(lang)) inv = {starter:x.mine, coop:mode==="coop", lang}; }
    if(p.type==="zg" && p.val===gid && inv){
      const g = ZWord.word5(inv.lang, p.extra); if(!g) continue;
      if(inv.coop){ const starterTurn = shared.length % 2 === 0; if(starterTurn === (x.mine === inv.starter)) shared.push(g); }
      else (x.mine ? mine : theirs).push(g);
    }
  }
  if(!inv) return null;
  const answer = ZWord.norm(inv.lang, ZWord.pick(ZWords[inv.lang].five, gid));
  const run = list => list.reduce((st, g) => ZWord.play(st, g), ZWord.newGame(answer));
  if(inv.coop){ const st = run(shared); return {...inv, st, myTurn: !st.over && ((st.rows.length % 2 === 0) === inv.starter)}; }
  const me = run(mine), them = run(theirs);
  return {...inv, st:me, them, myTurn:!me.over};
}
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
function zwState(){ const z = S.zw; if(!z) return null; return z.mode==="cpu" ? {lang:z.lang, st:z.st, them:z.cpu.st, myTurn:!z.st.over && !z.cpu.busy} : onlineZw(z.gid); }
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
function tiles(st, cur, lang){
  const rows = [];
  for(let r = 0; r < st.max; r++){
    const row = st.rows[r], typing = !row && r === st.rows.length && !st.over;
    const cells = [0,1,2,3,4].map(i => {
      if(row) return `<div class="tile ${row.marks[i]}">${esc(row.guess[i])}</div>`;
      const c = typing && cur[i]; return `<div class="tile${c ? " typed" : ""}">${c ? esc(c) : ""}</div>`;
    }).join("");
    rows.push(`<div class="trow" dir="${dirOf(lang)}">${cells}</div>`);
  }
  return `<div class="tiles" aria-label="${t("zwName")}">${rows.join("")}</div>`;
}
const miniRows = st => `<div class="mini">${st.rows.map(r => `<div class="mrow">${r.marks.map(m => `<span class="${m}"></span>`).join("")}</div>`).join("")}</div>`;
function langChips(act){
  return `<div class="seg" role="group" aria-label="${t("wordLang")}"><span class="small" style="align-self:center">${t("wordLang")}</span>${WLANGS.map(l =>
    `<button class="chip" data-act="${act}" data-arg="${l}" aria-pressed="${wordLang()===l}">${{de:"Deutsch",en:"English",ar:"العربية"}[l]}</button>`).join("")}</div>`;
}
function train(left, max){
  const coaches = Array.from({length:max}, (_, i) => `<span class="coach${i < left ? "" : " gone"}"></span>`).join("");
  return `<div class="train" role="img" aria-label="${t("ltLeft",{n:left})}"><span class="loco"></span>${coaches}</div>`;
}

/* ---------------- Screens ---------------- */
function zugwortScreen(){
  const z = S.zw, zs = zwState(); if(!z || !zs) return null;
  const {st, lang} = zs, peer = z.mode==="online" ? (peerOf(z.peerId) || {first_name:z.peerName||""}) : null, name = esc(peer ? peer.first_name : "");
  const answer = st.answer.join("");
  let line;
  if(z.mode==="cpu"){
    const me = st, cpu = zs.them;
    if(!me.over) line = z.cpu.busy ? t("thinking") : cpu.won ? t("zwCpuFound",{n:cpu.rows.length}) : t("yourMove");
    else if(me.won && (!cpu.won || me.rows.length < cpu.rows.length)) line = t("zwWon",{n:me.rows.length});
    else if(me.won && cpu.won && me.rows.length === cpu.rows.length) line = t("zwDraw");
    else if(cpu.won) line = t("zwCpuWon") + " " + t("zwWas",{w:esc(answer)});
    else line = t("zwWas",{w:esc(answer)});
  } else if(zs.coop){
    line = st.won ? t("zwWonTogether",{n:st.rows.length}) : st.over ? t("zwWas",{w:esc(answer)}) : zs.myTurn ? t("yourMove") : t("peerMove",{name});
  } else {
    const me = st, them = zs.them;
    if(me.over && them.over) line = me.won && (!them.won || me.rows.length < them.rows.length) ? t("zwWon",{n:me.rows.length})
      : me.won && them.won && me.rows.length === them.rows.length ? t("zwDraw") : them.won ? t("zwTheyWon",{name}) + " " + t("zwWas",{w:esc(answer)}) : t("zwWas",{w:esc(answer)});
    else if(me.over) line = (me.won ? t("zwWon",{n:me.rows.length}) + " · " : t("zwWas",{w:esc(answer)}) + " · ") + t("zwWaiting",{name});
    else line = t("yourMove");
  }
  const back = z.mode==="online" ? "chat" : "games";
  const side = z.mode==="cpu" ? `<div class="vs"><span class="small">${t("computer")}</span>${miniRows(zs.them)}</div>`
    : !zs.coop ? `<div class="vs"><span class="small">${name}</span>${miniRows(zs.them)}</div>` : "";
  const controls = z.mode==="cpu" ? `<div class="row" style="flex-wrap:wrap">
      <div class="seg"><button class="chip" data-act="zwLevel" data-arg="easy" aria-pressed="${z.cpu.level==="easy"}">${t("easy")}</button><button class="chip" data-act="zwLevel" data-arg="normal" aria-pressed="${z.cpu.level!=="easy"}">${t("normal")}</button></div>
      <button class="btn ghost small" data-act="zwCpu">${t("newGame")}</button></div>${langChips("zwLang")}`
    : `<div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-act="wordSheet" data-arg="zw">${t("newGame")}</button><button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button></div>`;
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${back}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("zwName")}</div><div class="small">${z.mode==="cpu" ? t("zwRaceCpu") : (zs.coop ? t("zwTogether") : t("zwRace")) + " · " + name}</div></div></div>
    <span class="pill${st.over?"":" off"}" style="align-self:flex-start">${line}</span>
    ${z.mode==="online" ? onlineInfo("zw", z) : ""}
    <div class="zwboard">${tiles(st, zs.myTurn ? z.cur : [], lang)}${side}</div>
    ${keyboard(lang, "zw", ZWord.keys(st))}
    <div class="small">${zs.coop ? t("coopNote") : t("zwHelp")}</div>
    ${controls}
  </div>`;
}
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
function cpuStep(){
  const z = S.zw; if(!z || z.mode!=="cpu" || z.cpu.st.over) return;
  z.cpu.busy = true; render();
  setTimeout(() => {
    if(S.zw !== z) return;
    z.cpu.st = ZWord.play(z.cpu.st, ZWord.solve(fiveList(z.lang), z.cpu.st.rows, z.cpu.level));
    z.cpu.busy = false; render();
  }, 700);
}
const wordActions = {
  zwCpu(){
    const lang = wordLang(), list = fiveList(lang), answer = list[Math.floor(Math.random()*list.length)];
    const level = S.zw && S.zw.mode==="cpu" ? S.zw.cpu.level : "normal";
    S.zw = {mode:"cpu", lang, st:ZWord.newGame(answer), cpu:{st:ZWord.newGame(answer), level, busy:false}, cur:[]};
    S.screen = "zugwort"; render();
  },
  zwLevel(v){ if(S.zw && S.zw.mode==="cpu") S.zw.cpu.level = v === "easy" ? "easy" : "normal"; render(); },
  zwLang(l){ if(WLANGS.includes(l)){ S.wordLang = l; wordActions.zwCpu(); } },
  zwKey(c){
    const z = S.zw, zs = zwState(); if(!z || !zs || !zs.myTurn) return;
    if(z.cur.length < 5 && ZWord.alphabet(zs.lang).includes(c)){ z.cur.push(c); render(); }
  },
  zwDel(){ if(S.zw){ S.zw.cur.pop(); render(); } },
  zwEnter(){
    const z = S.zw, zs = zwState(); if(!z || !zs || !zs.myTurn) return;
    if(z.cur.length !== 5) return toast(t("zwFive"));
    const guess = z.cur.slice(); z.cur = [];
    if(z.mode==="cpu"){ z.st = ZWord.play(z.st, guess); render(); cpuStep(); }
    else { sendBody(CARD + "zg:" + z.gid + ":" + guess.join("")); render(); }
  },
  zwOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); S.zw = {mode:"online", gid, peerId:S.chatWith, peerName:m && m.first_name, cur:[]}; S.screen = "zugwort"; render(); },
  zwInvite(mode){
    const gid = newGid(), lang = wordLang(), m = peerOf(S.chatWith);
    S.wordSheet = null;
    sendBody(CARD + "zw:" + gid + ":" + (mode==="race" ? "race" : "coop") + "-" + lang);
    S.zw = {mode:"online", gid, peerId:S.chatWith, peerName:m && m.first_name, cur:[]}; S.screen = "zugwort"; render();
  },
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

export { lettersScreen, wordActions, wordCard, wordSheet, zugwortScreen };
