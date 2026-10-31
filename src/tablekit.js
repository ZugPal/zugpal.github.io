// Shared frame for the classic games (Vier in einer Reihe, Mühle, Mau-Mau), in the same style as the Chess and Dama
// screens: against the computer (four levels, thinking in a Web Worker), two players on one phone, or online with a
// match; who starts, takeback, hint, sound, resign / draw offer, a running score, statistics per level and an end
// screen with the reason and confetti. Each game registers a definition with its own board:
//   { id, E(), newGame(seed), end(st, status, states), colorName(c), token(c), levels, local, rules(),
//     board: { create(api) -> board with .el, paint(board, rec, ctx) } }
// The board keeps its own DOM between renders and animates the difference to the new position.
// Online chat cards: cg:<gid>:<game> (sender plays "w" and starts), cgm:<gid>:<move>, cgx:<gid>:resign|draw|accept|decline.
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, parseMsg, t, toast } from "./util.js";

const GID = /^[A-Za-z0-9]{4,12}$/;
const TABLES = {}, boards = {};
const store = { get(k, d){ try{ const v = localStorage.getItem("zugpal.tk." + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("zugpal.tk." + k, JSON.stringify(v)); }catch(e){} } };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const other = c => c === "w" ? "b" : "w";

let G = null;   // { game, mode: "cpu"|"local"|"online", keys, myColor, level, seed, gid, peerId, peerName, hint, thinking, instant }
function setG(g){ G = g; S.tk = g; return g; }
function register(def){ TABLES[def.id] = def; }
const isTable = game => !!TABLES[game];

/* ---------------- Game record ---------------- */
function record(){
  if(!G) return null;
  const def = TABLES[G.game], E = def.E();
  let keys = [], myColor = G.myColor || "w", seed = G.seed || 1;
  const extra = { resign: null, drawOffer: null, drawAgreed: false };
  if(G.mode !== "online") keys = G.keys.slice();
  else {
    let starter = null, st = null;
    for(const x of S.messages){
      const p = parseMsg(x.body);
      if(p.type === "cg" && p.val === G.gid && p.extra === G.game && starter === null){ starter = x.mine; seed = ZWord.hash(G.gid); st = def.newGame(seed); }
      if(starter === null || p.val !== G.gid) continue;
      const color = x.mine === starter ? "w" : "b";
      if(p.type === "cgm" && st.turn === color && !extra.resign && !extra.drawAgreed && !E.status(st).over){ const n = E.apply(st, p.extra); if(n){ st = n; keys.push(p.extra); } }
      if(p.type === "cgx"){
        if(p.extra === "resign" && !extra.resign) extra.resign = color;
        if(p.extra === "draw") extra.drawOffer = { by: color, ply: keys.length };
        if(p.extra === "accept" && extra.drawOffer && extra.drawOffer.by !== color) extra.drawAgreed = true;
        if(p.extra === "decline") extra.drawOffer = null;
      }
    }
    if(extra.drawOffer && extra.drawOffer.ply !== keys.length) extra.drawOffer = null;
    myColor = starter === false ? "b" : "w";
  }
  const states = [def.newGame(seed)];
  for(const k of keys){ const n = E.apply(states[states.length - 1], k); if(!n) break; states.push(n); }
  keys = keys.slice(0, states.length - 1);
  const st = states[states.length - 1], status = E.status(st);
  let end = def.end(st, status, states);
  if(!end && extra.resign) end = { winner: other(extra.resign), reason: "resign" };
  else if(!end && extra.drawAgreed) end = { winner: null, reason: "agreed" };
  else if(!end && G.resigned) end = { winner: other(G.resigned), reason: "resign" };
  if(G.mode === "local") myColor = st.turn;
  return { game: G.game, mode: G.mode, keys, states, st, status, end, myColor, drawOffer: extra.drawOffer, seed };
}
const canAct = rec => !!rec && !rec.end && !G.thinking && (G.mode === "local" || rec.st.turn === rec.myColor);

/* ---------------- Updating the view ---------------- */
function nameOf(rec, color){
  const def = TABLES[G.game];
  if(G.mode === "local") return def.colorName(color);
  if(color === rec.myColor) return t("you");
  return G.mode === "cpu" ? "🤖︎ " + t("chLevel_" + G.level) : esc((peerOf(G.peerId) || { first_name: G.peerName || "" }).first_name);
}
function update(){
  const rec = record(); if(!rec) return null;
  const def = TABLES[G.game], bd = boards[G.game];
  if(bd && bd.el.isConnected){ def.board.paint(bd, rec, { canAct: canAct(rec), hint: G.hint, thinking: !!G.thinking, instant: !!G.instant, api }); G.instant = false; }
  const bottom = G.mode === "local" ? "w" : rec.myColor, top = other(bottom), score = G.mode === "online" ? null : store.get(G.game + ".score." + G.mode, { a: 0, b: 0, d: 0 });
  const wins = c => !score ? "" : `<span class="tkwins" aria-label="${t("tkScore")}">${G.mode === "local" ? (c === "w" ? score.a : score.b) : (c === rec.myColor ? score.a : score.b)}</span>`;
  const bar = c => `<span class="who">${def.token(c)} ${nameOf(rec, c)}${G.thinking && c !== rec.myColor && G.mode === "cpu" ? ` <span class="small">${t("thinking")}</span>` : ""}</span><span class="grow"></span>${def.bar ? def.bar(rec, c) : ""}${wins(c)}`;
  const turnOf = !rec.end && rec.st.turn;
  for(const [id, c] of [["ttop", top], ["tbot", bottom]]){ const el = document.getElementById(id); if(el){ el.innerHTML = bar(c); el.classList.toggle("turn", turnOf === c); } }
  const sl = document.getElementById("tstatus");
  if(sl){
    let s;
    if(rec.end) s = endTitle(rec) + " · " + t("tkReason_" + rec.end.reason);
    else if(rec.drawOffer && rec.drawOffer.by !== rec.myColor) s = `${t("chDrawOffered", { name: nameOf(rec, other(rec.myColor)) })} <button class="btn small" data-act="tkDrawAnswer" data-arg="accept">${t("chAccept")}</button> <button class="btn ghost small" data-act="tkDrawAnswer" data-arg="decline">${t("chDecline")}</button>`;
    else if(canAct(rec)) s = (def.prompt && def.prompt(rec)) || (G.mode === "local" ? t("tkTurn", { name: def.colorName(rec.st.turn) }) : t("yourMove"));
    else s = G.mode === "cpu" ? t("thinking") : t("peerMove", { name: nameOf(rec, rec.st.turn) });
    sl.innerHTML = s;
  }
  const tb = document.getElementById("ttake"); if(tb) tb.disabled = !rec.keys.length || !!G.thinking || G.mode === "online";
  return rec;
}
function endTitle(rec){
  const e = rec.end;
  if(!e.winner) return t("chDraw");
  if(G.mode === "local") return t("tkWins", { name: TABLES[G.game].colorName(e.winner) });
  return e.winner === rec.myColor ? t("chYouWin") : t("chYouLose");
}

/* ---------------- Moves ---------------- */
function play(move){
  const rec = record(); if(!canAct(rec)) return false;
  const def = TABLES[G.game];
  if(!def.E().apply(rec.st, move)) return false;
  G.hint = null;
  if(G.mode !== "online"){ G.keys.push(move); save(); update(); }
  else sendBody(CARD + "cgm:" + G.gid + ":" + move);
  const after = record();
  if(after.end) finish(after);
  else if(G.mode === "cpu" && after.st.turn !== after.myColor) setTimeout(cpuMove, def.afterMove || 450);
  return true;
}
let worker = null, jobId = 0;
function think(game, st, level){
  return new Promise(res => {
    try{
      if(!worker) worker = new Worker("engines/ai-worker.js");
      const id = ++jobId, on = e => { if(e.data.id === id){ worker.removeEventListener("message", on); res(e.data.move); } };
      worker.addEventListener("message", on); worker.postMessage({ id, game, st, level });
    }catch(e){ res(TABLES[game].E().think(st, level)); }
  });
}
async function cpuMove(){
  const rec = record(); if(!rec || rec.end || G.mode !== "cpu" || rec.st.turn === rec.myColor || G.thinking) return;
  const def = TABLES[G.game], game = G, n = G.keys.length, t0 = Date.now();
  G.thinking = true; update();
  const mv = await think(G.game, rec.st, G.level);
  await new Promise(r => setTimeout(r, Math.max(0, (def.minThink || 450) - (Date.now() - t0))));
  if(G !== game || G.keys.length !== n) return;
  G.thinking = false;
  if(!mv || !def.E().apply(rec.st, mv)){ update(); return; }
  G.keys.push(mv); save();
  const after = update();
  if(after.end) finish(after);
  else if(after.st.turn !== after.myColor) setTimeout(cpuMove, def.afterMove || 450);   // e.g. Mau-Mau: an 8, or play after drawing
}
const endKey = rec => (G.gid || G.mode) + ":" + rec.keys.length + ":" + rec.end.reason;
function finish(rec){
  const key = endKey(rec); if(G.endShown === key) return; G.endShown = key;
  const def = TABLES[G.game], win = G.mode === "local" ? !!rec.end.winner : rec.end.winner === rec.myColor;
  if(G.mode !== "online"){
    const sk = G.game + ".score." + G.mode, sc = store.get(sk, { a: 0, b: 0, d: 0 });
    if(!rec.end.winner) sc.d++; else if(G.mode === "local" ? rec.end.winner === "w" : rec.end.winner === rec.myColor) sc.a++; else sc.b++;
    store.set(sk, sc);
  }
  if(G.mode === "cpu"){ const sk = G.game + ".stats", stats = store.get(sk, {}), s = stats[G.level] || { played: 0, won: 0 }; s.played++; if(rec.end.winner === rec.myColor) s.won++; stats[G.level] = s; store.set(sk, stats); }
  const g = G;
  setTimeout(() => { if(G !== g) return; sound(win || !rec.end.winner ? "end" : "lose"); if(win && !reduced()) confetti(); update(); }, def.endDelay || 600);
  setTimeout(() => { if(G !== g || G.endShown !== key) return; S.tkEnd = true; render(); }, (def.endDelay || 600) + 900);
}

/* ---------------- Sound & confetti ---------------- */
let actx = null;
function sound(kind){
  if(!store.get("sound", true)) return;
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime, tone = (f, d, at, type, vol) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type || "triangle"; o.frequency.value = f; g.gain.setValueAtTime(vol || .1, now + at); g.gain.exponentialRampToValueAtTime(.001, now + at + d); o.connect(g).connect(actx.destination); o.start(now + at); o.stop(now + at + d); };
    if(kind === "drop"){ tone(150, .09, 0, "sine", .2); tone(95, .12, .02, "triangle", .1); }
    else if(kind === "move") tone(300, .07, 0, "sine", .12);
    else if(kind === "card"){ tone(900, .03, 0, "square", .025); tone(500, .05, .02, "triangle", .05); }
    else if(kind === "capture"){ tone(220, .08, 0, "square", .06); tone(160, .1, .05, "triangle", .08); }
    else if(kind === "mill"){ tone(523, .1, 0); tone(784, .16, .08); }
    else if(kind === "end"){ tone(523, .2, 0); tone(659, .2, .12); tone(784, .3, .24); }
    else if(kind === "lose"){ tone(392, .2, 0); tone(330, .2, .15); tone(262, .35, .3); }
    else if(kind === "bad") tone(140, .12, 0, "sawtooth", .04);
  }catch(e){}
}
function confetti(){
  const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
  const W = cv.width = innerWidth, H = cv.height = innerHeight, g = cv.getContext("2d"), cols = ["#D7263D", "#F5C518", "#1F5FBF", "#9FE0C3", "#F3F5F4"];
  const parts = Array.from({ length: 140 }, () => ({ x: W / 2, y: H * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 6 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  let f = 0; const tick = () => { g.clearRect(0, 0, W, H); parts.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s / 2, 0, 6.28); g.fill(); }); if(++f < 140) requestAnimationFrame(tick); else cv.remove(); };
  requestAnimationFrame(tick);
}
const api = { rec: record, canAct, play, sound, refuse(msg){ toast(msg); sound("bad"); }, update, reduced, get G(){ return G; } };

