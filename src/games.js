// Game boards and online-game helpers (chess, dama). Rules are in engines/*.js. Solitaire lives in solitaire.js.
import { render } from "./screens.js";
import { S } from "./state.js";
import { esc, parseMsg, t } from "./util.js";

const GLYPH = {K:"\u265A",Q:"\u265B",R:"\u265C",B:"\u265D",N:"\u265E",P:"\u265F"};
function onlineChess(gid){
  let st = ZChess.newGame(), starter = null;
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type==="chess" && p.val===gid && starter===null) starter = x.mine ? "me" : "them";
    if(p.type==="cm" && p.val===gid && starter!==null){
      const myColor = starter==="me" ? "w" : "b";
      if((st.turn===myColor) !== !!x.mine) continue;
      const m = ZChess.fromUci(st, p.extra); if(m) st = ZChess.apply(st, m);
    }
  }
  return {st, myColor: starter==="them" ? "b" : "w"};
}
function chessState(){
  const c = S.chess; if(!c) return null;
  if(c.mode==="cpu") return {st:c.st, myColor:"w"};
  return onlineChess(c.gid);
}
function boardHtml(st, myColor, sel){
  const legal = ZChess.legal(st);
  const targets = new Set(sel===null || sel===undefined ? [] : legal.filter(m=>m.from===sel).map(m=>m.to));
  const last = S.chess && S.chess.last;
  let h = "";
  for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){
    const rank = myColor==="w" ? 7 - r : r, file = myColor==="w" ? c : 7 - c, i = rank*8 + file;
    const p = st.b[i], dark = (rank + file) % 2 === 0;
    h += `<button class="sq ${dark?"d":"l"}${sel===i?" sel":""}${last && (last.from===i || last.to===i)?" last":""}" data-act="sq" data-arg="${i}" aria-label="${ZChess.sqName(i)}${p?" "+p:""}">${p?`<span class="pc ${p[0]}">${GLYPH[p[1]]}\uFE0E</span>`:""}${targets.has(i)?'<span class="dot"></span>':""}</button>`;
  }
  return `<div class="board" role="grid">${h}</div>`;
}
function cpuTurn(){
  const c = S.chess; if(!c || c.mode!=="cpu") return;
  c.thinking = true; render();
  setTimeout(()=>{
    if(S.chess!==c) return;
    const m = ZChess.bestMove(c.st, c.level==="easy" ? 1 : 3);
    if(m){ c.st = ZChess.apply(c.st, m); c.last = {from:m.from, to:m.to}; }
    c.thinking = false; render();
  }, 60);
}
function onlineDama(gid){
  let st = ZDama.newGame(), starter = null, last = null;
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type==="dama" && p.val===gid && starter===null) starter = x.mine ? "me" : "them";
    if(p.type==="dm" && p.val===gid && starter!==null){
      const myColor = starter==="me" ? "w" : "b";
      if((st.turn===myColor) !== !!x.mine) continue;
      const m = ZDama.fromKey(st, p.extra); if(m){ st = ZDama.apply(st, m); last = m.path; }
    }
  }
  return {st, myColor: starter==="them" ? "b" : "w", last};
}
function damaState(){ const d = S.dama; if(!d) return null; if(d.mode==="cpu") return {st:d.st, myColor:"w", last:d.last}; return onlineDama(d.gid); }
function damaBoard(st, myColor, sel, lastPath){
  const moves = ZDama.legal(st);
  const targets = new Set(sel===null || sel===undefined ? [] : moves.filter(m=>m.path[0]===sel).map(m=>m.path[m.path.length-1]));
  const lp = new Set(lastPath || []);
  let h = "";
  for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){
    const row = myColor==="w" ? 7 - r : r, col = myColor==="w" ? c : 7 - c, i = row*8 + col, p = st.b[i];
    h += `<button class="sq ${(row+col)%2===0?"d":"l"}${sel===i?" sel":""}${lp.has(i)?" path":""}" data-act="dq" data-arg="${i}" aria-label="${"abcdefgh"[col]}${row+1}">${p?`<span class="dm ${ZDama.color(p)}${ZDama.isKing(p)?" k":""}"></span>`:""}${targets.has(i)?'<span class="dot"></span>':""}</button>`;
  }
  return `<div class="board" role="grid">${h}</div>`;
}
function damaCpu(){
  const d = S.dama; if(!d || d.mode!=="cpu") return;
  d.thinking = true; render();
  setTimeout(()=>{
    if(S.dama!==d) return;
    const m = ZDama.bestMove(d.st, d.level==="easy" ? 1 : 5);
    if(m){ d.st = ZDama.apply(d.st, m); d.last = m.path; }
    d.thinking = false; render();
  }, 60);
}
const peerOf = id => S.matches.find(x=>x.id===id);
const COUNTED = m => !["cm","dm","chess","dama","zw","zg","lt","lg","cg","cgm","qz","qa","sl","slsub","slstop","slrej"].includes(parseMsg(m.body).type);
function presenceOf(m, gid){
  if(!m || !m.seen_at) return null;
  const age = Date.now() - Date.parse(m.seen_at);
  if(!(age < 25000)) return "away";
  if(gid && m.active_game === "g:" + gid) return "here";
  if(m.active_game === "chat") return "chat";
  return "away";
}
const unreadFrom = peerId => S.messages.filter(x=>!x.mine && COUNTED(x)).length - (S.readCount[peerId] || 0);
function onlineInfo(type, g){
  const m = peerOf(g.peerId), name = esc(m ? m.first_name : (g.peerName || ""));
  const pr = presenceOf(m, g.gid);
  let h = pr ? `<div class="small" style="display:flex;align-items:center;gap:6px;color:${pr==="here"?"var(--accent)":"var(--muted)"}"><span class="dot"></span>${pr==="here" ? t("inGame",{name}) : pr==="chat" ? t("inChatP",{name}) : t("leftGame",{name})}</div>` : "";
  let lastInv = null;
  for(const x of S.messages){ const p = parseMsg(x.body); if(p.type===type) lastInv = {gid:p.val, mine:x.mine}; }
  if(lastInv && lastInv.gid !== g.gid && !lastInv.mine && /^[A-Za-z0-9]{4,12}$/.test(lastInv.gid))
    h += `<div class="banner action"><span>${t("newGameStarted",{name})}</span><button class="btn small" data-act="${type}Open" data-arg="${lastInv.gid}">${t("openIt")}</button></div>`;
  if(unreadFrom(g.peerId) > 0){
    const lastTxt = [...S.messages].reverse().find(x=>!x.mine && parseMsg(x.body).type==="text");
    h += `<div class="banner action"><span>${t("newMsgFrom",{name})}${lastTxt ? `: “${esc(String(lastTxt.body).slice(0,60))}”` : ""}</span><button class="btn small" data-act="chessBack" data-arg="chat">${t("openChat")}</button></div>`;
  }
  return h;
}
function currentActivity(){
  if(S.screen==="chat") return "chat";
  if(S.screen==="chess" && S.chess && S.chess.mode==="online") return "g:" + S.chess.gid;
  if(S.screen==="dama" && S.dama && S.dama.mode==="online") return "g:" + S.dama.gid;
  if(S.screen==="zugwort" && S.zw && S.zw.mode==="online") return "g:" + S.zw.gid;
  if(S.screen==="letters" && S.lt && S.lt.mode==="online") return "g:" + S.lt.gid;
  if(S.screen==="classic" && S.cg && S.cg.mode==="online") return "g:" + S.cg.gid;
  if(S.screen==="quiz" && S.qz && S.qz.mode==="online") return "g:" + S.qz.gid;
  if(S.screen==="slf" && S.sl) return "g:" + S.sl.gid;
  return "";
}

export { COUNTED, GLYPH, boardHtml, chessState, cpuTurn, currentActivity, damaBoard, damaCpu, damaState, onlineInfo, peerOf, unreadFrom };
