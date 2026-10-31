// Quizfahrt, our own quiz duel, modelled on the popular quiz-duel apps: 3 rounds, a wheel picks each round's category
// (the same on both phones), 3 questions per round with a 20-second bar, jokers (50:50 and +10 seconds, once per game),
// the right answer lights up and you see what the other player chose, a round overview with dots for both players
// (theirs only for questions you have answered too), three computer levels, statistics per category and confetti.
// Questions: engines/quiz-questions.js (our own, never the official test text); rules: ZQuiz in engines/party-engine.js.
// Online chat cards: qz:<gid>:2 (sender = "w"; "2" = this duel, older invites without it are the plain 6 questions),
//   qa:<gid>:<question>-<choice> (choice = position on screen 0..3, 4 = time ran out).
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, parseMsg, t } from "./util.js";

const GID = /^[A-Za-z0-9]{4,12}$/, LEVELS = ["easy", "medium", "hard"];
const QTIME = 20000, SPIN = 2600, COLORS = { lid: "#1F5FBF", geo: "#2A9D8F", rail: "#1F6B50", nature: "#6A994E", lang: "#E0A526", mix: "#C0262D" };
const ICONS = { lid: "🏛", geo: "🌍", rail: "🚆", nature: "🌿", lang: "💬", mix: "💡" };
const store = { get(k, d){ try{ const v = localStorage.getItem("zugpal.qz." + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("zugpal.qz." + k, JSON.stringify(v)); }catch(e){} } };
const newGid = () => Math.random().toString(36).slice(2, 10);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const qText = q => q[S.lang] || q.de;
const other = c => c === "w" ? "b" : "w";

/* ---------------- State ---------------- */
function onlineQuiz(gid){
  let inv = null, st = null;
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type === "qz" && p.val === gid && !inv){ inv = { starter: x.mine }; st = p.extra === "2" ? ZQuiz.newDuel(ZQuestions, ZSeed.hash(gid)) : ZQuiz.newGame(ZQuestions, ZSeed.hash(gid)); }
    if(p.type === "qa" && p.val === gid && inv){
      const [i, choice] = String(p.extra || "").split("-").map(Number), who = x.mine === inv.starter ? "w" : "b";
      if(i === st.answers[who].length) st = ZQuiz.answer(st, who, choice);
    }
  }
  return inv ? { st, me: inv.starter ? "w" : "b" } : null;
}
function quizState(){ const q = S.qz; if(!q) return null; return q.mode === "cpu" ? { st: q.st, me: "w" } : onlineQuiz(q.gid); }
const fresh = (mode, extra) => ({ mode, level: "medium", started: {}, hidden: {}, extra: {}, jokers: { fifty: false, time: false }, wheelSeen: [], reveal: null, ...extra });

