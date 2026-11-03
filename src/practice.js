// Practice ride: the simulated riders from demo mode (Lena, Karim, Aylin, Mira, Jonas) inside the live app, so anyone
// can try waving, chatting and playing when nobody else is on the train. While S.ride is the practice ride (key
// PRACTICE) every call that belongs to the ride goes to a DemoBackend; profile, account, trains, notices and host mode
// stay on the live backend. Nothing from a practice ride is ever written to Supabase.
import { DemoBackend } from "./backend-demo.js";
import { stopPolling } from "./polling.js";
import { render } from "./screens.js";
import { PRACTICE_KEY, S, backend, isPractice, save } from "./state.js";
import { ICON, t, toast } from "./util.js";

// everything that belongs to the ride you are on (people, waves, matches, chat, media, group chat, feedback)
const RIDE = ["checkIn", "update", "visible", "wave", "unwave", "matches", "presence", "messages", "send", "sendMedia", "openMedia", "mediaStatus",
  "reportMedia", "block", "report", "fileReport", "compliment", "recordMood", "leave", "buddy", "checkOut", "groupMessages", "groupSend", "groupRemove",
  "hostStats", "hostAnnounce", "announcement", "callSignal"];
function PracticeBackend(live){
  let demo = null;
  // the simulated people answer with the AI where it is set up (see supabase/functions/practice-chat), else with scripts
  const fresh = () => DemoBackend({ ai: live.practiceReply });
  const sim = () => demo || (demo = fresh());
  const api = {
    get mode(){ return live.mode; },
    get uid(){ return live.uid; },
    // no Realtime in a practice ride: it polls every 1.5 s like demo mode (see polling.js)
    get realtime(){ return !isPractice() && !!live.realtime; },
    listen(fn){ if(isPractice()) live.unlisten(); else live.listen(fn); },
    unlisten(){ live.unlisten(); },
    // a report in a practice ride shows the demo "received" notice next to your real notices (ids prefixed, so they never mix)
    async notices(){
      const real = (await live.notices()) || [];
      if(!demo) return real;
      const d = (await demo.notices()) || [];
      return d.map(n => ({ ...n, id: "p-" + n.id })).concat(real);
    },
    async noticesSeen(ids){
      const isDemo = i => /^p-/.test(String(i));
      const d = ids.filter(isDemo).map(i => Number(String(i).slice(2))), r = ids.filter(i => !isDemo(i));
      if(d.length && demo) await demo.noticesSeen(d);
      if(r.length) await live.noticesSeen(r);
    }
  };
  for(const name of RIDE) api[name] = function(...a){
    if(!isPractice()) return live[name](...a);
    if(name === "checkIn") demo = fresh();                       // every practice ride starts fresh
    const b = sim(); return b[name] ? b[name](...a) : undefined;  // calls the demo doesn't know (calls) do nothing
  };
  for(const name of Object.keys(live)) if(!(name in api)) api[name] = (...a) => live[name](...a);
  return api;
}

/* ---------- screens ---------- */
// on every screen while practising: these people are not real
function practiceBanner(){
  if(!isPractice() || S.screen === "loading") return "";
  const end = S.screen === "nearby" || S.screen === "checkin" ? `<button class="btn small" data-act="practiceEnd">${t("pracEnd")}</button>` : "";
  return `<div class="banner practice${end ? " action" : ""}" role="status"><span>${ICON.shield}${t("pracBanner")}</span>${end}</div>`;
}
// the offer on the check-in screen (not in demo mode: there everyone is simulated already)
function practiceCard(){
  if(!backend || backend.mode === "demo") return "";
  return `<div class="card practicecard"><div class="pname">${ICON.bubble}${t("pracTitle")}</div><div class="small">${t("pracBody")}</div>
    <button class="btn ghost" data-act="practiceStart">${t("pracBtn")}</button></div>`;
}
// the offer on an empty people list
function practiceEmpty(){
  if(isPractice() || !backend || backend.mode === "demo") return "";
  return `<div class="small" style="margin-top:10px">${t("pracEmpty")}</div><button class="btn ghost small" data-act="practiceStart" style="margin-top:8px">${t("pracBtn")}</button>`;
}

/* ---------- actions ---------- */
const resetRide = () => { S.seen = new Set(); S.buddySeen = new Set(); S.riders = []; S.matches = []; S.warnedEnd = false; S.declined = new Set(); S.wavedMe = new Set();
  S.group = []; S.groupUnread = 0; S.current = null; S.chatWith = null; S.messages = []; S.announcement = null; S.hostStats = null; };
const practiceActions = {
  async practiceStart(){
    if(isPractice()){ S.screen = "nearby"; return render(); }
    // from an empty real ride: leave it first (nobody was there), the practice ride takes its place
    if(S.ride){ stopPolling(); try{ await backend.checkOut(); }catch(e){ console.error(e); } }
    S.ride = { key: PRACTICE_KEY, label: t("pracTitle"), expiresAt: Date.now() + 45 * 60000 };
    resetRide(); save(); S.screen = "mood"; render();
  },
  async practiceEnd(){
    if(!isPractice()) return;
    stopPolling();
    try{ await backend.checkOut(); }catch(e){ console.error(e); }
    S.ride = null; resetRide(); S.moodBefore = null; S.moodAfter = null; S.recommend = null; S.fb = {}; S.fbList = [];
    save(); S.screen = "checkin"; render(); toast(t("pracEnded"));
  }
};

export { PracticeBackend, practiceActions, practiceBanner, practiceCard, practiceEmpty };
