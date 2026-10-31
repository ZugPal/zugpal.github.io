// Refreshing the train: Supabase Realtime triggers an instant refresh; polling stays as the fallback
// (every 6 s, or every 20 s while Realtime is connected; 1.5 s in demo mode).
import { startFeedback } from "./actions.js";
import { loadMessages } from "./chat.js";
import { currentActivity } from "./games.js";
import { loadNotices, render } from "./screens.js";
import { S, backend } from "./state.js";
import { parseMsg, t, toast } from "./util.js";
import { flush, pending } from "./outbox.js";
import { groupArrived, loadGroup } from "./trains.js";
import { onSignal } from "./call.js";
// an incoming call while Zugpal is in the background: a notice without a name
function notifyCall(){ notify(t("callIncoming")); }

/* ---------------- Polling ---------------- */
let pollTimer = null, rtTimer = null, lastRefresh = 0;
async function refresh(){
  lastRefresh = Date.now();
  loadNotices();
  if(!S.ride || S.screen==="feedback") return;
  if(Date.now() > S.ride.expiresAt) return startFeedback();
  const act = currentActivity();
  if(backend.presence && (act !== S.presAct || Date.now() - S.presAt > 12000)){ S.presAct = act; S.presAt = Date.now(); backend.presence(act).catch(()=>{}); }
  const [riders, matches] = await Promise.all([backend.visible(), backend.matches()]);
  // Talk Train: the host's announcement for everyone; numbers for the host
  if(backend.announcement && S.ride.key.startsWith("TALK-")){
    const a = await backend.announcement().catch(() => null);
    if(a && a !== S.announcement && S.screen !== "nearby") toast(t("hostAnnTitle") + ": " + a);
    S.announcement = a;
    if(S.isHost) S.hostStats = await backend.hostStats().catch(() => S.hostStats);
  }
  S.riders = riders || []; S.matches = matches || []; cacheRide();
  // someone new waved at you: a vibration and a notice without a name (the card shows who)
  const newWave = S.riders.find(r => r.waved_me && !r.waved && !S.wavedMe.has(r.id));
  S.riders.forEach(r => { if(r.waved_me) S.wavedMe.add(r.id); });
  if(newWave){ try{ navigator.vibrate && navigator.vibrate([40, 30, 40]); }catch(e){}
    if(document.hidden) notify(t("wavedNotice")); else if(S.screen !== "nearby") toast(t("wavedNotice")); }
  const buddy = S.riders.find(r=>r.buddy && !S.buddySeen.has(r.id) && !S.seen.has(r.id));
  if(buddy){ S.buddySeen.add(buddy.id); toast(t("buddyHere",{name:buddy.first_name})); }
  const fresh = S.matches.find(m=>!S.seen.has(m.id));
  if(fresh){ S.matches.forEach(m=>S.seen.add(m.id));
    // only take over the screen from the people list; in a chat or game just show a notice
    if(S.screen==="nearby"){ S.current = fresh; S.iceIndex = 0; S.screen = "match"; try{ navigator.vibrate && navigator.vibrate([80,60,80]); }catch(e){} }
    else toast(t("newMatch",{name:fresh.first_name}));
  }
  const onlineChessOpen = (S.screen==="chess" && S.chess && S.chess.mode==="online") || (S.screen==="dama" && S.dama && S.dama.mode==="online")
    || (S.screen==="zugwort" && S.zw && S.zw.mode==="online") || (S.screen==="letters" && S.lt && S.lt.mode==="online") || (S.screen==="table" && S.tk && S.tk.mode==="online")
    || (S.screen==="quiz" && S.qz && S.qz.mode==="online") || S.screen==="slf";
  if(S.screen==="chat" || onlineChessOpen) await loadMessages();
  if(S.screen==="group") await loadGroup();
  if(["nearby","match","chat","group"].includes(S.screen) || onlineChessOpen) render({ soft: true });
}
// Background refresh: in a tunnel it fails quietly and shows "Reconnecting…" instead of an error every few seconds
async function poll(){
  try{
    await refresh(); flush();
    if(S.netDown || S.netPortal){ S.netDown = false; S.netPortal = false; render({ soft: true }); }
  }catch(e){
    console.error(e);
    // a train Wi-Fi that wants a login answers with its own web page instead of our data
    const portal = /Unexpected token|JSON|<!DOCTYPE|<html/i.test(String(e && (e.message || e)));
    if(!S.netDown || portal !== !!S.netPortal){ S.netDown = true; S.netPortal = portal; render({ soft: true }); }
  }
}
// the people list and matches of the current ride stay on the phone, so the app opens in a tunnel
const RIDE_CACHE = "zugpal.ridecache";
function cacheRide(){ try{ localStorage.setItem(RIDE_CACHE, JSON.stringify({ key: S.ride.key, riders: S.riders, matches: S.matches })); }catch(e){} }
function restoreRide(){
  try{ const c = JSON.parse(localStorage.getItem(RIDE_CACHE) || "null");
    if(c && S.ride && c.key === S.ride.key){ S.riders = c.riders || []; S.matches = c.matches || []; S.matches.forEach(m => S.seen.add(m.id)); } }catch(e){}
}
document.addEventListener("visibilitychange", () => { if(!document.hidden && S.ride && pollTimer) poll(); });
window.addEventListener("online", () => { if(S.ride && pollTimer) poll(); });
// A new message from a match (via Realtime): a vibration, "new" on the match list, and a phone notice while Zugpal is in the background
const MOVES = ["cm","cx","dm","dx","zg","lg","cgm","cgx","qa","slsub","slstop","slrej"];
function messageAlert(row){
  if(!row || !row.from_id || MOVES.includes(parseMsg(row.body || "").type)) return;
  const from = row.from_id, here = !document.hidden && S.screen === "chat" && S.chatWith === from;
  if(here) return;
  S.unread[from] = (S.unread[from] || 0) + 1;
  const m = S.matches.find(x => x.id === from), name = m ? m.first_name : "";
  try{ navigator.vibrate && navigator.vibrate([60, 40, 60]); }catch(e){}
  updateBadge();
  if(document.hidden) return notify(unreadTotal() > 1 ? t("newMsgsN", { n: unreadTotal() }) : t("newMsg1"));
  // games already show their own notice for the person you are playing with
  if(!(S.chatWith === from && ["chess","dama","table"].includes(S.screen))) toast(t("newMsgFrom",{name}));
}
// The number of unread messages on the app icon (installed app), like other messengers
const unreadTotal = () => Object.values(S.unread).reduce((a, b) => a + b, 0);
function updateBadge(){
  try{ const n = unreadTotal(); if(navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); }catch(e){}
}
// The phone notice never shows a name or the message: just "Zugpal" and how many new messages there are
function notify(body){
  if(S.notifyOff || !("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body, icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: "zugpal-msg", renotify: true };
  const title = "Zugpal";
  (navigator.serviceWorker ? navigator.serviceWorker.getRegistration() : Promise.resolve(null))
    .then(reg => reg ? reg.showNotification(title, opts) : new Notification(title, opts)).catch(e => console.error(e));
}
function onRealtime(kind, row){ if(kind === "call") return onSignal(row); if(kind === "msg") messageAlert(row); if(kind === "group") groupArrived(row); clearTimeout(rtTimer); rtTimer = setTimeout(poll, 250); }
function tick(){ if(backend.realtime && Date.now() - lastRefresh < 20000) return; poll(); }
function startPolling(){
  stopPolling();
  if(backend.listen) backend.listen(onRealtime);
  pollTimer = setInterval(tick, backend.mode==="demo" ? 1500 : 6000);
}
function stopPolling(){ clearInterval(pollTimer); pollTimer = null; clearTimeout(rtTimer); if(backend && backend.unlisten) backend.unlisten(); }

export { messageAlert as messageAlertForTest, notifyCall, poll, refresh, restoreRide, startPolling, stopPolling, updateBadge };
