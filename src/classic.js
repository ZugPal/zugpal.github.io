// Classic games: Vier in einer Reihe (ZFour), Mühle (ZMuehle), Mau-Mau (ZMau). Rules are in engines/*.js.
// Vs computer (Easy/Normal) and online with a match through chat cards (same system as chess):
//   cg:<gid>:<four|muehle|mau>   invite (sender plays "w" and starts; Mau-Mau deals from <gid>, so both phones see the same game)
//   cgm:<gid>:<move>              a move in the engine's own format
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, parseMsg, t } from "./util.js";

const GAMES = ["four", "muehle", "mau"];
const ENG = () => ({ four: ZFour, muehle: ZMuehle, mau: ZMau });
const GID = /^[A-Za-z0-9]{4,12}$/;
const newGid = () => Math.random().toString(36).slice(2, 10);
const NAME = g => t(g + "Name");
const fresh = (game, seed) => game === "mau" ? ENG()[game].newGame(seed) : ENG()[game].newGame();

function onlineCg(gid){
  let inv = null, st = null;
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type==="cg" && p.val===gid && !inv && GAMES.includes(p.extra)){ inv = {game:p.extra, starter:x.mine}; st = fresh(p.extra, ZWord.hash(gid)); }
    if(p.type==="cgm" && p.val===gid && inv){
      const color = x.mine === inv.starter ? "w" : "b";
      if(st.turn !== color) continue;
      const next = ENG()[inv.game].apply(st, p.extra); if(next) st = next;
    }
  }
  return inv ? {game:inv.game, st, me:inv.starter ? "w" : "b"} : null;
}
function cgState(){ const c = S.cg; if(!c) return null; return c.mode==="cpu" ? {game:c.game, st:c.st, me:"w"} : onlineCg(c.gid); }

