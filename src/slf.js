// Stadt-Land-Fluss, modelled on the popular Stadt-Land-Fluss apps: the letter rolls like a slot machine, each round
// runs against a 90-second bar, the first one done says "Stopp!" and the other gets 10 more seconds, a tick or a
// warning appears next to each answer while you type (right first letter?), points come in colours (20 only you,
// 10 different, 5 the same, 0 missing or rejected) and you can say "doesn't count" to an answer. Two sets of
// categories (classic and everyday). Online with a match (3 rounds) or alone against the clock for practice.
// Scoring rules: ZSlf in engines/party-engine.js.
// Online chat cards: sl:<gid>:<lang>[-<set>] invite, slsub:<gid>:<round>-<base64 json> answers, slstop:<gid>:<round>,
//   slrej:<gid>:<round>-<category>.
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, hasContact, parseMsg, t, toast } from "./util.js";

const GID = /^[A-Za-z0-9]{4,12}$/, ROUNDS = 3, SETS = ["classic", "everyday"];
const ROLL = 1600, ROUND_MS = 90000, STOP_MS = 10000;
const store = { get(k, d){ try{ const v = localStorage.getItem("zugpal.sl." + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("zugpal.sl." + k, JSON.stringify(v)); }catch(e){} } };
const newGid = () => Math.random().toString(36).slice(2, 10);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const enc = list => btoa(unescape(encodeURIComponent(JSON.stringify(list))));
function dec(s){ try{ const a = JSON.parse(decodeURIComponent(escape(atob(s)))); return Array.isArray(a) ? a.slice(0, 6).map(x => String(x || "").slice(0, 30)) : null; }catch(e){ return null; } }
const catsOf = (lang, set) => t((set === "everyday" ? "slCats2_" : "slCats_") + lang).split("|");
const gameLang = () => ["de", "en", "ar"].includes(S.lang) ? S.lang : "de";
const clearDraft = () => { for(let k = 0; k < 6; k++) S.draft["sl" + k] = ""; };
const draft = () => Array.from({ length: 6 }, (_, k) => String(S.draft["sl" + k] || "").trim().slice(0, 30));

/* ---------------- State ---------------- */
function onlineSlf(gid){
  let inv = null; const rounds = [];
  const R = r => rounds[r] || (rounds[r] = { sub: {}, stop: null, rej: { w: [], b: [] } });
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type === "sl" && p.val === gid && !inv){ const [lang, set] = String(p.extra || "").split("-"); if(["de", "en", "ar"].includes(lang)) inv = { starter: x.mine, lang, set: SETS.includes(set) ? set : "classic" }; }
    if(!inv || p.val !== gid) continue;
    const who = x.mine === inv.starter ? "w" : "b";
    const [rs, data] = String(p.extra || "").split(/-(.*)/s); const r = Number(rs);
    if(!(r >= 0 && r < ROUNDS)) continue;
    if(p.type === "slsub" && !R(r).sub[who]){ const a = dec(data); if(a) R(r).sub[who] = a; }
    if(p.type === "slstop" && !R(r).stop) R(r).stop = who;
    if(p.type === "slrej"){ const c = Number(data); if(c >= 0 && c < ZSlf.CATS && !R(r).rej[who].includes(c)) R(r).rej[who].push(c); }
  }
  if(!inv) return null;
  const seed = ZSeed.hash(gid), me = inv.starter ? "w" : "b", op = me === "w" ? "b" : "w";
  let round = 0; while(round < ROUNDS && rounds[round] && rounds[round].sub.w && rounds[round].sub.b) round++;
  const pts = (p, i) => { const r = rounds[i]; return r && r.sub.w && r.sub.b ? ZSlf.points(inv.lang, ZSlf.letter(inv.lang, seed, i), r.sub[p], r.sub[p === "w" ? "b" : "w"], r.rej[p === "w" ? "b" : "w"]) : null; };
  const total = p => rounds.reduce((s, r, i) => s + (pts(p, i) || []).reduce((a, b) => a + b, 0), 0);
  return { lang: inv.lang, set: inv.set, seed, me, op, rounds, round, over: round >= ROUNDS, pts, score: { me: total(me), op: total(op) } };
}

