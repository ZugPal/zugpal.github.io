// Start-up and event wiring. Entry point loaded by index.html.
import { actions, joinTest, openProfile, safe } from "./actions.js";
import { DemoBackend } from "./backend-demo.js";
import { LiveBackend } from "./backend-live.js";
import { growBox, resizeImage, resizeMax, sendChat, sendMedia } from "./chat.js";
import { CONFIG } from "./config.js";
import { navInit } from "./nav.js";
import { refresh, restoreRide, startPolling } from "./polling.js";
import { flush } from "./outbox.js";
import { openTrainLink, sendGroup } from "./trains.js";
import { loadNotices, render } from "./screens.js";
import { S, backend, load, save, setBackend } from "./state.js";
import { t, toast } from "./util.js";

/* ---------------- Wiring ---------------- */
function bind(el){
  const key = el.dataset.bind, val = el.type==="checkbox" ? el.checked : el.value;
  if(key.startsWith("edit.")){ if(S.edit) S.edit[key.slice(5)] = val; } else S.draft[key] = val;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if(!b) return;
  // a choice in the "+" sheet closes the sheet first
  if(b.closest(".plussheet") && b.dataset.act !== "plusClose") S.plusSheet = false;
  const fn = actions[b.dataset.act]; if(fn) fn(b.dataset.arg, b);
});
document.addEventListener("input", e => { const el = e.target; if(el.dataset && el.dataset.bind) bind(el); });
document.addEventListener("change", async e => {
  const el = e.target;
  if(el.id==="lang"){ S.lang = el.value; save(); render(); return; }
  if(el.id==="photoInput" && el.files && el.files[0]){
    try{ const f = el.files[0]; S.edit.photo = await resizeImage(f, 320, 0.8); S.edit.photoSmall = await resizeImage(f, 24, 0.6); render(); }
    catch(err){ toast(t("photoError")); }
    return;
  }
  if((el.id==="mediaPhoto" || el.id==="mediaCam") && el.files && el.files[0]){
    try{ let d = await resizeMax(el.files[0], 1024, 0.72); if(d.length > 580000) d = await resizeMax(el.files[0], 720, 0.6); sendMedia("photo", d); }
    catch(err){ toast(t("photoError")); }
    return;
  }
  if(el.dataset && el.dataset.fbbuddy){ S.fb[el.dataset.fbbuddy].buddy = el.checked; return; }
  if(el.dataset && el.dataset.bind) bind(el);
});
// remember folded sections ("More about you") across re-renders; toggle does not bubble, so listen while capturing
document.addEventListener("toggle", e => { if(e.target && e.target.classList && e.target.classList.contains("more")) S.moreOpen = e.target.open; }, true);
// Chat box: tapping Send must not take the focus away (the keyboard stays open, like WhatsApp)
document.addEventListener("pointerdown", e => { if(e.target.closest && e.target.closest("#chatSend, #groupSend")) e.preventDefault(); });
document.addEventListener("keydown", e => {
  if(e.key !== "Enter" || e.shiftKey || e.isComposing) return;
  if(e.target.id === "chatInput"){ e.preventDefault(); sendChat(); }
  if(e.target.id === "groupInput"){ e.preventDefault(); sendGroup(); }
});
document.addEventListener("input", e => {
  if(e.target.id !== "chatInput" && e.target.id !== "groupInput") return;
  growBox(e.target);
  const f = e.target.closest("form"); if(f) f.classList.toggle("has-text", !!e.target.value.trim());   // microphone becomes Send
});
document.addEventListener("submit", e => { if(e.target.id === "groupForm"){ e.preventDefault(); sendGroup(); } });
document.addEventListener("submit", e => { if(e.target.id==="chatForm"){ e.preventDefault(); sendChat(); } });
// Offline + install (PWA). The service worker caches the app; see sw.js.
// On localhost only with ?sw (so local testing always shows the newest files). A new version shows an "update" bar.
if("serviceWorker" in navigator && (location.protocol === "https:" || /[?&]sw(&|$)/.test(location.search))){
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").catch(e => console.error(e));
  navigator.serviceWorker.addEventListener("controllerchange", () => { if(hadController){ S.updateReady = true; render(); } });
}
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); S.installPrompt = e; render(); });
window.addEventListener("appinstalled", () => { S.installPrompt = null; render(); });
window.addEventListener("online", () => render());
window.addEventListener("offline", () => render());

(async function start(){
  // File pickers live outside the re-rendered app so a re-render can't remove them mid-pick
  [["mediaPhoto", null], ["mediaCam", "environment"]].forEach(([id, cap])=>{
    if(document.getElementById(id)) return;
    const inp = document.createElement("input"); inp.type = "file"; inp.id = id; inp.accept = "image/*"; inp.hidden = true;
    if(cap) inp.setAttribute("capture", cap);
    document.body.appendChild(inp);
  });
  load();
  S.autoTalk = location.hash === "#talk";
  if(location.hash === "#install") S.installSheet = true;
  const m = location.hash.match(/^#ride-([A-Za-z0-9]{4,8})$/); S.autoRide = m ? m[1] : null;
  const tm = location.hash.match(/^#train-([A-Za-z0-9]{6})$/); S.autoTrain = tm ? tm[1].toUpperCase() : null;
  navInit(render);
  S.screen = "loading"; render();
  // ?demo forces the simulated riders (for testing without touching the live database)
  try{ setBackend(CONFIG.supabaseUrl && !/[?&]demo\b/.test(location.search) ? await LiveBackend() : DemoBackend()); }
  catch(e){ console.error(e); setBackend(DemoBackend()); toast(t("netError")); }
  loadNotices(true);
  // Email account: after a login link on a new phone, bring the saved profile back
  if(backend.account){ try{ S.account = await backend.account(); if(S.account && !S.account.anon && !S.profile){ const p = await backend.loadProfile(); if(p && p.name){ S.profile = p; S.agreed = true; save(); } } }catch(e){ console.error(e); } }
  if(backend.amHost) backend.amHost().then(v => { S.isHost = v; render(); }).catch(() => {});
  if(!S.profile) openProfile();
  else if(S.autoRide && !(S.ride && S.ride.key === "TEST-" + S.autoRide.toUpperCase())){ const c = S.autoRide; S.autoRide = null; joinTest(c); return; }
  else if(S.ride){ S.screen = "nearby"; restoreRide(); startPolling(); safe(async()=>{ await backend.checkIn(); await refresh(); flush(); }); }
  else if(S.autoTalk){ S.autoTalk = false; actions.checkin("talk"); return; }
  else S.screen = "checkin";
  render();
  if(S.autoTrain && S.profile){ const c = S.autoTrain; S.autoTrain = null; openTrainLink(c); }
})();
