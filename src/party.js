// Party games: Stadt-Land-Fluss for two (online with a match), plus the chat cards for it and for Quizfahrt (quiz.js).
// Same chat-card system as chess:
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

export { partyCard, slActions as partyActions, slfScreen };