/* ---------------- Pieces of UI ---------------- */
// the letter rolls through the alphabet and stops on the round's letter
function letterRoll(lang, L, at){
  const el = Date.now() - at, letters = Array.from(ZSlf.LETTERS[lang] || ZSlf.LETTERS.de);
  if(el >= ROLL || reduced()) return `<span class="slletter landed">${esc(L)}</span>`;
  const strip = Array.from({ length: 14 }, (_, i) => letters[(letters.indexOf(L) + i * 7 + 3) % letters.length]).concat([L]);
  return `<span class="slletter slroll"><span class="slstrip" style="animation-delay:${-el}ms">${strip.map(c => `<b>${esc(c)}</b>`).join("")}</span></span>`;
}
const markOf = (lang, L, v) => !String(v || "").trim() ? "" : ZSlf.valid(lang, L, v) && !hasContact(v) ? "ok" : "bad";
function fields(lang, set, L, locked){
  return catsOf(lang, set).map((c, k) => { const v = S.draft["sl" + k] || "";
    return `<div class="field slfield"><label for="sl${k}">${esc(c)}</label><div class="slin"><input type="text" id="sl${k}" data-bind="sl${k}" data-letter="${esc(L)}" data-lang="${lang}" maxlength="30" autocomplete="off" dir="auto" value="${esc(v)}"${locked ? " disabled" : ""}><span class="slmark ${markOf(lang, L, v)}" id="slm${k}" aria-hidden="true"></span></div></div>`; }).join("");
}
const bar = (ms, el, cls) => `<div class="qtimer ${cls || ""}"><i style="animation-duration:${ms}ms;animation-delay:${-el}ms"></i></div>`;
const chip = p => `<b class="slp p${p}">${p}</b>`;

