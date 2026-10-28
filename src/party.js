// Party games: "Quizfahrt" (our quiz duel, own questions incl. "Leben in Deutschland") and Stadt-Land-Fluss for two.
// Quiz vs computer or online; Stadt-Land-Fluss online with a match. Same chat-card system as chess:
//   qz:<gid>                       quiz invite (sender = "w"); both phones pick the same 6 questions from <gid>
//   qa:<gid>:<question>:<choice>   an answer (choice = position on screen, same order on both phones)
//   sl:<gid>:<lang>                Stadt-Land-Fluss invite; letters and categories in <lang>
//   slsub:<gid>:<round>:<data>     a player's answers for a round (base64 of a JSON list of 6 words)
//   slstop:<gid>:<round>           "Stopp!": the other phone hands in what it has
//   slrej:<gid>:<round>:<cat>      "doesn't count": reject one of the other player's answers
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, hasContact, parseMsg, t, toast } from "./util.js";

const GID = /^[A-Za-z0-9]{4,12}$/;
const newGid = () => Math.random().toString(36).slice(2, 10);
const ROUNDS = 3;
const enc = list => btoa(unescape(encodeURIComponent(JSON.stringify(list))));
function dec(s){ try{ const a = JSON.parse(decodeURIComponent(escape(atob(s)))); return Array.isArray(a) ? a.slice(0, 6).map(x => String(x || "").slice(0, 30)) : null; }catch(e){ return null; } }
const qText = q => q[S.lang] || q.de;

