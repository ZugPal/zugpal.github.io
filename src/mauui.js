// Mau-Mau, modelled on the popular Mau-Mau apps: green felt table, the other player's cards face down at the top,
// deck and pile in the middle, your hand fanned at the bottom. Cards that fit lift up; drag one onto the pile or tap
// it, tap the deck to draw. Cards fly between deck, hands and pile (the other player's cards flip over as they land),
// cards are dealt one by one at the start, a jack opens a suit picker, and bubbles show "+2", "Skip", the wished suit
// and "Mau!" when someone is down to one card. A drawn card that doesn't fit is kept automatically.
// Frame and shell: tablekit.js; rules: engines/maumau-engine.js ("pH9", "pSJ>H", "d" draw, "n" keep).
import { register } from "./tablekit.js";
import { S } from "./state.js";
import { t } from "./util.js";

const SUIT = { C: "♣", S: "♠", H: "♥", D: "♦" };
const other = c => c === "w" ? "b" : "w";
const rank = r => r === "T" ? "10" : S.lang === "de" ? ({ J: "B", Q: "D", K: "K", A: "A" }[r] || r) : r;
const red = c => c[0] === "H" || c[0] === "D";
const sortHand = h => h.slice().sort((a, b) => a[0] === b[0] ? ZMau.RANKS.indexOf(a[1]) - ZMau.RANKS.indexOf(b[1]) : "CSHD".indexOf(a[0]) - "CSHD".indexOf(b[0]));
const faceHtml = c => `<span class="ix">${rank(c[1])}<br>${SUIT[c[0]]}︎</span><span class="pip">${["J", "Q", "K"].includes(c[1]) ? rank(c[1]) : SUIT[c[0]] + "︎"}</span><span class="ix bt">${rank(c[1])}<br>${SUIT[c[0]]}︎</span>`;
const cardHtml = (c, cls, extra) => `<div class="mmc${red(c) ? " red" : ""}${cls ? " " + cls : ""}" data-c="${c}"${extra || ""}>${faceHtml(c)}</div>`;

function create(api){
  const el = document.createElement("div"); el.className = "mmtable"; el.setAttribute("dir", "ltr");
  el.innerHTML = `<div class="mmopp"></div>
    <div class="mmcenter"><button class="mmstock" aria-label="${t("mauStock")}"><span class="mmc back"></span><span class="mmc back"></span><span class="n"></span></button>
      <div class="mmpile"></div><div class="mmbadges"></div></div>
    <div class="mmkeep"></div>
    <div class="mmhand"></div><div class="mmbubble" aria-live="polite"></div><div class="mmwish"></div><div class="mmfly"></div>`;
  const q = s => el.querySelector(s);
  const bd = { el, api, opp: q(".mmopp"), stock: q(".mmstock"), pile: q(".mmpile"), badges: q(".mmbadges"), keep: q(".mmkeep"), hand: q(".mmhand"), bubble: q(".mmbubble"), wish: q(".mmwish"), fly: q(".mmfly"),
    shown: null, incoming: new Set(), oppIncoming: 0, pileIncoming: 0, sig: "", drag: null, wishFor: null, autoKey: null };
  bd.stock.addEventListener("click", () => {
    const rec = api.rec(); if(!api.canAct(rec)) return;
    const ms = ZMau.moves(rec.st);
    if(ms.includes("d")) api.play("d"); else if(ms.includes("n")) api.play("n");
  });
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-mm]"); if(!b) return;
    const rec = api.rec(), what = b.dataset.mm;
    if(what === "keep") api.play("n");
    else if(what === "cancel"){ bd.wishFor = null; api.update(); }
    else if(what.startsWith("suit:") && bd.wishFor){ const m = "p" + bd.wishFor + ">" + what.slice(5); bd.wishFor = null; api.play(m); }
  });
  bd.hand.addEventListener("pointerdown", e => onDown(bd, e));
  el.addEventListener("pointermove", e => onMove(bd, e));
  el.addEventListener("pointerup", e => onUp(bd, e)); el.addEventListener("pointercancel", e => onUp(bd, e));
  return bd;
}
const ctxOf = (api, rec) => ({ canAct: api.canAct(rec), hint: api.G && api.G.hint, instant: false });