/* ---------------- Sound & confetti ---------------- */
let actx = null;
function sound(kind){
  if(!store.get("sound", true)) return;
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime, tone = (f, d, at, type, vol) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type || "triangle"; o.frequency.value = f; g.gain.setValueAtTime(vol || .1, now + at); g.gain.exponentialRampToValueAtTime(.001, now + at + d); o.connect(g).connect(actx.destination); o.start(now + at); o.stop(now + at + d); };
    if(kind === "right"){ tone(660, .1, 0); tone(880, .18, .08); }
    else if(kind === "wrong"){ tone(220, .2, 0, "sawtooth", .05); }
    else if(kind === "end"){ tone(523, .2, 0); tone(659, .2, .12); tone(784, .3, .24); }
    else if(kind === "spin") for(let k = 0; k < 10; k++) tone(900 - k * 40, .03, k * k * .022, "square", .02);
  }catch(e){}
}
function confetti(){
  const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
  const W = cv.width = innerWidth, H = cv.height = innerHeight, g = cv.getContext("2d"), cols = Object.values(COLORS);
  const parts = Array.from({ length: 140 }, () => ({ x: W / 2, y: H * .4, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 6 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  let f = 0; const tick = () => { g.clearRect(0, 0, W, H); parts.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; g.fillStyle = p.c; g.fillRect(p.x, p.y, p.s, p.s * .6); }); if(++f < 140) requestAnimationFrame(tick); else cv.remove(); };
  requestAnimationFrame(tick);
}

/* ---------------- Pieces of UI ---------------- */
function wheel(target, at){
  const k = ZQuiz.CATS.indexOf(target), seg = 360 / ZQuiz.CATS.length, rot = 360 * 5 - k * seg, el = Date.now() - at;
  const pt = (a, r) => { const rad = (a - 90) * Math.PI / 180; return [(Math.cos(rad) * r).toFixed(2), (Math.sin(rad) * r).toFixed(2)]; };
  const segs = ZQuiz.CATS.map((c, i) => { const a0 = i * seg - seg / 2, a1 = a0 + seg, [x0, y0] = pt(a0, 48), [x1, y1] = pt(a1, 48), [tx, ty] = pt(i * seg, 31);
    return `<path d="M0 0L${x0} ${y0}A48 48 0 0 1 ${x1} ${y1}Z" fill="${COLORS[c]}"/><text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="13">${ICONS[c]}</text>`; }).join("");
  return `<div class="qwheelwrap"><span class="qpointer">▼︎</span><svg class="qwheel${reduced() ? "" : " spin"}" viewBox="-50 -50 100 100" style="--rot:${rot}deg;animation-delay:${-el}ms;${reduced() ? `transform:rotate(${rot}deg)` : ""}" aria-hidden="true">${segs}<circle r="8" fill="#FFFDF8"/></svg></div>`;
}
function board(st, me, name){
  if(!st.rounds) return "";
  const op = other(me), mine = st.answers[me], theirs = st.answers[op];
  const dot = (p, i, show) => { const a = st.answers[p][i]; if(a === undefined) return `<i class="qd"></i>`; if(!show) return `<i class="qd done">?</i>`; return `<i class="qd ${ZQuiz.correct(st.qs[i], a) ? "r" : "w"}"></i>`; };
  const rows = st.rounds.map((c, r) => `<div class="qbr"><span class="dots">${[0, 1, 2].map(j => dot(me, r * 3 + j, true)).join("")}</span>
      <span class="qbcat" style="--c:${COLORS[c]}">${ICONS[c]} ${t("qzCat_" + c)}</span><span class="dots">${[0, 1, 2].map(j => dot(op, r * 3 + j, mine.length > r * 3 + j)).join("")}</span></div>`).join("");
  const seen = Math.min(mine.length, theirs.length);
  const their = theirs.slice(0, mine.length).filter((c, i) => ZQuiz.correct(st.qs[i], c)).length;
  return `<div class="qboard"><div class="qbr head"><b>${t("you")} · ${ZQuiz.score(st, me)}</b><span></span><b>${name} · ${their}${theirs.length > seen ? "+" : ""}</b></div>${rows}</div>`;
}

/* ---------------- Screen ---------------- */
function quizScreen(){
  const q = S.qz, qs = quizState(); if(!q || !qs) return null;
  const { st, me } = qs, op = other(me), mine = st.answers[me], theirs = st.answers[op], n = st.qs.length, per = st.per || n;
  const name = q.mode === "cpu" ? "🤖︎ " + t("chLevel_" + q.level) : esc((peerOf(q.peerId) || { first_name: q.peerName || "" }).first_name);
  const status = ZQuiz.status(st), now = Date.now();
  clearTimeout(q.timer); q.timer = null;
  let body;
  if(q.reveal !== null && q.reveal !== undefined){
    const i = q.reveal, item = st.qs[i], bank = ZQuestions[item.i], txt = qText(bank), myC = mine[i], thC = theirs[i], el = now - (q.revealAt || 0);
    const right = ZQuiz.correct(item, myC), last = i + 1 >= n;
    body = `<div class="card quizq qreveal"><span class="lbl" style="--c:${COLORS[bank.cat]}">${ICONS[bank.cat]} ${t("qzCat_" + bank.cat)} · ${i + 1}/${n}</span><div class="pname" dir="auto">${esc(txt[0])}</div>
      <div class="opts">${item.order.map((o, pos) => `<div class="chip opt qopt${pos === myC ? " picked" : ""}${o === 0 ? " right" : pos === myC ? " wrong" : ""}" style="animation-delay:${450 - el}ms" dir="auto"><span class="grow">${esc(txt[o + 1])}</span>${pos === myC ? `<span class="qwho">${t("you")}</span>` : ""}${pos === thC ? `<span class="qwho them">${name}</span>` : ""}</div>`).join("")}</div>
      <div class="qverdict ${right ? "ok" : "no"}" style="animation-delay:${450 - el}ms">${myC === 4 ? t("qzTimeUp") : right ? t("qzRight") : t("qzWrong")}${thC === undefined ? ` <span class="small">· ${t("qzTheyPending", { name })}</span>` : ""}</div>
      <button class="btn" data-act="qzNext">${last ? t("qzResult") : (i + 1) % per === 0 ? t("qzNextRound") : t("qzNextQ")}</button></div>`;
  } else if(mine.length < n){
    const i = mine.length, round = Math.floor(i / per);
    if(st.rounds && i % per === 0 && !q.wheelSeen.includes(round)){
      q.wheelAt = q.wheelAt && q.wheelRound === round ? q.wheelAt : now; q.wheelRound = round;
      if(now - q.wheelAt < 50) sound("spin");
      const shown = now - q.wheelAt > SPIN || reduced();
      if(!shown) setTimeout(() => { if(S.qz === q && q.wheelRound === round) render(); }, SPIN - (now - q.wheelAt) + 30);
      body = `<div class="card qwheelcard"><div class="pname">${t("qzRoundN", { n: round + 1, m: st.rounds.length })}</div>${wheel(st.rounds[round], q.wheelAt)}
        <div class="qwheelcat${shown ? " on" : ""}" style="--c:${COLORS[st.rounds[round]]}">${ICONS[st.rounds[round]]} ${t("qzCat_" + st.rounds[round])}</div>
        <button class="btn" data-act="qzGo"${shown ? "" : " disabled"}>${t("qzGo")}</button></div>`;
    } else {
      const item = st.qs[i], bank = ZQuestions[item.i], txt = qText(bank);
      q.started[i] = q.started[i] || now;
      const total = QTIME + (q.extra[i] || 0), el = now - q.started[i], left = total - el, hidden = q.hidden[i] || [];
      if(left <= 0){ setTimeout(() => quizActions.qzAnswer(4), 0); }
      else q.timer = setTimeout(() => { if(S.qz === q && quizState().st.answers[me].length === i) quizActions.qzAnswer(4); }, left);
      body = `<div class="card quizq"><span class="lbl" style="--c:${COLORS[bank.cat]}">${ICONS[bank.cat]} ${t("qzCat_" + bank.cat)} · ${i + 1}/${n}</span>
        <div class="qtimer" role="timer" aria-label="${t("qzTime")}"><i style="animation-duration:${total}ms;animation-delay:${-el}ms"></i></div>
        <div class="pname" dir="auto">${esc(txt[0])}</div>
        <div class="opts">${item.order.map((o, pos) => hidden.includes(pos) ? `<div class="chip opt qopt gone" aria-hidden="true"></div>` : `<button class="chip opt qopt" data-act="qzAnswer" data-arg="${pos}" dir="auto" style="animation-delay:${pos * 60 - el}ms">${esc(txt[o + 1])}</button>`).join("")}</div>
        <div class="row qjokers"><button class="btn ghost small" data-act="qzJoker" data-arg="fifty"${q.jokers.fifty ? " disabled" : ""}>50:50</button><button class="btn ghost small" data-act="qzJoker" data-arg="time"${q.jokers.time ? " disabled" : ""}>+10 s</button></div></div>`;
    }
  } else if(!status.over){
    body = `<div class="card"><div class="pname">${t("qzWaiting", { name })}</div><div class="small">${t("qzTheyAt", { name, n: theirs.length, m: n })}</div></div>`;
  } else {
    const won = status.winner === me;
    if(!q.endShown){ q.endShown = true; recordEnd(st, me, status); sound("end"); if(won && !reduced()) setTimeout(confetti, 100); }
    body = `<div class="card qend"><div class="pname" style="font-size:24px">${!status.winner ? t("drawT") : won ? t("cgYouWin") : q.mode === "cpu" ? t("cgCpuWins") : t("cgTheyWin", { name })}</div>
      <div class="qfinal"><b>${ZQuiz.score(st, me)}</b><span>:</span><b>${ZQuiz.score(st, op)}</b></div>${statsLine()}
      <div class="small">${t("qzTalk")}</div>
      ${q.mode === "cpu" ? `<button class="btn" data-act="qzCpu">${t("chRematch")}</button>` : `<button class="btn" data-act="qzInvite">${t("chRematch")}</button>`}</div>`;
  }
  const back = q.mode === "online" ? "chat" : "games";
  return `<div class="screen qzscreen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${back}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("qzName")}</div><div class="small">${q.mode === "cpu" ? t("againstCpu") + " · " + t("chLevel_" + q.level) : name}</div></div>
      <button class="iconbtn" data-act="qzSound" aria-label="${t("chSound")}">${store.get("sound", true) ? "🔊︎" : "🔇︎"}</button></div>
    ${q.mode === "online" ? onlineInfo("qz", q) : ""}
    ${body}
    ${board(st, me, name)}
    ${q.mode === "cpu" ? `<div class="row" style="flex-wrap:wrap"><div class="seg">${LEVELS.map(l => `<button class="chip" data-act="qzLevel" data-arg="${l}" aria-pressed="${q.level === l}">${t("chLevel_" + l)}</button>`).join("")}</div>
      <button class="btn ghost small" data-act="qzCpu">${t("newGame")}</button></div>`
    : `<div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-act="qzInvite">${t("newGame")}</button><button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button></div>`}
  </div>`;
}
function recordEnd(st, me, status){
  const s = store.get("stats", { played: 0, won: 0, right: 0, total: 0, cats: {} });
  s.played++; if(status.winner === me) s.won++;
  st.qs.forEach((q, i) => { const c = ZQuestions[q.i].cat, ok = ZQuiz.correct(q, st.answers[me][i]); s.total++; if(ok) s.right++; const x = s.cats[c] || [0, 0]; x[1]++; if(ok) x[0]++; s.cats[c] = x; });
  store.set("stats", s);
}
function statsLine(){
  const s = store.get("stats", null); if(!s || !s.total) return "";
  const best = Object.entries(s.cats).filter(([, x]) => x[1] >= 3).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1])[0];
  return `<div class="zwstats"><div><b>${s.played}</b><span>${t("zwPlayed")}</span></div><div><b>${s.won}</b><span>${t("qzWins")}</span></div><div><b>${Math.round(s.right / s.total * 100)}</b><span>${t("qzRightPct")}</span></div><div><b>${best ? ICONS[best[0]] : "–"}</b><span>${best ? t("qzCat_" + best[0]) : t("qzBest")}</span></div></div>`;
}