/* ---------------- Quizfahrt ---------------- */
function onlineQuiz(gid){
  let inv = null, st = null;
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type === "qz" && p.val === gid && !inv){ inv = { starter: x.mine }; st = ZQuiz.newGame(ZQuestions, ZSeed.hash(gid)); }
    if(p.type === "qa" && p.val === gid && inv){
      const [i, choice] = String(p.extra || "").split("-").map(Number), who = x.mine === inv.starter ? "w" : "b";
      if(i === st.answers[who].length) st = ZQuiz.answer(st, who, choice);
    }
  }
  return inv ? { st, me: inv.starter ? "w" : "b" } : null;
}
function quizState(){ const q = S.qz; if(!q) return null; return q.mode === "cpu" ? { st: q.st, me: "w" } : onlineQuiz(q.gid); }
function quizScreen(){
  const q = S.qz, qs = quizState(); if(!q || !qs) return null;
  const { st, me } = qs, op = me === "w" ? "b" : "w", mine = st.answers[me], theirs = st.answers[op];
  const name = q.mode === "cpu" ? t("computer") : esc((peerOf(q.peerId) || { first_name: q.peerName || "" }).first_name);
  const status = ZQuiz.status(st), score = `${t("you")} ${ZQuiz.score(st, me)} : ${ZQuiz.score(st, op)} ${name}`;
  let body;
  const showing = q.reveal !== null && q.reveal !== undefined ? q.reveal : null;
  if(showing !== null){
    const item = st.qs[showing], bank = ZQuestions[item.i], txt = qText(bank), myC = mine[showing], thC = theirs[showing];
    body = `<div class="card quizq"><span class="lbl">${t("qzCat_" + bank.cat)} · ${showing + 1}/${st.qs.length}</span><div class="pname" dir="auto">${esc(txt[0])}</div>
      <div class="opts">${item.order.map((o, pos) => `<div class="chip opt${o === 0 ? " right" : pos === myC ? " wrong" : ""}" dir="auto">${esc(txt[o + 1])}${pos === myC ? ` · ${t("you")}` : ""}${pos === thC ? ` · ${name}` : ""}</div>`).join("")}</div>
      <div class="small">${ZQuiz.correct(item, myC) ? t("qzRight") : t("qzWrong")}${thC === undefined ? " · " + t("qzTheyPending", { name }) : ""}</div>
      <button class="btn" data-act="qzNext">${showing + 1 < st.qs.length ? t("qzNextQ") : t("qzResult")}</button></div>`;
  } else if(mine.length < st.qs.length){
    const item = st.qs[mine.length], bank = ZQuestions[item.i], txt = qText(bank);
    body = `<div class="card quizq"><span class="lbl">${t("qzCat_" + bank.cat)} · ${mine.length + 1}/${st.qs.length}</span><div class="pname" dir="auto">${esc(txt[0])}</div>
      <div class="opts">${item.order.map((o, pos) => `<button class="chip opt" data-act="qzAnswer" data-arg="${pos}" dir="auto">${esc(txt[o + 1])}</button>`).join("")}</div></div>`;
  } else if(!status.over){
    body = `<div class="card"><div class="pname">${t("qzWaiting", { name })}</div><div class="small">${t("qzTheyAt", { name, n: theirs.length, m: st.qs.length })}</div></div>`;
  } else {
    body = `<div class="card"><div class="pname" style="font-size:22px">${!status.winner ? t("drawT") : status.winner === me ? t("cgYouWin") : q.mode === "cpu" ? t("cgCpuWins") : t("cgTheyWin", { name })}</div>
      <div class="small">${t("qzTalk")}</div></div>`;
  }
  const back = q.mode === "online" ? "chat" : "games";
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${back}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("qzName")}</div><div class="small">${q.mode === "cpu" ? t("againstCpu") : name}</div></div></div>
    <span class="pill${status.over ? "" : " off"}" style="align-self:flex-start">${score}</span>
    ${q.mode === "online" ? onlineInfo("qz", q) : ""}
    ${body}
    ${q.mode === "cpu" ? `<div class="row" style="flex-wrap:wrap"><div class="seg"><button class="chip" data-act="qzLevel" data-arg="easy" aria-pressed="${q.level === "easy"}">${t("easy")}</button><button class="chip" data-act="qzLevel" data-arg="normal" aria-pressed="${q.level !== "easy"}">${t("normal")}</button></div>
      <button class="btn ghost small" data-act="qzCpu">${t("newGame")}</button></div>`
    : `<div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-act="qzInvite">${t("newGame")}</button><button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button></div>`}
  </div>`;
}

/* ---------------- Stadt-Land-Fluss ---------------- */
function onlineSlf(gid){
  let inv = null; const rounds = [];
  const R = r => rounds[r] || (rounds[r] = { sub: {}, stop: false, rej: { w: [], b: [] } });
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type === "sl" && p.val === gid && !inv && ["de", "en", "ar"].includes(p.extra)) inv = { starter: x.mine, lang: p.extra };
    if(!inv || p.val !== gid) continue;
    const who = x.mine === inv.starter ? "w" : "b";
    const [rs, data] = String(p.extra || "").split(/-(.*)/s); const r = Number(rs);
    if(!(r >= 0 && r < ROUNDS)) continue;
    if(p.type === "slsub" && !R(r).sub[who]){ const a = dec(data); if(a) R(r).sub[who] = a; }
    if(p.type === "slstop") R(r).stop = true;
    if(p.type === "slrej"){ const c = Number(data); if(c >= 0 && c < ZSlf.CATS && !R(r).rej[who].includes(c)) R(r).rej[who].push(c); }
  }
  if(!inv) return null;
  const seed = ZSeed.hash(gid), me = inv.starter ? "w" : "b", op = me === "w" ? "b" : "w";
  let round = 0; while(round < ROUNDS && rounds[round] && rounds[round].sub.w && rounds[round].sub.b) round++;
  const total = p => rounds.reduce((s, r, i) => s + (r && r.sub.w && r.sub.b ? ZSlf.points(inv.lang, ZSlf.letter(inv.lang, seed, i), r.sub[p], r.sub[p === "w" ? "b" : "w"], r.rej[p === "w" ? "b" : "w"]).reduce((a, b) => a + b, 0) : 0), 0);
  return { lang: inv.lang, seed, me, op, rounds, round, over: round >= ROUNDS, score: { me: total(me), op: total(op) } };
}
function slfScreen(){
  const g = S.sl, s = g && onlineSlf(g.gid); if(!g || !s) return null;
  const name = esc((peerOf(g.peerId) || { first_name: g.peerName || "" }).first_name);
  const cats = t("slCats_" + s.lang).split("|");
  // results of the finished rounds (newest first), with "doesn't count" for the other player's answers
  const results = s.rounds.map((r, i) => {
    if(!r || !r.sub.w || !r.sub.b) return "";
    const L = ZSlf.letter(s.lang, s.seed, i), mineP = ZSlf.points(s.lang, L, r.sub[s.me], r.sub[s.op], r.rej[s.op]), theirP = ZSlf.points(s.lang, L, r.sub[s.op], r.sub[s.me], r.rej[s.me]);
    const cell = v => hasContact(v) ? "–" : esc(v || "–");
    return `<div class="card"><div class="pname">${t("slRound", { n: i + 1 })} · ${esc(L)}</div><div style="overflow-x:auto"><table class="sltable" dir="auto"><tr><th></th><th>${t("you")}</th><th>${name}</th></tr>
      ${cats.map((c, k) => `<tr><td class="small">${esc(c)}</td><td>${cell(r.sub[s.me][k])} <b>${mineP[k]}</b></td><td>${cell(r.sub[s.op][k])} <b>${theirP[k]}</b>
        ${r.sub[s.op][k] && !r.rej[s.me].includes(k) && ZSlf.valid(s.lang, L, r.sub[s.op][k]) ? `<button class="link quiet" data-act="slReject" data-arg="${i}-${k}">${t("slReject")}</button>` : r.rej[s.me].includes(k) ? `<span class="small">${t("slRejected")}</span>` : ""}</td></tr>`).join("")}</table></div></div>`;
  }).reverse().join("");
  let body = "";
  if(!s.over){
    const r = s.rounds[s.round] || { sub: {}, stop: false }, L = ZSlf.letter(s.lang, s.seed, s.round);
    if(r.sub[s.me]) body = `<div class="card"><div class="pname">${t("slWaiting", { name })}</div></div>`;
    else {
      if(r.stop && g.autoSent !== s.round){ g.autoSent = s.round; setTimeout(() => slActions.slSubmit(), 0); }
      body = `<div class="card"><div class="row" style="justify-content:space-between"><span class="pname">${t("slRound", { n: s.round + 1 })} / ${ROUNDS}</span><span class="slletter">${esc(L)}</span></div>
        ${r.stop ? `<div class="banner">${t("slStopped", { name })}</div>` : ""}
        ${cats.map((c, k) => `<div class="field"><label for="sl${k}">${esc(c)}</label><input type="text" id="sl${k}" data-bind="sl${k}" maxlength="30" autocomplete="off" dir="auto" value="${esc(S.draft["sl" + k] || "")}"></div>`).join("")}
        <div class="row" style="flex-wrap:wrap"><button class="btn" data-act="slSubmit">${t("slDone")}</button><button class="btn ghost small" data-act="slStop">${t("slStop")}</button></div>
        <div class="small">${t("slHelp")}</div></div>`;
    }
  } else body = `<div class="card"><div class="pname" style="font-size:22px">${s.score.me > s.score.op ? t("cgYouWin") : s.score.me < s.score.op ? t("cgTheyWin", { name }) : t("drawT")}</div></div>`;
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="chat" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("slName")}</div><div class="small">${name}</div></div></div>
    <span class="pill${s.over ? "" : " off"}" style="align-self:flex-start">${t("you")} ${s.score.me} : ${s.score.op} ${name}</span>
    ${onlineInfo("sl", g)}
    ${body}${results}
    <div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-act="slInvite">${t("newGame")}</button><button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button></div>
  </div>`;
}