/* ---------------- Input ---------------- */
function tryCard(bd, c){
  const rec = bd.api.rec(); if(!bd.api.canAct(rec)) return false;
  const ms = ZMau.moves(rec.st);
  if(c[1] === "J" && ms.some(m => m.startsWith("p" + c + ">"))){ bd.wishFor = c; bd.api.update(); bd.api.sound("card"); return true; }
  if(ms.includes("p" + c)) return bd.api.play("p" + c);
  const st = rec.st, top = ZMau.top(st);
  const why = st.sevens ? t("mmNeed7", { n: st.sevens * 2 }) : rec.st.drew ? t("mmOnlyDrawn") : c[1] === "J" ? t("mmNoJackOnJack") : st.wish ? t("mmNeedWish", { s: SUIT[st.wish] + "︎" }) : t("mmNeed", { s: SUIT[top[0]] + "︎", r: rank(top[1]) });
  bd.api.refuse(why); shake(bd, c); return false;
}
function shake(bd, c){ const e = bd.hand.querySelector(`[data-c="${c}"]`); if(e){ e.classList.remove("no"); void e.offsetWidth; e.classList.add("no"); } }
function onDown(bd, e){
  const card = e.target.closest(".mmc"); if(!card || bd.wishFor) return;
  const rec = bd.api.rec(); if(!bd.api.canAct(rec)) return;
  e.preventDefault();
  bd.drag = { pid: e.pointerId, el: card, c: card.dataset.c, x0: e.clientX, y0: e.clientY, moved: false, base: card.style.transform };
  try{ bd.el.setPointerCapture(e.pointerId); }catch(err){}
}
function onMove(bd, e){
  const d = bd.drag; if(!d || e.pointerId !== d.pid) return;
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
  if(!d.moved && Math.hypot(dx, dy) < 6) return;
  d.moved = true; d.el.classList.add("dragging");
  d.el.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`;
}
function onUp(bd, e){
  const d = bd.drag; if(!d || e.pointerId !== d.pid) return;
  bd.drag = null; d.el.classList.remove("dragging");
  if(e.type === "pointercancel"){ d.el.style.transform = d.base; return; }
  if(!d.moved){ d.el.style.transform = d.base; tryCard(bd, d.c); return; }
  const hr = bd.hand.getBoundingClientRect();
  if(e.clientY < hr.top - 10){ d.el.style.visibility = "hidden"; if(!tryCard(bd, d.c)){ d.el.style.visibility = ""; d.el.style.transform = d.base; } }   // the card flies on from where you let go
  else d.el.style.transform = d.base;
}

/* ---------------- Flights ---------------- */
function relRect(bd, el){ const a = bd.el.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height }; }
function fly(bd, from, to, html, opts){
  const f = document.createElement("div"); f.className = "mmflyer"; f.innerHTML = html;
  f.style.width = to.w + "px"; f.style.height = to.h + "px";
  const sx = from.w / to.w;
  f.style.transform = `translate(${from.x}px,${from.y}px) scale(${sx}) rotate(${opts.r0 || 0}deg)`;
  bd.fly.appendChild(f);
  const reduced = bd.api.reduced(), dur = reduced ? 0 : (opts.dur || 380);
  setTimeout(() => {
    f.getBoundingClientRect();
    f.style.transition = `transform ${dur}ms cubic-bezier(.3,.7,.4,1)`;
    f.style.transform = `translate(${to.x}px,${to.y}px) scale(1) rotate(${opts.r1 || 0}deg)`;
    if(opts.flip) setTimeout(() => f.classList.add("flipped"), dur * .45);
    bd.api.sound("card");
    setTimeout(() => { f.remove(); opts.done && opts.done(); }, dur + 20);
  }, opts.delay || 0);
}
const flipHtml = c => `<div class="mmc back"></div><div class="mmc face${red(c) ? " red" : ""}">${faceHtml(c)}</div>`;

/* ---------------- Drawing ---------------- */
function layoutHand(bd, cards, flags){
  const W = bd.hand.clientWidth || 340, n = cards.length;
  const cw = Math.min(70, Math.max(48, W * .19)), step = n > 1 ? Math.min(cw * .7, (W - cw) / (n - 1)) : 0, x0 = (W - cw - step * (n - 1)) / 2;
  return cards.map((c, i) => { const mid = i - (n - 1) / 2, rot = n > 1 ? mid * Math.min(4, 26 / n) : 0, y = Math.abs(mid) * Math.abs(mid) * Math.min(1.2, 10 / n) + (flags.lift.has(c) ? -14 : 0);
    return cardHtml(c, [flags.lift.has(c) ? "can" : "", flags.dim.has(c) ? "dim" : "", flags.hint === c ? "hint" : "", bd.incoming.has(c) ? "incoming" : ""].filter(Boolean).join(" "),
      ` style="left:${x0 + i * step}px;width:${cw}px;transform:translate(0,${y}px) rotate(${rot}deg)" role="button" aria-label="${rank(c[1])} ${SUIT[c[0]]}"`); }).join("");
}
function oppHtml(n, hide){
  const step = Math.min(18, 220 / Math.max(1, n)), w = 38;
  return `<div class="mmfan" style="width:${w + step * Math.max(0, n - 1)}px">${Array.from({ length: n }, (_, i) => `<span class="mmc back sm${i >= n - hide ? " incoming" : ""}" style="left:${i * step}px;transform:rotate(${(i - (n - 1) / 2) * 3}deg)"></span>`).join("")}</div>`;
}
function bubble(bd, text, where){
  const b = document.createElement("div"); b.className = "mmb " + (where || "mid"); b.textContent = text;
  bd.bubble.appendChild(b); setTimeout(() => b.remove(), 1500);
}
function paint(bd, rec, ctx){
  const st = rec.st, me = rec.myColor, op = other(me), api = bd.api;
  const prev = bd.shown, newGame = !prev || prev.seed !== rec.seed, back = prev && !newGame && rec.keys.length < prev.keys;
  const events = [];
  if(!ctx.instant && !back){
    if(newGame && !api.reduced()) events.push({ deal: true });
    else if(prev) for(let i = prev.keys; i < rec.keys.length; i++) events.push({ m: rec.keys[i], by: rec.states[i].turn, before: rec.states[i], after: rec.states[i + 1] });
  }
  // remember where things are before the new layout
  const oldHand = {}; bd.hand.querySelectorAll(".mmc").forEach(e => { oldHand[e.dataset.c] = relRect(bd, e); });
  const oppR = relRect(bd, bd.opp), stockR = relRect(bd, bd.stock);
  if(newGame || back || ctx.instant){ bd.incoming.clear(); bd.oppIncoming = 0; bd.pileIncoming = 0; bd.fly.innerHTML = ""; bd.wishFor = null; }
  if(!ctx.canAct) bd.wishFor = null;
  // cards that are on their way get hidden in the new layout until they land
  const hand = sortHand(st.hands[me]);
  events.forEach(ev => {
    if(ev.deal){ hand.forEach(c => bd.incoming.add(c)); bd.oppIncoming = st.hands[op].length; bd.pileIncoming = 1; return; }
    if(ev.m === "d"){ const got = ev.after.hands[ev.by].length - ev.before.hands[ev.by].length; if(ev.by === me) ev.after.hands[me].slice(-got).forEach(c => hand.includes(c) && bd.incoming.add(c)); else bd.oppIncoming += got; ev.got = got; }
    if(ev.m[0] === "p") bd.pileIncoming++;
  });
  draw(bd, rec, ctx, hand);
  // now fly
  const pileR = relRect(bd, bd.pile), handR = relRect(bd, bd.hand);
  const cardSize = { w: Math.min(70, Math.max(48, bd.hand.clientWidth * .19)) }; cardSize.h = cardSize.w * 1.4;
  let delay = 0;
  const land = () => { draw(bd, api.rec(), ctxOf(api, api.rec()), sortHand(api.rec().st.hands[api.rec().myColor])); };
  events.forEach(ev => {
    if(ev.deal){
      const dealt = []; for(let i = 0; i < 5; i++){ dealt.push(["w", i]); dealt.push(["b", i]); }
      dealt.forEach(([who], k) => {
        const mine = who === me;
        const target = mine ? { x: handR.x + handR.w / 2 - cardSize.w / 2, y: handR.y + 10, w: cardSize.w, h: cardSize.h } : { x: oppR.x + oppR.w / 2 - 19, y: oppR.y + 4, w: 38, h: 53 };
        fly(bd, stockR, target, `<div class="mmc back"></div>`, { delay: k * 90, dur: 300, done: () => {
          if(mine){ const nx = [...bd.incoming][0]; if(nx) bd.incoming.delete(nx); } else bd.oppIncoming = Math.max(0, bd.oppIncoming - 1);
          land(); } });
      });
      const top = ZMau.top(st);
      fly(bd, stockR, { ...pileR, w: cardSize.w, h: cardSize.h }, flipHtml(top), { delay: 10 * 90 + 120, flip: true, done: () => { bd.pileIncoming = 0; land(); } });
      delay = 10 * 90 + 500; return;
    }
    const d0 = delay;
    if(ev.m[0] === "p"){
      const c = ev.m.slice(1).split(">")[0], wish = ev.m.split(">")[1];
      const done = () => { bd.pileIncoming = Math.max(0, bd.pileIncoming - 1); land(); afterPlay(bd, ev, c, wish, me); };
      if(ev.by === me) fly(bd, oldHand[c] || { x: handR.x + handR.w / 2, y: handR.y, w: cardSize.w, h: cardSize.h }, { ...pileR, w: cardSize.w, h: cardSize.h }, cardHtml(c), { delay: d0, r1: (Math.random() - .5) * 16, done });
      else fly(bd, { x: oppR.x + oppR.w / 2 - 19, y: oppR.y + 4, w: 38, h: 53 }, { ...pileR, w: cardSize.w, h: cardSize.h }, flipHtml(c), { delay: d0, flip: true, r1: (Math.random() - .5) * 16, done });
      delay += 420;
    } else if(ev.m === "d"){
      const got = ev.got || 0, cards = ev.by === me ? ev.after.hands[me].slice(-got) : [];
      for(let k = 0; k < got; k++){
        const c = cards[k];
        const target = ev.by === me ? { x: handR.x + handR.w / 2 - cardSize.w / 2, y: handR.y + 10, w: cardSize.w, h: cardSize.h } : { x: oppR.x + oppR.w / 2 - 19, y: oppR.y + 4, w: 38, h: 53 };
        fly(bd, stockR, target, ev.by === me ? flipHtml(c) : `<div class="mmc back"></div>`, { delay: d0 + k * 140, flip: ev.by === me, done: () => {
          if(ev.by === me) bd.incoming.delete(c); else bd.oppIncoming = Math.max(0, bd.oppIncoming - 1);
          land(); } });
      }
      if(ev.before.sevens > 0) setTimeout(() => bubble(bd, t("mmTook", { n: got }), ev.by === me ? "low" : "high"), d0);
      delay += 140 * got + 300;
    } else if(ev.m === "n") setTimeout(() => bubble(bd, t("mmKept"), ev.by === me ? "low" : "high"), d0);
  });
  if(rec.end && rec.end.reason === "empty") setTimeout(() => bubble(bd, "Mau-Mau!", rec.end.winner === me ? "low" : "high"), delay + 200);
  bd.shown = { seed: rec.seed, keys: rec.keys.length };
  // a drawn card that doesn't fit is kept automatically
  const ms = ctx.canAct ? ZMau.moves(st) : [];
  const ak = rec.seed + ":" + rec.keys.length;
  if(ms.length === 1 && ms[0] === "n" && bd.autoKey !== ak){ bd.autoKey = ak; setTimeout(() => { const r = api.rec(); if(r.keys.length === rec.keys.length && api.canAct(r)) api.play("n"); }, 900 + delay); }
}
function afterPlay(bd, ev, c, wish, me){
  const where = ev.by === me ? "low" : "high";
  if(c[1] === "7") bubble(bd, "+" + ev.after.sevens * 2, "mid");
  else if(c[1] === "8") bubble(bd, t("mmSkip"), "mid");
  else if(c[1] === "J" && wish) bubble(bd, t("mmWished", { s: SUIT[wish] + "︎" }), "mid");
  if(ev.after.hands[ev.by].length === 1) setTimeout(() => bubble(bd, "Mau!", where), 350);
}
function draw(bd, rec, ctx, hand){
  const st = rec.st, me = rec.myColor, op = other(me);
  const ms = ctx.canAct ? ZMau.moves(st) : [];
  const playable = new Set(ms.filter(m => m[0] === "p").map(m => m.slice(1).split(">")[0]));
  const hint = ctx.hint && ctx.hint[0] === "p" ? ctx.hint.slice(1).split(">")[0] : null;
  const flags = { lift: ctx.canAct ? playable : new Set(), dim: new Set(ctx.canAct ? hand.filter(c => !playable.has(c)) : []), hint };
  const sig = [hand.join(), [...bd.incoming].join(), [...flags.lift].join(), hint, ctx.canAct, bd.hand.clientWidth].join("|");
  if(sig !== bd.sig && !bd.drag){ bd.sig = sig; bd.hand.innerHTML = layoutHand(bd, hand, flags); }
  bd.opp.innerHTML = oppHtml(st.hands[op].length, bd.oppIncoming);
  const visible = st.pile.slice(0, st.pile.length - bd.pileIncoming).slice(-3);
  bd.pile.innerHTML = visible.map((c, i) => cardHtml(c, "", ` style="transform:rotate(${((c.charCodeAt(0) * 7 + c.charCodeAt(1) * 13) % 17) - 8}deg)"`)).join("") || `<span class="mmc ghost"></span>`;
  bd.stock.querySelector(".n").textContent = st.stock.length;
  const canDraw = ms.includes("d"), mustTake = canDraw && st.sevens > 0;
  bd.stock.classList.toggle("can", canDraw); bd.stock.classList.toggle("must", mustTake && !playable.size);
  bd.stock.classList.toggle("hint", ctx.hint === "d" || ctx.hint === "n"); bd.stock.disabled = !canDraw && !ms.includes("n");
  bd.badges.innerHTML = (st.wish ? `<span class="mmbadge${red(st.wish) ? " red" : ""}">${t("mmWish")} ${SUIT[st.wish]}︎</span>` : "") + (st.sevens ? `<span class="mmbadge warn">+${st.sevens * 2}</span>` : "");
  bd.keep.innerHTML = ms.includes("n") && playable.size ? `<button class="btn ghost small" data-mm="keep">${t("mmKeep")}</button>` : "";
  bd.wish.innerHTML = bd.wishFor ? `<div class="mmwishbox" role="dialog" aria-label="${t("mauWish")}"><div class="pname">${t("mauWish")}</div><div class="mmsuits">${ZMau.SUITS.map(s => `<button class="mmsuit${red(s + "7") ? " red" : ""}" data-mm="suit:${s}" aria-label="${s}">${SUIT[s]}︎</button>`).join("")}</div><button class="link" data-mm="cancel">${t("cancel")}</button></div>` : "";
}

register({
  id: "mau", E: () => ZMau, newGame: seed => ZMau.newGame(seed), levels: ["easy", "medium", "hard"], local: false,
  end(st, s){ return s.winner ? { winner: s.winner, reason: "empty" } : null; },
  colorName: c => t("chColor_" + c), token: () => `<span class="mmc back tok"></span>`,
  bar: (rec, c) => `<span class="small">${t("mmCards", { n: rec.st.hands[c].length })}</span>`,
  endNote(rec){ const loser = rec.end && rec.end.winner ? other(rec.end.winner) : null; if(!loser || rec.end.reason !== "empty") return "";
    const left = rec.st.hands[loser]; return `<div class="mmleft">${left.map(c => cardHtml(c, "sm")).join("")}</div><p class="small">${t("mmPoints", { n: left.length, p: ZMau.points(left) })}</p>`; },
  prompt(rec){
    const st = rec.st, ms = ZMau.moves(st), plays = ms.filter(m => m[0] === "p");
    if(MB() && MB().wishFor) return t("mauWish");
    if(st.sevens > 0) return plays.length ? t("mmSevenOr", { n: st.sevens * 2 }) : t("mmTakeN", { n: st.sevens * 2 });
    if(st.drew) return plays.length ? t("mmDrewFits") : t("mmDrewNo");
    if(st.wish) return t("mmWishPlay", { s: SUIT[st.wish] + "︎" });
    return plays.length ? t("mmPlay") : t("mmDraw");
  },
  rules: () => t("mmRules"), afterMove: 650, minThink: 700, endDelay: 900,
  board: { create: api => (mb = create(api)), paint }
});
let mb = null; const MB = () => mb;
