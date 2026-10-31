// Dama (Turkish/Arabic draughts), modelled on the popular Dama apps: wooden board with round pieces, drag & drop
// or tap, multi-captures hop square by square (one jump per drag/tap, or straight to the end square), captured
// pieces fade one by one, pieces that must capture glow ("you must capture"), crowned kings, move list, capture
// counters, hint, undo, flip, sounds, four computer levels (Web Worker), two players on one phone, online with a
// match incl. resign / draw offer, and an end screen with the reason.
// Online chat cards: dama:<gid> (sender plays white), dm:<gid>:<path key>, dx:<gid>:resign|draw|accept|decline.
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, parseMsg, t, toast } from "./util.js";

const LEVELS = ["easy", "medium", "hard", "expert"];
const GID = /^[A-Za-z0-9]{4,12}$/;
const store = { get(k, d){ try{ const v = localStorage.getItem("zugpal.dama." + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("zugpal.dama." + k, JSON.stringify(v)); }catch(e){} } };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const HOP = 230;   // ms per jump

let G = null;   // { mode: "cpu"|"local"|"online", keys (cpu/local), myColor, level, gid, peerId, part, hint, view, thinking }
let B = null;   // board DOM
function setG(g){ G = g; S.dama = g; return g; }

/* ---------------- Game record ---------------- */
function record(){
  if(!G) return null;
  let keys = [], myColor = G.myColor || "w", extra = { resign: null, drawOffer: null, drawAgreed: false };
  if(G.mode !== "online") keys = G.keys.slice();
  else {
    let starter = null, st = ZDama.newGame();
    for(const x of S.messages){
      const p = parseMsg(x.body);
      if(p.type === "dama" && p.val === G.gid && starter === null) starter = x.mine;
      if(starter === null || p.val !== G.gid) continue;
      const color = x.mine === starter ? "w" : "b";
      if(p.type === "dm" && st.turn === color && !extra.resign && !extra.drawAgreed){ const m = ZDama.fromKey(st, p.extra); if(m){ st = ZDama.apply(st, m); keys.push(ZDama.key(m)); } }
      if(p.type === "dx"){
        if(p.extra === "resign" && !extra.resign) extra.resign = color;
        if(p.extra === "draw") extra.drawOffer = { by: color, ply: keys.length };
        if(p.extra === "accept" && extra.drawOffer && extra.drawOffer.by !== color) extra.drawAgreed = true;
        if(p.extra === "decline") extra.drawOffer = null;
      }
    }
    if(extra.drawOffer && extra.drawOffer.ply !== keys.length) extra.drawOffer = null;
    myColor = starter === false ? "b" : "w";
  }
  const states = [ZDama.newGame()], moves = [], notes = [];
  for(const k of keys){ const s = states[states.length - 1], m = ZDama.fromKey(s, k); if(!m) break; moves.push(m); notes.push(ZDama.notation(m)); states.push(ZDama.apply(s, m)); }
  const st = states[states.length - 1], status = ZDama.status(st);
  const seen = {}; let repetition = false; for(const s of states){ const k = ZDama.posKey(s); seen[k] = (seen[k] || 0) + 1; if(seen[k] >= 3) repetition = true; }
  let end = null;
  if(status.winner) end = { winner: status.winner, reason: st.b.some(p => ZDama.color(p) === st.turn) ? "blocked" : "nopieces" };
  else if(status.draw) end = { winner: null, reason: "quiet" };
  else if(repetition) end = { winner: null, reason: "repetition" };
  else if(extra.resign) end = { winner: extra.resign === "w" ? "b" : "w", reason: "resign" };
  else if(extra.drawAgreed) end = { winner: null, reason: "agreed" };
  else if(G.resigned) end = { winner: G.resigned === "w" ? "b" : "w", reason: "resign" };
  if(G.mode === "local") myColor = st.turn;
  return { keys: keys.slice(0, moves.length), states, moves, notes, st, status, end, myColor, drawOffer: extra.drawOffer };
}
const viewIndex = rec => G.view === null || G.view === undefined || G.view >= rec.states.length - 1 ? rec.states.length - 1 : Math.max(0, G.view);

/* ---------------- Board DOM ---------------- */
function ensureBoard(){
  if(B) return B;
  const el = document.createElement("div"); el.className = "dboard"; el.setAttribute("dir", "ltr");
  const squares = [];
  for(let i = 0; i < 64; i++){ const d = document.createElement("div"); d.className = "dsq"; el.appendChild(d); squares.push(d); }
  const layer = document.createElement("div"); layer.className = "dlayer"; el.appendChild(layer);
  const arrows = document.createElementNS("http://www.w3.org/2000/svg", "svg"); arrows.setAttribute("viewBox", "0 0 8 8"); arrows.classList.add("carrows"); el.appendChild(arrows);
  el.addEventListener("pointerdown", onDown);
  B = { el, squares, layer, arrows, pieces: [], shown: null, shownView: 0, flip: null };
  return B;
}
const flipped = () => !!G && G.mode !== "local" && ((G.myColor || "w") === "b") !== !!G.flip || (!!G && G.mode === "local" && !!G.flip);
const posOf = sq => { const f = sq % 8, r = Math.floor(sq / 8), fl = flipped(); return { x: fl ? 7 - f : f, y: fl ? r : 7 - r }; };
function place(el, sq){ const p = posOf(sq); el.style.transform = `translate(${p.x * 100}%,${p.y * 100}%)`; }
function makePiece(p){
  const el = document.createElement("div"); el.className = "dpiece " + ZDama.color(p) + (ZDama.isKing(p) ? " king" : "");
  el.innerHTML = `<span class="disc"></span><span class="crown">♛︎</span>`;
  B.layer.appendChild(el); return el;
}
function setKind(item, p){ if(item.p === p) return; const wasKing = ZDama.isKing(item.p); item.p = p; item.el.className = "dpiece " + ZDama.color(p) + (ZDama.isKing(p) ? " king" : ""); if(!wasKing && ZDama.isKing(p) && !reduced()){ item.el.classList.add("crowned"); setTimeout(() => item.el.classList.remove("crowned"), 700); } }
function candidates(rec){ return canAct(rec) ? ZDama.legal(rec.st) : []; }
function canAct(rec){ return rec && !rec.end && viewIndex(rec) === rec.states.length - 1 && !G.thinking && (G.mode === "local" || rec.st.turn === rec.myColor); }
function matchPart(cands, part){ return cands.filter(m => part.every((s, i) => m.path[i] === s)); }
function paintSquares(rec){
  const fl = flipped(), view = viewIndex(rec), st = rec.states[view], last = rec.moves[view - 1];
  const cands = candidates(rec), part = G.part || [], matching = part.length ? matchPart(cands, part) : [];
  const nexts = new Set(matching.map(m => m.path[part.length]).filter(x => x !== undefined));
  const ends = new Set(matching.map(m => m.path[m.path.length - 1]));
  const must = cands.length && cands[0].taken.length ? new Set(cands.map(m => m.path[0])) : new Set();
  const lastPath = new Set(last ? last.path : []);
  B.squares.forEach((d, idx) => {
    const x = idx % 8, y = Math.floor(idx / 8), sq = fl ? (y * 8 + (7 - x)) : ((7 - y) * 8 + x);
    d.dataset.sq = sq;
    let cls = "dsq";
    if(lastPath.has(sq) && !part.length) cls += " last";
    if(part.length && part[part.length - 1] === sq) cls += " sel";
    if(nexts.has(sq)) cls += " step"; else if(ends.has(sq) && part.length) cls += " goal";
    if(!part.length && must.has(sq)) cls += " must";
    d.className = cls;
    d.innerHTML = (x === 0 ? `<span class="rk">${Math.floor(sq / 8) + 1}</span>` : "") + (y === 7 ? `<span class="fl">${"abcdefgh"[sq % 8]}</span>` : "");
  });
}
// pieces follow the position; a new move hops along its path and removes captured pieces one by one
function syncPieces(rec, animate){
  const view = viewIndex(rec), st = rec.states[view];
  const sameLine = B.shown && B.shown.join() === rec.keys.slice(0, B.shownView).join();
  const oneStep = animate && sameLine && view === B.shownView + 1 && B.flip === flipped();
  const m = oneStep ? rec.moves[view - 1] : null;
  if(m && !G.previewed){
    const mover = B.pieces.find(x => x.sq === m.path[0]);
    if(mover){
      mover.el.style.zIndex = 5;
      m.path.slice(1).forEach((sq, i) => setTimeout(() => {
        place(mover.el, sq); mover.sq = sq;
        const v = m.taken[i] !== undefined && B.pieces.find(x => x.sq === m.taken[i] && x !== mover);
        if(v){ v.el.classList.add("gone"); setTimeout(() => v.el.remove(), 300); B.pieces = B.pieces.filter(x => x !== v); }
        if(i === m.path.length - 2){ setTimeout(() => { mover.el.style.zIndex = ""; setKind(mover, st.b[sq]); }, HOP); }
      }, reduced() ? 0 : i * HOP));
    }
  } else {
    // full match (also finalises a move whose hops were already shown while you played it)
    const pool = B.pieces.slice(), next = [];
    st.b.forEach((p, sq) => { if(!p) return;
      let i = pool.findIndex(x => x.sq === sq && ZDama.color(x.p) === ZDama.color(p)); if(i < 0) i = pool.findIndex(x => ZDama.color(x.p) === ZDama.color(p));
      let item; if(i >= 0) item = pool.splice(i, 1)[0]; else { item = { el: makePiece(p), p }; item.el.style.transition = "none"; requestAnimationFrame(() => requestAnimationFrame(() => { item.el.style.transition = ""; })); }
      item.sq = sq; place(item.el, sq); setKind(item, p); next.push(item);
    });
    pool.forEach(x => { x.el.classList.add("gone"); setTimeout(() => x.el.remove(), 300); });
    B.pieces = next;
  }
  G.previewed = false;
  B.shown = rec.keys.slice(0, view); B.shownView = view; B.flip = flipped();
}
// while you build a capture step by step, show the piece on its current square and fade what it took
function preview(rec){
  const part = G.part || []; if(part.length < 2) return;
  const m = matchPart(candidates(rec), part)[0]; if(!m) return;
  const mover = B.pieces.find(x => x.sq === part[0] || x.moving); if(!mover) return;
  mover.moving = true; mover.el.style.zIndex = 5; place(mover.el, part[part.length - 1]);
  m.taken.slice(0, part.length - 1).forEach(t2 => { const v = B.pieces.find(x => x.sq === t2); if(v) v.el.classList.add("gone"); });
}
function drawHint(m){
  B.arrows.innerHTML = "";
  if(!m) return;
  const pts = m.path.map(posOf).map(p => `${p.x + .5},${p.y + .5}`).join(" ");
  B.arrows.innerHTML = `<defs><marker id="dah" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto"><path d="M0,0 L3,1.5 L0,3 z" fill="#E0A526"/></marker></defs>
    <polyline points="${pts}" fill="none" stroke="#E0A526" stroke-width=".16" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#dah)" opacity=".9"/>`;
}

/* ---------------- Updating the view ---------------- */
function update(animate){
  const rec = record(); if(!rec || !B) return rec;
  paintSquares(rec); syncPieces(rec, animate !== false); preview(rec);
  drawHint(G.hint && viewIndex(rec) === rec.states.length - 1 ? G.hint : null);
  const ml = document.getElementById("dmoves");
  if(ml){
    const view = viewIndex(rec);
    ml.innerHTML = rec.notes.map((s, i) => (i % 2 === 0 ? `<span class="mn">${i / 2 + 1}.</span>` : "") + `<button class="mv${i + 1 === view ? " cur" : ""}" data-act="daView" data-arg="${i + 1}">${esc(s)}</button>`).join("") || `<span class="small">${t("chNoMoves")}</span>`;
    const cur = ml.querySelector(".cur"); if(cur) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  const st = rec.states[viewIndex(rec)];
  const count = c => st.b.filter(p => ZDama.color(p) === c).length, kings = c => st.b.filter(p => p === c.toUpperCase()).length;
  const bar = c => `<span class="dmini ${c}"></span> ${count(c)}${kings(c) ? ` <span class="small">(${kings(c)} ♛︎)</span>` : ""} <span class="small">· ${t("daTaken", { n: 16 - count(c === "w" ? "b" : "w") })}</span>`;
  const me = G.mode === "local" ? "w" : rec.myColor, them = me === "w" ? "b" : "w";
  const name = G.mode === "cpu" ? t("chLevel_" + G.level) : G.mode === "local" ? t("daColor_" + them) : esc((peerOf(G.peerId) || { first_name: G.peerName || "" }).first_name);
  const top = document.getElementById("dtop"), bot = document.getElementById("dbot");
  if(top) top.innerHTML = `<span class="who">${G.mode === "cpu" ? "🤖︎ " : ""}${name}${G.thinking ? ` <span class="small">${t("thinking")}</span>` : ""}</span><span>${bar(them)}</span>`;
  if(bot) bot.innerHTML = `<span class="who">${G.mode === "local" ? t("daColor_" + me) : t("you")}</span><span>${bar(me)}</span>`;
  const sl = document.getElementById("dstatus");
  if(sl){
    let s;
    if(viewIndex(rec) < rec.states.length - 1) s = `${t("chReviewing")} <button class="link" data-act="daView" data-arg="live">${t("chBackLive")}</button>`;
    else if(rec.end) s = endTitle(rec) + " · " + t("daReason_" + rec.end.reason);
    else if(rec.drawOffer && rec.drawOffer.by !== rec.myColor) s = `${t("chDrawOffered", { name })} <button class="btn small" data-act="daDrawAnswer" data-arg="accept">${t("chAccept")}</button> <button class="btn ghost small" data-act="daDrawAnswer" data-arg="decline">${t("chDecline")}</button>`;
    else if(G.mode === "local") s = t("daTurn_" + rec.st.turn) + (rec.status.mustCapture ? " · " + t("daMust") : "");
    else if(rec.st.turn === rec.myColor) s = t("yourMove") + (rec.status.mustCapture ? " · " + t("daMust") : "");
    else s = G.mode === "cpu" ? t("thinking") : t("peerMove", { name });
    sl.innerHTML = s;
  }
  const tb = document.getElementById("dtake"); if(tb) tb.disabled = G.mode === "online" || !rec.keys.length || G.thinking;
  return rec;
}
function endTitle(rec){
  const e = rec.end;
  if(!e.winner) return t("chDraw");
  if(G.mode === "local") return t("daWins_" + e.winner);
  return e.winner === rec.myColor ? t("chYouWin") : t("chYouLose");
}

/* ---------------- Moving ---------------- */
let drag = null;
function squareAt(x, y){
  const r = B.el.getBoundingClientRect(); if(x < r.left || y < r.top || x > r.right || y > r.bottom) return null;
  const cx = Math.floor((x - r.left) / (r.width / 8)), cy = Math.floor((y - r.top) / (r.height / 8));
  return flipped() ? cy * 8 + (7 - cx) : (7 - cy) * 8 + cx;
}
function refuse(msg){ toast(msg); sound("bad"); }
function choose(rec, sq){   // a tap or drop on sq while building a move; true if it was used
  const cands = candidates(rec), part = G.part || [];
  const matching = matchPart(cands, part);
  const full = matching.filter(m => m.path[m.path.length - 1] === sq);
  if(full.length === 1 && part.length){ commitMove(full[0], part.length > 1); return true; }   // straight to the end square
  const step = matching.filter(m => m.path[part.length] === sq);
  if(step.length){
    G.part = part.concat([sq]);
    const done = step.filter(m => m.path.length === G.part.length);
    if(done.length === 1 && step.length === 1){ preview(rec); commitMove(done[0], true); return true; }
    update(false); sound("move"); return true;
  }
  return false;
}
function onDown(e){
  const rec = record(); if(!canAct(rec)) return;
  const sq = squareAt(e.clientX, e.clientY); if(sq === null) return;
  e.preventDefault();
  const cands = candidates(rec), part = G.part || [];
  if(part.length && choose(rec, sq)) return;
  const own = rec.st.b[sq] && ZDama.color(rec.st.b[sq]) === rec.st.turn;
  if(own){
    if(part.length > 1){ return; }                                 // finish the capture you started (or undo it)
    if(!cands.some(m => m.path[0] === sq)){ G.part = []; update(false); return refuse(rec.status.mustCapture ? t("daMustMsg") : t("daNoMove")); }
    G.part = [sq]; G.hint = null; update(false);
    const pc = B.pieces.find(x => x.sq === sq);
    drag = { from: sq, el: pc && pc.el, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId };
    B.el.setPointerCapture(e.pointerId);
    B.el.addEventListener("pointermove", onMove); B.el.addEventListener("pointerup", onUp); B.el.addEventListener("pointercancel", onUp);
  } else if(part.length === 1){ G.part = []; update(false); }
}
function onMove(e){
  if(!drag || e.pointerId !== drag.pid || !drag.el) return;
  if(!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
  drag.moved = true;
  const r = B.el.getBoundingClientRect(), s = r.width / 8;
  drag.el.classList.add("dragging");
  drag.el.style.transform = `translate(${e.clientX - r.left - s / 2}px,${e.clientY - r.top - s * 0.75}px) scale(1.12)`;
}
function onUp(e){
  if(!drag || e.pointerId !== drag.pid) return;
  B.el.removeEventListener("pointermove", onMove); B.el.removeEventListener("pointerup", onUp); B.el.removeEventListener("pointercancel", onUp);
  const d = drag; drag = null;
  if(d.el) d.el.classList.remove("dragging");
  if(!d.moved) return;
  const to = squareAt(e.clientX, e.clientY), rec = record();
  if(to !== null && to !== d.from && choose(rec, to)) return;
  if(d.el) place(d.el, d.from);
  if(to !== null && to !== d.from) refuse(rec.status.mustCapture ? t("daMustMsg") : t("daBadSquare"));
}
function commitMove(m, previewed){
  G.part = []; G.hint = null; G.previewed = !!previewed;
  const mv = B.pieces.find(x => x.moving); if(mv && previewed) mv.sq = m.path[m.path.length - 1];
  B.pieces.forEach(x => { x.moving = false; });
  const k = ZDama.key(m);
  if(G.mode !== "online"){ G.keys.push(k); save(); }
  else sendBody(CARD + "dm:" + G.gid + ":" + k);
  const after = update(true);
  sound(m.taken.length ? "capture" : "move");
  if(after && after.end) return finish(after);
  if(G.mode === "cpu") setTimeout(cpuMove, previewed ? 150 : m.path.length * HOP);
}
let worker = null, jobId = 0;
function think(st, level){
  return new Promise(res => {
    try{
      if(!worker) worker = new Worker("engines/dama-worker.js");
      const id = ++jobId, on = e => { if(e.data.id === id){ worker.removeEventListener("message", on); res(e.data.key); } };
      worker.addEventListener("message", on); worker.postMessage({ id, st, level });
    }catch(e){ const m = ZDama.think(st, level); res(m ? ZDama.key(m) : null); }
  });
}
async function cpuMove(){
  const rec = record(); if(!rec || rec.end || G.mode !== "cpu" || rec.st.turn === rec.myColor || G.thinking) return;
  G.thinking = true; update(false);
  const t0 = Date.now(), n = G.keys.length, game = G;
  const k = await think(rec.st, G.level);
  await new Promise(r => setTimeout(r, Math.max(0, 500 - (Date.now() - t0))));
  if(G !== game || G.keys.length !== n) return;
  G.thinking = false;
  if(!k){ update(false); return; }
  G.keys.push(k); save();
  const m = ZDama.fromKey(rec.st, k), after = update(true);
  sound(m && m.taken.length ? "capture" : "move");
  if(after.end) setTimeout(() => finish(after), m ? m.path.length * HOP : 0);
}
function finish(rec){
  const key = (G.gid || G.mode) + ":" + rec.keys.length + ":" + rec.end.reason; if(G.endShown === key) return; G.endShown = key;
  sound("end");
  const win = G.mode === "local" ? !!rec.end.winner : rec.end.winner === rec.myColor;
  if(win && !reduced()) confetti();
  if(G.mode === "cpu"){ const stats = store.get("stats", {}), s = stats[G.level] || { played: 0, won: 0 }; s.played++; if(rec.end.winner === rec.myColor) s.won++; stats[G.level] = s; store.set("stats", stats); }
  setTimeout(() => { S.damaEnd = true; render(); }, 700);
}

/* ---------------- Sound & confetti ---------------- */
let actx = null;
function sound(kind){
  if(!store.get("sound", true)) return;
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime, tone = (f, d, at, type, vol) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type || "triangle"; o.frequency.value = f; g.gain.setValueAtTime(vol || .1, now + at); g.gain.exponentialRampToValueAtTime(.001, now + at + d); o.connect(g).connect(actx.destination); o.start(now + at); o.stop(now + at + d); };
    if(kind === "move") tone(300, .07, 0, "sine", .12);
    else if(kind === "capture"){ tone(220, .08, 0, "square", .06); tone(160, .1, .05, "triangle", .08); }
    else if(kind === "end"){ tone(523, .2, 0); tone(659, .2, .12); tone(784, .3, .24); }
    else if(kind === "bad") tone(140, .12, 0, "sawtooth", .04);
  }catch(e){}
}
function confetti(){
  const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
  const W = cv.width = innerWidth, H = cv.height = innerHeight, g = cv.getContext("2d"), cols = ["#7A4A12", "#F2C46B", "#F3F5F4", "#15211D", "#9FE0C3"];
  const parts = Array.from({ length: 130 }, () => ({ x: W / 2, y: H * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6.28, s: 6 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  let f = 0; const tick = () => { g.clearRect(0, 0, W, H); parts.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s / 2, 0, 6.28); g.fill(); }); if(++f < 140) requestAnimationFrame(tick); else cv.remove(); };
  requestAnimationFrame(tick);
}

/* ---------------- Screens ---------------- */
function save(){ if(G && G.mode !== "online") store.set(G.mode, { keys: G.keys, myColor: G.myColor, level: G.level }); }
function load(mode){ const c = store.get(mode, null); return { mode, keys: (c && c.keys) || [], myColor: (c && c.myColor) || "w", level: LEVELS.includes(c && c.level) ? c.level : "medium", part: [], view: null }; }
function damaScreen(){
  if(!G) setG(load("cpu"));
  const online = G.mode === "online", back = online ? "chat" : "games";
  return `<div class="screen chscreen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${back}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("damaT")}</div><div class="small">${G.mode === "cpu" ? t("chLevel_" + G.level) : G.mode === "local" ? t("daLocal") : t("chOnline")}</div></div>
      ${online ? "" : `<button class="btn ghost small" data-act="daNewSheet">${t("solNewShort")}</button>`}</div>
    ${online ? onlineInfo("dama", G) : ""}
    <div class="cplayer" id="dtop"></div>
    <div class="cmount" id="dmount"></div>
    <div class="cplayer" id="dbot"></div>
    <div class="cstatus" id="dstatus" role="status" aria-live="polite"></div>
    <div class="cmoves" id="dmoves" dir="ltr"></div>
    <div class="ctools">
      <button class="iconbtn" data-act="daStep" data-arg="-1" aria-label="${t("chPrev")}">‹</button>
      <button class="iconbtn" data-act="daStep" data-arg="1" aria-label="${t("chNext")}">›</button>
      ${online ? `<button class="btn ghost small" data-act="daOfferDraw">${t("chOfferDraw")}</button>` : `<button class="btn ghost small" id="dtake" data-act="daTakeback">${t("chTakeback")}</button>`}
      ${G.mode === "cpu" ? `<button class="btn ghost small" data-act="daHint">${t("solHint")}</button>` : ""}
      <button class="btn ghost small" data-act="daFlip">${t("chFlip")}</button>
      <button class="btn ghost small" data-act="daResign">${t("chResign")}</button>
      <button class="iconbtn" data-act="daSound" aria-label="${t("chSound")}">${store.get("sound", true) ? "🔊︎" : "🔇︎"}</button>
    </div>
    <div class="small">${t("daRules")}</div>
  </div>`;
}
function mountDama(){
  const m = document.getElementById("dmount"); if(!m || !G) return;
  ensureBoard(); m.appendChild(B.el);
  const rec = update(B.shown !== null);
  if(rec && !G.mounted){ G.mounted = true; if(rec.end) G.endShown = (G.gid || G.mode) + ":" + rec.keys.length + ":" + rec.end.reason; }
  if(rec && rec.end) finish(rec);
  if(rec && G.mode === "cpu" && !rec.end && rec.st.turn !== rec.myColor && !G.thinking) setTimeout(cpuMove, 300);
}
function damaOverlay(){
  if(S.damaNew) return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel"><h2>${t("chNewGame")}</h2>
    <div class="flabel">${t("daMode")}</div><div class="seg"><button class="chip" data-act="daPickMode" data-arg="cpu" aria-pressed="${(S.damaPickMode || "cpu") === "cpu"}">${t("vsComputer")}</button><button class="chip" data-act="daPickMode" data-arg="local" aria-pressed="${S.damaPickMode === "local"}">${t("daLocal")}</button></div>
    ${(S.damaPickMode || "cpu") === "cpu" ? `<div class="flabel">${t("chColor")}</div><div class="seg">${["w", "b", "r"].map(c => `<button class="chip" data-act="daPickColor" data-arg="${c}" aria-pressed="${(S.damaPick || "w") === c}">${t("chColor_" + c)}</button>`).join("")}</div>
    <div class="flabel">${t("chLevel")}</div><div class="opts">${LEVELS.map(l => { const s = store.get("stats", {})[l]; return `<button class="chip opt" data-act="daPickLevel" data-arg="${l}" aria-pressed="${(S.damaLevel || "medium") === l}"><span class="grow"><b>${t("chLevel_" + l)}</b><br><span class="small">${t("daLevelD_" + l)}</span></span>${s && s.played ? `<span class="small">${t("solStats", { w: s.won, p: s.played })}</span>` : ""}</button>`; }).join("")}</div>` : `<p class="small">${t("daLocalD")}</p>`}
    <button class="btn" data-act="daStart">${t("play")}</button><div class="row" style="justify-content:flex-end"><button class="link" data-act="daNewClose">${t("cancel")}</button></div></div></div>`;
  if(S.damaEnd && G){
    const rec = record(); if(!rec.end) return "";
    return `<div class="sheet center" role="dialog" aria-modal="true"><div class="panel"><h2>${endTitle(rec)}</h2>
      <p>${t("daReason_" + rec.end.reason)} · ${t("solMovesN", { n: Math.ceil(rec.keys.length / 2) })}</p>
      ${G.mode === "online" ? `<button class="btn" data-act="damaInvite">${t("chRematch")}</button>` : `<button class="btn" data-act="daRematch">${t("chRematch")}</button><button class="btn ghost" data-act="daNewSheet">${t("chNewGame")}</button>`}
      <button class="link" data-act="daEndClose">${t("chSeeBoard")}</button></div></div>`;
  }
  return "";
}
function fresh(mode, color, level){
  const myColor = color === "r" ? (Math.random() < .5 ? "w" : "b") : color || "w";
  setG({ mode, keys: [], myColor, level: level || "medium", part: [], view: null }); S.damaEnd = false; save();
  if(B){ B.shown = null; B.pieces.forEach(x => x.el.remove()); B.pieces = []; }
}
const damaActions = {
  damaCpuNew(){ if(!G || G.mode === "online") setG(load(store.get("lastMode", "cpu"))); S.damaEnd = false; if(B) B.shown = null; S.screen = "dama"; render(); },
  damaInvite(){ const gid = Math.random().toString(36).slice(2, 10), m = peerOf(S.chatWith); S.damaEnd = false; sendBody(CARD + "dama:" + gid); setG({ mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name, part: [], view: null }); if(B) B.shown = null; S.screen = "dama"; render(); },
  damaOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); setG({ mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name, part: [], view: null }); S.damaEnd = false; if(B) B.shown = null; S.screen = "dama"; render(); },
  daNewSheet(){ S.damaEnd = false; S.damaNew = true; S.damaPickMode = G && G.mode === "local" ? "local" : "cpu"; S.damaPick = G && G.myColor || "w"; S.damaLevel = G && G.level || "medium"; render(); },
  daNewClose(){ S.damaNew = false; render(); },
  daPickMode(m){ S.damaPickMode = m === "local" ? "local" : "cpu"; render(); },
  daPickColor(c){ S.damaPick = c; render(); },
  daPickLevel(l){ if(LEVELS.includes(l)) S.damaLevel = l; render(); },
  daStart(){ S.damaNew = false; const mode = S.damaPickMode || "cpu"; store.set("lastMode", mode); fresh(mode, mode === "cpu" ? S.damaPick : "w", S.damaLevel); render(); },
  daRematch(){ S.damaEnd = false; fresh(G.mode, G.mode === "cpu" ? (G.myColor === "w" ? "b" : "w") : "w", G.level); render(); },
  daEndClose(){ S.damaEnd = false; render(); },
  daTakeback(){
    if(!G || G.mode === "online" || G.thinking) return;
    const rec = record(); let n = G.mode === "cpu" && rec.st.turn === rec.myColor ? 2 : 1; n = Math.min(n, G.keys.length);
    G.keys = G.keys.slice(0, G.keys.length - n); G.part = []; G.hint = null; G.view = null; G.resigned = null; S.damaEnd = false; save(); if(B) B.shown = null; update(false);
  },
  async daHint(){ const rec = record(); if(!canAct(rec)) return; const k = await think(rec.st, "hard"), m = k && ZDama.fromKey(rec.st, k); if(m){ G.hint = m; update(false); setTimeout(() => { if(G.hint === m){ G.hint = null; update(false); } }, 3000); } },
  daFlip(){ G.flip = !G.flip; if(B) B.shown = null; update(false); },
  daSound(){ store.set("sound", !store.get("sound", true)); render(); },
  daStep(d){ const rec = record(); G.view = Math.max(0, Math.min(rec.states.length - 1, viewIndex(rec) + Number(d))); G.part = []; if(B) B.shown = null; update(false); },
  daView(a){ G.view = a === "live" ? null : Number(a); G.part = []; if(B) B.shown = null; update(false); },
  daResign(){
    const rec = record(); if(!rec || rec.end || !confirm(t("chResignAsk"))) return;
    if(G.mode === "online"){ sendBody(CARD + "dx:" + G.gid + ":resign"); setTimeout(() => { const r = record(); if(r.end) finish(r); }, 50); }
    else { G.resigned = G.mode === "local" ? rec.st.turn : rec.myColor; const r = update(false); finish(r); }
  },
  daOfferDraw(){ if(G && G.mode === "online"){ sendBody(CARD + "dx:" + G.gid + ":draw"); toast(t("chDrawSent")); } },
  daDrawAnswer(a){ if(G && G.mode === "online"){ sendBody(CARD + "dx:" + G.gid + ":" + (a === "accept" ? "accept" : "decline")); setTimeout(() => { const r = record(); if(r.end) finish(r); }, 50); } }
};
export { damaActions, damaOverlay, damaScreen, mountDama };
