// Solitaire collection (Klondike draw 1/3, Spider 1/2/4 suits, FreeCell), modelled on the big solitaire apps:
// drag & drop or tap-to-move, deal animation, invalid moves slide back and shake with the reason, undo, hints,
// auto-finish, timer/moves/score, statistics per game type, the classic bouncing-cards cascade when you win and a
// "no moves left" dialog when you're stuck. Rules are in engines/patience-engine.js (ZPatience).
// The board is one DOM element that lives across renders (render() only re-mounts it), so animations keep running.
import { render } from "./screens.js";
import { S } from "./state.js";
import { ICON, esc, t } from "./util.js";

const VARS = ["klondike1", "klondike3", "spider1", "spider2", "spider4", "freecell"];
const SUIT = { S: "♠", H: "♥", D: "♦", C: "♣" };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = { get(k, d){ try{ const v = localStorage.getItem("zugpal.sol." + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("zugpal.sol." + k, JSON.stringify(v)); }catch(e){} } };

let G = null;   // { st, history, el, cards: Map(id -> element), slots, lay, start, elapsed, timer, done }

/* ---------------- Game life cycle ---------------- */
function newGame(variant, seed){
  variant = VARS.includes(variant) ? variant : store.get("variant", "klondike1");
  seed = seed || (variant === "freecell" ? 1 + Math.floor(Math.random() * 32000) : Math.floor(Math.random() * 2 ** 31));
  store.set("variant", variant);
  const stats = store.get("stats", {}); const s = stats[variant] || (stats[variant] = { played: 0, won: 0, streak: 0, best: 0, bestTime: 0 });
  if(G && G.st && G.st.moves > 0 && !G.done){ const o = stats[G.st.variant]; if(o) o.streak = 0; }
  s.played++; store.set("stats", stats);
  if(G) clearInterval(G.timer);
  G = { st: ZPatience.deal(variant, seed), history: [], el: G && G.el, cards: G ? G.cards : new Map(), start: 0, elapsed: 0, timer: null, done: false, dealing: true };
  save(); return G;
}
function save(){ if(G) store.set("current", { st: G.st, elapsed: elapsedNow(), done: G.done }); }
function resume(){
  const c = store.get("current", null);
  if(c && c.st && ZPatience.VARIANTS[c.st.variant] && !c.done){ G = { st: c.st, history: [], el: null, cards: new Map(), start: 0, elapsed: c.elapsed || 0, timer: null, done: false, dealing: true }; return true; }
  return false;
}
const elapsedNow = () => G ? G.elapsed + (G.start ? Date.now() - G.start : 0) : 0;
const fmtTime = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
function startClock(){ if(!G.start && !G.done){ G.start = Date.now(); G.timer = setInterval(updateBar, 1000); } }
function stopClock(){ if(G.start){ G.elapsed += Date.now() - G.start; G.start = 0; } clearInterval(G.timer); }

/* ---------------- Board DOM ---------------- */
function rankLabel(r){ if(r === 1) return "A"; if(r <= 10) return String(r); return (S.lang === "de" ? ["B", "D", "K"] : ["J", "Q", "K"])[r - 11]; }
function cardEl(c){
  let el = G.cards.get(c.id);
  if(!el){
    el = document.createElement("div"); el.className = "pcard"; el.dataset.id = c.id;
    el.innerHTML = `<div class="face"><span class="cr"></span><span class="cs"></span><span class="cbig"></span></div><div class="back"></div>`;
    G.cards.set(c.id, el); G.el.appendChild(el);
  }
  const red = ZPatience.red(c);
  el.classList.toggle("red", red); el.classList.toggle("down", !c.up);
  el.querySelector(".cr").textContent = rankLabel(c.r);
  el.querySelector(".cs").textContent = SUIT[c.s] + "︎";
  el.querySelector(".cbig").textContent = c.r > 10 ? rankLabel(c.r) : SUIT[c.s] + "︎";
  el.setAttribute("aria-label", c.up ? rankLabel(c.r) + SUIT[c.s] : t("solFaceDown"));
  return el;
}
function ensureBoard(){
  if(!G.el){
    G.el = document.createElement("div"); G.el.className = "solboard"; G.el.setAttribute("dir", "ltr");
    G.el.addEventListener("pointerdown", onDown);
    G.cards = new Map();
  }
  return G.el;
}
// Where every card and empty pile goes, for the current board width and screen height
function computeLayout(){
  const st = G.st, mount = G.el.parentElement, cs = mount ? getComputedStyle(mount) : null;
  const W = Math.min(mount ? mount.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : 360, 560);
  const cols = st.tab.length, gap = cols >= 10 ? 3 : 5;
  const cw = Math.floor((W - gap * (cols - 1)) / cols), ch = Math.round(cw * 1.42);
  const x = i => i * (cw + gap), y0 = ch + 14;
  const top = mount ? mount.getBoundingClientRect().top : 0;
  const avail = Math.max(ch * 4, (window.innerHeight || 800) - Math.max(0, top) - 120);
  const slots = [], pos = new Map();
  const put = (c, px, py, z, loc) => pos.set(c.id, { x: px, y: py, z, loc });
  // top row
  if(st.type === "klondike"){
    slots.push({ k: "stock", x: x(0), y: 0 });
    st.stock.forEach((c, i) => put(c, x(0), 0, i, { k: "stock" }));
    slots.push({ k: "waste", x: x(1), y: 0 });
    const show = st.draw === 3 ? 3 : 1, w = st.waste, fan = Math.round(cw * 0.3);
    w.forEach((c, i) => { const off = Math.max(0, i - (w.length - show)); put(c, x(1) + off * fan, 0, 100 + i, { k: "waste", top: i === w.length - 1 }); });
    st.found.forEach((f, i) => { slots.push({ k: "found", i, x: x(3 + i), y: 0 }); f.forEach((c, j) => put(c, x(3 + i), 0, 200 + j, { k: "found", i })); });
  } else if(st.type === "spider"){
    st.found.forEach((f, i) => { slots.push({ k: "found", i, x: x(i) * 0 + i * Math.round(cw * 0.42), y: 0, mini: true }); f.forEach((c, j) => put(c, i * Math.round(cw * 0.42), 0, 200 + i * 13 + j, { k: "found", i })); });
    slots.push({ k: "stock", x: x(cols - 1), y: 0 });
    st.stock.forEach((c, i) => put(c, x(cols - 1) - Math.floor(i / 10) * Math.round(cw * 0.22), 0, i, { k: "stock" }));
  } else {
    st.cells.forEach((c, i) => { slots.push({ k: "cell", i, x: x(i), y: 0 }); if(c) put(c, x(i), 0, 300 + i, { k: "cell", i }); });
    st.found.forEach((f, i) => { slots.push({ k: "found", i, x: x(4 + i), y: 0 }); f.forEach((c, j) => put(c, x(4 + i), 0, 200 + j, { k: "found", i })); });
  }
  // tableau, squeezed so the longest column still fits on the screen
  let maxH = 0;
  st.tab.forEach((p, i) => {
    slots.push({ k: "tab", i, x: x(i), y: y0 });
    const downs = p.filter(c => !c.up).length, ups = p.length - downs;
    let dd = ch * 0.13, du = ch * 0.28;
    const need = downs * dd + Math.max(0, ups - 1) * du;
    if(need > avail - ch) { const f = Math.max(0.35, (avail - ch) / need); dd *= f; du *= f; }
    let yy = y0;
    p.forEach((c, idx) => { put(c, x(i), Math.round(yy), 400 + idx, { k: "tab", i, idx }); yy += c.up ? du : dd; });
    maxH = Math.max(maxH, yy - (p.length ? (p[p.length - 1].up ? du : dd) : 0) + ch);
  });
  return { cw, ch, gap, W, y0, slots, pos, height: Math.max(maxH, y0 + ch * 2) + 6 };
}
function layout(opts){
  if(!G || !G.el || !G.el.parentElement) return;
  const L = G.lay = computeLayout(), el = G.el;
  el.style.width = L.W + "px"; el.style.height = L.height + "px";
  el.style.setProperty("--cw", L.cw + "px"); el.style.setProperty("--ch", L.ch + "px");
  // empty pile markers
  el.querySelectorAll(".pslot").forEach(s => s.remove());
  for(const s of L.slots){
    const d = document.createElement("div");
    d.className = "pslot " + s.k + (s.mini ? " mini" : ""); if(s.i !== undefined) d.dataset.i = s.i;
    d.style.transform = `translate(${s.x}px,${s.y}px)`;
    if(s.k === "stock"){ d.dataset.act2 = "stock"; d.textContent = G.st.type === "klondike" && !G.st.stock.length && G.st.waste.length ? "↻" : ""; }
    if(s.k === "found" && G.st.type !== "spider") d.textContent = "A";
    el.insertBefore(d, el.firstChild);
  }
  // cards
  const all = [...G.st.tab.flat(), ...G.st.stock, ...G.st.waste, ...G.st.found.flat(), ...G.st.cells.filter(Boolean)];
  const live = new Set(all.map(c => c.id));
  for(const [id, e] of G.cards) if(!live.has(id)){ e.remove(); G.cards.delete(id); }
  const stockSlot = L.slots.find(s => s.k === "stock") || L.slots[0];
  all.forEach((c, n) => {
    const e = cardEl(c), p = L.pos.get(c.id); if(!p) return;
    e._loc = p.loc; e.style.visibility = "";
    if(opts && opts.deal){
      e.style.transition = "none"; e.style.transform = `translate(${stockSlot.x}px,${stockSlot.y}px)`; e.style.zIndex = p.z;
      requestAnimationFrame(() => requestAnimationFrame(() => { e.style.transition = ""; e.style.transitionDelay = (p.loc.k === "tab" ? n * 14 : 0) + "ms"; e.style.transform = `translate(${p.x}px,${p.y}px)`; }));
      setTimeout(() => { e.style.transitionDelay = ""; }, 1400);
    } else {
      e.style.transform = `translate(${p.x}px,${p.y}px)`; e.style.zIndex = p.z;
    }
  });
  G.dealing = false;
}

/* ---------------- Moves ---------------- */
function commit(next){
  if(!next) return false;
  G.history.push(G.st); if(G.history.length > 300) G.history.shift();
  G.st = next; startClock(); layout(); updateBar(); save();
  if(ZPatience.won(G.st)) setTimeout(win, 350);
  else if(ZPatience.stuck(G.st)) setTimeout(() => { if(G && !G.done && ZPatience.stuck(G.st)) dialog("stuck"); }, 700);
  return true;
}
function reason(from, to){
  const st = G.st, cards = ZPatience.cardsAt(st, from);
  if(!ZPatience.canPick(st, from)) return st.type === "spider" ? t("rSuit") : t("rNo");
  if(!to) return t("rNo");
  if(to.k === "found") return st.type === "spider" ? t("rSpiderFound") : t("rFound");
  if(to.k === "cell") return t("rCell");
  const p = st.tab[to.i];
  if(st.type === "freecell" && cards.length > ZPatience.maxMove(st, !p.length)) return t("rLimit", { n: ZPatience.maxMove(st, !p.length) });
  if(!p.length) return t("rKing");
  const tc = p[p.length - 1];
  if(tc.r !== cards[0].r + 1) return t("rRank");
  return t("rColor");
}
function refuse(ids, msg){
  try{ navigator.vibrate && navigator.vibrate(35); }catch(e){}
  ids.forEach(id => { const e = G.cards.get(id); if(e){ e.classList.remove("shake"); void e.offsetWidth; e.classList.add("shake"); setTimeout(() => e.classList.remove("shake"), 450); } });
  flash(msg);
}
function flash(msg){
  const f = document.getElementById("solmsg"); if(!f) return;
  f.textContent = msg; f.classList.add("on"); clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove("on"), 2200);
}
function drawStock(){
  if(G.st.type === "freecell") return;
  if(G.st.type === "spider" && G.st.stock.length && G.st.tab.some(p => !p.length)) return refuse([], t("rSpiderDeal"));
  if(!commit(ZPatience.draw(G.st))) flash(t("solStockEmpty"));
}