/* ---------------- Screen ---------------- */
function slfScreen(){
  const g = S.sl; if(!g) return null;
  if(g.mode === "solo") return soloScreen(g);
  const s = onlineSlf(g.gid); if(!s) return null;
  const name = esc((peerOf(g.peerId) || { first_name: g.peerName || "" }).first_name);
  const cats = catsOf(s.lang, s.set), now = Date.now();
  clearTimeout(g.timer); g.timer = null;
  const results = s.rounds.map((r, i) => {
    const mineP = s.pts(s.me, i), theirP = s.pts(s.op, i); if(!mineP) return "";
    const L = ZSlf.letter(s.lang, s.seed, i), cell = v => hasContact(v) ? "–" : esc(v || "–");
    return `<div class="card"><div class="pname">${t("slRound", { n: i + 1 })} · ${esc(L)} <span class="small">· ${mineP.reduce((a, b) => a + b, 0)} : ${theirP.reduce((a, b) => a + b, 0)}</span></div><div style="overflow-x:auto"><table class="sltable" dir="auto"><tr><th></th><th>${t("you")}</th><th>${name}</th></tr>
      ${cats.map((c, k) => `<tr><td class="small">${esc(c)}</td><td>${cell(r.sub[s.me][k])} ${chip(mineP[k])}</td><td>${cell(r.sub[s.op][k])} ${chip(theirP[k])}
        ${r.sub[s.op][k] && !r.rej[s.me].includes(k) && ZSlf.valid(s.lang, L, r.sub[s.op][k]) ? `<button class="link quiet" data-act="slReject" data-arg="${i}-${k}">${t("slReject")}</button>` : r.rej[s.me].includes(k) ? `<span class="small">${t("slRejected")}</span>` : ""}</td></tr>`).join("")}</table></div></div>`;
  }).reverse().join("");
  let body = "";
  if(!s.over){
    const r = s.rounds[s.round] || { sub: {}, stop: null }, L = ZSlf.letter(s.lang, s.seed, s.round);
    if(r.sub[s.me]) body = `<div class="card"><div class="pname">${t("slWaiting", { name })}</div><div class="small">${t("slTheyTyping", { name })}</div></div>`;
    else {
      g.rollAt = g.rollAt || {}; g.rollAt[s.round] = g.rollAt[s.round] || now;
      const el = now - g.rollAt[s.round], rolling = el < ROLL && !reduced();
      if(rolling) setTimeout(() => { if(S.sl === g) render(); }, ROLL - el + 20);
      let timer = "", banner = "";
      if(!rolling){
        const run = el - ROLL, left = ROUND_MS - run;
        if(r.stop && r.stop !== s.me){
          g.stopAt = g.stopAt || {}; g.stopAt[s.round] = g.stopAt[s.round] || now;
          const sl = STOP_MS - (now - g.stopAt[s.round]);
          banner = `<div class="banner slstopbanner">${t("slStoppedN", { name })}${bar(STOP_MS, now - g.stopAt[s.round], "hot")}</div>`;
          g.timer = setTimeout(() => { if(S.sl === g) slActions.slSubmit(true); }, Math.max(0, sl));
        } else {
          timer = bar(ROUND_MS, run);
          g.timer = setTimeout(() => { if(S.sl === g) slActions.slSubmit(true); }, Math.max(0, left));
        }
      }
      body = `<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><span class="pname">${t("slRound", { n: s.round + 1 })} / ${ROUNDS}</span>${letterRoll(s.lang, L, g.rollAt[s.round])}</div>
        ${timer}${banner}
        ${fields(s.lang, s.set, L, rolling)}
        <div class="row" style="flex-wrap:wrap"><button class="btn" data-act="slSubmit"${rolling ? " disabled" : ""}>${t("slDone")}</button><button class="btn ghost small" data-act="slStop"${rolling ? " disabled" : ""}>${t("slStop")}</button></div>
        <div class="small">${t("slHelp")}</div></div>`;
    }
  } else {
    const won = s.score.me > s.score.op;
    if(!g.endShown){ g.endShown = true; if(won && !reduced()) setTimeout(confetti, 100); }
    body = `<div class="card qend"><div class="pname" style="font-size:24px">${won ? t("cgYouWin") : s.score.me < s.score.op ? t("cgTheyWin", { name }) : t("drawT")}</div>
      <div class="qfinal"><b>${s.score.me}</b><span>:</span><b>${s.score.op}</b></div><div class="small">${t("slTalk")}</div></div>`;
  }
  return `<div class="screen slscreen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="chat" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("slName")}</div><div class="small">${name} · ${t("slSet_" + s.set)}</div></div></div>
    <span class="pill${s.over ? "" : " off"}" style="align-self:flex-start">${t("you")} ${s.score.me} : ${s.score.op} ${name}</span>
    ${onlineInfo("sl", g)}
    ${body}${results}
    ${setChips()}
    <div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-act="slInvite">${t("newGame")}</button><button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button></div>
  </div>`;
}
const setChips = () => `<div class="seg" role="group"><span class="small" style="align-self:center">${t("slSetT")}</span>${SETS.map(x => `<button class="chip" data-act="slSet" data-arg="${x}" aria-pressed="${store.get("set", "classic") === x}">${t("slSet_" + x)}</button>`).join("")}</div>`;
function soloScreen(g){
  const now = Date.now(), r = g.round < ROUNDS ? g.rounds[g.round] : null, cats = catsOf(g.lang, g.set);
  clearTimeout(g.timer); g.timer = null;
  const total = g.rounds.reduce((a, x) => a + (x.points ? x.points.reduce((p, q) => p + q, 0) : 0), 0);
  let body;
  if(r){
    r.at = r.at || now;
    const el = now - r.at, rolling = el < ROLL && !reduced();
    if(rolling) setTimeout(() => { if(S.sl === g) render(); }, ROLL - el + 20);
    else g.timer = setTimeout(() => { if(S.sl === g) slActions.slSubmit(true); }, Math.max(0, ROUND_MS - (el - ROLL)));
    body = `<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><span class="pname">${t("slRound", { n: g.round + 1 })} / ${ROUNDS}</span>${letterRoll(g.lang, r.letter, r.at)}</div>
      ${rolling ? "" : bar(ROUND_MS, el - ROLL)}
      ${fields(g.lang, g.set, r.letter, rolling)}
      <button class="btn" data-act="slSubmit"${rolling ? " disabled" : ""}>${t("slDone")}</button>
      <div class="small">${t("slSoloHelp")}</div></div>`;
  } else {
    const best = store.get("best." + g.set + "." + g.lang, 0), isBest = total >= best && total > 0;
    if(!g.endShown){ g.endShown = true; if(total > best) store.set("best." + g.set + "." + g.lang, total); if(isBest && !reduced()) setTimeout(confetti, 100); }
    body = `<div class="card qend"><div class="pname" style="font-size:24px">${isBest ? t("slNewBest") : t("slSoloDone")}</div>
      <div class="qfinal"><b>${total}</b></div><div class="small">${t("slBest", { n: Math.max(best, total) })}</div>
      <button class="btn" data-act="slSolo">${t("chRematch")}</button></div>`;
  }
  const results = g.rounds.map((x, i) => !x.points ? "" : `<div class="card"><div class="pname">${t("slRound", { n: i + 1 })} · ${esc(x.letter)} <span class="small">· ${x.points.reduce((a, b) => a + b, 0)}</span></div>
    <table class="sltable" dir="auto">${cats.map((c, k) => `<tr><td class="small">${esc(c)}</td><td>${esc(x.answers[k] || "–")} ${chip(x.points[k])}</td></tr>`).join("")}</table></div>`).reverse().join("");
  return `<div class="screen slscreen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="games" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("slName")}</div><div class="small">${t("slSolo")} · ${t("slSet_" + g.set)}</div></div></div>
    <span class="pill off" style="align-self:flex-start">${t("slPoints", { n: total })}</span>
    ${body}${results}
    ${setChips()}
    <div class="seg" role="group"><span class="small" style="align-self:center">${t("wordLang")}</span>${["de", "en", "ar"].map(x => `<button class="chip" data-act="slLang" data-arg="${x}" aria-pressed="${g.lang === x}">${{ de: "Deutsch", en: "English", ar: "العربية" }[x]}</button>`).join("")}</div>
  </div>`;
}
function confetti(){
  const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
  const W = cv.width = innerWidth, H = cv.height = innerHeight, g = cv.getContext("2d"), cols = ["#0E7A68", "#FFD166", "#1F5FBF", "#C0262D", "#9FE0C3"];
  const parts = Array.from({ length: 130 }, () => ({ x: W / 2, y: H * .4, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 6 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)] }));
  let f = 0; const tick = () => { g.clearRect(0, 0, W, H); parts.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; g.fillStyle = p.c; g.fillRect(p.x, p.y, p.s, p.s * .6); }); if(++f < 140) requestAnimationFrame(tick); else cv.remove(); };
  requestAnimationFrame(tick);
}
// tick or warning next to an answer while typing
if(typeof document !== "undefined") document.addEventListener("input", e => {
  const el = e.target; if(!el || !el.dataset || !el.dataset.letter || !/^sl\d$/.test(el.id)) return;
  const m = document.getElementById("slm" + el.id.slice(2)); if(m) m.className = "slmark " + markOf(el.dataset.lang, el.dataset.letter, el.value);
});

