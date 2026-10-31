// Vier in einer Reihe, modelled on the popular four-in-a-row apps: blue frame with holes, a disc that hovers above
// the board and follows your finger, falls into the column with a bounce when you let go (or tap a column), the
// winning four pulse with a line through them, and a new game drops all discs out of the bottom of the frame.
// While the computer thinks its disc wanders above the columns. Frame and shell: tablekit.js; rules: engines/four-engine.js.
import { register } from "./tablekit.js";
import { t } from "./util.js";

const W = 7, H = 6;
const HOLES = (() => { let d = "M0 0H7V6H0Z"; for(let r = 0; r < H; r++) for(let c = 0; c < W; c++){ const x = c + .5, y = r + .5; d += `M${x - .4} ${y}a.4 .4 0 1 0 .8 0a.4 .4 0 1 0 -.8 0Z`; } return d; })();
const pos = (el, c, y) => { el.style.transform = `translate(${c * 100}%,${y * 100}%)`; };

function create(api){
  const el = document.createElement("div"); el.className = "f4board"; el.setAttribute("dir", "ltr");
  el.innerHTML = `<div class="f4back"></div><div class="f4layer"></div>
    <svg class="f4frame" viewBox="0 0 7 6" aria-hidden="true"><defs><linearGradient id="f4g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F72D6"/><stop offset="1" stop-color="#1B4FA3"/></linearGradient></defs><path fill="url(#f4g)" fill-rule="evenodd" d="${HOLES}"/></svg>
    <svg class="f4line" viewBox="0 0 7 6" aria-hidden="true"></svg>
    <div class="f4cols">${Array.from({ length: W }, (_, c) => `<button class="f4col" data-col="${c}" aria-label="${t("column")} ${c + 1}"></button>`).join("")}</div>`;
  const bd = { el, api, layer: el.querySelector(".f4layer"), line: el.querySelector(".f4line"), cols: [...el.querySelectorAll(".f4col")], discs: {}, ghost: null, arrow: null, drag: null, wander: null, lineKey: null };
  bd.ghost = disc("w"); bd.ghost.classList.add("ghost"); bd.layer.appendChild(bd.ghost); pos(bd.ghost, 3, 0);
  bd.arrow = document.createElement("div"); bd.arrow.className = "f4arrow"; bd.arrow.textContent = "▼︎"; bd.layer.appendChild(bd.arrow);
  const colAt = x => { const r = el.getBoundingClientRect(); return Math.max(0, Math.min(W - 1, Math.floor((x - r.left) / (r.width / W)))); };
  el.addEventListener("pointerdown", e => {
    const rec = api.rec(); if(!api.canAct(rec)) return;
    e.preventDefault();
    bd.drag = { pid: e.pointerId, col: colAt(e.clientX) };
    try{ el.setPointerCapture(e.pointerId); }catch(err){}
    showGhost(bd, bd.drag.col, rec.st.turn);
  });
  el.addEventListener("pointermove", e => {
    if(bd.drag && e.pointerId === bd.drag.pid){ bd.drag.col = colAt(e.clientX); showGhost(bd, bd.drag.col); return; }
    if(e.pointerType === "mouse" && !bd.drag){ const rec = api.rec(); if(api.canAct(rec)) showGhost(bd, colAt(e.clientX), rec.st.turn); }
  });
  const up = e => {
    if(!bd.drag || e.pointerId !== bd.drag.pid) return;
    const d = bd.drag; bd.drag = null;
    const r = el.getBoundingClientRect();
    if(e.type === "pointercancel" || e.clientX < r.left - 20 || e.clientX > r.right + 20 || e.clientY < r.top - 80 || e.clientY > r.bottom + 40) return;
    tryDrop(bd, colAt(e.clientX) ?? d.col);
  };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  el.addEventListener("click", e => { const b = e.target.closest(".f4col"); if(b && e.detail === 0) tryDrop(bd, Number(b.dataset.col)); });   // keyboard
  return bd;
}
function disc(p){ const d = document.createElement("div"); d.className = "f4d " + p; d.innerHTML = "<i></i>"; return d; }
function showGhost(bd, c, p){
  if(p) bd.ghost.className = "f4d ghost " + p;
  bd.ghost.classList.add("on"); pos(bd.ghost, c, 0); bd.ghostCol = c;
}
function tryDrop(bd, c){
  const rec = bd.api.rec(); if(!bd.api.canAct(rec)) return;
  if(!ZFour.moves(rec.st).includes(String(c))){
    const col = bd.cols[c]; col.classList.remove("shake"); void col.offsetWidth; col.classList.add("shake");
    return bd.api.refuse(t("f4Full"));
  }
  bd.ghost.classList.remove("on");
  bd.api.play(String(c));
}
// drop one disc from above the board into its hole
function drop(bd, i, p, delay){
  const c = i % W, y = H - Math.floor(i / W), el = disc(p), reduced = bd.api.reduced();
  el.style.transition = "none"; pos(el, c, 0); bd.layer.insertBefore(el, bd.ghost);
  const dur = reduced ? 0 : Math.round(150 + 300 * Math.sqrt(y / H));
  setTimeout(() => {
    el.getBoundingClientRect();
    el.style.transition = dur ? `transform ${dur}ms cubic-bezier(.55,0,1,.45)` : "none"; pos(el, c, y);
    setTimeout(() => { el.classList.add("land"); bd.api.sound("drop"); }, dur);
  }, delay || 0);
  return { el, p, dur: dur + (delay || 0) };
}
function paint(bd, rec, ctx){
  const st = rec.st, want = {}; st.b.forEach((p, i) => { if(p) want[i] = p; });
  const gone = Object.keys(bd.discs).filter(i => bd.discs[i].p !== want[i]);
  const added = Object.keys(want).filter(i => !bd.discs[i] || bd.discs[i].p !== want[i]).map(Number).sort((a, b) => a - b);
  let wait = 0;
  if(ctx.instant || gone.length > 2){
    // a new game: the discs fall out of the bottom (or vanish when the screen opens)
    gone.forEach(i => { const d = bd.discs[i]; delete bd.discs[i];
      if(ctx.instant || bd.api.reduced()){ d.el.remove(); return; }
      const c = i % W; d.el.style.transition = `transform ${500 + (i % 3) * 60}ms cubic-bezier(.55,0,1,.45) ${c * 40}ms`; pos(d.el, c, H + 2); setTimeout(() => d.el.remove(), 900); });
  } else gone.forEach(i => { const d = bd.discs[i]; delete bd.discs[i]; d.el.style.transition = "transform .3s ease-out, opacity .3s"; d.el.classList.add("lift"); pos(d.el, i % W, 0); setTimeout(() => d.el.remove(), 350); });   // takeback
  if(ctx.instant || added.length > 2) added.forEach(i => { const el = disc(want[i]); pos(el, i % W, H - Math.floor(i / W)); bd.layer.insertBefore(el, bd.ghost); bd.discs[i] = { el, p: want[i] }; });
  else added.forEach((i, k) => { const d = drop(bd, i, want[i], k * 380); bd.discs[i] = d; wait = Math.max(wait, d.dur); });
  // the last disc, the winning four and the line through them
  Object.keys(bd.discs).forEach(i => bd.discs[i].el.classList.toggle("last", Number(i) === st.last && !rec.status.line));
  const line = rec.status.line, lk = line ? line.join() : null;
  if(lk !== bd.lineKey){
    bd.lineKey = lk; bd.line.innerHTML = "";
    Object.values(bd.discs).forEach(d => d.el.classList.remove("win"));
    if(line) setTimeout(() => {
      if(bd.lineKey !== lk) return;
      line.forEach(i => bd.discs[i] && bd.discs[i].el.classList.add("win"));
      const a = line[0], b = line[3], x1 = a % W + .5, y1 = H - Math.floor(a / W) - .5, x2 = b % W + .5, y2 = H - Math.floor(b / W) - .5;
      bd.line.innerHTML = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" pathLength="1"/>`;
    }, wait + 120);
  }
  // hover disc: yours when you can play, the computer's wandering while it thinks
  clearInterval(bd.wander); bd.wander = null;
  const free = ZFour.moves(st).map(Number);
  if(ctx.canAct && !bd.drag){ showGhost(bd, free.includes(bd.ghostCol) ? bd.ghostCol : free.includes(3) ? 3 : free[0], st.turn); bd.ghost.classList.add("idle"); }
  else if(ctx.thinking && free.length){
    showGhost(bd, bd.ghostCol ?? 3, st.turn); bd.ghost.classList.remove("idle");
    bd.wander = setInterval(() => { if(!bd.el.isConnected){ clearInterval(bd.wander); return; } showGhost(bd, free[Math.floor(Math.random() * free.length)]); }, 420);
  } else if(!bd.drag) bd.ghost.classList.remove("on", "idle");
  const hint = ctx.hint !== null && ctx.hint !== undefined ? Number(ctx.hint) : null;
  bd.arrow.classList.toggle("on", hint !== null); if(hint !== null){ pos(bd.arrow, hint, 0); bd.ghost.classList.remove("on"); }
  bd.cols.forEach((b, c) => { b.disabled = !ctx.canAct || !free.includes(c); b.classList.toggle("hint", hint === c); });
}

register({
  id: "four", E: () => ZFour, newGame: () => ZFour.newGame(), levels: ["easy", "medium", "hard", "expert"], local: true,
  end(st, s){ return s.winner ? { winner: s.winner, reason: "four" } : s.over ? { winner: null, reason: "full" } : null; },
  colorName: c => t("f4Color_" + c), token: c => `<span class="f4mini ${c}"></span>`,
  bar: (rec, c) => `<span class="small">${t("f4Left", { n: 21 - rec.st.b.filter(p => p === c).length })}</span>`,
  rules: () => t("f4Rules"), afterMove: 520, minThink: 500, endDelay: 700,
  board: { create, paint }
});
