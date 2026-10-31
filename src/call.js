// Voice and video calls between two matches (WebRTC, phone to phone).
// Rules: only with a match, only after both wrote 2+ messages (the database checks this too), never a phone number.
// The two phones exchange connection details through the private table call_signals (Realtime, RLS: only the two).
// Calls need CONFIG.calls (a TURN relay: keeps IP addresses private and makes calls work on mobile networks).
// Without it the call buttons are hidden in the live app; demo mode shows a simulated call.
// The call screen lives outside #app, so the regular redraws never interrupt the video.
import { CONFIG } from "./config.js";
import { S, backend } from "./state.js";
import { ICON, esc, photo, t, toast } from "./util.js";

let C = null, tick = null;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const cfg = () => CONFIG.calls && Array.isArray(CONFIG.calls.iceServers) && CONFIG.calls.iceServers.length ? CONFIG.calls : null;
const callsAvailable = () => !!backend && (backend.mode === "demo" || (!!cfg() && !!backend.callSignal)) && !!window.RTCPeerConnection;
const unlocked = () => S.messages.filter(m => m.mine && !String(m.body).startsWith("\u0001")).length >= 2
  && S.messages.filter(m => !m.mine && !String(m.body).startsWith("\u0001")).length >= 2;
const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

/* ---------- the call screen ---------- */
function layer(){ let el = document.getElementById("callUi"); if(!el){ el = document.createElement("div"); el.id = "callUi"; document.body.appendChild(el); } return el; }
function statusText(){
  if(!C) return "";
  return { calling: t("callCalling"), incoming: C.video ? t("callIncomingVideo") : t("callIncoming"), connecting: t("callConnecting"),
    live: fmt(Math.floor((Date.now() - C.start) / 1000)), ended: C.endText || t("callEnded") }[C.state] || "";
}
function draw(){
  if(!C){ const el = document.getElementById("callUi"); if(el) el.remove(); return; }
  const el = layer(), m = S.matches.find(x => x.id === C.peer) || {};
  const showVideo = C.video && !!C.remote && (C.state === "live" || C.state === "connecting");
  if(el.dataset.state === C.state && el.dataset.id === C.id && el.dataset.muted === String(!!C.muted) && el.dataset.cam === String(!!C.camOff)){ const s = el.querySelector(".callstatus"); if(s) s.textContent = statusText(); return; }
  el.dataset.state = C.state; el.dataset.id = C.id; el.dataset.muted = String(!!C.muted); el.dataset.cam = String(!!C.camOff);
  const btns = C.state === "incoming"
    ? `<button class="callbtn red" id="cDecline" aria-label="${t("callDecline")}">${ICON.phoneDown}</button><button class="callbtn green" id="cAccept" aria-label="${t("callAccept")}">${C.video ? ICON.video : ICON.phone}</button>`
    : C.state === "ended" ? ""
    : `<button class="callbtn${C.muted ? " on" : ""}" id="cMute" aria-pressed="${!!C.muted}" aria-label="${t("callMute")}">${ICON.micOff}</button>
       ${C.video ? `<button class="callbtn${C.camOff ? " on" : ""}" id="cCam" aria-pressed="${!!C.camOff}" aria-label="${t("callCamera")}">${ICON.video}</button>` : ""}
       <button class="callbtn red" id="cEnd" aria-label="${t("callEnd")}">${ICON.phoneDown}</button>`;
  el.innerHTML = `<div class="callbox${showVideo ? " withvideo" : ""}" role="dialog" aria-modal="true" aria-label="${esc(m.first_name || "")}">
    ${C.video ? `<video id="callRemote" autoplay playsinline></video><video id="callLocal" autoplay muted playsinline></video>` : `<audio id="callAudio" autoplay></audio>`}
    <div class="callinfo">${photo(C.peer, m.first_name, m.photo, 96, false)}<div class="callname">${esc(m.first_name || "")}</div><div class="callstatus" role="status">${statusText()}</div></div>
    <div class="callbtns">${btns}</div>
    ${C.state !== "ended" ? `<div class="callsafe"><button class="link" id="cReport">${ICON.shield}${t("reportShort")}</button><span>${t("callSafe")}</span></div>` : ""}
  </div>`;
  const on = (id, fn) => { const b = el.querySelector("#" + id); if(b) b.onclick = fn; };
  on("cAccept", acceptAny); on("cDecline", () => hangUp("decline")); on("cEnd", () => hangUp("end"));
  on("cMute", () => { C.muted = !C.muted; if(C.local) C.local.getAudioTracks().forEach(x => x.enabled = !C.muted); draw(); });
  on("cCam", () => { C.camOff = !C.camOff; if(C.local) C.local.getVideoTracks().forEach(x => x.enabled = !C.camOff); draw(); });
  on("cReport", () => { const id = C.peer; hangUp("end"); import("./actions.js").then(a => a.actions.reportOpen(id)); });
  attach();
}
function attach(){
  if(!C) return;
  const lv = document.getElementById("callLocal"), rv = document.getElementById("callRemote"), au = document.getElementById("callAudio");
  if(lv && C.local && lv.srcObject !== C.local) lv.srcObject = C.local;
  if(rv && C.remote && rv.srcObject !== C.remote) rv.srcObject = C.remote;
  if(au && C.remote && au.srcObject !== C.remote) au.srcObject = C.remote;
}
function startTick(){ clearInterval(tick); tick = setInterval(() => { if(!C) return clearInterval(tick); draw(); }, 1000); }

