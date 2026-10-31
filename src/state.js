// App state (one object S) and saving it on the phone.
import { T } from "./i18n.js";

/* ---------------- State ---------------- */
const STORE_KEY = "abteil.v1";
const S = {
  lang:"de", profile:null, agreed:false, edit:null,
  ride:null, moods:new Set(["small"]), coach:"", womenOnly:false, chatOnly:true, open:true, moodBefore:null, moodAfter:null, autoTalk:false,
  screen:"welcome", riders:[], matches:[], seen:new Set(), buddySeen:new Set(), buddies:new Set(),
  current:null, chatWith:null, unread:{}, netDown:false, messages:[], mediaDone:new Set(), mediaStatus:{}, mediaCache:{}, photoSheet:false, readCount:{}, lastUnread:0, presAct:null, presAt:0, chess:null, dama:null, sol:null, gamesBack:"checkin", playing:null, viewer:null, reportSheet:null, reportDone:null, notices:[], noticesAt:0, recording:null, iceIndex:0, draft:{}, fb:{}, toast:"", warnedEnd:false
};
let backend = null;
function setBackend(b){ backend = b; }
function load(){
  try{
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if(!d){ const nl=(navigator.language||"de").slice(0,2); S.lang = T[nl]?nl:"de"; return; }
    S.lang = T[d.lang] ? d.lang : "de";
    S.profile = d.profile || null; S.agreed = !!d.profile;
    if(S.profile){ S.profile.langs = S.profile.langs || []; S.profile.topics = S.profile.topics || []; }
    S.moods = new Set(d.moods || ["small"]); S.coach = d.coach || ""; S.womenOnly = !!d.womenOnly; S.chatOnly = d.chatOnly ?? true;
    S.buddies = new Set(d.buddies || []);
    S.wavedOnce = !!d.wavedOnce; S.nudgeOff = !!d.nudgeOff; S.notifyOff = !!d.notifyOff;
    if(d.ride && d.ride.expiresAt > Date.now()) S.ride = d.ride;
  }catch(e){}
}
function save(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify({lang:S.lang, profile:S.profile, moods:[...S.moods], coach:S.coach, womenOnly:S.womenOnly, chatOnly:S.chatOnly, buddies:[...S.buddies], ride:S.ride, wavedOnce:S.wavedOnce, nudgeOff:S.nudgeOff, notifyOff:S.notifyOff})); }catch(e){}
}

export { S, backend, load, save, setBackend };
