// Mühle, modelled on the popular Mühle / nine men's morris apps: wooden board, the pieces you still have to place
// lie beside the board (drag one onto a point or just tap the point), pieces slide along the lines (drag or tap-tap,
// dots show where they can go; with three pieces left they can jump anywhere), a closed mill lights up and the
// pieces you may take wobble until you tap one, which then disappears. Last move marked, hint arrow.
// Frame and shell: tablekit.js; rules: engines/muehle-engine.js (moves "p5", "m3-4", with "x12" when a mill captures).
import { register } from "./tablekit.js";
import { t } from "./util.js";

const OFF = [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
const P = Array.from({ length: 24 }, (_, i) => { const s = 3 - Math.floor(i / 8), o = OFF[i % 8]; return [50 + o[0] * s * 15, 50 + o[1] * s * 15]; });
const other = c => c === "w" ? "b" : "w";
const bases = st => [...new Set(ZMuehle.moves(st).map(m => m.split("x")[0]))];
const toOf = base => Number(base[0] === "p" ? base.slice(1) : base.split("-")[1]);
const fromOf = base => base[0] === "m" ? Number(base.slice(1).split("-")[0]) : null;

function create(api){
  const el = document.createElement("div"); el.className = "mlwrap"; el.setAttribute("dir", "ltr");
  const lines = [0, 1, 2].map(r => { const a = 5 + r * 15, w = 90 - r * 30; return `<rect x="${a}" y="${a}" width="${w}" height="${w}"/>`; }).join("") + `<path d="M50 5V35M50 65V95M5 50H35M65 50H95"/>`;
  el.innerHTML = `<div class="mlhand mlh-top"></div>
    <div class="mlboard"><svg viewBox="0 0 100 100" class="mllines" aria-hidden="true"><g class="ln">${lines}</g><g class="mills"></g><g class="hint"></g></svg>
      ${P.map(([x, y], i) => `<div class="mlpt" data-i="${i}" style="left:${x}%;top:${y}%"></div>`).join("")}<div class="mllayer"></div></div>
    <div class="mlhand mlh-bot"></div>`;
  const bd = { el, api, board: el.querySelector(".mlboard"), layer: el.querySelector(".mllayer"), pts: [...el.querySelectorAll(".mlpt")],
    hands: { top: el.querySelector(".mlh-top"), bot: el.querySelector(".mlh-bot") }, mills: el.querySelector(".mills"), hintG: el.querySelector(".hint"),
    pieces: {}, sel: null, pending: null, pendKey: null, drag: null, shownKeys: null, millShown: null };
  el.addEventListener("pointerdown", e => onDown(bd, e));
  el.addEventListener("pointermove", e => onMove(bd, e));
  el.addEventListener("pointerup", e => onUp(bd, e)); el.addEventListener("pointercancel", e => onUp(bd, e));
  return bd;
}
const place = (el, i) => { el.style.left = P[i][0] + "%"; el.style.top = P[i][1] + "%"; };
function piece(p){ const d = document.createElement("div"); d.className = "mlp " + p; d.innerHTML = "<i></i>"; return d; }
function pointAt(bd, x, y, radius){
  const r = bd.board.getBoundingClientRect(), px = (x - r.left) / r.width * 100, py = (y - r.top) / r.height * 100;
  let best = null, bdist = radius || 9;
  P.forEach(([a, b], i) => { const d = Math.hypot(a - px, b - py); if(d < bdist){ bdist = d; best = i; } });
  return best;
}
// the position shown: the real one, plus your half-made move while you choose which piece to take
function shownBoard(rec, bd){
  const b = rec.st.b.slice();
  if(bd.pending){ const f = fromOf(bd.pending), to = toOf(bd.pending); if(f !== null) b[f] = null; b[to] = rec.st.turn; }
  return b;
}
function bottomColor(rec, api){ return api.G.mode === "local" ? "w" : rec.myColor; }

/* ---------------- Input ---------------- */
function onDown(bd, e){
  const rec = bd.api.rec(); if(!bd.api.canAct(rec)) return;
  const st = rec.st, me = st.turn, bs = bases(st);
  const handEl = bottomColor(rec, bd.api) === me ? bd.hands.bot : bd.hands.top;
  if(st.hand[me] > 0 && !bd.pending && handEl.contains(e.target)){   // pick a piece from your hand
    e.preventDefault();
    const d = piece(me); d.classList.add("dragging"); bd.layer.appendChild(d);
    bd.drag = { pid: e.pointerId, el: d, hand: true, x0: e.clientX, y0: e.clientY, moved: true };
    follow(bd, e); try{ bd.el.setPointerCapture(e.pointerId); }catch(err){}
    return;
  }
  const i = pointAt(bd, e.clientX, e.clientY); if(i === null) return;
  e.preventDefault();
  if(bd.pending){
    const m = bd.pending + "x" + i;
    if(ZMuehle.moves(st).includes(m)) return bd.api.play(m);
    return bd.api.refuse(st.b[i] === other(me) ? t("mlProtected") : t("mlTake"));
  }
  if(st.hand[me] > 0){ return tryBase(bd, rec, "p" + i); }
  if(bd.sel !== null && bs.includes("m" + bd.sel + "-" + i)) return tryBase(bd, rec, "m" + bd.sel + "-" + i);
  if(st.b[i] === me){
    if(!bs.some(b => b.startsWith("m" + i + "-"))){ bd.sel = null; bd.api.update(); return bd.api.refuse(t("mlStuck")); }
    bd.sel = i; bd.api.update(); bd.api.sound("move");
    const pc = bd.pieces[i];
    bd.drag = { pid: e.pointerId, el: pc && pc.el, from: i, x0: e.clientX, y0: e.clientY, moved: false };
    try{ bd.el.setPointerCapture(e.pointerId); }catch(err){}
    return;
  }
  if(bd.sel !== null){ bd.sel = null; bd.api.update(); return bd.api.refuse(t("mlNoLine")); }
}
function follow(bd, e){
  const r = bd.board.getBoundingClientRect();
  bd.drag.el.style.left = ((e.clientX - r.left) / r.width * 100) + "%"; bd.drag.el.style.top = ((e.clientY - r.top - 18) / r.height * 100) + "%";
}
function onMove(bd, e){
  const d = bd.drag; if(!d || e.pointerId !== d.pid || !d.el) return;
  if(!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
  d.moved = true; d.el.classList.add("dragging"); follow(bd, e);
}
function onUp(bd, e){
  const d = bd.drag; if(!d || e.pointerId !== d.pid) return;
  bd.drag = null;
  if(d.el) d.el.classList.remove("dragging");
  const rec = bd.api.rec(), i = e.type === "pointercancel" ? null : pointAt(bd, e.clientX, e.clientY, 11);
  if(d.hand){
    d.el.remove();
    if(i !== null && bd.api.canAct(rec)) tryBase(bd, rec, "p" + i, true);
    return;
  }
  if(!d.moved) return;
  if(i !== null && i !== d.from && bd.api.canAct(rec)){
    const base = "m" + d.from + "-" + i;
    if(bases(rec.st).includes(base)) return tryBase(bd, rec, base, true);
    bd.api.refuse(rec.st.b[i] ? t("mlTaken") : t("mlNoLine"));
  }
  if(d.el) place(d.el, d.from);
}
function tryBase(bd, rec, base, dropped){
  const ms = ZMuehle.moves(rec.st);
  if(ms.includes(base)){ bd.sel = null; bd.instantNext = !!dropped; return bd.api.play(base); }
  if(ms.some(m => m.startsWith(base + "x"))){   // a mill: keep the piece there and choose what to take
    bd.sel = null; bd.pending = base; bd.pendKey = rec.keys.length; bd.instantNext = !!dropped;
    bd.api.sound("mill"); bd.api.update(); return true;
  }
  const to = toOf(base);
  bd.api.refuse(rec.st.b[to] ? t("mlTaken") : t("mlNoLine"));
  return false;
}

/* ---------------- Drawing ---------------- */
function handRow(el, n, p, active){
  if(el.childElementCount !== n || el.dataset.p !== p){ el.dataset.p = p; el.innerHTML = Array.from({ length: n }, () => `<span class="mlp ${p} mini"><i></i></span>`).join(""); }
  el.classList.toggle("active", !!active && n > 0);
}
function paint(bd, rec, ctx){
  const st = rec.st, api = bd.api;
  if(bd.pending && (bd.pendKey !== rec.keys.length || !ctx.canAct)) bd.pending = null;
  if(!ctx.canAct) bd.sel = null;
  const target = shownBoard(rec, bd), bottom = bottomColor(rec, api), top = other(bottom);
  // the difference between what is on screen and the position: slides, placements from the hand, captures
  const have = {}; Object.entries(bd.pieces).forEach(([i, x]) => { have[i] = x.p; });
  const gone = [], added = [];
  for(let i = 0; i < 24; i++){ if(have[i] && have[i] !== target[i]) gone.push(i); if(target[i] && have[i] !== target[i]) added.push(i); }
  const fresh = ctx.instant || gone.length + added.length > 6, quick = bd.instantNext; bd.instantNext = false;
  const next = {}; Object.entries(bd.pieces).forEach(([i, x]) => { if(!gone.includes(Number(i))) next[i] = x; });
  const used = new Set();
  added.forEach(j => {
    const p = target[j];
    const from = fresh ? -1 : gone.find(i => have[i] === p && !used.has(i) && target[i] !== p);
    let item;
    if(from !== undefined && from >= 0){ used.add(from); item = bd.pieces[from]; if(!quick && !api.reduced()) item.el.classList.add("slide"); place(item.el, j); setTimeout(() => item.el.classList.remove("slide"), 400); api.sound("move"); }
    else {
      item = { el: piece(p), p }; bd.layer.appendChild(item.el);
      if(fresh || quick || api.reduced()) place(item.el, j);
      else { item.el.style.left = "50%"; item.el.style.top = (p === bottom ? 112 : -12) + "%"; item.el.getBoundingClientRect(); item.el.classList.add("slide"); place(item.el, j); setTimeout(() => item.el.classList.remove("slide"), 450); api.sound("move"); }
    }
    next[j] = item;
  });
  gone.filter(i => !used.has(i)).forEach(i => {
    const x = bd.pieces[i]; if(!x) return;
    if(fresh && !ctx.instant && !api.reduced()){ x.el.classList.add("slide"); x.el.style.left = "50%"; x.el.style.top = (x.p === bottom ? 112 : -12) + "%"; x.el.style.opacity = 0; }
    else if(!fresh){ x.el.classList.add("taken"); api.sound("capture"); }
    setTimeout(() => x.el.remove(), fresh && ctx.instant ? 0 : 450);
  });
  bd.pieces = next;
  // hands beside the board
  handRow(bd.hands.bot, st.hand[bottom], bottom, ctx.canAct && st.turn === bottom && !bd.pending);
  handRow(bd.hands.top, st.hand[top], top, ctx.canAct && st.turn === top && !bd.pending);
  // mills: a new mill lights up (and stays lit while you choose a piece to take)
  let mill = null;
  const lastTo = bd.pending ? toOf(bd.pending) : st.last && st.last.x !== null ? st.last.to : null;
  if(lastTo !== null && target[lastTo]) mill = ZMuehle.MILLS.filter(m => m.includes(lastTo) && m.every(j => target[j] === target[lastTo]));
  const mk = mill && mill.length ? mill.map(m => m.join()).join("|") + ":" + rec.keys.length + (bd.pending ? "p" : "") : null;
  if(mk !== bd.millShown){
    bd.millShown = mk;
    bd.mills.innerHTML = mk ? mill.map(m => `<polyline points="${m.map(j => P[j].join(",")).join(" ")}"/>`).join("") : "";
    if(mk && !bd.pending){ const k = mk; setTimeout(() => { if(bd.millShown === k) bd.mills.innerHTML = ""; }, 1600); }
  }
  // points: legal targets, selection, last move, pieces you may take
  const ms = ctx.canAct ? ZMuehle.moves(st) : [], bs = [...new Set(ms.map(m => m.split("x")[0]))];
  const takeable = new Set(bd.pending ? ms.filter(m => m.startsWith(bd.pending + "x")).map(m => Number(m.split("x")[1])) : []);
  const dots = new Set(bd.pending ? [] : st.hand[st.turn] > 0 ? bs.map(toOf) : bd.sel !== null ? bs.filter(b => fromOf(b) === bd.sel).map(toOf) : []);
  const last = st.last && !bd.pending ? [st.last.from, st.last.to].filter(x => x !== null && x !== undefined) : [];
  bd.pts.forEach((d, i) => { d.className = "mlpt" + (dots.has(i) ? " can" : "") + (bd.sel === i ? " sel" : "") + (last.includes(i) ? " last" : "") + (last[1] === i || (last.length === 1 && last[0] === i) ? " to" : ""); });
  Object.entries(bd.pieces).forEach(([i, x]) => { x.el.classList.toggle("takeable", takeable.has(Number(i))); x.el.classList.toggle("sel", bd.sel === Number(i)); });
  // hint: from -> to arrow, ring where to place, cross on the piece to take
  bd.hintG.innerHTML = "";
  if(ctx.hint){
    const m = /^(?:p(\d+)|m(\d+)-(\d+))(?:x(\d+))?$/.exec(ctx.hint);
    if(m){ const to = Number(m[1] ?? m[3]), f = m[2] !== undefined ? Number(m[2]) : null;
      bd.hintG.innerHTML = (f !== null ? `<line x1="${P[f][0]}" y1="${P[f][1]}" x2="${P[to][0]}" y2="${P[to][1]}" class="ar"/>` : "") + `<circle cx="${P[to][0]}" cy="${P[to][1]}" r="5.5" class="rg"/>` +
        (m[4] !== undefined ? `<path class="cx" d="M${P[m[4]][0] - 4} ${P[m[4]][1] - 4}l8 8m0 -8l-8 8"/>` : ""); }
  }
}

register({
  id: "muehle", E: () => ZMuehle, newGame: () => ZMuehle.newGame(), levels: ["easy", "medium", "hard", "expert"], local: true,
  end(st, s, states){
    if(s.over){
      if(!s.winner) return { winner: null, reason: "quiet" };
      const loser = other(s.winner);
      return { winner: s.winner, reason: ZMuehle.count(st.b, loser) + st.hand[loser] < 3 ? "fewer" : "blocked" };
    }
    if(st.hand.w === 0 && st.hand.b === 0){ const k = ZMuehle.posKey(st); if(states.filter(x => ZMuehle.posKey(x) === k).length >= 3) return { winner: null, reason: "repetition" }; }
    return null;
  },
  colorName: c => t("chColor_" + c), token: c => `<span class="mlp ${c} mini"><i></i></span>`,
  bar: (rec, c) => { const on = ZMuehle.count(rec.st.b, c), fly = rec.st.hand[c] === 0 && on === 3;
    return `<span class="small">${t("mlOnBoard", { n: on })}${fly ? " · " + t("mlFlyTag") : ""}</span>`; },
  prompt(rec){
    const bd = MB(), st = rec.st, who = rec.mode === "local" ? t("chColor_" + st.turn) + ": " : "";
    if(bd && bd.pending) return who + t("mlTake");
    if(st.hand[st.turn] > 0) return who + t("mlPlace", { n: st.hand[st.turn] });
    if(ZMuehle.count(st.b, st.turn) === 3) return who + t("mlFly");
    return who + t("mlMoveP");
  },
  rules: () => t("mlRules"), afterMove: 450, minThink: 500, endDelay: 600,
  board: { create: api => (mb = create(api)), paint }
});
let mb = null; const MB = () => mb;