/* ---------------- Actions ---------------- */
const slActions = {
  // quiz
  qzCpu(){ const level = S.qz && S.qz.mode === "cpu" ? S.qz.level : "normal"; S.qz = { mode: "cpu", st: ZQuiz.newGame(ZQuestions, Math.floor(Math.random() * 1e9)), level, reveal: null }; S.screen = "quiz"; render(); },
  qzLevel(v){ if(S.qz) S.qz.level = v === "easy" ? "easy" : "normal"; render(); },
  qzAnswer(pos){
    const q = S.qz, qs = quizState(); if(!q || !qs) return; pos = Number(pos);
    const i = qs.st.answers[qs.me].length; if(i >= qs.st.qs.length) return;
    if(q.mode === "cpu"){
      q.st = ZQuiz.answer(q.st, "w", pos);
      q.st = ZQuiz.answer(q.st, "b", ZQuiz.cpuChoice(q.st.qs[i], q.level));
    } else sendBody(CARD + "qa:" + q.gid + ":" + i + "-" + pos);
    q.reveal = i; render();
  },
  qzNext(){ if(S.qz){ S.qz.reveal = null; render(); } },
  qzInvite(){ const gid = newGid(), m = peerOf(S.chatWith); S.cgSheet = false; sendBody(CARD + "qz:" + gid); S.qz = { mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name, reveal: null }; S.screen = "quiz"; render(); },
  qzOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); S.qz = { mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name, reveal: null }; S.screen = "quiz"; render(); },
  // Stadt-Land-Fluss
  slInvite(){
    const gid = newGid(), m = peerOf(S.chatWith), lang = ["de", "en", "ar"].includes(S.lang) ? S.lang : "de";
    S.cgSheet = false; for(let k = 0; k < 6; k++) S.draft["sl" + k] = "";
    sendBody(CARD + "sl:" + gid + ":" + lang); S.sl = { gid, peerId: S.chatWith, peerName: m && m.first_name }; S.screen = "slf"; render();
  },
  slOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); for(let k = 0; k < 6; k++) S.draft["sl" + k] = ""; S.sl = { gid, peerId: S.chatWith, peerName: m && m.first_name }; S.screen = "slf"; render(); },
  slSubmit(){
    const g = S.sl, s = g && onlineSlf(g.gid); if(!s || s.over) return;
    const r = s.rounds[s.round]; if(r && r.sub[s.me]) return;
    const answers = Array.from({ length: 6 }, (_, k) => String(S.draft["sl" + k] || "").trim().slice(0, 30));
    if(answers.some(a => hasContact(a))) return toast(t("noContact"));
    sendBody(CARD + "slsub:" + g.gid + ":" + s.round + "-" + enc(answers));
    for(let k = 0; k < 6; k++) S.draft["sl" + k] = "";
    render();
  },
  slStop(){
    const g = S.sl, s = g && onlineSlf(g.gid); if(!s || s.over) return;
    const filled = Array.from({ length: 6 }, (_, k) => String(S.draft["sl" + k] || "").trim()).filter(Boolean).length;
    if(filled < 3) return toast(t("slFillMore"));
    sendBody(CARD + "slstop:" + g.gid + ":" + s.round); slActions.slSubmit();
  },
  slReject(arg){ const g = S.sl; if(!g) return; const [r, c] = String(arg).split("-").map(Number); sendBody(CARD + "slrej:" + g.gid + ":" + r + "-" + c); render(); }
};
function partyCard(p, x, name){
  const gid = String(p.val || ""); if(!GID.test(gid)) return "";
  if(p.type === "qz") return `<div class="gamecard"><span class="lbl">${t("qzName")}</span><span>${x.mine ? t("cgStartMe", { game: t("qzName") }) : t("cgStartThem", { name, game: t("qzName") })}</span><button class="btn small" style="align-self:center" data-act="qzOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
  if(p.type === "sl") return `<div class="gamecard"><span class="lbl">${t("slName")}</span><span>${x.mine ? t("cgStartMe", { game: t("slName") }) : t("cgStartThem", { name, game: t("slName") })}</span><button class="btn small" style="align-self:center" data-act="slOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
  return "";
}

export { partyCard, quizScreen, slActions as partyActions, slfScreen };
