// Refreshing the train: Supabase Realtime triggers an instant refresh; polling stays as the fallback
// (every 6 s, or every 20 s while Realtime is connected; 1.5 s in demo mode).
import { safe, startFeedback } from "./actions.js";
import { loadMessages } from "./chat.js";
import { currentActivity } from "./games.js";
import { loadNotices, render } from "./screens.js";
import { S, backend } from "./state.js";
import { t, toast } from "./util.js";

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
  S.riders = riders || []; S.matches = matches || [];
  const buddy = S.riders.find(r=>r.buddy && !S.buddySeen.has(r.id) && !S.seen.has(r.id));
  if(buddy){ S.buddySeen.add(buddy.id); toast(t("buddyHere",{name:buddy.first_name})); }
  const fresh = S.matches.find(m=>!S.seen.has(m.id));
  if(fresh){ S.matches.forEach(m=>S.seen.add(m.id));
    // only take over the screen from the people list; in a chat or game just show a notice
    if(S.screen==="nearby"){ S.current = fresh; S.iceIndex = 0; S.screen = "match"; try{ navigator.vibrate && navigator.vibrate([80,60,80]); }catch(e){} }
    else toast(t("newMatch",{name:fresh.first_name}));
  }
  const onlineChessOpen = (S.screen==="chess" && S.chess && S.chess.mode==="online") || (S.screen==="dama" && S.dama && S.dama.mode==="online")
    || (S.screen==="zugwort" && S.zw && S.zw.mode==="online") || (S.screen==="letters" && S.lt && S.lt.mode==="online") || (S.screen==="classic" && S.cg && S.cg.mode==="online");
  if(S.screen==="chat" || onlineChessOpen) await loadMessages();
  if(["nearby","match","chat"].includes(S.screen) || onlineChessOpen) render();
}
function onRealtime(){ clearTimeout(rtTimer); rtTimer = setTimeout(()=>safe(refresh), 250); }
function tick(){ if(backend.realtime && Date.now() - lastRefresh < 20000) return; safe(refresh); }
function startPolling(){
  stopPolling();
  if(backend.listen) backend.listen(onRealtime);
  pollTimer = setInterval(tick, backend.mode==="demo" ? 1500 : 6000);
}
function stopPolling(){ clearInterval(pollTimer); pollTimer = null; clearTimeout(rtTimer); if(backend && backend.unlisten) backend.unlisten(); }

export { refresh, startPolling, stopPolling };
