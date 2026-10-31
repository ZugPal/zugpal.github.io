// Video messages: record up to 20 seconds with the front camera, send once, the other person can watch it once.
// MP4 when the phone can record it (plays everywhere), otherwise WebM. Small on purpose (about 300 kbit/s) so it gets
// through on a train. The recorder and the player live outside #app, so a redraw never stops them.
import { blobToDataUrl, sendMedia } from "./chat.js";
import { esc, t, toast } from "./util.js";

const MAX = 20;
let rec = null;
const TYPES = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm"];
const pickType = () => TYPES.find(x => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(x)) || "";
function layer(id){ let el = document.getElementById(id); if(!el){ el = document.createElement("div"); el.id = id; el.className = "medialayer"; document.body.appendChild(el); } return el; }
const close = id => { const el = document.getElementById(id); if(el) el.remove(); };
const fmt = s => "0:" + String(s).padStart(2, "0");

async function startVideo(){
  if(rec) return;
  if(!window.MediaRecorder || !navigator.mediaDevices) return toast(t("videoUnsupported"));
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 }, frameRate: { ideal: 24, max: 24 } },
    audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch(e){ console.error(e); return toast(t("camDenied")); }
  rec = { stream, chunks: [], mr: null, start: 0, timer: null, type: pickType() };
  const el = layer("videoRec");
  el.innerHTML = `<div class="vrbox" role="dialog" aria-modal="true" aria-label="${esc(t("videoMsg"))}">
    <video id="vrPreview" autoplay muted playsinline></video>
    <div class="vrtime" id="vrTime">${fmt(0)} / ${fmt(MAX)}</div>
    <div class="vrbtns"><button class="btn ghost small" id="vrCancel">${t("cancel")}</button>
      <button class="vrrec" id="vrRec" aria-label="${esc(t("videoRecord"))}"></button>
      <button class="btn small" id="vrSend" disabled>${t("send")}</button></div>
    <div class="small vrhint">${t("videoHint")}</div></div>`;
  el.querySelector("#vrPreview").srcObject = stream;
  el.querySelector("#vrCancel").onclick = () => stopVideo(false);
  el.querySelector("#vrRec").onclick = () => rec && rec.mr && rec.mr.state === "recording" ? rec.mr.stop() : begin();
  el.querySelector("#vrSend").onclick = () => stopVideo(true);
}
function begin(){
  const r = rec; if(!r) return;
  const opts = { videoBitsPerSecond: 300000, audioBitsPerSecond: 32000 }; if(r.type) opts.mimeType = r.type;
  try{ r.mr = new MediaRecorder(r.stream, opts); }catch(e){ r.mr = new MediaRecorder(r.stream); }
  r.chunks = [];
  r.mr.ondataavailable = e => { if(e.data && e.data.size) r.chunks.push(e.data); };
  r.mr.onstop = () => { clearInterval(r.timer); const s = document.getElementById("vrSend"); if(s) s.disabled = !r.chunks.length;
    const b = document.getElementById("vrRec"); if(b) b.classList.remove("on"); };
  r.mr.start(500); r.start = Date.now();
  document.getElementById("vrRec").classList.add("on");
  r.timer = setInterval(() => {
    const s = Math.min(MAX, Math.floor((Date.now() - r.start) / 1000)), el = document.getElementById("vrTime");
    if(el) el.textContent = fmt(s) + " / " + fmt(MAX);
    if(s >= MAX && r.mr.state === "recording") r.mr.stop();
  }, 250);
}
async function stopVideo(send){
  const r = rec; rec = null; if(!r) return close("videoRec");
  clearInterval(r.timer);
  if(r.mr && r.mr.state === "recording") await new Promise(ok => { r.mr.addEventListener("stop", ok, { once: true }); r.mr.stop(); });
  r.stream.getTracks().forEach(x => x.stop()); close("videoRec");
  if(!send || !r.chunks.length) return;
  const type = String((r.mr && r.mr.mimeType) || r.type || "video/webm").split(";")[0];
  const data = await blobToDataUrl(new Blob(r.chunks, { type }));
  if(data.length > 1450000) return toast(t("videoTooLong"));
  sendMedia("video", data);
}
// play a received video once, full screen
function playVideo(src, onDone){
  const el = layer("videoView");
  el.innerHTML = `<div class="vrbox" role="dialog" aria-modal="true"><video id="vvPlayer" autoplay playsinline controls controlslist="nodownload noremoteplayback" disablepictureinpicture></video>
    <div class="note">${t("onceNote")}</div><button class="btn mint small" id="vvClose">${t("close")}</button></div>`;
  const v = el.querySelector("#vvPlayer");
  v.oncontextmenu = e => e.preventDefault();
  const done = () => { try{ v.pause(); }catch(e){} v.removeAttribute("src"); close("videoView"); if(onDone) onDone(); };
  v.onended = done; v.onerror = () => { done(); toast(t("playFail")); };
  el.querySelector("#vvClose").onclick = done;
  v.src = src;
}

export { playVideo, startVideo };
