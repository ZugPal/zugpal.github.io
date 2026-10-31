// Trains people create ("my usual train", like a group) and the group chat of a ride ("Everyone").
// A created train has a code (link #train-CODE, QR poster qr.html?code=CODE); checking in on it gives the ride key
// TRAIN-CODE-YYYY-MM-DD. Every ride (Talk Train, any train, test ride, created train) has one group chat.
// The database keeps the rules (see supabase/migrations/20261031120000_trains_and_groups.sql).
import { S, backend } from "./state.js";
import { ICON, berlinDate, esc, hasContact, t, toast } from "./util.js";
import { render } from "./screens.js";
import { baseUrl, calendarFileFor, googleLinkFor, rideInfo, weekdaysText } from "./talktrain.js";
import { pendingGroup, queue, setGroupHooks } from "./outbox.js";

const THEMES = ["talk", "german", "games", "books"];
const isAndroid = () => /Android/i.test(navigator.userAgent);
const sched = r => ({ code: r.code, weekdays: r.weekdays, date: r.one_date, time: String(r.dep_time).slice(0, 5), minutes: r.minutes,
  route: [r.from_station, r.to_station].filter(Boolean).join(" → ") });
const newCode = () => { const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let c = ""; for(let i = 0; i < 6; i++) c += abc[Math.floor(Math.random() * abc.length)]; return c; };
const findTrain = code => (S.trains || []).find(x => x.code === code) || (S.invitedTrain && S.invitedTrain.code === code ? S.invitedTrain : null);
const canSee = r => !r.women_only || (S.profile && S.profile.gender === "woman");

/* ---------- loading ---------- */
async function loadTrains(force){
  if(!backend || !backend.trains || S.trainsLoading || (!force && Date.now() - (S.trainsAt || 0) < 60000)) return;
  S.trainsLoading = true;
  try{ S.trains = (await backend.trains()) || []; S.trainsAt = Date.now(); try{ localStorage.setItem("zugpal.trains", JSON.stringify(S.trains)); }catch(e){} }
  catch(e){ console.error(e); if(!S.trains){ try{ S.trains = JSON.parse(localStorage.getItem("zugpal.trains") || "[]"); }catch(_){ S.trains = []; } } S.trainsAt = Date.now(); }
  finally{ S.trainsLoading = false; }
  if(S.screen === "checkin") render({ soft: true });
}
async function openTrainLink(code){
  code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if(!code || !backend.trainGet) return;
  try{ const r = await backend.trainGet(code); if(r){ S.invitedTrain = r; S.screen = "checkin"; render(); } else toast(t("trainGone")); }
  catch(e){ console.error(e); toast(t("netError")); }
}

