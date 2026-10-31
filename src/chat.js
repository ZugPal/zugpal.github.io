// Chat: sending text, view-once photos, play-once voice (WAV 8 kHz), loading messages.
import { safe } from "./actions.js";
import { peerOf, unreadFrom } from "./games.js";
import { render } from "./screens.js";
import { S, backend } from "./state.js";
import { hasContact, parseMsg, t, toast } from "./util.js";

/* ---------------- Photo handling ---------------- */
function resizeImage(file, size, quality){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = c.height = size; const s = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, size, size); URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", quality)); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
const SILENT_WAV = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";
const SAFE_PHOTO = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const SAFE_AUDIO = /^data:audio\/(wav|webm|mp4|ogg|aac|mpeg|x-m4a)(;[a-z0-9=._-]+)*;base64,[A-Za-z0-9+/=]+$/i;
function resizeMax(file, max, quality){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
      c.width = Math.round(img.width*r); c.height = Math.round(img.height*r); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", quality)); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
const blobToDataUrl = b => new Promise((ok, fail)=>{ const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(b); });
const textCount = mine => S.messages.filter(m=>!!m.mine===mine && parseMsg(m.body).type==="text").length;
async function sendMedia(kind, data){
  const to = S.chatWith; if(!to) return;
  toast(t("sending"));
  try{ await backend.sendMedia(to, kind, data); await loadMessages(); }
  catch(e){
    const msg = String(e && e.message || e);
    const m = S.matches.find(x=>x.id===to);
    toast(/photos locked/.test(msg) ? t("photoLocked") : /photos off/.test(msg) ? t("photosOff",{name:m ? m.first_name : ""})
      : /send_media|PGRST202|schema cache|does not exist|Could not find/i.test(msg) ? t("mediaSetup") : t("netError"));
  }
}
let rec = null, recTimer = null;
function encodeWav(chunks, inRate, outRate){
  let len = 0; chunks.forEach(c=>len += c.length);
  const all = new Float32Array(len); let o = 0; chunks.forEach(c=>{ all.set(c, o); o += c.length; });
  const ratio = inRate / outRate, outLen = Math.floor(len / ratio), mono = new Float32Array(outLen);
  let peak = 0;
  for(let i = 0; i < outLen; i++){ const a = Math.floor(i*ratio), b = Math.min(len, Math.floor((i+1)*ratio)); let sum = 0; for(let j = a; j < b; j++) sum += all[j]; const v = sum / Math.max(1, b - a); mono[i] = v; if(Math.abs(v) > peak) peak = Math.abs(v); }
  const gain = peak > 0.01 && peak < 0.9 ? Math.min(4, 0.9 / peak) : 1;
  const buf = new ArrayBuffer(44 + outLen*2), dv = new DataView(buf);
  const w = (off, str) => { for(let i = 0; i < str.length; i++) dv.setUint8(off + i, str.charCodeAt(i)); };
  w(0,"RIFF"); dv.setUint32(4, 36 + outLen*2, true); w(8,"WAVE"); w(12,"fmt "); dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,1,true);
  dv.setUint32(24,outRate,true); dv.setUint32(28,outRate*2,true); dv.setUint16(32,2,true); dv.setUint16(34,16,true); w(36,"data"); dv.setUint32(40,outLen*2,true);
  for(let i = 0; i < outLen; i++){ const v = Math.max(-1, Math.min(1, mono[i]*gain)); dv.setInt16(44 + i*2, v < 0 ? v*0x8000 : v*0x7FFF, true); }
  return new Blob([buf], {type:"audio/wav"});
}
async function startRecording(){
  let ctx = null;
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC(); if(ctx.state === "suspended" && ctx.resume) ctx.resume();
    const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}});
    const src = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks = [];
    node.onaudioprocess = e => { chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
    src.connect(node); node.connect(ctx.destination);
    rec = {ctx, stream, src, node, chunks, rate:ctx.sampleRate};
    S.recording = {start:Date.now()}; render();
    clearInterval(recTimer);
    recTimer = setInterval(()=>{
      if(!S.recording){ clearInterval(recTimer); return; }
      const sec = Math.floor((Date.now()-S.recording.start)/1000);
      if(sec >= 60){ stopRecording(true); return; }
      const el = document.getElementById("recTime"); if(el) el.textContent = Math.floor(sec/60) + ":" + String(sec%60).padStart(2,"0");
    }, 250);
  }catch(e){ console.error(e); try{ ctx && ctx.close(); }catch(_){} toast(t("micDenied")); }
}
function stopRecording(send){
  clearInterval(recTimer);
  const r = rec; rec = null; S.recording = null; render();
  if(!r) return;
  try{ r.node.disconnect(); r.src.disconnect(); }catch(e){}
  r.stream.getTracks().forEach(tr=>tr.stop());
  try{ r.ctx.close(); }catch(e){}
  if(!send || !r.chunks.length) return;
  blobToDataUrl(encodeWav(r.chunks, r.rate, 8000)).then(d=>{ if(d.length < 1450000) sendMedia("voice", d); else toast(t("voiceTooLong")); });
}
function sendBody(body){
  if(!S.chatWith) return;
  S.messages.push({mine:true, body, at:Date.now()}); render();
  safe(async()=>{ await backend.send(S.chatWith, body); await loadMessages(); });
}
function sendChat(){ const body = String(S.draft.chat||"").trim(); if(!body) return; if(hasContact(body)) return toast(t("noContact")); S.draft.chat = ""; sendBody(body.slice(0,500)); }
async function loadMessages(){
  if(!S.chatWith) return;
  S.messages = await backend.messages(S.chatWith);
  try{ S.mediaStatus = await backend.mediaStatus(); }catch(e){}
  if(S.screen==="chess" || S.screen==="dama" || S.screen==="table"){
    const un = unreadFrom(S.chatWith);
    if(un > S.lastUnread){ const m = peerOf(S.chatWith); toast(t("newMsgFrom",{name:m ? m.first_name : ""})); try{ navigator.vibrate && navigator.vibrate(60); }catch(e){} }
    S.lastUnread = Math.max(0, un);
  }
  if((S.screen==="chat" || S.screen==="chess" || S.screen==="dama") && !S.viewer) render();
}

export { SAFE_AUDIO, SAFE_PHOTO, SILENT_WAV, loadMessages, resizeImage, resizeMax, sendBody, sendChat, sendMedia, startRecording, stopRecording, textCount };