/* ---------- connection ---------- */
async function media(video){
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: video ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 24 } } : false });
}
function peer(){
  const c = cfg();
  const pc = new RTCPeerConnection({ iceServers: c.iceServers, iceTransportPolicy: c.relayOnly === false ? "all" : "relay" });
  C.local.getTracks().forEach(tr => pc.addTrack(tr, C.local));
  pc.ontrack = e => { C.remote = e.streams[0]; const el = document.getElementById("callUi"); if(el) el.dataset.state = ""; draw(); };
  pc.onconnectionstatechange = () => {
    if(!C || C.pc !== pc) return;
    if(pc.connectionState === "connected" && C.state !== "live"){ C.state = "live"; C.start = Date.now(); clearTimeout(C.ringTimer); draw(); startTick(); }
    if(pc.connectionState === "failed") hangUp("end", t("callFailed"));
  };
  C.pc = pc; return pc;
}
// send the whole description at once (all connection candidates included): fewer messages on a weak network
function gathered(pc){
  if(pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise(ok => { const done = () => { if(pc.iceGatheringState === "complete"){ pc.removeEventListener("icegatheringstatechange", done); ok(); } };
    pc.addEventListener("icegatheringstatechange", done); setTimeout(ok, 4000); });
}
const signal = (kind, payload) => backend.callSignal(C.peer, C.id, kind, payload ? JSON.stringify(payload) : null).catch(e => console.error(e));

async function startCall(kind){
  const peerId = S.chatWith; if(!peerId || C) return;
  if(!callsAvailable()) return toast(t("callsOff"));
  if(!unlocked()) return toast(t("callLocked"));
  C = { id: newId(), peer: peerId, video: kind === "video", role: "caller", state: "calling" };
  draw();
  if(backend.mode === "demo") return demoCall();
  try{ C.local = await media(C.video); }
  catch(e){ console.error(e); C = null; draw(); return toast(t("camDenied")); }
  attach();
  const pc = peer(); await pc.setLocalDescription(await pc.createOffer()); await gathered(pc);
  if(!C || C.pc !== pc) return;
  signal("offer", { sdp: pc.localDescription.sdp, video: C.video });
  C.ringTimer = setTimeout(() => { if(C && C.state !== "live") hangUp("end", t("callNoAnswer"), true); }, 40000);
}
async function accept(){
  if(!C || C.state !== "incoming") return;
  C.state = "connecting"; draw(); stopRing();
  try{ C.local = await media(C.video); }
  catch(e){ console.error(e); return hangUp("decline", t("camDenied")); }
  attach();
  const pc = peer(); await pc.setRemoteDescription({ type: "offer", sdp: C.offer });
  await pc.setLocalDescription(await pc.createAnswer()); await gathered(pc);
  if(!C || C.pc !== pc) return;
  signal("answer", { sdp: pc.localDescription.sdp });
}
function hangUp(kind, text, missed){
  if(!C) return;
  const c = C; clearTimeout(c.ringTimer); clearTimeout(c.demo); stopRing();
  if(backend.mode !== "demo" && kind && c.state !== "ended") signal(kind);
  // a short note in the chat: "Call · 3:12" or "No answer"
  if(c.role === "caller" && backend.mode !== "demo"){
    const d = c.state === "live" ? fmt(Math.floor((Date.now() - c.start) / 1000)) : "missed";
    import("./chat.js").then(ch => { if(S.chatWith === c.peer) ch.sendBody("\u0001call:" + (c.video ? "video" : "voice") + ":" + d); });
  }
  try{ c.pc && c.pc.close(); }catch(e){}
  (c.local ? c.local.getTracks() : []).forEach(x => x.stop());
  c.state = "ended"; c.endText = text || (missed ? t("callNoAnswer") : t("callEnded")); draw();
  clearInterval(tick); setTimeout(() => { if(C === c){ C = null; draw(); } }, 1600);
}
let ringTimer = null;
function ring(){ stopRing(); const buzz = () => { try{ navigator.vibrate && navigator.vibrate([400, 200, 400]); }catch(e){} }; buzz(); ringTimer = setInterval(buzz, 2000); }
function stopRing(){ clearInterval(ringTimer); ringTimer = null; try{ navigator.vibrate && navigator.vibrate(0); }catch(e){} }

// signals from the other phone (Realtime)
async function onSignal(row){
  if(!row || !row.kind) return;
  let p = {}; try{ p = row.payload ? JSON.parse(row.payload) : {}; }catch(e){}
  if(row.kind === "offer"){
    if(Date.now() - Date.parse(row.created_at || Date.now()) > 45000) return;          // an old ring
    if(C){ if(C.id !== row.call_id) backend.callSignal(row.from_id, row.call_id, "busy", null).catch(() => {}); return; }
    if(!S.matches.some(m => m.id === row.from_id)) return;
    C = { id: row.call_id, peer: row.from_id, video: !!p.video, role: "callee", state: "incoming", offer: p.sdp };
    C.ringTimer = setTimeout(() => { if(C && C.state === "incoming"){ stopRing(); C = null; draw(); } }, 40000);
    ring(); draw();
    if(document.hidden) import("./polling.js").then(pl => pl.notifyCall && pl.notifyCall());
    return;
  }
  if(!C || C.id !== row.call_id) return;
  if(row.kind === "answer" && C.pc){ C.state = "connecting"; draw(); try{ await C.pc.setRemoteDescription({ type: "answer", sdp: p.sdp }); }catch(e){ console.error(e); hangUp("end", t("callFailed")); } }
  if(row.kind === "decline") hangUp(null, t("callDeclined"));
  if(row.kind === "busy") hangUp(null, t("callBusy"));
  if(row.kind === "end") hangUp(null, t("callEnded"));
}

/* ---------- demo: a simulated call, so the screens can be tried without a second phone ---------- */
function demoCall(){
  C.demo = setTimeout(() => { if(!C) return; C.state = "connecting"; draw();
    C.demo = setTimeout(() => { if(!C) return; C.state = "live"; C.start = Date.now(); draw(); startTick(); }, 1200); }, 1500);
}
function demoIncoming(peerId, video){
  if(C) return;
  C = { id: newId(), peer: peerId, video: !!video, role: "callee", state: "incoming", demoIn: true };
  ring(); draw();
}
// in demo, "accept" just connects
const realAccept = accept;
async function acceptAny(){ if(C && C.demoIn){ stopRing(); C.state = "live"; C.start = Date.now(); draw(); startTick(); return; } return realAccept(); }

const callActions = {
  callStart(kind){ startCall(kind === "video" ? "video" : "voice"); }
};
export { acceptAny as accept, callActions, callsAvailable, demoIncoming, onSignal };
