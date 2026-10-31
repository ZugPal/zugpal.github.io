// Chess, modelled on the big chess apps: drag & drop or tap-tap with legal-move dots, animated pieces (cburnett set),
// last-move and check highlights, promotion picker, move list in notation with step-through review, captured
// pieces with material balance, hint arrow, takeback, flip board, move sounds, four computer levels (search runs
// in a Web Worker), resign / draw offer online, and an end screen with the reason (+ confetti or a fallen king).
// Online moves use the same chat cards as before: chess:<gid> (sender plays white), cm:<gid>:<uci>,
// and now cx:<gid>:resign|draw|accept|decline.
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, parseMsg, t, toast } from "./util.js";

const LEVELS = ["easy", "medium", "hard", "expert"];
const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
const GID = /^[A-Za-z0-9]{4,12}$/;
const store = { get(k, d){ try{ const v = localStorage.getItem("zugpal.chess." + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("zugpal.chess." + k, JSON.stringify(v)); }catch(e){} } };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let G = null;   // current game (also kept in S.chess, which presence and polling read): { mode, gid, peerId, peerName, plies (cpu), myColor, level, sel, flip, view, thinking, hint }
let B = null;   // board DOM: { el, squares[], layer, arrows, pieces: [{el, sq, p}], shown: [uci...] }

/* ---------------- Game record ---------------- */
// Everything is derived from the move list: positions, notation, captures, how the game ended.
function record(){
  if(!G) return null;
  let plies = [], myColor = G.myColor, extra = { resign: null, drawOffer: null, drawAgreed: false };
  if(G.mode === "cpu") plies = G.plies.slice();
  else {
    let starter = null, st = ZChess.newGame();
    for(const x of S.messages){
      const p = parseMsg(x.body);
      if(p.type === "chess" && p.val === G.gid && starter === null) starter = x.mine;
      if(starter === null || p.val !== G.gid) continue;
      const color = x.mine === starter ? "w" : "b";
      if(p.type === "cm" && st.turn === color && !extra.resign && !extra.drawAgreed){ const m = ZChess.fromUci(st, p.extra); if(m){ st = ZChess.apply(st, m); plies.push(ZChess.uci(m)); extra.drawOffer = extra.drawOffer && extra.drawOffer.ply === plies.length ? extra.drawOffer : null; } }
      if(p.type === "cx"){
        if(p.extra === "resign" && !extra.resign) extra.resign = color;
        if(p.extra === "draw") extra.drawOffer = { by: color, ply: plies.length };
        if(p.extra === "accept" && extra.drawOffer && extra.drawOffer.by !== color) extra.drawAgreed = true;
        if(p.extra === "decline") extra.drawOffer = null;
      }
    }
    myColor = starter === false ? "b" : "w";
  }
  const states = [ZChess.newGame()], sans = [], moves = [];
  for(const u of plies){ const s = states[states.length - 1], m = ZChess.fromUci(s, u); if(!m) break; sans.push(ZChess.san(s, m)); moves.push(m); states.push(ZChess.apply(s, m)); }
  const st = states[states.length - 1], status = ZChess.status(st);
  const keys = {}; let threefold = false; for(const s of states){ const k = ZChess.key(s); keys[k] = (keys[k] || 0) + 1; if(keys[k] >= 3) threefold = true; }
  let end = null;
  if(status.mate) end = { winner: st.turn === "w" ? "b" : "w", reason: "mate" };
  else if(status.stalemate) end = { winner: null, reason: "stalemate" };
  else if(st.half >= 100) end = { winner: null, reason: "fifty" };
  else if(status.draw) end = { winner: null, reason: "material" };
  else if(threefold) end = { winner: null, reason: "repetition" };
  else if(extra.resign) end = { winner: extra.resign === "w" ? "b" : "w", reason: "resign" };
  else if(extra.drawAgreed) end = { winner: null, reason: "agreed" };
  else if(G.resigned) end = { winner: myColor === "w" ? "b" : "w", reason: "resign" };
  return { plies: plies.slice(0, moves.length), states, sans, moves, st, status, end, myColor, drawOffer: extra.drawOffer };
}

/* ---------------- Board DOM ---------------- */
const img = p => `vendor/pieces/${p}.svg`;
function ensureBoard(){
  if(B) return B;
  const el = document.createElement("div"); el.className = "cboard"; el.setAttribute("dir", "ltr");
  const squares = [];
  for(let i = 0; i < 64; i++){ const d = document.createElement("div"); d.className = "csq"; el.appendChild(d); squares.push(d); }
  const layer = document.createElement("div"); layer.className = "clayer"; el.appendChild(layer);
  const arrows = document.createElementNS("http://www.w3.org/2000/svg", "svg"); arrows.setAttribute("viewBox", "0 0 8 8"); arrows.classList.add("carrows"); el.appendChild(arrows);
  el.addEventListener("pointerdown", onDown);
  B = { el, squares, layer, arrows, pieces: [], shown: null, flip: null };
  return B;
}
// screen position of a square (0 = a1) for the current orientation
const posOf = sq => { const f = sq % 8, r = Math.floor(sq / 8), fl = flipped(); return { x: fl ? 7 - f : f, y: fl ? r : 7 - r }; };
const flipped = () => !!G && ((G.myColor || "w") === "b") !== !!G.flip;
function place(el, sq){ const p = posOf(sq); el.style.transform = `translate(${p.x * 100}%,${p.y * 100}%)`; }
function paintSquares(rec){
  const fl = flipped(), view = viewIndex(rec), st = rec.states[view], last = rec.moves[view - 1];
  const legalTo = G.sel !== null && G.sel !== undefined && view === rec.states.length - 1 ? ZChess.legal(st).filter(m => m.from === G.sel) : [];
  const kingSq = st.b.findIndex(p => p === st.turn + "K"), check = ZChess.inCheck(st);
  B.squares.forEach((d, idx) => {
    // idx is the screen cell; find the square shown there
    const x = idx % 8, y = Math.floor(idx / 8), sq = fl ? (y * 8 + (7 - x)) : ((7 - y) * 8 + x);
    d.dataset.sq = sq;
    const dark = (Math.floor(sq / 8) + (sq % 8)) % 2 === 0;
    let cls = "csq " + (dark ? "d" : "l");
    if(last && (last.from === sq || last.to === sq)) cls += " last";
    if(G.sel === sq) cls += " sel";
    if(check && sq === kingSq) cls += " chk";
    const tm = legalTo.find(m => m.to === sq);
    if(tm) cls += st.b[sq] || tm.ep ? " cap" : " dot";
    d.className = cls;
    d.innerHTML = (x === 0 ? `<span class="rk">${Math.floor(sq / 8) + 1}</span>` : "") + (y === 7 ? `<span class="fl">${"abcdefgh"[sq % 8]}</span>` : "");
  });
}
// pieces: animate one move when possible, otherwise match pieces to squares
function syncPieces(rec, animate){
  const view = viewIndex(rec), st = rec.states[view];
  const prevView = B.shownView, sameLine = B.shown && B.shown.join() === rec.plies.slice(0, prevView).join();
  const oneStep = animate && sameLine && view === prevView + 1 && B.flip === flipped();
  if(oneStep){
    const m = rec.moves[view - 1], before = rec.states[view - 1], me = before.turn;
    const capSq = m.ep ? m.to + (me === "w" ? -8 : 8) : m.to;
    const victim = B.pieces.find(x => x.sq === capSq && (m.capture));
    if(victim){ victim.el.classList.add("gone"); setTimeout(() => victim.el.remove(), 260); B.pieces = B.pieces.filter(x => x !== victim); }
    const mover = B.pieces.find(x => x.sq === m.from);
    if(mover){ mover.sq = m.to; mover.el.style.zIndex = 5; place(mover.el, m.to); setTimeout(() => { mover.el.style.zIndex = ""; }, 260);
      if(m.promo){ setTimeout(() => { mover.p = me + m.promo; mover.el.src = img(mover.p); }, 200); } }
    if(m.castle){ const r = me === "w" ? 0 : 7, from = m.castle === "K" ? r * 8 + 7 : r * 8, to = m.castle === "K" ? r * 8 + 5 : r * 8 + 3; const rook = B.pieces.find(x => x.sq === from); if(rook){ rook.sq = to; place(rook.el, to); } }
  } else {
    const pool = B.pieces.slice(), next = [];
    st.b.forEach((p, sq) => { if(!p) return;
      let i = pool.findIndex(x => x.sq === sq && x.p === p); if(i < 0) i = pool.findIndex(x => x.p === p);
      let item;
      if(i >= 0){ item = pool.splice(i, 1)[0]; }
      else { const el = document.createElement("img"); el.className = "cpiece"; el.alt = ""; el.draggable = false; el.src = img(p); B.layer.appendChild(el); item = { el, p }; if(!animate || reduced()) el.style.transition = "none"; }
      item.sq = sq; place(item.el, sq); next.push(item);
      if(item.el.style.transition === "none") requestAnimationFrame(() => requestAnimationFrame(() => { item.el.style.transition = ""; }));
    });
    pool.forEach(x => x.el.remove());
    B.pieces = next;
  }
  B.pieces.forEach(x => { x.el.dataset.sq = x.sq; x.el.classList.toggle("fallen", false); x.el.classList.toggle("champ", false); });
  if(rec.end && view === rec.states.length - 1 && rec.end.reason !== "agreed"){
    const loser = rec.end.winner ? (rec.end.winner === "w" ? "b" : "w") : null;
    if(loser){ const k = B.pieces.find(x => x.p === loser + "K"); if(k) k.el.classList.add("fallen"); const w = B.pieces.find(x => x.p === rec.end.winner + "K"); if(w) w.el.classList.add("champ"); }
  }
  B.shown = rec.plies.slice(0, view); B.shownView = view; B.flip = flipped();
}
function drawArrow(m){
  B.arrows.innerHTML = "";
  if(!m) return;
  const a = posOf(m.from), b = posOf(m.to);
  B.arrows.innerHTML = `<defs><marker id="ah" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto"><path d="M0,0 L3,1.5 L0,3 z" fill="#E0A526"/></marker></defs>
    <line x1="${a.x + .5}" y1="${a.y + .5}" x2="${b.x + .5}" y2="${b.y + .5}" stroke="#E0A526" stroke-width=".18" stroke-linecap="round" marker-end="url(#ah)" opacity=".9"/>`;
}

/* ---------------- Updating the whole view ---------------- */
const viewIndex = rec => G.view === null || G.view === undefined || G.view >= rec.states.length - 1 ? rec.states.length - 1 : Math.max(0, G.view);
function update(animate){
  const rec = record(); if(!rec || !B) return rec;
  paintSquares(rec); syncPieces(rec, animate !== false);
  drawArrow(G.hint && viewIndex(rec) === rec.states.length - 1 ? G.hint : null);
  // move list
  const ml = document.getElementById("cmoves");
  if(ml){
    const view = viewIndex(rec);
    ml.innerHTML = rec.sans.map((s, i) => (i % 2 === 0 ? `<span class="mn">${i / 2 + 1}.</span>` : "") + `<button class="mv${i + 1 === view ? " cur" : ""}" data-act="chView" data-arg="${i + 1}">${esc(s)}</button>`).join("") || `<span class="small">${t("chNoMoves")}</span>`;
    const cur = ml.querySelector(".cur"); if(cur) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  // players + captured pieces
  const capBar = color => { // pieces this colour has taken
    const start = { P: 8, N: 2, B: 2, R: 2, Q: 1 }, st = rec.states[viewIndex(rec)], opp = color === "w" ? "b" : "w", have = {};
    st.b.forEach(p => { if(p && p[0] === opp) have[p[1]] = (have[p[1]] || 0) + 1; });
    const taken = ["Q", "R", "B", "N", "P"].flatMap(k => Array(Math.max(0, start[k] - (have[k] || 0))).fill(opp + k));
    const mat = c => st.b.reduce((n, p) => n + (p && p[0] === c ? VAL[p[1]] : 0), 0), diff = mat(color) - mat(opp);
    return taken.map(p => `<img src="${img(p)}" alt="" class="capt">`).join("") + (diff > 0 ? `<span class="small"> +${diff}</span>` : "");
  };
  const me = rec.myColor, them = me === "w" ? "b" : "w", name = G.mode === "cpu" ? t("chLevel_" + G.level) : esc((peerOf(G.peerId) || { first_name: G.peerName || "" }).first_name);
  const top = document.getElementById("ctop"), bot = document.getElementById("cbot");
  if(top) top.innerHTML = `<span class="who">${G.mode === "cpu" ? "🤖︎ " : ""}${name}${G.thinking ? ` <span class="small">${t("thinking")}</span>` : ""}</span><span class="caps">${capBar(them)}</span>`;
  if(bot) bot.innerHTML = `<span class="who">${t("you")}</span><span class="caps">${capBar(me)}</span>`;
  // status line
  const sl = document.getElementById("cstatus");
  if(sl){
    let s;
    if(viewIndex(rec) < rec.states.length - 1) s = `${t("chReviewing")} <button class="link" data-act="chView" data-arg="live">${t("chBackLive")}</button>`;
    else if(rec.end) s = endText(rec);
    else if(rec.drawOffer && rec.drawOffer.by !== me) s = `${t("chDrawOffered", { name })} <button class="btn small" data-act="chDrawAnswer" data-arg="accept">${t("chAccept")}</button> <button class="btn ghost small" data-act="chDrawAnswer" data-arg="decline">${t("chDecline")}</button>`;
    else if(rec.st.turn === me) s = t("yourMove") + (rec.status.check ? " · " + t("inCheck") : "");
    else s = G.mode === "cpu" ? t("thinking") : t("peerMove", { name });
    sl.innerHTML = s;
  }
  const tb = document.getElementById("ctake"); if(tb) tb.disabled = G.mode !== "cpu" || !rec.plies.length || G.thinking;
  return rec;
}
function endText(rec){
  const me = rec.myColor, e = rec.end;
  const head = !e.winner ? t("chDraw") : e.winner === me ? t("chYouWin") : t("chYouLose");
  return `${head} · ${t("chReason_" + e.reason)}`;
}

/* ---------------- Moving ---------------- */
let drag = null;
function squareAt(x, y){
  const r = B.el.getBoundingClientRect(); if(x < r.left || y < r.top || x > r.right || y > r.bottom) return null;
  const cx = Math.floor((x - r.left) / (r.width / 8)), cy = Math.floor((y - r.top) / (r.height / 8));
  return flipped() ? cy * 8 + (7 - cx) : (7 - cy) * 8 + cx;
}
function canAct(rec){ return rec && !rec.end && viewIndex(rec) === rec.states.length - 1 && rec.st.turn === rec.myColor && !G.thinking; }
function onDown(e){
  const rec = record(); if(!canAct(rec)) return;
  const sq = squareAt(e.clientX, e.clientY); if(sq === null) return;
  e.preventDefault();
  const st = rec.st, piece = st.b[sq];
  if(G.sel !== null && G.sel !== undefined && ZChess.legal(st).some(m => m.from === G.sel && m.to === sq)){ tryMove(G.sel, sq); return; }
  if(piece && piece[0] === st.turn){
    const same = G.sel === sq; G.sel = sq; G.hint = null; update(false);
    const pc = B.pieces.find(x => x.sq === sq);
    drag = { from: sq, el: pc && pc.el, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId, deselect: same };
    B.el.setPointerCapture(e.pointerId);
    B.el.addEventListener("pointermove", onMove); B.el.addEventListener("pointerup", onUp); B.el.addEventListener("pointercancel", onUp);
  } else { G.sel = null; update(false); }
}
function onMove(e){
  if(!drag || e.pointerId !== drag.pid || !drag.el) return;
  if(!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
  drag.moved = true;
  const r = B.el.getBoundingClientRect(), s = r.width / 8;
  drag.el.classList.add("dragging");
  drag.el.style.transform = `translate(${e.clientX - r.left - s / 2}px,${e.clientY - r.top - s * 0.75}px) scale(1.15)`;
  const over = squareAt(e.clientX, e.clientY);
  B.squares.forEach(d => d.classList.toggle("over", Number(d.dataset.sq) === over));
}
function onUp(e){
  if(!drag || e.pointerId !== drag.pid) return;
  B.el.removeEventListener("pointermove", onMove); B.el.removeEventListener("pointerup", onUp); B.el.removeEventListener("pointercancel", onUp);
  const d = drag; drag = null;
  B.squares.forEach(x => x.classList.remove("over"));
  if(d.el) d.el.classList.remove("dragging");
  if(!d.moved){ if(d.deselect){ G.sel = null; update(false); } return; }
  const to = squareAt(e.clientX, e.clientY);
  if(to !== null && to !== d.from && tryMove(d.from, to, true)) return;
  if(d.el){ place(d.el, d.from); }    // snaps back
  if(to !== null && to !== d.from){ const rec = record(); if(rec.status.check) toast(t("chInCheckHint")); sound("bad"); }
}
function tryMove(from, to, dragged){
  const rec = record(), cands = ZChess.legal(rec.st).filter(m => m.from === from && m.to === to);
  if(!cands.length) return false;
  if(cands.some(m => m.promo)){ G.promo = { from, to }; G.sel = null; if(dragged){ const pc = B.pieces.find(x => x.sq === from); if(pc) place(pc.el, from); } render(); return true; }
  play(cands[0]); return true;
}
function play(m){
  const rec = record(); G.sel = null; G.hint = null; G.promo = null;
  const u = ZChess.uci(m), st2 = ZChess.apply(rec.st, m);
  if(G.mode === "cpu"){ G.plies.push(u); saveCpu(); }
  else sendBody(CARD + "cm:" + G.gid + ":" + u);
  const after = update(true);
  sound(ZChess.status(st2).check ? "check" : m.capture ? "capture" : "move");
  if(after && after.end) return finish(after);
  if(G.mode === "cpu") cpuMove();
}
// the computer thinks in a Web Worker so the board stays smooth
let worker = null, jobId = 0;
function think(st, level){
  return new Promise(res => {
    try{
      if(!worker){ worker = new Worker("engines/chess-worker.js"); }
      const id = ++jobId; const onMsg = e => { if(e.data.id === id){ worker.removeEventListener("message", onMsg); res(e.data.uci); } };
      worker.addEventListener("message", onMsg); worker.postMessage({ id, st, level });
    }catch(e){ const m = ZChess.think(st, level); res(m ? ZChess.uci(m) : null); }
  });
}
async function cpuMove(){
  const rec = record(); if(!rec || rec.end || rec.st.turn === rec.myColor) return;
  G.thinking = true; update(false);
  const t0 = Date.now(), plyNow = G.plies.length, game = G;
  const u = await think(rec.st, G.level);
  await new Promise(r => setTimeout(r, Math.max(0, 450 - (Date.now() - t0))));
  if(G !== game || G.plies.length !== plyNow){ return; }
  G.thinking = false;
  if(!u){ update(false); return; }
  const m = ZChess.fromUci(rec.st, u); G.plies.push(u); saveCpu();
  const after = update(true);
  sound(ZChess.status(after.st).check ? "check" : m && m.capture ? "capture" : "move");
  if(after.end) finish(after);
}
function finish(rec){
  const k = (G.gid || "cpu") + ":" + rec.plies.length + ":" + rec.end.reason; if(G.endShown === k) return; G.endShown = k;
  sound("end");
  const win = rec.end.winner && rec.end.winner === rec.myColor;
  if(win && !reduced()) confetti();
  if(G.mode === "cpu"){
    const stats = store.get("stats", {}), s = stats[G.level] || { played: 0, won: 0, drawn: 0 };
    s.played++; if(win) s.won++; else if(!rec.end.winner) s.drawn++; stats[G.level] = s; store.set("stats", stats);
  }
  setTimeout(() => { S.chessEnd = true; render(); }, win ? 900 : 500);
}

/* ---------------- Sounds (WebAudio, no files) ---------------- */
let actx = null;
function sound(kind){
  if(!store.get("sound", true)) return;
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime, tone = (f, d, at, type, vol) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type || "triangle"; o.frequency.value = f; g.gain.setValueAtTime(vol || .12, now + at); g.gain.exponentialRampToValueAtTime(.001, now + at + d); o.connect(g).connect(actx.destination); o.start(now + at); o.stop(now + at + d); };
    if(kind === "move") tone(420, .07, 0, "square", .05);
    else if(kind === "capture"){ tone(260, .08, 0, "square", .07); tone(180, .1, .03, "triangle", .08); }
    else if(kind === "check"){ tone(660, .09, 0); tone(880, .12, .09); }
    else if(kind === "end"){ tone(523, .2, 0); tone(659, .2, .12); tone(784, .3, .24); }
    else if(kind === "bad") tone(140, .12, 0, "sawtooth", .04);
  }catch(e){}
}
function confetti(){
  const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
  const W = cv.width = innerWidth, H = cv.height = innerHeight, g = cv.getContext("2d");
  const cols = ["#0E7A68", "#FFD166", "#F2C46B", "#E0A526", "#2D5B8A", "#F3F5F4"];
  const parts = Array.from({ length: 140 }, () => ({ x: W / 2, y: H * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6.28, s: 5 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  let f = 0; const tick = () => { g.clearRect(0, 0, W, H);
    parts.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += .2; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
    if(++f < 140) requestAnimationFrame(tick); else cv.remove(); };
  requestAnimationFrame(tick);
}

/* ---------------- Screens ---------------- */
function setG(g){ G = g; S.chess = g; return g; }
function saveCpu(){ if(G && G.mode === "cpu") store.set("cpu", { plies: G.plies, myColor: G.myColor, level: G.level }); }
function chessScreen(){
  if(!G){ const c = store.get("cpu", null); setG(c ? { mode: "cpu", plies: c.plies || [], myColor: c.myColor || "w", level: LEVELS.includes(c.level) ? c.level : "medium", sel: null, view: null } : { mode: "cpu", plies: [], myColor: "w", level: "medium", sel: null, view: null }); }
  const cpu = G.mode === "cpu", back = cpu ? "games" : "chat";
  return `<div class="screen chscreen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${back}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("chess")}</div><div class="small">${cpu ? t("chLevel_" + G.level) : t("chOnline")}</div></div>
      ${cpu ? `<button class="btn ghost small" data-act="chNewSheet">${t("solNewShort")}</button>` : ""}</div>
    ${cpu ? "" : onlineInfo("chess", G)}
    <div class="cplayer" id="ctop"></div>
    <div class="cmount" id="cmount"></div>
    <div class="cplayer" id="cbot"></div>
    <div class="cstatus" id="cstatus" role="status" aria-live="polite"></div>
    <div class="cmoves" id="cmoves" dir="ltr"></div>
    <div class="ctools">
      <button class="iconbtn" data-act="chStep" data-arg="-1" aria-label="${t("chPrev")}">‹</button>
      <button class="iconbtn" data-act="chStep" data-arg="1" aria-label="${t("chNext")}">›</button>
      ${cpu ? `<button class="btn ghost small" id="ctake" data-act="chTakeback">${t("chTakeback")}</button><button class="btn ghost small" data-act="chHint">${t("solHint")}</button>` : `<button class="btn ghost small" data-act="chOfferDraw">${t("chOfferDraw")}</button>`}
      <button class="btn ghost small" data-act="chFlip">${t("chFlip")}</button>
      <button class="btn ghost small" data-act="chResign">${t("chResign")}</button>
      <button class="iconbtn" data-act="chSound" aria-label="${t("chSound")}">${store.get("sound", true) ? "🔊︎" : "🔇︎"}</button>
    </div>
    ${cpu ? "" : `<button class="btn ghost small" data-act="chessBack" data-arg="chat" style="align-self:flex-start">${t("backChat")}</button>`}
  </div>`;
}
function mountChess(){
  const m = document.getElementById("cmount"); if(!m || !G) return;
  ensureBoard(); m.appendChild(B.el);
  const rec = update(B.shown !== null);
  if(rec && !G.mounted){ G.mounted = true; if(rec.end) G.endShown = (G.gid || "cpu") + ":" + rec.plies.length + ":" + rec.end.reason; }   // already over when opened: no fanfare
  if(rec && rec.end && G.mode === "online") finish(rec);
  if(rec && G.mode === "cpu" && !rec.end && rec.st.turn !== rec.myColor && !G.thinking) cpuMove();
}
function chessOverlay(){
  if(S.chessPromo || (G && G.promo)){
    const color = record().st.turn;
    return `<div class="sheet center" role="dialog" aria-modal="true"><div class="panel"><h2>${t("chPromote")}</h2><div class="promo">${["Q", "R", "B", "N"].map(p => `<button class="pbtn" data-act="chPromote" data-arg="${p}"><img src="${img(color + p)}" alt="${p}"></button>`).join("")}</div>
      <button class="link" data-act="chPromoCancel">${t("cancel")}</button></div></div>`;
  }
  if(S.chessNew) return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel"><h2>${t("chNewGame")}</h2>
    <div class="flabel">${t("chColor")}</div><div class="seg">${["w", "b", "r"].map(c => `<button class="chip" data-act="chPickColor" data-arg="${c}" aria-pressed="${(S.chessPick || "w") === c}">${t("chColor_" + c)}</button>`).join("")}</div>
    <div class="flabel">${t("chLevel")}</div><div class="opts">${LEVELS.map(l => { const s = store.get("stats", {})[l]; return `<button class="chip opt" data-act="chPickLevel" data-arg="${l}" aria-pressed="${(S.chessLevel || G.level) === l}"><span class="grow"><b>${t("chLevel_" + l)}</b><br><span class="small">${t("chLevelD_" + l)}</span></span>${s && s.played ? `<span class="small">${t("solStats", { w: s.won, p: s.played })}</span>` : ""}</button>`; }).join("")}</div>
    <button class="btn" data-act="chStart">${t("play")}</button><div class="row" style="justify-content:flex-end"><button class="link" data-act="chNewClose">${t("cancel")}</button></div></div></div>`;
  if(S.chessEnd && G){
    const rec = record(); if(!rec.end) return "";
    const win = rec.end.winner === rec.myColor;
    return `<div class="sheet center" role="dialog" aria-modal="true"><div class="panel"><h2>${!rec.end.winner ? t("chDraw") : win ? t("chYouWin") : t("chYouLose")}</h2>
      <p>${t("chReason_" + rec.end.reason)} · ${t("solMovesN", { n: Math.ceil(rec.plies.length / 2) })}</p>
      ${G.mode === "cpu" ? `<button class="btn" data-act="chRematch">${t("chRematch")}</button><button class="btn ghost" data-act="chNewSheet">${t("chNewGame")}</button>` : `<button class="btn" data-act="chessInvite">${t("chRematch")}</button>`}
      <button class="link" data-act="chEndClose">${t("chSeeBoard")}</button></div></div>`;
  }
  return "";
}

/* ---------------- Actions ---------------- */
function startCpu(color, level){
  const myColor = color === "r" ? (Math.random() < .5 ? "w" : "b") : color;
  setG({ mode: "cpu", plies: [], myColor, level, sel: null, view: null }); S.chessEnd = false; saveCpu();
  if(B){ B.shown = null; B.pieces.forEach(x => x.el.remove()); B.pieces = []; }
}
const chessActions = {
  chessCpu(){ if(!G || G.mode !== "cpu"){ setG(null); } S.chessEnd = false; S.screen = "chess"; render(); },
  chessInvite(){
    const gid = Math.random().toString(36).slice(2, 10), m = peerOf(S.chatWith);
    S.chessEnd = false; sendBody(CARD + "chess:" + gid);
    setG({ mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name, sel: null, view: null });
    if(B){ B.shown = null; } S.screen = "chess"; render();
  },
  chessOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); setG({ mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name, sel: null, view: null }); S.chessEnd = false; if(B) B.shown = null; S.screen = "chess"; render(); },
  chNewSheet(){ S.chessEnd = false; S.chessNew = true; S.chessPick = G && G.myColor || "w"; S.chessLevel = G && G.level || "medium"; render(); },
  chNewClose(){ S.chessNew = false; render(); },
  chPickColor(c){ S.chessPick = c; render(); },
  chPickLevel(l){ if(LEVELS.includes(l)) S.chessLevel = l; render(); },
  chStart(){ S.chessNew = false; startCpu(S.chessPick || "w", S.chessLevel || "medium"); render(); },
  chRematch(){ S.chessEnd = false; startCpu(G.myColor === "w" ? "b" : "w", G.level); render(); },
  chEndClose(){ S.chessEnd = false; render(); },
  chPromote(p){ const pr = G.promo; if(!pr) return; G.promo = null; const m = ZChess.legal(record().st).find(x => x.from === pr.from && x.to === pr.to && x.promo === p); render(); if(m) play(m); },
  chPromoCancel(){ G.promo = null; render(); },
  chTakeback(){
    if(!G || G.mode !== "cpu" || G.thinking) return;
    const rec = record(); let n = rec.st.turn === rec.myColor ? 2 : 1; if(rec.plies.length < n) n = rec.plies.length;
    G.plies = G.plies.slice(0, G.plies.length - n); G.sel = null; G.hint = null; G.view = null; S.chessEnd = false; G.resigned = false; saveCpu(); update(false);
  },
  async chHint(){
    const rec = record(); if(!canAct(rec)) return;
    const u = await think(rec.st, "hard"); const m = u && ZChess.fromUci(rec.st, u);
    if(m){ G.hint = m; update(false); setTimeout(() => { if(G.hint === m){ G.hint = null; update(false); } }, 3000); }
  },
  chFlip(){ G.flip = !G.flip; if(B) B.shown = null; update(false); },
  chSound(){ store.set("sound", !store.get("sound", true)); render(); },
  chStep(d){ const rec = record(); const cur = viewIndex(rec); G.view = Math.max(0, Math.min(rec.states.length - 1, cur + Number(d))); G.sel = null; if(B) B.shown = null; update(false); },
  chView(arg){ const rec = record(); G.view = arg === "live" ? null : Number(arg); G.sel = null; if(B) B.shown = null; update(false); },
  chResign(){
    const rec = record(); if(!rec || rec.end) return;
    if(!confirm(t("chResignAsk"))) return;
    if(G.mode === "cpu"){ G.resigned = true; const r = record(); update(false); finish(r); }
    else { sendBody(CARD + "cx:" + G.gid + ":resign"); setTimeout(() => { const r = record(); if(r.end) finish(r); }, 50); }
  },
  chOfferDraw(){ const rec = record(); if(!rec || rec.end || G.mode !== "online") return; sendBody(CARD + "cx:" + G.gid + ":draw"); toast(t("chDrawSent")); },
  chDrawAnswer(a){ if(G && G.mode === "online"){ sendBody(CARD + "cx:" + G.gid + ":" + (a === "accept" ? "accept" : "decline")); setTimeout(() => { const r = record(); if(r.end) finish(r); }, 50); } }
};
// when a new online move arrives by polling/Realtime, render() calls mountChess -> update animates it
export { chessActions, chessOverlay, chessScreen, mountChess };