/* ---------------- Screens ---------------- */
function save(){ if(G && G.mode !== "online") store.set(G.game + "." + G.mode, { keys: G.keys, myColor: G.myColor, level: G.level, seed: G.seed }); }
function load(game, mode){
  const def = TABLES[game], c = store.get(game + "." + mode, null);
  return { game, mode, keys: (c && c.keys) || [], myColor: (c && c.myColor) || "w", level: def.levels.includes(c && c.level) ? c.level : "medium",
    seed: (c && c.seed) || Math.floor(Math.random() * 1e9), instant: true };
}
function tableScreen(){
  if(!G || !TABLES[G.game]) return null;
  const def = TABLES[G.game], online = G.mode === "online";
  return `<div class="screen chscreen tkscreen tk-${def.id}">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${online ? "chat" : "games"}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t(def.id + "Name")}</div><div class="small">${G.mode === "cpu" ? t("chLevel_" + G.level) : G.mode === "local" ? t("daLocal") : t("chOnline")}</div></div>
      ${online ? `<button class="btn ghost small" data-act="cgInvite" data-arg="${def.id}">${t("solNewShort")}</button>` : `<button class="btn ghost small" data-act="tkNewSheet">${t("solNewShort")}</button>`}</div>
    ${online ? onlineInfo("cg", G) : ""}
    <div class="cplayer tkbar" id="ttop"></div>
    <div class="tkmount" id="tmount"></div>
    <div class="cplayer tkbar" id="tbot"></div>
    <div class="cstatus" id="tstatus" role="status" aria-live="polite"></div>
    <div class="ctools">
      ${online ? `<button class="btn ghost small" data-act="tkOfferDraw">${t("chOfferDraw")}</button>` : `<button class="btn ghost small" id="ttake" data-act="tkTakeback">${t("chTakeback")}</button>`}
      ${G.mode === "cpu" ? `<button class="btn ghost small" data-act="tkHint">${t("solHint")}</button>` : ""}
      <button class="btn ghost small" data-act="tkResign">${t("chResign")}</button>
      <button class="iconbtn" data-act="tkSound" aria-label="${t("chSound")}">${store.get("sound", true) ? "🔊︎" : "🔇︎"}</button>
      ${online ? `<button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button>` : ""}
    </div>
    <details class="tkrules"><summary>${t("tkRules")}</summary><p class="small">${def.rules()}</p></details>
  </div>`;
}
function mountTable(){
  const m = document.getElementById("tmount"); if(!m || !G) return;
  const def = TABLES[G.game];
  if(!boards[G.game]) boards[G.game] = def.board.create(api);
  m.appendChild(boards[G.game].el);
  const rec = update();
  if(rec && !G.mounted){ G.mounted = true; if(rec.end) G.endShown = endKey(rec); }
  if(rec && rec.end) finish(rec);
  if(rec && G.mode === "cpu" && !rec.end && rec.st.turn !== rec.myColor && !G.thinking) setTimeout(cpuMove, 400);
}
function tableOverlay(){
  const def = G && TABLES[G.game]; if(!def) return "";
  if(S.tkNew){
    const mode = S.tkPickMode || "cpu", stats = store.get(def.id + ".stats", {});
    return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel"><h2>${t("chNewGame")}</h2>
      ${def.local ? `<div class="flabel">${t("daMode")}</div><div class="seg"><button class="chip" data-act="tkPickMode" data-arg="cpu" aria-pressed="${mode === "cpu"}">${t("vsComputer")}</button><button class="chip" data-act="tkPickMode" data-arg="local" aria-pressed="${mode === "local"}">${t("daLocal")}</button></div>` : ""}
      ${mode === "cpu" ? `<div class="flabel">${t("tkStart")}</div><div class="seg">${["w", "b", "r"].map(c => `<button class="chip" data-act="tkPickStart" data-arg="${c}" aria-pressed="${(S.tkPick || "w") === c}">${t("tkStart_" + c)}</button>`).join("")}</div>
      <div class="flabel">${t("chLevel")}</div><div class="opts">${def.levels.map(l => { const s = stats[l]; return `<button class="chip opt" data-act="tkPickLevel" data-arg="${l}" aria-pressed="${(S.tkLevel || "medium") === l}"><span class="grow"><b>${t("chLevel_" + l)}</b><br><span class="small">${t(def.id + "LevelD_" + l)}</span></span>${s && s.played ? `<span class="small">${t("solStats", { w: s.won, p: s.played })}</span>` : ""}</button>`; }).join("")}</div>` : `<p class="small">${t("daLocalD")}</p>`}
      <button class="btn" data-act="tkStart">${t("play")}</button><div class="row" style="justify-content:flex-end"><button class="link" data-act="tkNewClose">${t("cancel")}</button></div></div></div>`;
  }
  if(S.tkEnd){
    const rec = record(); if(!rec || !rec.end) return "";
    const sc = G.mode === "online" ? null : store.get(G.game + ".score." + G.mode, { a: 0, b: 0, d: 0 });
    const scoreLine = sc ? `<p class="tkfinal"><span>${G.mode === "local" ? def.colorName("w") : t("you")}</span> <b>${sc.a} : ${sc.b}</b> <span>${G.mode === "local" ? def.colorName("b") : t("computer")}</span></p>` : "";
    return `<div class="sheet center" role="dialog" aria-modal="true"><div class="panel"><h2>${endTitle(rec)}</h2>
      <p>${t("tkReason_" + rec.end.reason)} · ${t("solMovesN", { n: Math.ceil(rec.keys.length / 2) })}</p>${def.endNote ? def.endNote(rec) : ""}${scoreLine}
      ${G.mode === "online" ? `<button class="btn" data-act="cgInvite" data-arg="${def.id}">${t("chRematch")}</button>` : `<button class="btn" data-act="tkRematch">${t("chRematch")}</button><button class="btn ghost" data-act="tkNewSheet">${t("chNewGame")}</button>`}
      <button class="link" data-act="tkEndClose">${t("chSeeBoard")}</button></div></div>`;
  }
  return "";
}
function fresh(game, mode, starter, level){
  const myColor = starter === "r" ? (Math.random() < .5 ? "w" : "b") : starter || "w";
  setG({ game, mode, keys: [], myColor, level: level || "medium", seed: Math.floor(Math.random() * 1e9) }); S.tkEnd = false; save();
}
const tableActions = {
  tkCpu(game){ if(!TABLES[game]) return; const mode = TABLES[game].local ? store.get(game + ".lastMode", "cpu") : "cpu"; setG(load(game, mode)); S.tkEnd = false; S.screen = "table"; render(); },
  tkOpenOnline(game, gid){ if(!TABLES[game] || !GID.test(gid)) return; const m = peerOf(S.chatWith); setG({ game, mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name, instant: true }); S.tkEnd = false; S.screen = "table"; render(); },
  tkNewSheet(){ S.tkEnd = false; S.tkNew = true; S.tkPickMode = G && G.mode === "local" ? "local" : "cpu"; S.tkPick = G && G.mode === "cpu" && G.myColor === "b" ? "b" : "w"; S.tkLevel = G && G.level || "medium"; render(); },
  tkNewClose(){ S.tkNew = false; render(); },
  tkPickMode(m){ S.tkPickMode = m === "local" ? "local" : "cpu"; render(); },
  tkPickStart(c){ S.tkPick = ["w", "b", "r"].includes(c) ? c : "w"; render(); },
  tkPickLevel(l){ if(G && TABLES[G.game].levels.includes(l)) S.tkLevel = l; render(); },
  tkStart(){ S.tkNew = false; const mode = S.tkPickMode || "cpu"; store.set(G.game + ".lastMode", mode); fresh(G.game, mode, mode === "cpu" ? S.tkPick : "w", S.tkLevel); render(); },
  tkRematch(){ S.tkEnd = false; fresh(G.game, G.mode, G.mode === "cpu" ? other(G.myColor) : "w", G.level); render(); },
  tkEndClose(){ S.tkEnd = false; render(); },
  tkTakeback(){
    if(!G || G.mode === "online" || G.thinking) return;
    const rec = record(); let n = rec.keys.length; if(!n) return;
    if(G.mode === "cpu"){ if(!rec.states.slice(0, n).some(s => s.turn === rec.myColor)) return; while(n > 0){ n--; if(rec.states[n].turn === rec.myColor) break; } }
    else n--;
    G.keys = G.keys.slice(0, n); G.hint = null; G.resigned = null; G.endShown = null; S.tkEnd = false; save(); update();
  },
  async tkHint(){
    const rec = record(); if(!canAct(rec)) return;
    const mv = await think(G.game, rec.st, "hard"); if(!mv) return;
    G.hint = mv; update(); setTimeout(() => { if(G && G.hint === mv){ G.hint = null; update(); } }, 3000);
  },
  tkSound(){ store.set("sound", !store.get("sound", true)); render(); },
  tkResign(){
    const rec = record(); if(!rec || rec.end || !confirm(t("chResignAsk"))) return;
    if(G.mode === "online"){ sendBody(CARD + "cgx:" + G.gid + ":resign"); const r = record(); if(r.end) finish(r); }
    else { G.resigned = G.mode === "local" ? rec.st.turn : rec.myColor; const r = update(); finish(r); }
  },
  tkOfferDraw(){ if(G && G.mode === "online"){ sendBody(CARD + "cgx:" + G.gid + ":draw"); toast(t("chDrawSent")); } },
  tkDrawAnswer(a){ if(G && G.mode === "online"){ sendBody(CARD + "cgx:" + G.gid + ":" + (a === "accept" ? "accept" : "decline")); const r = record(); if(r.end) finish(r); } }
};
export { isTable, mountTable, register, tableActions, tableOverlay, tableScreen };