/* ---------------- Actions ---------------- */
function soloGame(lang, set){
  const letters = Array.from(ZSlf.LETTERS[lang] || ZSlf.LETTERS.de), picked = [];
  while(picked.length < ROUNDS){ const c = letters[Math.floor(Math.random() * letters.length)]; if(!picked.includes(c)) picked.push(c); }
  return { mode: "solo", lang, set, round: 0, rounds: picked.map(letter => ({ letter, answers: null, points: null, at: 0 })) };
}
const slActions = {
  slSolo(){ clearDraft(); S.sl = soloGame(S.sl && S.sl.mode === "solo" ? S.sl.lang : gameLang(), store.get("set", "classic")); S.screen = "slf"; render(); },
  slLang(l){ if(!["de", "en", "ar"].includes(l)) return; clearDraft(); S.sl = soloGame(l, store.get("set", "classic")); render(); },
  slSet(x){ if(!SETS.includes(x)) return; store.set("set", x); if(S.sl && S.sl.mode === "solo" && S.sl.round === 0 && !S.sl.rounds[0].answers){ clearDraft(); S.sl = soloGame(S.sl.lang, x); } render(); },
  slInvite(){
    const gid = newGid(), m = peerOf(S.chatWith);
    S.cgSheet = false; clearDraft();
    sendBody(CARD + "sl:" + gid + ":" + gameLang() + "-" + store.get("set", "classic")); S.sl = { mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name }; S.screen = "slf"; render();
  },
  slOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); clearDraft(); S.sl = { mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name }; S.screen = "slf"; render(); },
  slSubmit(auto){
    const g = S.sl; if(!g) return;
    const answers = draft();
    if(answers.some(a => hasContact(a))){ if(auto === true) answers.forEach((a, k) => { if(hasContact(a)) answers[k] = ""; }); else return toast(t("noContact")); }
    if(g.mode === "solo"){
      const r = g.rounds[g.round]; if(!r) return;
      r.answers = answers; r.points = answers.map(a => ZSlf.valid(g.lang, r.letter, a) ? 10 : 0);
      g.round++; clearDraft(); render(); return;
    }
    const s = onlineSlf(g.gid); if(!s || s.over) return;
    const r = s.rounds[s.round]; if(r && r.sub[s.me]) return;
    sendBody(CARD + "slsub:" + g.gid + ":" + s.round + "-" + enc(answers));
    clearDraft(); render();
  },
  slStop(){
    const g = S.sl, s = g && g.mode === "online" && onlineSlf(g.gid); if(!s || s.over) return;
    if(draft().filter(Boolean).length < 3) return toast(t("slFillMore"));
    sendBody(CARD + "slstop:" + g.gid + ":" + s.round); slActions.slSubmit();
  },
  slReject(arg){ const g = S.sl; if(!g || g.mode !== "online") return; const [r, c] = String(arg).split("-").map(Number); sendBody(CARD + "slrej:" + g.gid + ":" + r + "-" + c); render(); }
};

export { slActions, slfScreen };