/* ---------------- Actions ---------------- */
const quizActions = {
  qzCpu(){ const level = S.qz && S.qz.mode === "cpu" ? S.qz.level : store.get("level", "medium"); S.qz = fresh("cpu", { level, st: ZQuiz.newDuel(ZQuestions, Math.floor(Math.random() * 1e9)) }); S.screen = "quiz"; render(); },
  qzLevel(v){ if(!LEVELS.includes(v) || !S.qz) return; store.set("level", v); S.qz.level = v; render(); },
  qzGo(){ const q = S.qz, qs = quizState(); if(!q || !qs) return; const i = qs.st.answers[qs.me].length; q.wheelSeen.push(Math.floor(i / (qs.st.per || qs.st.qs.length))); q.wheelAt = null; render(); },
  qzAnswer(pos){
    const q = S.qz, qs = quizState(); if(!q || !qs || q.reveal !== null) return; pos = Number(pos);
    const i = qs.st.answers[qs.me].length; if(i >= qs.st.qs.length || !(pos >= 0 && pos <= 4)) return;
    clearTimeout(q.timer);
    if(q.mode === "cpu"){
      q.st = ZQuiz.answer(q.st, "w", pos);
      q.st = ZQuiz.answer(q.st, "b", ZQuiz.cpuChoice(q.st.qs[i], q.level));
    } else sendBody(CARD + "qa:" + q.gid + ":" + i + "-" + pos);
    q.reveal = i; q.revealAt = Date.now();
    const ok = ZQuiz.correct(qs.st.qs[i], pos);
    setTimeout(() => sound(ok ? "right" : "wrong"), reduced() ? 0 : 450);
    try{ if(!ok && navigator.vibrate) navigator.vibrate(60); }catch(e){}
    render();
  },
  qzNext(){ if(S.qz){ S.qz.reveal = null; render(); } },
  qzJoker(k){
    const q = S.qz, qs = quizState(); if(!q || !qs || q.reveal !== null) return;
    const i = qs.st.answers[qs.me].length; if(i >= qs.st.qs.length) return;
    if(k === "fifty" && !q.jokers.fifty){ q.jokers.fifty = true; q.hidden[i] = ZQuiz.fifty(qs.st.qs[i]); }
    if(k === "time" && !q.jokers.time){ q.jokers.time = true; q.extra[i] = (q.extra[i] || 0) + 10000; }
    render();
  },
  qzSound(){ store.set("sound", !store.get("sound", true)); render(); },
  qzInvite(){ const gid = newGid(), m = peerOf(S.chatWith); S.cgSheet = false; sendBody(CARD + "qz:" + gid + ":2"); S.qz = fresh("online", { gid, peerId: S.chatWith, peerName: m && m.first_name }); S.screen = "quiz"; render(); },
  qzOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); S.qz = fresh("online", { gid, peerId: S.chatWith, peerName: m && m.first_name }); S.screen = "quiz"; render(); }
};

export { quizActions, quizScreen };
