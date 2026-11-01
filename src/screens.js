// Screens: each returns HTML for #app; render() draws the current one.
import { inviteLink } from "./actions.js";
import { CONFIG } from "./config.js";
import { AGES, BADGES, DICE, ICE, LANGS, MOODS, TOPICS, WORDS } from "./data.js";
import { COUNTED, GLYPH, boardHtml, chessState, damaBoard, damaState, onlineInfo } from "./games.js";
import { S, backend } from "./state.js";
import { ICON, MONEY_RE, esc, hasContact, loc, minsLeft, moodName, parseMsg, photo, t, todaysWord, todaysWordIndex } from "./util.js";
import { wordCard, wordSheet } from "./words.js";
import { lettersScreen, ltOverlay } from "./letters.js";
import { zugwortScreen, zwOverlay } from "./zugwort.js";
import { cgCard, cgSheet } from "./classic.js";
import { bookCard, bookScreen, creditsScreen, libraryScreen } from "./library.js";
import { partyCard } from "./party.js";
import { slfScreen } from "./slf.js";
import { quizScreen } from "./quiz.js";
import { sponsorSlot, supporterScreen } from "./sponsor.js";
import { mountSolitaire, solDialogHtml, solitaireScreen } from "./solitaire.js";
import { chessOverlay, chessScreen, mountChess } from "./chessui.js";
import { damaOverlay, damaScreen, mountDama } from "./damaui.js";
import { mountTable, tableOverlay, tableScreen } from "./tablekit.js";
import { googleLink, talkInfo } from "./talktrain.js";
import { navSync } from "./nav.js";
import { paintQrs } from "./qr.js";
import { pending } from "./outbox.js";
import { groupScreen, groupSheet, trainNewScreen, trainsSection } from "./trains.js";
import { chatScreen, gameChat, plusSheet } from "./chatui.js";
import { installBar, installLink, installSheet } from "./install.js";
import { practiceBanner, practiceCard, practiceEmpty } from "./practice.js";