/* ---------------- Boards ---------------- */
function fourBoard(st, me, myTurn){
  const s = ZFour.status(st), line = new Set(s.line || []), ms = new Set(myTurn ? ZFour.moves(st) : []);
  let cols = "";
  for(let c = 0; c < ZFour.W; c++){
    let cells = "";
    for(let r = 0; r < ZFour.H; r++){ const i = r*ZFour.W + c, p = st.b[i];
      cells += `<span class="disc${p ? " " + (p === me ? "me" : "op") : ""}${line.has(i) ? " win" : ""}${st.last === i ? " last" : ""}"></span>`; }
    cols += `<button class="fcol" data-act="cgMove" data-arg="${c}"${ms.has(String(c)) ? "" : " disabled"} aria-label="${t("column")} ${c + 1}">${cells}</button>`;
  }
  return `<div class="fourboard" dir="ltr">${cols}</div>`;
}
const MPOS = (() => { const off = [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
  return Array.from({length:24}, (_, i) => { const r = Math.floor(i/8), k = i % 8, s = 3 - r; return [50 + off[k][0]*s*15, 50 + off[k][1]*s*15]; }); })();
function muehleBoard(st, me, myTurn, sel){
  const ms = myTurn ? ZMuehle.moves(st) : [];
  let hot = new Set();
  if(sel && sel.base) ms.filter(m => m.startsWith(sel.base + "x")).forEach(m => hot.add(+m.split("x")[1]));
  else if(sel && sel.from !== undefined) ms.filter(m => m.startsWith("m" + sel.from + "-")).forEach(m => hot.add(+m.split("-")[1].split("x")[0]));
  else ms.forEach(m => hot.add(m[0] === "p" ? +m.slice(1).split("x")[0] : +m.slice(1).split("-")[0]));
  const lines = [0,1,2].map(r => { const a = 5 + r*15, b = 100 - a; return `<rect x="${a}" y="${a}" width="${b - a}" height="${b - a}"/>`; }).join("")
    + `<path d="M50 5V35M50 65V95M5 50H35M65 50H95"/>`;
  const pts = MPOS.map(([x, y], i) => { const p = st.b[i];
    return `<button class="mpt${p ? " " + (p === me ? "me" : "op") : ""}${hot.has(i) ? " hot" : ""}${sel && sel.from === i ? " sel" : ""}${st.last && (st.last.to === i) ? " last" : ""}"
      style="left:${x}%;top:${y}%" data-act="cgPoint" data-arg="${i}"${hot.has(i) ? "" : " tabindex=\"-1\""} aria-label="${t("point")} ${i + 1}${p ? " " + (p === me ? t("yours") : t("theirs")) : ""}"></button>`; }).join("");
  return `<div class="mboard" dir="ltr"><svg viewBox="0 0 100 100" aria-hidden="true">${lines}</svg>${pts}</div>
    <div class="row small" style="justify-content:space-between"><span><span class="mdot me"></span> ${t("toPlace",{n:st.hand[me]})}</span><span><span class="mdot op"></span> ${t("toPlace",{n:st.hand[me === "w" ? "b" : "w"]})}</span></div>`;
}
const SUIT = { C:"♣", S:"♠", H:"♥", D:"♦" };
function rankLabel(r){ if(r === "T") return "10"; if(S.lang === "de") return { J:"B", Q:"D", K:"K", A:"A" }[r] || r; return r; }
const cardFace = (c, attrs) => `<button class="mcard${c[0] === "H" || c[0] === "D" ? " red" : ""}" ${attrs || "disabled"}><span>${rankLabel(c[1])}</span><span class="big">${SUIT[c[0]]}︎</span></button>`;
function mauTable(st, me, myTurn, sel, name){
  const op = me === "w" ? "b" : "w", top = ZMau.top(st), ms = myTurn ? ZMau.moves(st) : [];
  const playable = new Set(ms.filter(m => m[0] === "p").map(m => m.slice(1).split(">")[0]));
  const hand = st.hands[me].slice().sort((a, b) => a[0] === b[0] ? ZMau.RANKS.indexOf(a[1]) - ZMau.RANKS.indexOf(b[1]) : "CSHD".indexOf(a[0]) - "CSHD".indexOf(b[0]));
  const backs = Array.from({length:st.hands[op].length}, () => `<span class="mback"></span>`).join("");
  const info = st.sevens ? `<div class="banner">${t("mauSevens",{n:st.sevens*2})}</div>` : st.wish ? `<div class="banner info">${t("mauWished")} <b>${SUIT[st.wish]}︎</b></div>` : "";
  const wish = sel && sel.jack ? `<div class="card"><div class="pname">${t("mauWish")}</div><div class="seg">${ZMau.SUITS.map(s => `<button class="chip suit${s === "H" || s === "D" ? " red" : ""}" data-act="cgMove" data-arg="p${sel.jack}>${s}">${SUIT[s]}︎</button>`).join("")}</div></div>` : "";
  const extra = ms.includes("d") ? `<button class="btn ghost small" data-act="cgMove" data-arg="d">${st.sevens ? t("mauTake",{n:st.sevens*2}) : t("mauDraw")}</button>` : ms.includes("n") ? `<button class="btn ghost small" data-act="cgMove" data-arg="n">${t("mauPass")}</button>` : "";
  return `<div class="mautable">
    <div class="row small" style="justify-content:center"><span>${esc(name)}</span><span class="mbacks">${backs}</span></div>
    <div class="row" style="justify-content:center;gap:18px"><span class="mback stock" aria-label="${t("mauStock")}">${st.stock.length}</span>${cardFace(top)}</div>
    ${info}${wish}
    <div class="mhand">${hand.map(c => cardFace(c, playable.has(c) ? `data-act="cgCard" data-arg="${c}"` : "disabled")).join("")}</div>
    <div class="row" style="justify-content:center">${extra}</div></div>`;
}

/* ---------------- Screen ---------------- */
function classicScreen(){
  const c = S.cg, cs = cgState(); if(!c || !cs) return null;
  const {game, st, me} = cs, E = ENG()[game], s = E.status(st), myTurn = !s.over && st.turn === me && !c.thinking;
  const peer = c.mode==="online" ? (peerOf(c.peerId) || {first_name:c.peerName||""}) : null, name = peer ? peer.first_name : t("computer");
  let line;
  if(s.over) line = !s.winner ? t("drawT") : s.winner === me ? t("cgYouWin") : c.mode==="cpu" ? t("cgCpuWins") : t("cgTheyWin",{name:esc(name)});
  else if(!myTurn) line = c.mode==="cpu" ? t("thinking") : t("peerMove",{name:esc(name)});
  else line = game === "muehle" && c.sel && c.sel.base ? t("cgCapture") : t("yourMove");
  const board = game === "four" ? fourBoard(st, me, myTurn) : game === "muehle" ? muehleBoard(st, me, myTurn, c.sel) : mauTable(st, me, myTurn, c.sel, name);
  const back = c.mode==="online" ? "chat" : "games";
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${back}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${NAME(game)}</div><div class="small">${c.mode==="cpu" ? t("againstCpu") : esc(name)}</div></div></div>
    <span class="pill${s.over?"":" off"}" style="align-self:flex-start">${line}</span>
    ${c.mode==="online" ? onlineInfo("cg", c) : ""}
    ${board}
    <div class="small">${t(game + "Help")}</div>
    ${c.mode==="cpu" ? `<div class="row" style="flex-wrap:wrap">
      <div class="seg"><button class="chip" data-act="cgLevel" data-arg="easy" aria-pressed="${c.level==="easy"}">${t("easy")}</button><button class="chip" data-act="cgLevel" data-arg="normal" aria-pressed="${c.level!=="easy"}">${t("normal")}</button></div>
      <button class="btn ghost small" data-act="cgCpu" data-arg="${game}">${t("newGame")}</button></div>`
    : `<div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-act="cgInvite" data-arg="${game}">${t("newGame")}</button><button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button></div>`}
  </div>`;
}
function cgSheet(){
  if(!S.cgSheet) return "";
  return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel"><h2>${t("moreGames")}</h2>
    ${GAMES.map(g => `<button class="btn ghost" data-act="cgInvite" data-arg="${g}">${NAME(g)}</button>`).join("")}
    <button class="btn ghost" data-act="qzInvite">${t("qzName")}</button>
    <button class="btn ghost" data-act="slInvite">${t("slName")}</button>
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="cgSheetClose">${t("cancel")}</button></div></div></div>`;
}
function cgCard(p, x, name){
  const gid = String(p.val||""); if(!GID.test(gid) || !GAMES.includes(p.extra)) return "";
  return `<div class="gamecard"><span class="lbl">${NAME(p.extra)}</span><span>${x.mine ? t("cgStartMe",{game:NAME(p.extra)}) : t("cgStartThem",{name, game:NAME(p.extra)})}</span><button class="btn small" style="align-self:center" data-act="cgOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
}

/* ---------------- Actions ---------------- */
function cpuPlay(){
  const c = S.cg; if(!c || c.mode !== "cpu") return;
  const E = ENG()[c.game];
  if(E.status(c.st).over || c.st.turn !== "b"){ c.thinking = false; render(); return; }
  c.thinking = true; render();
  setTimeout(() => {
    if(S.cg !== c) return;
    const m = E.bestMove(c.st, c.level); const next = m && E.apply(c.st, m);
    if(next) c.st = next; else { c.thinking = false; render(); return; }
    cpuPlay();   // Mau-Mau: the computer may move again (after drawing, or after an 8)
  }, c.game === "mau" ? 650 : 350);
}
function play(move){
  const c = S.cg, cs = cgState(); if(!c || !cs) return;
  const E = ENG()[cs.game];
  if(cs.st.turn !== cs.me || c.thinking) return;
  const next = E.apply(cs.st, move); if(!next) return;
  c.sel = null;
  if(c.mode === "cpu"){ c.st = next; render(); cpuPlay(); }
  else { sendBody(CARD + "cgm:" + c.gid + ":" + move); render(); }
}
const classicActions = {
  cgCpu(game){
    if(!GAMES.includes(game)) return;
    const level = S.cg && S.cg.mode === "cpu" ? S.cg.level : "normal";
    S.cg = {game, mode:"cpu", st:fresh(game, Math.floor(Math.random() * 1e9)), level, sel:null, thinking:false}; S.screen = "classic"; render();
  },
  cgLevel(v){ if(S.cg) S.cg.level = v === "easy" ? "easy" : "normal"; render(); },
  cgMove(m){ play(String(m)); },
  cgCard(card){
    const cs = cgState(); if(!cs) return;
    if(card[1] === "J"){ S.cg.sel = {jack:card}; render(); } else play("p" + card);
  },
  cgPoint(i){
    const c = S.cg, cs = cgState(); if(!c || !cs || cs.game !== "muehle" || cs.st.turn !== cs.me) return;
    const ms = ZMuehle.moves(cs.st), sel = c.sel; i = Number(i);
    if(sel && sel.base){ const m = sel.base + "x" + i; if(ms.includes(m)) play(m); return; }
    let base = null;
    if(sel && sel.from !== undefined && ms.some(m => m.startsWith("m" + sel.from + "-" + i))) base = "m" + sel.from + "-" + i;
    else if(cs.st.hand[cs.me] > 0 && ms.some(m => m === "p" + i || m.startsWith("p" + i + "x"))) base = "p" + i;
    else if(cs.st.b[i] === cs.me && ms.some(m => m.startsWith("m" + i + "-"))){ c.sel = {from:i}; render(); return; }
    else { c.sel = null; render(); return; }
    if(ms.includes(base)) play(base); else { c.sel = {base}; render(); }
  },
  cgOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); S.cg = {mode:"online", gid, peerId:S.chatWith, peerName:m && m.first_name, sel:null}; S.screen = "classic"; render(); },
  cgInvite(game){
    if(!GAMES.includes(game)) return;
    const gid = newGid(), m = peerOf(S.chatWith);
    S.cgSheet = false;
    sendBody(CARD + "cg:" + gid + ":" + game);
    S.cg = {mode:"online", gid, peerId:S.chatWith, peerName:m && m.first_name, sel:null}; S.screen = "classic"; render();
  },
  cgSheet(){ S.cgSheet = true; render(); },
  cgSheetClose(){ S.cgSheet = false; render(); }
};

export { cgCard, cgSheet, classicActions, classicScreen };