/* ---------------- Drag & drop / tap ---------------- */
let drag = null;
function locOf(el){ return el && el._loc; }
function groupIds(loc){ return ZPatience.cardsAt(G.st, loc).map(c => c.id); }
function onDown(e){
  if(G.done || e.button > 0) return;
  const cardE = e.target.closest(".pcard"), slot = e.target.closest(".pslot");
  if(slot && slot.dataset.act2 === "stock" && !cardE){ e.preventDefault(); drawStock(); return; }
  if(!cardE) return;
  const loc = locOf(cardE); if(!loc) return;
  e.preventDefault();
  if(loc.k === "stock"){ drawStock(); return; }
  if(loc.k === "waste" && !loc.top) return;
  const ids = groupIds(loc.k === "waste" ? { k: "waste" } : loc);
  if(!ids.length) return;
  const els = ids.map(id => G.cards.get(id));
  const base = ids.map(id => G.lay.pos.get(id));
  drag = { loc: loc.k === "waste" ? { k: "waste" } : loc, ids, els, base, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId, pick: ZPatience.canPick(G.st, loc.k === "waste" ? { k: "waste" } : loc) };
  G.el.setPointerCapture(e.pointerId);
  G.el.addEventListener("pointermove", onMove); G.el.addEventListener("pointerup", onUp); G.el.addEventListener("pointercancel", onUp);
}
function onMove(e){
  if(!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if(!drag.moved && Math.hypot(dx, dy) < 7) return;
  if(!drag.pick){ return; }
  if(!drag.moved){ drag.moved = true; drag.els.forEach(el => el.classList.add("dragging")); }
  drag.els.forEach((el, i) => { el.style.transform = `translate(${drag.base[i].x + dx}px,${drag.base[i].y + dy}px)`; el.style.zIndex = 1000 + i; });
  drag.dx = dx; drag.dy = dy;
}
function dropTarget(drag){
  const L = G.lay, b = drag.base[0], cx = b.x + drag.dx, cy = b.y + drag.dy;
  let best = null, bestA = 0;
  const area = (x, y, w, h) => Math.max(0, Math.min(cx + L.cw, x + w) - Math.max(cx, x)) * Math.max(0, Math.min(cy + L.ch, y + h) - Math.max(cy, y));
  for(const s of L.slots){
    if(s.k === "stock" || s.k === "waste") continue;
    if(s.k === "tab"){
      const p = G.st.tab[s.i], last = p.length ? L.pos.get(p[p.length - 1].id) : null;
      const a = area(s.x, s.y, L.cw, (last ? last.y - s.y : 0) + L.ch);
      if(a > bestA && !(drag.loc.k === "tab" && drag.loc.i === s.i)){ bestA = a; best = { k: "tab", i: s.i }; }
    } else {
      const a = area(s.x, s.y, s.mini ? L.cw * 0.42 : L.cw, L.ch);
      if(a > bestA && !(drag.loc.k === s.k && drag.loc.i === s.i)){ bestA = a; best = { k: s.k, i: s.i }; }
    }
  }
  return best;
}
function onUp(e){
  if(!drag || e.pointerId !== drag.pid) return;
  G.el.removeEventListener("pointermove", onMove); G.el.removeEventListener("pointerup", onUp); G.el.removeEventListener("pointercancel", onUp);
  const d = drag; drag = null;
  d.els.forEach(el => el.classList.remove("dragging"));
  if(d.moved){
    const to = dropTarget(d);
    const next = to && ZPatience.move(G.st, d.loc, to);
    if(next) commit(next); else { layout(); refuse(d.ids, to ? reason(d.loc, to) : t("rNo")); }
    return;
  }
  // a tap: send the card(s) to the best place
  if(d.loc.k === "found") return;
  if(!d.pick) return refuse(d.ids, reason(d.loc, null));
  const to = ZPatience.autoTarget(G.st, d.loc);
  if(!to || !commit(ZPatience.move(G.st, d.loc, to))) refuse(d.ids, t("rNowhere"));
}

/* ---------------- Toolbar ---------------- */
function updateBar(){
  const b = document.getElementById("solbar"); if(!b || !G) return;
  b.textContent = `${fmtTime(elapsedNow())} · ${t("solMovesN", { n: G.st.moves })}${G.st.type !== "freecell" ? " · " + t("solScoreN", { n: G.st.score }) : ""}`;
  const u = document.getElementById("solundo"); if(u) u.disabled = !G.history.length || G.done;
  const a = document.getElementById("solauto"); if(a) a.hidden = !ZPatience.canAutoFinish(G.st) || G.done;
}
function hint(){
  const h = ZPatience.hints(G.st)[0];
  const glow = els => els.forEach(e => { if(!e) return; e.classList.remove("hint"); void e.offsetWidth; e.classList.add("hint"); setTimeout(() => e.classList.remove("hint"), 1600); });
  if(h){
    glow(groupIds(h.from).map(id => G.cards.get(id)));
    const tp = h.to.k === "tab" ? G.st.tab[h.to.i] : h.to.k === "found" ? G.st.found[h.to.i] : [];
    glow([tp && tp.length ? G.cards.get(tp[tp.length - 1].id) : G.el.querySelector(`.pslot.${h.to.k}[data-i="${h.to.i}"]`)]);
  } else if(ZPatience.canDraw(G.st)){ glow([G.el.querySelector(".pslot.stock")]); flash(t("solHintDraw")); }
  else flash(t("solHintNone"));
}
function autoFinish(){
  if(!ZPatience.canAutoFinish(G.st)) return;
  const step = () => { if(!G || G.done) return; const m = ZPatience.autoStep(G.st); if(m && commit(ZPatience.move(G.st, m.from, m.to))) setTimeout(step, reduced() ? 0 : 90); };
  step();
}

/* ---------------- Win / stuck ---------------- */
function win(){
  if(G.done) return; G.done = true; stopClock();
  const stats = store.get("stats", {}), s = stats[G.st.variant] || { played: 1, won: 0, streak: 0, best: 0, bestTime: 0 };
  s.won++; s.streak++; s.best = Math.max(s.best, s.streak);
  const time = G.elapsed, record = !s.bestTime || time < s.bestTime; if(record) s.bestTime = time;
  stats[G.st.variant] = s; store.set("stats", stats); save();
  G.result = { time, record };
  if(reduced()) return dialog("won");
  cascade(() => dialog("won"));
}
// The classic: cards jump off the foundations and bounce across the screen, leaving a trail
function cascade(done){
  const cv = document.createElement("canvas"); cv.className = "cascade"; document.body.appendChild(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext("2d"); g.scale(dpr, dpr);
  const L = G.lay, cw = Math.max(34, L.cw), ch = Math.round(cw * 1.42), rect = G.el.getBoundingClientRect();
  const piles = G.st.found.map((f, i) => ({ cards: f.slice().reverse(), x: rect.left + (L.slots.find(s => s.k === "found" && s.i === i) || { x: 0 }).x, y: rect.top }));
  const order = []; for(let k = 0; k < 13; k++) piles.forEach(p => { if(p.cards[k]) order.push({ c: p.cards[k], x: p.x, y: p.y }); });
  const drawCard = (c, x, y) => {
    g.fillStyle = "#fff"; g.strokeStyle = "#9AA8A2"; g.lineWidth = 1;
    g.beginPath(); g.roundRect ? g.roundRect(x, y, cw, ch, 5) : g.rect(x, y, cw, ch); g.fill(); g.stroke();
    g.fillStyle = ZPatience.red(c) ? "#B3261E" : "#15211D"; g.font = `700 ${Math.round(cw * 0.32)}px system-ui,sans-serif`;
    g.fillText(rankLabel(c.r), x + 4, y + cw * 0.34); g.font = `${Math.round(cw * 0.55)}px system-ui,sans-serif`; g.fillText(SUIT[c.s], x + cw * 0.28, y + ch * 0.72);
  };
  let idx = 0, cur = null, stop = false, frames = 0;
  const finish = () => { if(stop) return; stop = true; cv.remove(); done(); };
  cv.addEventListener("pointerdown", finish);
  G.cards.forEach(e => e.style.visibility = "hidden");
  const tick = () => {
    if(stop) return;
    if(!cur){
      if(idx >= order.length){ setTimeout(finish, 400); return; }
      const o = order[idx++]; cur = { ...o, vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4), vy: -Math.random() * 6 };
    }
    for(let k = 0; k < 2 && cur; k++){
      cur.vy += 0.55; cur.x += cur.vx; cur.y += cur.vy;
      if(cur.y + ch > H){ cur.y = H - ch; cur.vy = -cur.vy * 0.72; }
      drawCard(cur.c, cur.x, cur.y);
      if(cur.x < -cw || cur.x > W) cur = null;
    }
    if(++frames > 60 * 45) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function dialog(kind){
  S.solDialog = kind; render();
}

/* ---------------- Screen ---------------- */
function variantSheet(){
  const stats = store.get("stats", {});
  const cur = G ? G.st.variant : store.get("variant", "klondike1");
  return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel"><h2>${t("solChoose")}</h2>
    ${VARS.map(v => { const s = stats[v]; return `<button class="chip opt solvar${v === cur ? " cur" : ""}" data-act="solVariant" data-arg="${v}"><span class="grow"><b>${t("v_" + v)}</b><br><span class="small">${t("vd_" + v)}</span></span>
      ${s && s.played ? `<span class="small">${t("solStats", { w: s.won, p: s.played })}${s.bestTime ? "<br>" + t("solBestTime", { t: fmtTime(s.bestTime) }) : ""}</span>` : ""}</button>`; }).join("")}
    ${G ? `<button class="btn ghost" data-act="solRestart">${t("solRestart")}</button>` : ""}
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="solSheetClose">${t("close")}</button></div></div></div>`;
}
function solDialogHtml(){
  if(S.solSheet) return variantSheet();
  if(!S.solDialog || !G) return "";
  if(S.solDialog === "won"){
    const s = (store.get("stats", {})[G.st.variant]) || {};
    return `<div class="sheet center" role="dialog" aria-modal="true"><div class="panel"><h2>${t("solWonTitle")}</h2>
      <p>${t("solWonBody", { t: fmtTime(G.result ? G.result.time : 0), m: G.st.moves })}${G.st.type !== "freecell" ? " · " + t("solScoreN", { n: G.st.score }) : ""}</p>
      ${G.result && G.result.record ? `<div class="banner info">${t("solRecord")}</div>` : ""}
      <div class="small">${t("solStats", { w: s.won || 0, p: s.played || 0 })} · ${t("solStreak", { n: s.streak || 0 })}</div>
      <button class="btn" data-act="solAgain">${t("solNew")}</button><button class="btn ghost" data-act="solSheet">${t("solChoose")}</button></div></div>`;
  }
  return `<div class="sheet center" role="dialog" aria-modal="true"><div class="panel"><h2>${t("solStuckTitle")}</h2><p>${t("solStuckBody")}</p>
    <button class="btn" data-act="solUndo">${t("undo")}</button><button class="btn ghost" data-act="solAgain">${t("solNew")}</button>
    <button class="link" data-act="solDialogClose">${t("solKeepLooking")}</button></div></div>`;
}
function solitaireScreen(){
  if(!G && !resume()) newGame();
  const fc = G.st.type === "freecell";
  return `<div class="screen solscreen">
    <div class="row"><button class="iconbtn flip" data-act="solBack" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("v_" + G.st.variant)}${fc ? ` · ${t("solGame", { n: G.st.seed })}` : ""}</div><div class="small" id="solbar"></div></div>
      <button class="btn ghost small" data-act="solSheet">${t("solNewShort")}</button></div>
    <div class="solmount" id="solmount"></div>
    <div class="solmsg" id="solmsg" role="status" aria-live="polite"></div>
    <div class="soltools">
      <button class="btn ghost small" id="solundo" data-act="solUndo">${t("undo")}</button>
      <button class="btn ghost small" data-act="solHint">${t("solHint")}</button>
      <button class="btn small" id="solauto" data-act="solAuto" hidden>${t("solAuto")}</button>
    </div>
    <div class="small">${t("solHelp_" + G.st.type)}</div>
  </div>`;
}
// called by render() after the screen HTML is in place
function mountSolitaire(){
  const m = document.getElementById("solmount"); if(!m || !G) return;
  const first = !G.el;
  ensureBoard(); m.appendChild(G.el);
  layout({ deal: first || G.dealing });
  updateBar();
}
window.addEventListener("resize", () => { if(G && G.el && G.el.isConnected && !drag) layout(); });

const solitaireActions = {
  solNew(){ if(!G && !resume()) newGame(); S.solDialog = null; S.screen = "solitaire"; render(); },
  solBack(){ stopClock(); save(); S.screen = "games"; render(); },
  solSheet(){ S.solDialog = null; S.solSheet = true; render(); },
  solSheetClose(){ S.solSheet = false; render(); },
  solVariant(v){ S.solSheet = false; S.solDialog = null; G && G.el && G.el.remove(); if(G) G.el = null; newGame(v); render(); },
  solRestart(){ const v = G.st.variant, seed = G.st.seed; S.solSheet = false; S.solDialog = null; G.el && G.el.remove(); G.el = null; newGame(v, seed); render(); },
  solAgain(){ const v = G.st.variant; S.solDialog = null; G.el && G.el.remove(); G.el = null; newGame(v); render(); },
  solUndo(){ if(!G || !G.history.length) return; if(G.done){ G.done = false; } S.solDialog = null; G.st = G.history.pop(); render(); layout(); updateBar(); save(); },
  solHint(){ if(G) hint(); },
  solAuto(){ if(G) autoFinish(); },
  solDialogClose(){ S.solDialog = null; render(); }
};

export { mountSolitaire, solDialogHtml, solitaireActions, solitaireScreen };