/* ---------------- Screens ---------------- */
function header(){
  return `<div class="top"><div class="logo">Zugpal</div>
    <select id="lang" aria-label="Language / Sprache / اللغة">
      <option value="de"${S.lang==="de"?" selected":""}>Deutsch</option>
      <option value="en"${S.lang==="en"?" selected":""}>English</option>
      <option value="ar"${S.lang==="ar"?" selected":""}>العربية</option>
    </select></div>
    ${backend && backend.mode==="demo" ? `<div class="banner info">${t("demoBanner")}</div>` : ""}
    ${practiceBanner()}
    ${S.updateReady ? `<div class="banner info action"><span>${t("updateReady")}</span><button class="btn small" data-act="reloadApp">${t("updateBtn")}</button></div>` : ""}
    <div id="netBanner" data-soft>${S.netPortal && S.ride ? `<div class="banner info reconnect" role="status"><span class="dot"></span>${t("netPortal")}</div>`
      : navigator.onLine === false || (S.netDown && S.ride) ? `<div class="banner info reconnect" role="status"><span class="dot"></span>${S.ride ? t("reconnecting") : t("offlineBanner")}${pending() ? ` <b>${t("waitingN",{n:pending()})}</b>` : ""}</div>` : ""}</div>`;
}
const trustStrip = () => `<ul class="trust" aria-label="Zugpal">${[1,2,3,4].map(i=>`<li>${ICON.shield}${t("trust"+i)}</li>`).join("")}</ul>`;
function legalFooter(){
  const h = S.lang==="de" ? "" : "#" + S.lang;
  return `<footer class="legal"><a href="impressum.html${h}" target="_blank" rel="noopener">${t("impressum")}</a><a href="datenschutz.html${h}" target="_blank" rel="noopener">${t("privacy")}</a><a href="regeln.html${h}" target="_blank" rel="noopener">${t("rulesLink")}</a></footer>`;
}
// Optional email account (magic link): shown on the profile screen
function accountCard(){
  if(!backend || backend.mode !== "live") return "";
  const a = S.account;
  if(a && !a.anon && a.email) return `<div class="card"><div class="pname">${ICON.shield} ${t("accSaved",{e:esc(a.email)})}</div><div class="small">${t("accSavedBody")}</div>
    <button class="link" data-act="accSignOut" style="align-self:flex-start">${t("accSignOut")}</button></div>`;
  if(S.accSent) return `<div class="card"><div class="pname">${t("accSentTitle")}</div><div class="small">${t("accSent")}</div></div>`;
  const login = !!S.accLogin;
  return `<div class="card"><div class="pname">${login ? t("accLoginTitle") : t("accTitle")}</div><div class="small">${login ? t("accLoginBody") : t("accBody")}</div>
    <div class="field"><label for="accEmail">${t("accEmail")}</label><input type="text" inputmode="email" autocomplete="email" id="accEmail" data-bind="accEmail" value="${esc(S.draft.accEmail||"")}"></div>
    <button class="btn ghost" data-act="accLink">${t("accSend")}</button>
    <button class="link" data-act="accMode" data-arg="${login ? "save" : "login"}" style="align-self:flex-start">${login ? t("accToSave") : t("accToLogin")}</button></div>`;
}
// Talk Train host: live numbers (never names) and one announcement per ride
function hostCard(){
  if(!S.isHost || !S.ride || !S.ride.key.startsWith("TALK-")) return "";
  const s = S.hostStats;
  return `<div class="card host"><div class="pname">${ICON.shield} ${t("hostTitle")}</div>
    <div class="row hostqr"><div class="qr" data-qr="${esc(linkFor("talk"))}"></div><div class="grow"><div class="small">${t("hostQrBody")}</div>
      <a class="btn ghost small" href="qr.html" target="_blank" rel="noopener">${t("printPoster")}</a></div></div>
    <div class="stats"><div><b>${s ? s.checked_in : "–"}</b><span class="small">${t("hostChecked")}</span></div><div><b>${s ? s.open_now : "–"}</b><span class="small">${t("hostOpenN")}</span></div><div><b>${s ? s.matches : "–"}</b><span class="small">${t("hostMatches")}</span></div></div>
    ${s && s.announced ? `<div class="small">${t("hostDone")}</div>` : `<div class="field"><label for="hostMsg">${t("hostMsgLabel")}</label><input type="text" id="hostMsg" data-bind="hostMsg" maxlength="280" dir="auto" value="${esc(S.draft.hostMsg||"")}"><div class="small">${t("hostMsgHint")}</div></div>
      <button class="btn ghost small" data-act="hostSend">${t("hostSend")}</button>`}</div>`;
}
function hostSheet(){
  return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel"><h2>${t("hostTitle")}</h2><p class="small">${t("hostIntro")}</p>
    ${S.isHost ? `<div class="banner info">${t("hostActive")}</div>` : `<div class="field"><label for="hostCode">${t("hostCode")}</label><input type="text" id="hostCode" data-bind="hostCode" autocomplete="off" value="${esc(S.draft.hostCode||"")}"></div>
    <button class="btn" data-act="hostUnlock">${t("hostUnlock")}</button>`}
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="hostClose">${t("close")}</button></div></div></div>`;
}
function safetyBar(id){
  return `<div class="safety"><div class="row" style="flex-wrap:wrap;gap:8px">
      <button class="btn small leave" data-act="leaveChat" data-arg="${esc(id)}">${t("leaveChat")}</button>
      <button class="btn small ghost" data-act="reportOpen" data-arg="${esc(id)}">${ICON.shield}${t("reportShort")}</button>
      <button class="link danger" data-act="block" data-arg="${esc(id)}">${t("block")}</button></div>
    <div class="small">${t("safetyNote")}</div></div>`;
}
const objectLine = () => `<div class="small">${t("objectHint")} ${CONFIG.contactEmail ? `<a href="mailto:${esc(CONFIG.contactEmail)}">${esc(CONFIG.contactEmail)}</a>` : `<a href="impressum.html${S.lang==="de"?"":"#"+S.lang}" target="_blank" rel="noopener">${t("impressum")}</a>`}</div>`;
const REPORT_REASONS = ["under18","harassment","hate","scam","contact","fake","other"];
function reportSheet(){
  const r = S.reportSheet, name = esc(r.name || "");
  const reasons = REPORT_REASONS.map(k=>`<button class="chip opt" data-act="reportReason" data-arg="${k}" aria-pressed="${r.reason===k}">${t("r_"+k)}</button>`).join("");
  return `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="rsT"><div class="panel">
    <h2 id="rsT">${t("reportTitle",{name})}</h2>
    <div class="flabel">${t("reportWhy")}</div><div class="opts">${reasons}</div>
    <div class="field"><label for="rDetails">${t("reportDetails")}</label><input type="text" id="rDetails" data-bind="reportDetails" maxlength="500" value="${esc(S.draft.reportDetails||"")}"></div>
    <label class="check" for="rBlock"><input type="checkbox" id="rBlock" data-bind="reportBlock"${S.draft.reportBlock!==false?" checked":""}> ${t("alsoBlock")}</label>
    <div class="small">${t("safetyNote")} ${t("reportNext",{name})}</div>
    <div class="banner">${t("emergency")}</div>
    <div class="row" style="justify-content:flex-end;gap:12px"><button class="link" data-act="reportCancel">${t("cancel")}</button><button class="btn" data-act="reportSend">${t("sendReport")}</button></div>
  </div></div>`;
}
function noticeText(n){
  if(n.kind==="suspended"){
    const until = n.until ? new Date(n.until) : null;
    if(!until || until.getFullYear() - new Date().getFullYear() > 50) return t("n_ban",{r:esc(n.reason||"")});
    return t("n_suspended",{d:esc(until.toLocaleString(S.lang, {dateStyle:"medium", timeStyle:"short"})), r:esc(n.reason||"")});
  }
  if(n.kind==="removed") return t("n_removed",{r:esc(n.reason||"")});
  return t("n_"+n.kind,{n:Number(n.report_id)||""});
}
// A QR code to show on your phone, so the person next to you can scan it
function qrSheet(){
  const url = linkFor(S.qrSheet);
  return `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="qrT"><div class="panel qrpanel">
    <h2 id="qrT">${t("qrTitle")}</h2><p class="small">${t("qrBody")}</p>
    <div class="qr big" data-qr="${esc(url)}"></div>
    <div class="small qrurl">${esc(url.replace(/^https?:\/\//, ""))}</div>
    <div class="row" style="justify-content:flex-end;gap:12px"><button class="link" data-act="shareLink" data-arg="${esc(S.qrSheet)}">${t("shareLink")}</button><button class="btn" data-act="qrClose">${t("close")}</button></div></div></div>`;
}
// links to the Talk Train, a private test ride, or a train someone created
function linkFor(what){
  const base = location.href.split("#")[0].split("?")[0];
  if(what === "test" && S.ride) return base + "#ride-" + S.ride.key.slice(5);
  if(/^train-[A-Z0-9]{4,8}$/.test(what || "")) return base + "#" + what;
  return base + "#talk";
}
// The German word of the ride: tap it to see what it means in every language, and hear it
function wordMeaningSheet(){
  const i = Math.abs(Number(S.wordFlip) || 0) % WORDS.length, w = WORDS[i];
  const rows = [["de", "Deutsch", w[1]], ["en", "English", w[2]], ["ar", "العربية", w[3]]];
  rows.sort((a, b) => (b[0] === S.lang) - (a[0] === S.lang));
  return `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="wmT"><div class="panel wordsheet">
    <div class="lbl">${t("wordTitle")}</div><div class="bigword" id="wmT" lang="de">${esc(w[0])}</div>
    ${"speechSynthesis" in window ? `<button class="btn ghost small" data-act="wordSpeak" data-arg="${i}">${ICON.volume}${t("wordHear")}</button>` : ""}
    <div class="meanings">${rows.map(([l, n, m]) => `<div class="mrow${l === S.lang ? " mine" : ""}"><span class="mlang">${n}</span><span lang="${l}" dir="${l === "ar" ? "rtl" : "ltr"}">${esc(m)}</span></div>`).join("")}</div>
    <div class="small">${t("wordTask")}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="wordClose">${t("close")}</button></div></div></div>`;
}
function overlays(){
  if(S.installSheet) return installSheet();
  if(S.qrSheet) return qrSheet();
  if(S.groupSheet) return groupSheet();
  if(S.wordFlip !== null && S.wordFlip !== undefined) return wordMeaningSheet();
  if(S.plusSheet) return plusSheet();
  if(S.reportSheet) return reportSheet();
  if(S.wordSheet) return wordSheet();
  if(S.cgSheet) return cgSheet();
  if(S.hostSheet) return hostSheet();
  if(S.screen==="solitaire" && (S.solSheet || S.solDialog)) return solDialogHtml();
  if(S.screen==="chess"){ const o = chessOverlay(); if(o) return o; }
  if(S.screen==="dama"){ const o = damaOverlay(); if(o) return o; }
  if(S.screen==="table"){ const o = tableOverlay(); if(o) return o; }
  if(S.screen==="zugwort"){ const o = zwOverlay(); if(o) return o; }
  if(S.screen==="letters"){ const o = ltOverlay(); if(o) return o; }
  if(S.reportDone) return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel">
    <h2>${ICON.shield} ${t("reportThanksTitle")}</h2><p>${t("reportThanks",{n:Number(S.reportDone.n)||""})}</p>
    <div class="banner">${t("emergency")}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="reportDoneClose">${t("gotIt")}</button></div></div></div>`;
  const unseen = S.notices.filter(n=>!n.seen);
  if(unseen.length) return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel">
    <h2>${ICON.shield} ${t("noticesTitle")}</h2>
    ${unseen.map(n=>`<div class="notice">${noticeText(n)}</div>`).join("")}
    ${unseen.some(n=>n.kind==="removed"||n.kind==="suspended"||n.kind==="decided_none") ? objectLine() : ""}
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="noticesOk">${t("gotIt")}</button></div></div></div>`;
  return "";
}
async function loadNotices(force){
  if(!backend || !backend.notices || (!force && Date.now() - S.noticesAt < 30000)) return;
  S.noticesAt = Date.now();
  try{ const before = S.notices.filter(n=>!n.seen).length; S.notices = await backend.notices() || []; if(S.notices.filter(n=>!n.seen).length !== before) render(); }catch(e){ console.error(e); }
}
function endingBanner(){
  const n = minsLeft();
  if(!S.ride || n > 5 || !S.matches.length) return "";
  return `<div class="banner action"><span>${t("endingSoon",{n:Math.max(n,1)})}</span><button class="btn small" data-act="sayBye">${t("sayBye")}</button></div>`;
}
// Sprachpraxis: "helper" = happy to speak slow German, "learner-B1" = practising German at that level
function practiceTag(p){
  if(p === "helper") return `<span class="tag lang">${t("prHelperTag")}</span>`;
  const m = /^learner-(A1|A2|B1|B2|C1)$/.exec(p || ""); return m ? `<span class="tag lang">${t("prLearnerTag",{l:m[1]})}</span>` : "";
}
function practicePair(p){
  const mine = S.profile && S.profile.practice; if(!mine || !p) return false;
  return (mine === "helper" && p.startsWith("learner-")) || (mine.startsWith("learner-") && p === "helper");
}
function personCard(r, asking){
  const tags = [];
  if(r.buddy) tags.push(`<span class="tag gold">${t("buddyTag")}</span>`);
  if(r.same_coach && !r.chat_only) tags.push(`<span class="tag">${t("sameCoach")}</span>`);
  if(r.chat_only) tags.push(`<span class="tag">${t("chatOnlyTag")}</span>`);
  const pr = practiceTag(r.practice); if(pr) tags.push(pr);
  if(practicePair(r.practice)) tags.push(`<span class="tag gold">${t("goodPractice")}</span>`);
  const b = r.badges || {};
  Object.keys(b).filter(k=>BADGES[k] && b[k]>0).sort((x,y)=>b[y]-b[x]).slice(0,2).forEach(k=>tags.push(`<span class="tag plain">${esc(loc(BADGES,k))} ×${Number(b[k])||0}</span>`));
  const langs = (r.languages||[]).filter(l=>LANGS.includes(l)).join(", ");
  const tops = (r.topics||[]).map(x=>loc(TOPICS,x)).join(", ");
  return `<div class="person${r.buddy?" buddy":""}">${photo(r.id, r.first_name, r.photo_small, 56, true)}
    <div class="grow"><div class="pname">${esc(r.first_name)}${r.age_range && AGES.includes(r.age_range) ? `<span class="muted" style="font-weight:400">, ${esc(r.age_range)}</span>` : ""}</div>
      <div class="small">${esc((r.moods||[]).map(moodName).join(" · "))}</div>
      ${langs ? `<div class="small">${esc(t("speaks",{l:langs}))}</div>` : ""}
      ${tops ? `<div class="small">${esc(t("talksAbout",{t:tops}))}</div>` : ""}
      ${r.ask_me && !hasContact(r.ask_me) ? `<div class="small" style="color:var(--ink)" dir="auto">“${esc(t("askMeShown",{x:String(r.ask_me).slice(0,60)}))}”</div>` : ""}
      ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
      <button class="link quiet" data-act="reportOpen" data-arg="${esc(r.id)}">${ICON.shield}${t("reportShort")}</button></div>
    ${asking ? `<div class="askbtns"><button class="btn wave" data-act="wave" data-arg="${esc(r.id)}" aria-pressed="false">${t("waveBack")}</button><button class="link" data-act="waveNo" data-arg="${esc(r.id)}">${t("waveNo")}</button></div>`
      : `<button class="btn wave${r.waved?" done":""}" data-act="wave" data-arg="${esc(r.id)}" aria-pressed="${!!r.waved}">${r.waved?t("waved"):t("wave")}</button>`}</div>`;
}
// Sprachpraxis chips, used on the profile (edits S.edit) and on the mood screen at check-in (edits the profile directly)
function practiceField(cur, act, levelAct){
  const learner = /^learner-/.test(cur||"");
  return `<div class="field"><span class="flabel">${t("prTitle")}</span><div class="small">${t("prHint")}</div>
    <div class="seg"><button class="chip" data-act="${act}" data-arg="helper" aria-pressed="${cur==="helper"}">${t("prHelper")}</button>
      <button class="chip" data-act="${levelAct}" data-arg="${learner ? cur.slice(8) : "A2"}" aria-pressed="${learner}">${t("prLearner")}</button>
      <button class="chip" data-act="${act}" data-arg="none" aria-pressed="${!cur}">${t("prNone")}</button></div>
    ${learner ? `<div class="seg">${["A1","A2","B1","B2","C1"].map(l=>`<button class="chip" data-act="${levelAct}" data-arg="${l}" aria-pressed="${cur==="learner-"+l}">${l}</button>`).join("")}</div>` : ""}</div>`;
}
// Offer a phone notice for new messages while Zugpal is in the background (only where the browser supports it, asked once)
function notifyCard(){
  if(S.notifyOff || !backend || backend.mode !== "live" || !("Notification" in window) || Notification.permission !== "default") return "";
  return `<div class="card notifycard"><div class="row" style="align-items:flex-start">${ICON.bell}<div class="grow"><div class="pname">${t("notifyTitle")}</div><div class="small">${t("notifyBody")}</div></div></div>
    <div class="row"><button class="btn small" data-act="notifyOn">${t("notifyBtn")}</button><button class="link" data-act="notifyLater">${t("nudgeLater")}</button></div></div>`;
}
// The weekly Talk Train: on its day you check in; on other days you see the next date and can put it in your calendar
// Android has no app that opens a downloaded calendar file by itself, so there Google Calendar is the main button;
// iPhones open the calendar file directly ("Add to calendar").
const isAndroid = () => /Android/i.test(navigator.userAgent);
function calButtons(){
  const g = esc(googleLink());
  return isAndroid()
    ? `<a class="btn mint small" href="${g}" target="_blank" rel="noopener">${ICON.calendar}${t("calAdd")}</a><button class="link onhero-link" data-act="calAdd">${t("calOther")}</button>`
    : `<button class="btn mint small" data-act="calAdd">${ICON.calendar}${t("calAdd")}</button><a class="btn onhero small" href="${g}" target="_blank" rel="noopener">${t("calGoogle")}</a>`;
}
function talkHero(){
  const i = talkInfo();
  return `<div class="hero talkhero"><div class="small">${t("talkTrain")}</div>
    <div class="talkwhen${i.state === "now" ? " live" : ""}">${i.state === "now" ? `<span class="dot"></span>` : ""}${esc(i.when)}</div>
    <div style="font-weight:700">${esc(i.route)}</div>
    <div class="small">${i.onTrainDay ? t("talkTrainBody") : t("talkNotToday")}</div>
    ${i.onTrainDay ? `<button class="btn mint" data-act="checkin" data-arg="talk">${t("joinTalk")}</button>`
      : `<div class="row calrow">${calButtons()}</div>
        <button class="link onhero-link" data-act="checkin" data-arg="talk">${t("joinAnyway")}</button>`}
    <div class="row sharerow"><button class="link onhero-link" data-act="showQr" data-arg="talk">${ICON.qr}${t("showQr")}</button><button class="link onhero-link" data-act="shareLink" data-arg="talk">${t("inviteFriend")}</button></div>${sponsorSlot()}</div>`;
}
// Waving in three steps, until you have waved once; then one line
function waveHelp(){
  if(!S.open) return `<div class="empty"><div class="muted">${t("invisibleNote")}</div></div>`;
  if(S.wavedOnce) return `<div class="banner info">${t("waveNote")}</div>`;
  return `<div class="card howwave"><div class="pname">${t("howTitle")}</div>
    <ol class="steps"><li>${t("how1")}</li><li>${t("how2")}</li><li>${t("how3")}</li></ol></div>`;
}
// After a quick sign-up: a gentle reminder to add a photo and languages (until done or dismissed)
function profileNudge(){
  const p = S.profile; if(!p || S.nudgeOff || (p.photo && (p.langs || []).length)) return "";
  return `<div class="card nudge"><div class="pname">${t("nudgeTitle")}</div><div class="small">${t("nudgeBody")}</div>
    <div class="row"><button class="btn small" data-act="editProfile">${t("nudgeBtn")}</button><button class="link" data-act="nudgeOff">${t("nudgeLater")}</button></div></div>`;
}
const screens = {
  loading(){ return `<div class="screen"><p class="muted">${t("loading")}</p></div>`; },

  welcome(){
    const e = S.edit;
    const first = !S.profile;
    const gBtn = v => `<button class="chip" data-act="gender" data-arg="${v}" aria-pressed="${e.gender===v}">${t(v)}</button>`;
    const ageOpts = `<option value="">${t("ageHidden")}</option>` + AGES.map(a=>`<option value="${a}"${e.age===a?" selected":""}>${a}</option>`).join("");
    const langChips = LANGS.map(l=>`<button class="chip" data-act="lang2" data-arg="${esc(l)}" aria-pressed="${e.langs.includes(l)}">${esc(l)}</button>`).join("");
    const topicChips = Object.keys(TOPICS).map(id=>`<button class="chip" data-act="topic" data-arg="${id}" aria-pressed="${e.topics.includes(id)}">${esc(loc(TOPICS,id))}</button>`).join("");
    const rulesHref = "regeln.html" + (S.lang==="de" ? "" : "#" + S.lang);
    // photo, age, languages, "ask me about", German practice: optional, and folded away on the first sign-up
    const more = `<div class="field"><span class="flabel">${t("photo")}</span>
        <div class="photoedit">${photo("me", e.name, e.photo, 88, false)}
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">
            <label class="btn ghost small filebtn">${e.photo ? t("changePhoto") : t("addPhoto")}<input type="file" id="photoInput" accept="image/*"></label>
            ${e.photo ? `<button class="link" data-act="removePhoto">${t("removePhoto")}</button>` : ""}
          </div></div>
        <div class="small">${t("photoHint")}</div></div>
      <div class="field"><label for="age">${t("age")}</label><select id="age" data-bind="edit.age">${ageOpts}</select></div>
      <div class="field"><span class="flabel">${t("langs")}</span><div class="seg">${langChips}</div></div>
      <div class="field"><label for="askme">${t("askMe")}</label><input type="text" id="askme" data-bind="edit.askMe" maxlength="60" placeholder="${t("askMePh")}" value="${esc(e.askMe||"")}"></div>
      ${practiceField(e.practice, "practice", "practiceLevel")}
      <label class="check" for="acceptPhotos"><input type="checkbox" id="acceptPhotos" data-bind="edit.acceptPhotos"${e.acceptPhotos!==false?" checked":""}> ${t("acceptPhotos")}</label>`;
    return `<div class="screen">
      ${first && S.autoTalk ? `<div class="banner info talkbanner"><b>${t("talkOnBoard")}</b><span>${esc(talkInfo().route)}</span></div>` : ""}
      ${first ? installBar() : ""}
      ${first ? `<div class="muted">${t("tagline")}</div><h1>${t("welcomeTitle")}</h1><p class="muted" style="margin:0">${t("welcomeBody")}</p>${trustStrip()}` : `<h1>${t("profileTitle")}</h1>`}
      <div class="field"><label for="name">${t("firstName")}</label>
        <input type="text" id="name" data-bind="edit.name" maxlength="30" autocomplete="given-name" value="${esc(e.name)}">
        <div class="small">${t("firstNameHint")}</div></div>
      <div class="field"><span class="flabel">${t("iAm")}</span><div class="seg">${gBtn("woman")}${gBtn("man")}${gBtn("other")}</div><div class="small">${t("genderHint")}</div></div>
      <div class="field"><span class="flabel">${t("topics")}</span><div class="small">${t("topicsHint")}</div><div class="seg">${topicChips}</div></div>
      ${first ? `<details class="more card"${S.moreOpen ? " open" : ""}><summary>${t("moreAboutYou")}<span class="small">${t("moreAboutYouHint")}</span></summary><div class="morebody">${more}</div></details>` : more}
      <div class="card rulescard"><div class="pname">${t("rulesTitle")}</div>
        <ul class="rules"><li>${t("rule1")}</li><li>${t("rule2")}</li><li>${t("rule3")}</li><li>${t("rule4")}</li></ul>
        <label class="check" for="agree"><input type="checkbox" id="agree" data-bind="edit.agree"${e.agree?" checked":""}> ${t("agree")}</label>
        <a class="small" href="${rulesHref}" target="_blank" rel="noopener">${t("rulesFull")}</a></div>
      <div class="end"><button class="btn" data-act="saveProfile">${first ? t("start") : t("save")}</button></div>
      ${accountCard()}
    </div>`;
  },

  checkin(){
    const d = S.draft, dur = d.duration || "45";
    const opts = ["15","30","45","60","90","120"].map(v=>`<option value="${v}"${v===dur?" selected":""}>${v} ${t("min")}</option>`).join("");
    return `<div class="screen">
      <div class="row">${photo("me", S.profile.name, S.profile.photo, 40, false)}<div class="grow muted">${esc(S.profile.name)}</div><button class="link" data-act="editProfile">${t("editProfile")}</button></div>
      ${installBar()}
      <h1>${t("checkinTitle")}</h1>
      ${S.ride ? `<div class="banner info action"><span>${t("stillOn",{r:esc(S.ride.label)})}</span><button class="btn small" data-act="go" data-arg="nearby">${t("toPeople")}</button></div>` : ""}
      ${talkHero()}
      ${trainsSection()}
      <div class="card mytrain"><div class="pname">${ICON.train}${t("orOther")}</div>
        <div class="row">
          <div class="field" style="flex:1"><label for="line">${t("line")}</label><input type="text" id="line" data-bind="line" placeholder="RE 1" autocomplete="off" value="${esc(d.line||"")}"></div>
          <div class="field" style="flex:1.4"><label for="num">${t("number")}</label><input type="text" id="num" data-bind="num" inputmode="numeric" placeholder="10115" autocomplete="off" value="${esc(d.num||"")}"></div>
        </div>
        <div class="small" style="margin-top:-6px">${t("numberHint")}</div>
        <div class="field"><label for="duration">${t("duration")}</label><select id="duration" data-bind="duration">${opts}</select></div>
        <button class="btn" data-act="checkin" data-arg="train">${t("checkin")}</button></div>
      ${practiceCard()}
      <div class="row twobtn"><button class="btn ghost" data-act="openGames">${t("games")}</button>
        <button class="btn ghost" data-act="openLibrary">${ICON.book}${t("libTitle")}</button></div>
      <div class="card"><div class="pname">${t("testTitle")}</div><div class="small">${t("testBody")}</div>
        <button class="btn ghost" data-act="startTest">${t("testBtn")}</button></div>
      <div class="card" style="flex-direction:row;align-items:flex-start;color:var(--muted)">${ICON.shield}<div style="font-size:14px">${t("nobodySees")}</div></div>
      ${trustStrip()}
      ${installLink()}
      <button class="link quiet" data-act="openSupport">${t("supLink")}</button>
      ${backend && backend.mode === "live" ? `<button class="link quiet" data-act="hostOpen">${S.isHost ? t("hostActive") : t("hostLink")}</button>` : ""}
    </div>`;
  },

  mood(){
    const chips = Object.keys(MOODS).map(id=>`<button class="chip" data-act="mood" data-arg="${id}" aria-pressed="${S.moods.has(id)}">${esc(moodName(id))}</button>`).join("");
    const co = S.draft.chatOnly ?? S.chatOnly;
    return `<div class="screen">
      <div class="row"><button class="iconbtn flip" data-act="go" data-arg="checkin" aria-label="${t("back")}">${ICON.back}</button><div class="muted">${esc(S.ride.label)}</div></div>
      <h1>${t("moodTitle")}</h1>
      <p class="muted" style="margin:-8px 0 0">${t("moodHint")}</p>
      <div class="seg">${chips}</div>
      <div class="field"><span class="flabel">${t("talkMode")}</span><div class="seg">
        <button class="chip" data-act="mode" data-arg="both" aria-pressed="${!co}">${t("modeBoth")}</button>
        <button class="chip" data-act="mode" data-arg="chat" aria-pressed="${co}">${t("modeChat")}</button></div></div>
      ${co ? "" : `<div class="field"><label for="coach">${t("coach")}</label><input type="text" id="coach" data-bind="coach" maxlength="4" inputmode="numeric" value="${esc(S.draft.coach ?? S.coach)}"><div class="small">${t("coachHint")}</div></div>`}
      <div class="field"><span class="flabel">${t("moodNow")}</span><div class="seg">${[1,2,3,4,5].map(n=>`<button class="chip" data-act="moodBefore" data-arg="${n}" aria-pressed="${S.moodBefore===n}">${t("m"+n)}</button>`).join("")}</div><div class="small">${t("moodPrivate")}</div></div>
      ${practiceField(S.profile.practice, "mpractice", "mpracticeLevel")}
      ${S.profile.gender==="woman" ? `<label class="check card" for="wo" style="flex-direction:row"><input type="checkbox" id="wo" data-bind="womenOnly"${(S.draft.womenOnly ?? S.womenOnly)?" checked":""}> ${t("womenOnly")}</label>` : ""}
      <div class="end"><button class="btn" data-act="goOpen">${t("openBtn")}</button><div class="small" style="text-align:center">${t("offAnytime")}</div></div>
    </div>`;
  },

  nearby(){
    const n = S.riders.length;
    const title = !S.open ? t("invisible") : n===0 ? t("count0") : n===1 ? t("count1") : t("countN",{n});
    const matchIds = new Set(S.matches.map(m=>m.id));
    const matchList = S.matches.length && S.open ? `<div class="pname">${t("matchesTitle")}</div>` + S.matches.map(m=>`
      <div class="person">${photo(m.id, m.first_name, m.photo, 56, false)}<div class="grow"><div class="pname">${esc(m.first_name)}</div><div class="small">${esc((m.moods||[]).map(moodName).join(" · "))}</div>
      ${m.chat_only || S.unread[m.id] ? `<div class="tags">${S.unread[m.id] ? `<span class="tag new">${t("unreadTag",{n:S.unread[m.id]})}</span>` : ""}${m.chat_only ? `<span class="tag">${t("chatOnlyTag")}</span>` : ""}</div>` : ""}</div>
      <button class="btn wave" data-act="chat" data-arg="${esc(m.id)}">${t("openChat")}</button></div>`).join("") : "";
    // people who waved at you and wait for your answer: "Wave back" or "Not now" (they never learn about a "not now")
    const asking = S.open ? S.riders.filter(r=>r.waved_me && !r.waved && !matchIds.has(r.id) && !S.declined.has(r.id)) : [];
    const askIds = new Set(asking.map(r=>r.id));
    const wavedMe = asking.length ? `<div class="card wavedme"><div class="pname">${t("wavedAtYou")}</div><div class="small">${t("wavedAtYouHint")}</div>
      ${asking.map(r=>personCard(r, true)).join("")}</div>` : "";
    const others = S.riders.filter(r=>!matchIds.has(r.id) && !askIds.has(r.id)).sort((a,b)=>((b.buddy?2:0)+(practicePair(b.practice)?1:0))-((a.buddy?2:0)+(practicePair(a.practice)?1:0)));
    const [w, de, en, ar] = todaysWord();
    return `<div class="screen">
      <div class="row" style="justify-content:space-between;flex-wrap:wrap">
        <span class="pill${S.open?"":" off"}"><span class="dot"></span>${S.open?t("youAreOpen"):t("invisible")}</span>
        <button class="btn ghost small" data-act="toggleOpen">${S.open?t("goInvisible"):t("beVisible")}</button></div>
      <div class="ridebar">${ICON.train}<span class="grow"><b>${esc(S.ride.label)}</b> · ${t("minLeft",{n:minsLeft()})}</span><button class="link" data-act="endRide">${t("changeTrain")}</button></div>
      <div class="tabs" role="tablist" id="nearTabs" data-soft><button class="tab" role="tab" aria-selected="true">${t("peopleTab")}</button>
        <button class="tab" role="tab" aria-selected="false" data-act="openGroup">${t("groupTab")}${S.groupUnread ? ` <span class="tag new">${t("unreadTag",{n:S.groupUnread})}</span>` : ""}</button></div>
      ${S.ride.key.startsWith("TEST-") ? `<div class="card"><span class="flabel">${t("inviteLabel")}</span>
        <div class="small" style="user-select:all;overflow-wrap:anywhere;color:var(--ink)" id="inviteText">${esc(inviteLink())}</div>
        <div class="row" style="flex-wrap:wrap;gap:8px"><button class="btn ghost small" data-act="shareLink" data-arg="test">${t("shareLink")}</button><button class="btn ghost small" data-act="showQr" data-arg="test">${ICON.qr}${t("showQr")}</button></div></div>` : ""}
      ${endingBanner()}
      ${S.announcement ? `<div class="banner info announce"><b>${t("hostAnnTitle")}</b><span dir="auto">${esc(S.announcement)}</span></div>` : ""}
      ${hostCard()}
      <h1>${title}</h1>
      ${waveHelp()}
      ${wavedMe}
      ${matchList}
      ${profileNudge()}
      ${S.open ? (others.map(personCard).join("") || (S.matches.length ? "" : `<div class="empty"><div class="muted">${t("emptyBody")}</div>${practiceEmpty()}</div>`)) : ""}
      <button class="word" data-act="wordMeaning" data-arg="${todaysWordIndex()}"><span class="lbl" style="color:var(--muted)">${t("wordTitle")}</span><span class="w" lang="de">${esc(w)}</span>
        <span class="muted">${esc(S.lang==="de"?de:S.lang==="ar"?ar:en)}</span><span class="small wtap">${t("wordTapHint")}</span></button>
      <div class="end"><button class="btn ghost" data-act="openGames">${t("games")}</button><button class="btn ghost" data-act="openLibrary">${ICON.book}${t("libTitle")}</button><button class="btn ghost" data-act="go" data-arg="mood">${t("moodTitle")}</button><button class="link danger" data-act="endRide">${t("endRide")}</button></div>
    </div>`;
  },

  match(){
    const m = S.current; if(!m) return screens.nearby();
    const shared = (m.moods||[]).filter(x=>S.moods.has(x) && ICE[x]);
    const pool = []; shared.forEach(x=>ICE[x][S.lang].forEach(q=>pool.push([q,x]))); ICE.generic[S.lang].forEach(q=>pool.push([q,null]));
    const [q, why] = pool[S.iceIndex % pool.length];
    const meet = m.chat_only
      ? `<div class="meet">${ICON.bubble}<div style="font-weight:700">${t("chatOnlyMatch")}</div></div>`
      : `<div class="meet">${ICON.pin}<div><div class="small">${t("meetAt")}</div><div style="font-weight:700">${m.coach ? t("coachX",{c:esc(m.coach)}) : t("noCoach")}</div></div></div>`;
    // German practice: if one of you practises (or helps), suggest starting with the German word of the ride
    const theirPr = m.practice || (S.riders.find(r=>r.id===m.id) || {}).practice, [w, wde, wen, war] = todaysWord();
    const wordStart = (S.profile.practice || theirPr) ? `<div class="meet wordmeet"><div class="grow"><div class="small">${t("matchWordTitle")}</div>
        <button class="wordlink" data-act="wordMeaning" data-arg="${todaysWordIndex()}" lang="de">${esc(w)}</button><div class="small">${esc(S.lang==="de"?wde:S.lang==="ar"?war:wen)}</div></div>
        <button class="btn mint small" data-act="chatWord" data-arg="${esc(m.id)}">${t("matchWordBtn")}</button></div>` : "";
    return `<div class="screen"><div class="match">
      <div class="pair">${photo("me", S.profile.name, S.profile.photo, 84, false)}${photo(m.id, m.first_name, m.photo, 84, false)}</div>
      <h1 style="text-align:center">${t("matchTitle",{name:esc(m.first_name)})}</h1>
      <div class="small" style="text-align:center;color:var(--hero-muted)">${t("minLeft",{n:minsLeft()})}</div>
      <div class="ice"><div class="row" style="justify-content:space-between"><span class="lbl">${t("ice")}</span>
        <button class="iconbtn" data-act="nextIce" aria-label="${t("anotherIce")}" style="margin:-10px">${ICON.refresh}</button></div>
        <div class="q">“${esc(q)}”</div><div class="small" style="color:inherit">${why ? t("iceBecause",{mood:esc(moodName(why))}) : t("iceGeneric")}</div></div>
      ${wordStart}
      ${meet}
      <div class="end"><button class="btn mint" data-act="chat" data-arg="${esc(m.id)}">${t("sayHi")}</button>
        <button class="btn onhero" data-act="go" data-arg="nearby">${t("notToday")}</button>
        <button class="link onhero-link" data-act="reportOpen" data-arg="${esc(m.id)}">${ICON.shield}${t("reportShort")}</button></div>
    </div></div>`;
  },

  chat(){ return chatScreen(endingBanner, notifyCard) || screens.nearby(); },

  games(){
    // three quick favourites for a short ride, the rest as a compact list
    const icon = {
      chess: `<span class="pc b" style="font-size:34px">${GLYPH.N}︎</span>`, mau: `<span class="pc b" style="font-size:34px;color:#B3261E">♥︎</span>`, quiz: `<span class="pc b" style="font-size:34px">?</span>`,
      dama: `<span class="dm b" style="width:28px;height:28px;flex-shrink:0"></span>`, sol: `<span class="pc b" style="font-size:28px">♠︎</span>`,
      zw: `<span class="tile g" style="width:28px;height:28px;font-size:15px;flex-shrink:0">Z</span>`, four: `<span class="gicon four" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`,
      muehle: `<span class="gicon muehle" aria-hidden="true"></span>`, slf: `<span class="tile g" style="width:28px;height:28px;font-size:15px;flex-shrink:0">S</span>`,
      lt: `<span class="gicon-train" aria-hidden="true"><span class="lcoach c1"></span><span class="lcoach"></span><span class="lloco"></span></span>` };
    const big = (ic, name, body, act, arg) => `<div class="card"><div class="gamecard2"><span class="gicon-box">${icon[ic]}</span><div class="grow"><div class="pname">${name}</div><div class="small">${body}</div></div></div>
        <button class="btn" data-act="${act}"${arg ? ` data-arg="${arg}"` : ""}>${t("play")}</button></div>`;
    const row = (ic, name, act, arg) => `<div class="gamerow"><span class="gicon-box">${icon[ic]}</span><span class="grow pname">${name}</span>
        <button class="btn ghost small" data-act="${act}"${arg ? ` data-arg="${arg}"` : ""}>${t("play")}</button></div>`;
    return `<div class="screen">
      <div class="row"><button class="iconbtn flip" data-act="go" data-arg="${S.gamesBack}" aria-label="${t("back")}">${ICON.back}</button><h1 class="grow" style="font-size:26px">${t("games")}</h1></div>
      <p class="muted" style="margin:-6px 0 0">${t("gamesHint")}</p>
      <div class="pname">${t("gamesTop")}</div>
      ${big("chess", t("vsComputer"), t("vsComputerBody"), "chessCpu")}
      ${big("mau", t("mauName"), t("mauBody"), "cgCpu", "mau")}
      ${big("quiz", t("qzName"), t("qzBody"), "qzCpu")}
      <div class="small">${t("gamesWithMatch")}</div>
      <div class="pname">${t("gamesMore")}</div>
      <div class="card gamelist">
        ${row("dama", t("damaT"), "damaCpuNew")}${row("sol", t("solVs"), "solNew")}${row("zw", t("zwName"), "zwCpu")}${row("lt", t("ltName"), "ltCpu")}
        ${row("four", t("fourName"), "cgCpu", "four")}${row("muehle", t("muehleName"), "cgCpu", "muehle")}${row("slf", t("slName"), "slSolo")}
      </div>
    </div>`;
  },

  trainNew(){ return trainNewScreen(); },
  group(){ return groupScreen() || screens.nearby(); },
  zugwort(){ return zugwortScreen() || screens.games(); },
  table(){ return tableScreen() || screens.games(); },
  library(){ return libraryScreen(); },
  quiz(){ return quizScreen() || screens.games(); },
  support(){ return supporterScreen(); },
  slf(){ return slfScreen() || screens.chat(); },
  book(){ return bookScreen(); },
  credits(){ return creditsScreen(); },
  letters(){ return lettersScreen() || screens.games(); },

  chess(){ return chessScreen(); },

  dama(){ return damaScreen(); },

  solitaire(){ return solitaireScreen(); },

  feedback(){
    const items = S.fbList.map(m=>{
      const f = S.fb[m.id]; const name = esc(m.first_name);
      const badgeChips = Object.keys(BADGES).map(k=>`<button class="chip" data-act="fbBadge" data-arg="${esc(m.id)}|${k}" aria-pressed="${f.badges.has(k)}">${esc(loc(BADGES,k))}</button>`).join("");
      return `<div class="fb"><div class="row">${photo(m.id, m.first_name, m.photo, 48, false)}<div class="pname grow">${name}</div></div>
        <div class="field"><span class="flabel">${t("comfy",{name})}</span><div class="seg">
          <button class="chip" data-act="fbComfy" data-arg="${esc(m.id)}|yes" aria-pressed="${f.comfy===true}">${t("yes")}</button>
          <button class="chip" data-act="fbComfy" data-arg="${esc(m.id)}|no" aria-pressed="${f.comfy===false}">${t("no")}</button></div></div>
        <div class="field"><span class="flabel">${t("compliment")}</span><div class="seg">${badgeChips}</div></div>
        <label class="check" for="bud-${esc(m.id)}"><input type="checkbox" id="bud-${esc(m.id)}" data-fbbuddy="${esc(m.id)}"${f.buddy?" checked":""}> <span>${t("buddySave")}<br><span class="small">${t("buddyHint")}</span></span></label></div>`;
    }).join("");
    const moodQ = `<div class="fb"><div class="field"><span class="flabel">${t("moodAfter")}</span><div class="seg">${[1,2,3,4,5].map(n=>`<button class="chip" data-act="moodAfterSet" data-arg="${n}" aria-pressed="${S.moodAfter===n}">${t("m"+n)}</button>`).join("")}</div><div class="small">${t("moodPrivate")}</div></div></div>`;
    const recQ = `<div class="fb"><div class="field"><span class="flabel">${t("recommendQ")}</span><div class="seg">
      <button class="chip" data-act="recommendSet" data-arg="yes" aria-pressed="${S.recommend===true}">${t("yes")}</button>
      <button class="chip" data-act="recommendSet" data-arg="no" aria-pressed="${S.recommend===false}">${t("no")}</button></div><div class="small">${t("moodPrivate")}</div></div></div>`;
    return `<div class="screen"><h1>${t("fbTitle")}</h1>${items ? `<p class="muted" style="margin:-8px 0 0">${t("fbPrivate")}</p>` : ""}${moodQ}${recQ}${items}
      <div class="end"><button class="btn" data-act="finish">${t("finish")}</button></div></div>`;
  }
};
// Is someone typing in a text field of the app right now?
function typing(){
  const a = document.activeElement; if(!a || !a.closest || !a.closest("#app")) return false;
  return a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /^(text|search|email|tel|url|number|password)$/.test(a.type));
}
// render({ soft: true }) is used by background refreshes (polling, Realtime, toasts). While someone types it never rebuilds
// the screen (that lost letters and broke Android autocorrect); it only updates the parts marked data-soft (chat log, header).
function render(opts){
  if(opts && opts.soft && typing() && S.screen === S.rendered){
    const tpl = document.createElement("template"); tpl.innerHTML = header() + (screens[S.screen] || screens.welcome)() + overlays() + gameChat();
    const log = document.getElementById("chatLog"), atEnd = log && log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    document.querySelectorAll("#app [data-soft][id]").forEach(el => { const n = tpl.content.getElementById(el.id); if(n && n.innerHTML !== el.innerHTML) el.innerHTML = n.innerHTML; });
    if(log && atEnd) log.scrollTop = log.scrollHeight;
    return;
  }
  S.rendered = S.screen;
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang==="ar" ? "rtl" : "ltr";
  const active = document.activeElement && document.activeElement.id;
  const app = document.getElementById("app");
  app.innerHTML = header() + (screens[S.screen] || screens.welcome)()
    + (S.screen==="chat" || S.screen==="loading" ? "" : legalFooter())
    + (S.viewer ? `<div class="viewer" role="dialog" aria-modal="true"><img src="${esc(S.viewer)}" alt=""><div class="note">${t("onceNote")}</div><button class="btn mint small" data-act="closeViewer">${t("close")}</button></div>` : "")
    + overlays() + gameChat();
  if(active){ const el = document.getElementById(active); if(el && (el.tagName==="TEXTAREA" || (el.tagName==="INPUT" && el.type==="text"))){ el.focus(); try{ const l=el.value.length; el.setSelectionRange(l,l); }catch(e){} } }
  const log = document.getElementById("chatLog"); if(log) log.scrollTop = log.scrollHeight;
  if(S.screen==="solitaire") mountSolitaire();
  if(S.screen==="chess") mountChess();
  if(S.screen==="dama") mountDama();
  if(S.screen==="table") mountTable();
  paintQrs();
  navSync();
}

export { REPORT_REASONS, loadNotices, render };