/* ---------- check-in screen: the list ---------- */
function trainCard(r, invited){
  const s = sched(r), i = rideInfo(s), when = i.state === "past" ? "" : i.when, g = esc(googleLinkFor(s, r.label, baseUrl() + "#train-" + r.code));
  const tags = [`<span class="tag">${t("th_" + (THEMES.includes(r.theme) ? r.theme : "talk"))}</span>`];
  if(r.featured) tags.push(`<span class="tag gold">${t("hostedTag")}</span>`);
  if(r.women_only) tags.push(`<span class="tag lang">${t("womenOnlyTag")}</span>`);
  const repeat = r.one_date ? "" : weekdaysText(r.weekdays);
  return `<div class="card traincard${invited ? " invited" : ""}" data-code="${esc(r.code)}">
    ${invited ? `<div class="small"><b>${t("trainInvited")}</b></div>` : ""}
    <div class="tags">${tags.join("")}</div>
    <div class="pname">${ICON.train}<span dir="auto">${esc(r.label)}</span></div>
    <div class="small trainwhen${i.state === "now" ? " live" : ""}">${i.state === "now" ? `<span class="dot"></span>` : ""}${esc(when)}${repeat ? " · " + esc(repeat) : ""} · ${t("minN", { n: Number(r.minutes) || 45 })}</div>
    ${(s.route && !r.label.includes(s.route)) || r.coach ? `<div class="small" dir="auto">${r.label.includes(s.route) ? "" : esc(s.route)}${r.coach ? (s.route && !r.label.includes(s.route) ? " · " : "") + t("coachX", { c: esc(r.coach) }) : ""}</div>` : ""}
    <div class="small">${Number(r.members) > 0 ? t("trainComing", { n: Number(r.members) }) : t("trainFirst")}</div>
    <div class="row trainbtns">
      ${i.onTrainDay ? `<button class="btn small" data-act="trainCheckin" data-arg="${esc(r.code)}">${t("trainCheckin")}</button>` : ""}
      <button class="btn ghost small" data-act="trainJoin" data-arg="${esc(r.code)}" aria-pressed="${!!r.mine}">${r.mine ? t("trainJoined") : t("trainJoin")}</button>
      ${isAndroid() ? `<a class="link" href="${g}" target="_blank" rel="noopener">${ICON.calendar}${t("calShort")}</a>` : `<button class="link" data-act="trainCal" data-arg="${esc(r.code)}">${ICON.calendar}${t("calShort")}</button>`}
      <button class="link" data-act="showQr" data-arg="train-${esc(r.code)}">${ICON.qr}QR</button>
      <button class="link" data-act="shareLink" data-arg="train-${esc(r.code)}">${t("shareLink")}</button>
    </div>
    ${!i.onTrainDay ? `<button class="link quiet" data-act="trainCheckin" data-arg="${esc(r.code)}">${t("joinAnyway")}</button>` : ""}
    ${r.by_me ? `<div class="row" style="justify-content:space-between;flex-wrap:wrap"><a class="link quiet" href="qr.html?code=${esc(r.code)}&label=${encodeURIComponent(r.label)}" target="_blank" rel="noopener">${t("printPoster")}</a><button class="link danger" data-act="trainCancel" data-arg="${esc(r.code)}">${t("trainCancel")}</button></div>` : ""}
  </div>`;
}
function trainsSection(){
  loadTrains();
  const list = (S.trains || []).filter(r => canSee(r) && rideInfo(sched(r)).state !== "past" && !(S.invitedTrain && S.invitedTrain.code === r.code));
  const inv = S.invitedTrain ? trainCard((S.trains || []).find(x => x.code === S.invitedTrain.code) || S.invitedTrain, true) : "";
  const shown = S.trainsAll ? list : list.slice(0, 4);
  return `${inv}<div class="row" style="justify-content:space-between;align-items:center"><div class="pname">${t("trainsTitle")}</div>
      <button class="btn ghost small" data-act="trainNew">+ ${t("trainNew")}</button></div>
    ${shown.length ? shown.map(r => trainCard(r)).join("") : `<div class="card"><div class="small">${S.trains ? t("trainsEmpty") : t("loading")}</div></div>`}
    ${list.length > shown.length ? `<button class="link" data-act="trainsAll">${t("trainsAll", { n: list.length })}</button>` : ""}`;
}

/* ---------- creating a train ---------- */
function trainNewScreen(){
  const n = S.tn || (S.tn = { days: [1, 2, 3, 4, 5], once: false, theme: "talk", women: false });
  const d = S.draft;
  const day = i => `<button class="chip" data-act="tnDay" data-arg="${i}" aria-pressed="${!n.once && n.days.includes(i)}">${esc(weekdaysText([i]))}</button>`;
  const mins = ["15", "20", "30", "45", "60", "90", "120"].map(v => `<option value="${v}"${(d.tnMin || "45") === v ? " selected" : ""}>${v} ${t("min")}</option>`).join("");
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="go" data-arg="checkin" aria-label="${t("back")}">${ICON.back}</button><h1 class="grow" style="font-size:26px">${t("trainNewTitle")}</h1></div>
    <p class="muted" style="margin:-6px 0 0">${t("trainNewHint")}</p>
    <div class="row">
      <div class="field" style="flex:1"><label for="tnLine">${t("line")}</label><input type="text" id="tnLine" data-bind="tnLine" maxlength="12" placeholder="RE 1" autocomplete="off" value="${esc(d.tnLine || "")}"></div>
      <div class="field" style="flex:1"><label for="tnTime">${t("tnTime")}</label><input type="time" id="tnTime" data-bind="tnTime" value="${esc(d.tnTime || "07:30")}"></div>
    </div>
    <div class="row">
      <div class="field" style="flex:1"><label for="tnFrom">${t("tnFrom")}</label><input type="text" id="tnFrom" data-bind="tnFrom" maxlength="40" placeholder="Düren" autocomplete="off" value="${esc(d.tnFrom || "")}"></div>
      <div class="field" style="flex:1"><label for="tnTo">${t("tnTo")}</label><input type="text" id="tnTo" data-bind="tnTo" maxlength="40" placeholder="Köln Hbf" autocomplete="off" value="${esc(d.tnTo || "")}"></div>
    </div>
    <div class="field"><span class="flabel">${t("tnRepeat")}</span><div class="seg">${[1, 2, 3, 4, 5, 6, 7].map(day).join("")}
      <button class="chip" data-act="tnOnce" aria-pressed="${n.once}">${t("tnOnce")}</button></div></div>
    ${n.once ? `<div class="field"><label for="tnDate">${t("tnDate")}</label><input type="date" id="tnDate" data-bind="tnDate" value="${esc(d.tnDate || berlinDate())}"></div>` : ""}
    <div class="row">
      <div class="field" style="flex:1.3"><label for="tnMin">${t("duration")}</label><select id="tnMin" data-bind="tnMin">${mins}</select></div>
      <div class="field" style="flex:1"><label for="tnCoach">${t("tnCoach")}</label><input type="text" id="tnCoach" data-bind="tnCoach" maxlength="4" inputmode="numeric" value="${esc(d.tnCoach || "")}"></div>
    </div>
    <div class="field"><span class="flabel">${t("tnTheme")}</span><div class="seg">${THEMES.map(x => `<button class="chip" data-act="tnTheme" data-arg="${x}" aria-pressed="${n.theme === x}">${t("th_" + x)}</button>`).join("")}</div></div>
    ${S.profile && S.profile.gender === "woman" ? `<label class="check card" for="tnWomen" style="flex-direction:row"><input type="checkbox" id="tnWomen" data-bind="tnWomen"${d.tnWomen ? " checked" : ""}> ${t("tnWomen")}</label>` : ""}
    <div class="card" style="flex-direction:row;align-items:flex-start;color:var(--muted)">${ICON.shield}<div class="small">${t("trainSafety")}</div></div>
    <div class="end"><button class="btn" data-act="trainCreate">${t("tnCreate")}</button></div>
  </div>`;
}

/* ---------- the group chat of a ride ---------- */
const gcacheKey = () => "zugpal.group." + (S.ride ? S.ride.key : "");
async function loadGroup(){
  if(!S.ride || !backend.groupMessages) return;
  const key = S.ride.key; let list;
  try{ list = await backend.groupMessages(); try{ localStorage.setItem(gcacheKey(), JSON.stringify(list.slice(-80))); }catch(e){} }
  catch(e){ console.error(e); try{ list = JSON.parse(localStorage.getItem(gcacheKey()) || "[]"); }catch(_){ list = []; } S.netDown = true; }
  if(!S.ride || S.ride.key !== key) return;
  const have = new Set(list.map(m => m.cid).filter(Boolean));
  const waiting = pendingGroup(key).filter(x => !have.has(x.cid)).map(x => ({ id: "p-" + x.cid, mine: true, body: x.body, at: x.at, cid: x.cid, pending: true, name: S.profile.name }));
  S.group = list.concat(waiting);
  S.groupSeen = S.group.length;
}
const mutedSet = () => S.muted || (S.muted = new Set());
function groupScreen(){
  if(!S.ride) return "";
  const log = (S.group || []).filter(m => m.mine || !mutedSet().has(m.from)).map(m => {
    if(m.removed) return `<div class="msg${m.mine ? " mine" : ""} removed">${t("groupRemoved")}</div>`;
    const time = new Date(m.at).toLocaleTimeString(S.lang === "ar" ? "ar-u-nu-latn" : S.lang, { hour: "2-digit", minute: "2-digit" });
    if(m.mine) return `<div class="msg mine${m.pending ? " pending" : ""}" dir="auto">${esc(m.body)}<span class="tick">${m.pending ? ICON.clock : time}</span></div>`;
    if(hasContact(m.body)) return "";
    return `<div class="gmsg"><div class="gname">${esc(m.name || "?")} <span class="small">${time}</span>
        <button class="link more" data-act="groupMore" data-arg="${esc(m.id)}" aria-label="${t("groupMoreLabel")}">⋯</button></div>
      <div class="msg" dir="auto">${esc(m.body)}</div></div>`;
  }).join("");
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="go" data-arg="nearby" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow" id="groupHead" data-soft><div class="pname">${t("groupTitle")}</div><div class="small">${esc(S.ride.label)} · ${t("groupPeople", { n: S.riders.length + 1 })}</div></div></div>
    <div class="small grouphint">${ICON.shield}<span>${t("groupHint")}</span></div>
    <div id="groupLog" class="chatlog" data-soft>${log || `<div class="empty"><div class="muted">${t("groupEmpty")}</div></div>`}</div>
    <form class="chatbar" id="groupForm">
      <textarea id="groupInput" data-bind="group" rows="1" maxlength="500" enterkeyhint="send" dir="auto" autocomplete="off" placeholder="${t("groupPh")}" aria-label="${t("groupPh")}">${esc(S.draft.group || "")}</textarea>
      <button class="btn small" type="submit" id="groupSend">${t("send")}</button></form>
  </div>`;
}
function groupSheet(){
  const g = S.groupSheet; if(!g) return "";
  const m = (S.group || []).find(x => String(x.id) === String(g)); if(!m) return "";
  const canRemove = (S.isHost && S.ride && S.ride.key.startsWith("TALK-")) || (S.ride && S.ride.train && (findTrain(S.ride.train) || {}).by_me);
  return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel">
    <h2>${esc(m.name || "")}</h2><div class="msg" dir="auto" style="align-self:stretch;max-width:none">${esc(m.body)}</div>
    <button class="btn ghost" data-act="groupReport">${ICON.shield}${t("reportShort")}</button>
    <button class="btn ghost" data-act="groupMute">${t("groupMute")}</button>
    ${canRemove && /^\d+$/.test(String(m.id)) ? `<button class="btn ghost danger" data-act="groupRemove">${t("groupRemove")}</button>` : ""}
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="groupSheetClose">${t("close")}</button></div></div></div>`;
}
function sendGroup(){
  const box = document.getElementById("groupInput"); if(box) S.draft.group = box.value;
  const body = String(S.draft.group || "").trim(); if(!body || !S.ride) return;
  if(hasContact(body)) return toast(t("noContact"));
  S.draft.group = ""; if(box){ box.value = ""; box.style.height = "auto"; }
  const it = queue({ kind: "gmsg", ride: S.ride.key, body: body.slice(0, 500) });
  (S.group = S.group || []).push({ id: "p-" + it.cid, mine: true, body: it.body, at: it.at, cid: it.cid, pending: true, name: S.profile.name });
  S.groupSeen = S.group.length;
  render({ soft: true });
}
setGroupHooks(() => { if(S.screen === "group") loadGroup().then(() => render({ soft: true })); },
  it => { S.group = (S.group || []).filter(m => m.cid !== it.cid); toast(t("notSent")); render({ soft: true }); });
// a new group message arrived (Realtime): a badge on the "Everyone" tab when you are elsewhere
function groupArrived(row){
  if(!row || S.screen === "group" || row.from_id === backend.uid || mutedSet().has(row.from_id)) return;
  S.groupUnread = (S.groupUnread || 0) + 1;
  render({ soft: true });
}

/* ---------- actions ---------- */
const trainActions = {
  trainNew(){ S.tn = null; ["tnLine", "tnFrom", "tnTo", "tnTime", "tnDate", "tnMin", "tnCoach", "tnWomen"].forEach(k => delete S.draft[k]); S.screen = "trainNew"; render(); },
  tnDay(i){ const n = S.tn; i = +i; n.once = false; n.days.includes(i) ? n.days = n.days.filter(x => x !== i) : n.days.push(i); render(); },
  tnOnce(){ S.tn.once = !S.tn.once; render(); },
  tnTheme(x){ if(THEMES.includes(x)) S.tn.theme = x; render(); },
  trainsAll(){ S.trainsAll = true; render(); },
  async trainCreate(){
    const d = S.draft, n = S.tn;
    const line = String(d.tnLine || "").trim(), from = String(d.tnFrom || "").trim(), to = String(d.tnTo || "").trim(), time = String(d.tnTime || "07:30");
    if(!line && !to) return toast(t("tnNeedLine"));
    if(!/^\d{2}:\d{2}$/.test(time)) return toast(t("tnNeedTime"));
    if(!n.once && !n.days.length) return toast(t("tnNeedDays"));
    if([line, from, to].some(hasContact)) return toast(t("noContact"));
    const date = n.once ? String(d.tnDate || berlinDate()) : null;
    if(n.once && date < berlinDate()) return toast(t("tnNeedTime"));
    const label = [line, time, from && to ? from + " → " + to : from || to].filter(Boolean).join(" · ").slice(0, 60);
    const row = { code: newCode(), label, line: line || null, from_station: from || null, to_station: to || null,
      weekdays: n.once ? null : [...n.days].sort(), one_date: date, dep_time: time, minutes: parseInt(d.tnMin || "45", 10),
      coach: String(d.tnCoach || "").replace(/[^0-9A-Za-z]/g, "").slice(0, 4) || null, theme: n.theme,
      women_only: !!d.tnWomen && S.profile.gender === "woman" };
    try{ await backend.createTrain(row); }
    catch(e){ console.error(e); return toast(/row-level|policy/i.test(String(e && e.message)) ? t("tnLimit") : t("netError")); }
    await loadTrains(true);
    S.screen = "checkin"; S.qrSheet = "train-" + row.code; render(); toast(t("tnDone"));
  },
  async trainJoin(code){
    const r = findTrain(code); if(!r) return;
    r.mine = !r.mine; r.members = Math.max(0, Number(r.members || 0) + (r.mine ? 1 : -1)); render();
    try{ await backend.trainJoin(code, r.mine); }catch(e){ console.error(e); r.mine = !r.mine; render(); toast(t("netError")); }
  },
  trainCal(code){
    const r = findTrain(code); if(!r) return;
    const ics = calendarFileFor(sched(r), r.label, baseUrl() + "#train-" + r.code);
    if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){ location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics); return; }
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a"); a.href = url; a.download = "zugpal-" + r.code + ".ics"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000); toast(t("calDone"));
  },
  async trainCancel(code){
    if(!confirm(t("trainCancelQ"))) return;
    try{ await backend.cancelTrain(code); S.trains = (S.trains || []).filter(x => x.code !== code); if(S.invitedTrain && S.invitedTrain.code === code) S.invitedTrain = null; render(); toast(t("trainCancelled")); }
    catch(e){ console.error(e); toast(t("netError")); }
  },
  trainCheckin(code){
    const r = findTrain(code); if(!r) return;
    if(r.women_only && S.profile.gender !== "woman") return toast(t("womenOnlyNo"));
    S.ride = { key: "TRAIN-" + r.code + "-" + berlinDate(), label: r.label, expiresAt: Date.now() + (Number(r.minutes) || 45) * 60000, train: r.code };
    if(r.women_only) S.womenOnly = true;
    S.seen = new Set(); S.buddySeen = new Set(); S.riders = []; S.matches = []; S.warnedEnd = false; S.declined = new Set(); S.wavedMe = new Set(); S.group = []; S.groupUnread = 0;
    S.invitedTrain = null; S.screen = "mood"; render();
  },
  openGroup(){ S.groupUnread = 0; S.screen = "group"; render(); loadGroup().then(() => render({ soft: true })); },
  groupMore(id){ S.groupSheet = id; render(); },
  groupSheetClose(){ S.groupSheet = null; render(); },
  groupMute(){ const m = (S.group || []).find(x => String(x.id) === String(S.groupSheet)); if(m) mutedSet().add(m.from); S.groupSheet = null; render(); toast(t("groupMuted")); },
  groupReport(){ const m = (S.group || []).find(x => String(x.id) === String(S.groupSheet)); S.groupSheet = null; if(!m) return render();
    S.reportSheet = { id: m.from, name: m.name || "", reason: null }; S.draft.reportDetails = m.body.slice(0, 200); S.draft.reportBlock = true; render(); },
  async groupRemove(){ const id = S.groupSheet; S.groupSheet = null; render();
    try{ await backend.groupRemove(id); await loadGroup(); render(); }catch(e){ console.error(e); toast(t("netError")); } }
};

export { groupArrived, groupScreen, groupSheet, loadGroup, loadTrains, openTrainLink, sendGroup, trainActions, trainNewScreen, trainsSection };
