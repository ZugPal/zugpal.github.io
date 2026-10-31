// Actions: what happens when someone taps a [data-act] button.
import { SAFE_AUDIO, SAFE_PHOTO, SILENT_WAV, loadMessages, sendBody, startRecording, stopRecording, textCount } from "./chat.js";
import { AGES, DICE, LANGS, TOPICS, WORDS } from "./data.js";
import { chessState, cpuTurn, damaCpu, damaState } from "./games.js";
import { refresh, startPolling, stopPolling } from "./polling.js";
import { REPORT_REASONS, loadNotices, render } from "./screens.js";
import { S, backend, save } from "./state.js";
import { CARD, MAX_WAVES, berlinDate, hasContact, norm, t, toast } from "./util.js";
import { wordActions } from "./words.js";
import { classicActions } from "./classic.js";
import { libraryActions } from "./library.js";
import { partyActions } from "./party.js";
import { sponsorActions } from "./sponsor.js";
import { solitaireActions } from "./solitaire.js";
import { chessActions } from "./chessui.js";
import { damaActions } from "./damaui.js";
import { tableActions } from "./tablekit.js";

/* ---------------- Actions ---------------- */
function selectInvite(){ const el = document.getElementById("inviteText"); if(!el) return; const r = document.createRange(); r.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
async function safe(fn){ try{ await fn(); } catch(e){ console.error(e); const paused = /row-level security/i.test(String(e && e.message)); toast(paused ? t("pausedError") : t("netError")); if(paused) loadNotices(true); } }
const inviteLink = () => location.href.split("#")[0] + "#ride-" + S.ride.key.slice(5);
function joinTest(code){
  code = String(code).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);
  S.ride = {key:"TEST-" + code, label:t("testRide",{c:code}), expiresAt: Date.now() + 120*60000};
  S.seen = new Set(); S.buddySeen = new Set(); S.riders = []; S.matches = []; S.warnedEnd = false;
  save(); S.screen = "mood"; render();
}
function openProfile(){
  const p = S.profile || {};
  S.edit = {name:p.name||"", gender:p.gender||"", age:p.age||"", langs:[...(p.langs||[])], topics:[...(p.topics||[])], photo:p.photo||"", photoSmall:p.photoSmall||"", askMe:p.askMe||"", acceptPhotos:p.acceptPhotos!==false, practice:p.practice||"", agree:S.agreed};
  S.screen = "welcome";
}
const toggleIn = (arr, v) => { const i = arr.indexOf(v); i>=0 ? arr.splice(i,1) : arr.push(v); };
const actions = {
  gender(v){ S.edit.gender = v; render(); },
  lang2(v){ toggleIn(S.edit.langs, v); render(); },
  topic(v){ if(!S.edit.topics.includes(v) && S.edit.topics.length >= 5) return toast(t("maxTopics")); toggleIn(S.edit.topics, v); render(); },
  removePhoto(){ S.edit.photo = ""; S.edit.photoSmall = ""; render(); },
  saveProfile(){
    const e = S.edit, name = String(e.name||"").trim();
    if(!name) return toast(t("needName"));
    if(!e.gender) return toast(t("needGender"));
    if(!e.agree) return toast(t("needRules"));
    if(hasContact(e.askMe)) return toast(t("noContact"));
    S.profile = {name:name.slice(0,30), gender:e.gender, age:AGES.includes(e.age)?e.age:"", langs:e.langs.filter(l=>LANGS.includes(l)), topics:e.topics.filter(x=>TOPICS[x]).slice(0,5), photo:e.photo, photoSmall:e.photoSmall, askMe:String(e.askMe||"").trim().slice(0,60), acceptPhotos:e.acceptPhotos!==false, practice:/^(helper|learner-(A1|A2|B1|B2|C1))$/.test(e.practice||"") ? e.practice : ""};
    S.agreed = true; S.edit = null;
    if(e.gender!=="woman") S.womenOnly = false;
    save();
    if(S.account && !S.account.anon && backend.saveProfile) backend.saveProfile(S.profile).catch(e=>console.error(e));
    if(S.ride){ S.screen = "nearby"; safe(async()=>{ await backend.update(); await refresh(); }); startPolling(); }
    else if(S.autoRide){ const c = S.autoRide; S.autoRide = null; return joinTest(c); }
    else if(S.autoTalk){ S.autoTalk = false; return actions.checkin("talk"); }
    else S.screen = "checkin";
    render();
  },
  editProfile(){ openProfile(); render(); },
  go(where){ S.screen = where; if(where==="nearby") S.current = null; render(); },
  checkin(kind){
    const minutes = parseInt(S.draft.duration || "45", 10);
    let key, label;
    if(kind==="talk"){ key = "TALK-" + berlinDate(); label = t("talkTrain"); }
    else {
      const line = String(S.draft.line||"").trim(), num = String(S.draft.num||"").trim();
      if(!norm(line) || !norm(num)) return toast(t("needTrain"));
      key = norm(line) + "-" + norm(num) + "-" + berlinDate(); label = line.toUpperCase() + " · " + num;
    }
    S.ride = {key, label, expiresAt: Date.now() + minutes*60000};
    S.seen = new Set(); S.buddySeen = new Set(); S.riders = []; S.matches = []; S.warnedEnd = false;
    save(); S.screen = "mood"; render();
  },
  mood(id){ S.moods.has(id) ? S.moods.delete(id) : S.moods.add(id); if(!S.moods.size) S.moods.add(id); save(); render(); },
  mode(v){ S.draft.chatOnly = v==="chat"; render(); },
  goOpen(){
    S.chatOnly = !!(S.draft.chatOnly ?? S.chatOnly);
    S.coach = S.chatOnly ? "" : String(S.draft.coach ?? S.coach).replace(/[^0-9A-Za-z]/g,"").slice(0,4);
    S.womenOnly = S.profile.gender==="woman" && !!(S.draft.womenOnly ?? S.womenOnly);
    delete S.draft.coach; delete S.draft.womenOnly; delete S.draft.chatOnly;
    S.open = true; save(); S.screen = "nearby"; render();
    safe(async()=>{ await backend.checkIn(); await refresh(); startPolling(); });
  },
  toggleOpen(){ S.open = !S.open; render(); safe(async()=>{ await backend.update(); await refresh(); }); },
  wave(id){
    const r = S.riders.find(x=>x.id===id); if(!r) return;
    if(!r.waved && S.riders.filter(x=>x.waved).length + S.matches.length >= MAX_WAVES) return toast(t("waveLimit"));
    r.waved = !r.waved; render();
    safe(async()=>{ r.waved ? await backend.wave(id) : await backend.unwave(id); });
  },
  nextIce(){ S.iceIndex++; render(); },
  openGames(){ S.gamesBack = S.screen==="nearby" ? "nearby" : "checkin"; S.screen = "games"; render(); },
  chessCpu(){ const lvl = S.chess && S.chess.mode==="cpu" ? S.chess.level : "normal"; S.chess = {mode:"cpu", st:ZChess.newGame(), level:lvl, sel:null, last:null}; S.screen = "chess"; render(); },
  chessLevel(v){ if(S.chess) S.chess.level = v; render(); },
  chessInvite(){
    if(!S.chatWith) return;
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let gid = ""; for(let i=0;i<6;i++) gid += abc[Math.floor(Math.random()*abc.length)];
    sendBody(CARD + "chess:" + gid);
    S.chess = {mode:"online", gid, peerId:S.chatWith, sel:null, last:null}; S.screen = "chess"; render();
  },
  chessOpen(gid){ const m = S.matches.find(x=>x.id===S.chatWith); S.chess = {mode:"online", gid, peerId:S.chatWith, peerName:m && m.first_name, sel:null, last:null}; S.screen = "chess"; render(); },
  chessBack(where){ S.screen = where; render(); },
  damaCpuNew(){ const lvl = S.dama && S.dama.mode==="cpu" ? S.dama.level : "normal"; S.dama = {mode:"cpu", st:ZDama.newGame(), level:lvl, sel:null, last:null}; S.screen = "dama"; render(); },
  damaLevel(v){ if(S.dama) S.dama.level = v; render(); },
  damaInvite(){
    if(!S.chatWith) return;
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let gid = ""; for(let i=0;i<6;i++) gid += abc[Math.floor(Math.random()*abc.length)];
    sendBody(CARD + "dama:" + gid);
    S.dama = {mode:"online", gid, peerId:S.chatWith, sel:null}; S.screen = "dama"; render();
  },
  damaOpen(gid){ const m = S.matches.find(x=>x.id===S.chatWith); S.dama = {mode:"online", gid, peerId:S.chatWith, peerName:m && m.first_name, sel:null}; S.screen = "dama"; render(); },
  dq(arg){
    const d = S.dama, ds = damaState(); if(!d || !ds || d.thinking) return;
    const i = +arg, {st, myColor} = ds;
    if(ZDama.status(st).over || st.turn !== myColor) return;
    const moves = ZDama.legal(st);
    if(d.sel !== null && d.sel !== undefined){
      const m = moves.find(mv=>mv.path[0]===d.sel && mv.path[mv.path.length-1]===i);
      if(m){
        d.sel = null;
        if(d.mode==="cpu"){ d.st = ZDama.apply(st, m); d.last = m.path; render(); if(!ZDama.status(d.st).over) damaCpu(); }
        else sendBody(CARD + "dm:" + d.gid + ":" + ZDama.key(m));
        return;
      }
    }
    if(ZDama.color(st.b[i])===myColor){
      if(moves.some(mv=>mv.path[0]===i)) d.sel = i;
      else { d.sel = null; if(moves.length && moves[0].taken.length) toast(t("mustCapture")); }
    } else d.sel = null;
    render();
  },
  sq(arg){
    const c = S.chess, cs = chessState(); if(!c || !cs || c.thinking) return;
    const i = +arg, {st, myColor} = cs;
    if(ZChess.status(st).over || st.turn !== myColor) return;
    if(c.sel !== null && c.sel !== undefined){
      const m = ZChess.legal(st).find(mv=>mv.from===c.sel && mv.to===i && (!mv.promo || mv.promo==="Q"));
      if(m){
        c.sel = null; c.last = {from:m.from, to:m.to};
        if(c.mode==="cpu"){ c.st = ZChess.apply(st, m); render(); if(!ZChess.status(c.st).over) cpuTurn(); }
        else sendBody(CARD + "cm:" + c.gid + ":" + ZChess.uci(m));
        return;
      }
    }
    c.sel = (st.b[i] && st.b[i][0]===myColor) ? i : null; render();
  },
  pickPhoto(){
    const m = S.matches.find(x=>x.id===S.chatWith);
    if(m && m.accept_photos === false) return toast(t("photosOff",{name:m.first_name}));
    if(textCount(true) < 2 || textCount(false) < 2) return toast(t("photoLocked"));
    S.photoSheet = true; render();
  },
  photoCam(){ S.photoSheet = false; const inp = document.getElementById("mediaCam"); if(inp){ inp.value = ""; inp.click(); } render(); },
  photoGal(){ S.photoSheet = false; const inp = document.getElementById("mediaPhoto"); if(inp){ inp.value = ""; inp.click(); } render(); },
  photoSheetClose(){ S.photoSheet = false; render(); },
  recStart(){ startRecording(); },
  recCancel(){ stopRecording(false); },
  recSend(){ stopRecording(true); },
  closeViewer(){ S.viewer = null; render(); },
  openMedia(arg){
    const [id, kind] = arg.split("|");
    let audio = null;
    if(kind==="voice"){ audio = new Audio(); audio.src = SILENT_WAV; const pr = audio.play(); if(pr && pr.catch) pr.catch(()=>{}); }
    safe(async()=>{
      let r = S.mediaCache[id] ? {media_data:S.mediaCache[id]} : await backend.openMedia(id);
      S.mediaDone.add(id);
      const demo = String(id).startsWith("d-");
      if(!r){ toast(t("mediaGone")); return render(); }
      const src = r.media_data;
      if(kind==="photo"){
        if(!(SAFE_PHOTO.test(src) || (demo && String(src).startsWith("data:image/svg+xml")))) return render();
        S.viewer = src; render();
      } else {
        if(!SAFE_AUDIO.test(src)) return render();
        S.mediaCache[id] = src;
        S.playing = id; render();
        const a = audio || new Audio();
        const fail = () => { if(S.playing!==id) return; S.playing = null; S.mediaDone.delete(id); render(); toast(t("playFail")); };
        a.onended = () => { S.playing = null; delete S.mediaCache[id]; render(); };
        a.onerror = fail;
        try{ a.pause(); }catch(e){}
        a.src = src;
        const pr = a.play(); if(pr && pr.catch) pr.catch(fail);
      }
    });
  },
  reportMedia(id){ safe(async()=>{ await backend.reportMedia(id); toast(t("mediaReported") + " " + t("safetyNote")); }); },
  startTest(){ const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let c = ""; for(let i=0;i<5;i++) c += abc[Math.floor(Math.random()*abc.length)]; joinTest(c); },
  copyInvite(){
    const link = inviteLink();
    try{ navigator.clipboard.writeText(link).then(()=>toast(t("copied")), ()=>selectInvite()); }catch(e){ selectInvite(); }
  },
  moodBefore(n){ n = +n; S.moodBefore = S.moodBefore===n ? null : n; render(); },
  moodAfterSet(n){ n = +n; S.moodAfter = S.moodAfter===n ? null : n; render(); },
  chat(id){ S.chatWith = id; S.current = S.matches.find(m=>m.id===id) || S.current; S.messages = []; S.screen = "chat"; render(); safe(loadMessages); },
  accLink(){
    const email = String(S.draft.accEmail||"").trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return toast(t("accBad"));
    if(!backend.linkEmail) return toast(t("accDemo"));
    safe(async()=>{ if(S.account && S.account.anon) await backend.linkEmail(email); else await backend.emailLogin(email); S.accSent = true; render(); });
  },
  accMode(m){ S.accLogin = m === "login"; render(); },
  accSignOut(){ safe(async()=>{ await backend.signOut(); localStorage.removeItem("abteil.v1"); location.reload(); }); },
  recommendSet(v){ S.recommend = v === "yes" ? true : v === "no" ? false : null; render(); },
  hostOpen(){ S.hostSheet = true; render(); },
  hostClose(){ S.hostSheet = false; render(); },
  hostUnlock(){
    const code = String(S.draft.hostCode||"").trim(); if(!code) return;
    if(!backend.becomeHost) return toast(t("accDemo"));
    safe(async()=>{ try{ await backend.becomeHost(code); S.isHost = true; S.hostSheet = false; S.draft.hostCode = ""; toast(t("hostOn")); render(); }
      catch(e){ if(/wrong code/.test(String(e && e.message))) toast(t("hostWrong")); else throw e; } });
  },
  hostSend(){
    const body = String(S.draft.hostMsg||"").trim(); if(!body) return;
    if(!confirm(t("hostConfirm"))) return;
    safe(async()=>{ await backend.hostAnnounce(body.slice(0,280)); S.draft.hostMsg = ""; S.hostStats = await backend.hostStats(); S.announcement = body.slice(0,280); toast(t("hostSent")); render(); });
  },
  reloadApp(){ location.reload(); },
  install(){ const p = S.installPrompt; if(!p) return; S.installPrompt = null; p.prompt(); p.userChoice.finally(() => render()); },
  practice(v){ if(S.edit){ S.edit.practice = S.edit.practice === v ? "" : v; render(); } },
  practiceLevel(l){ if(S.edit && ["A1","A2","B1","B2","C1"].includes(l)){ S.edit.practice = "learner-" + l; render(); } },
  sendWord(){ const d = new Date(berlinDate()); sendBody(CARD + "word:" + (Math.floor(d.getTime()/86400000) % WORDS.length)); },
  game(kind){
    let body = CARD + kind;
    if(kind==="dice") body += ":" + Math.floor(Math.random()*DICE.en.length);
    if(kind==="spin") body += ":" + (Math.random() < .5 ? "me" : "you");
    sendBody(body);
  },
  sayBye(){
    if(S.screen==="chat" && S.chatWith) return sendBody(CARD + "bye");
    S.matches.forEach(m=>safe(()=>backend.send(m.id, CARD + "bye")));
    toast(t("bye"));
  },
  buddyToggle(id){
    const on = !S.buddies.has(id); on ? S.buddies.add(id) : S.buddies.delete(id); save(); render();
    safe(()=>backend.buddy(id, on));
  },
  report(id){ actions.reportOpen(id); },
  reportOpen(id){
    const p = S.matches.find(x=>x.id===id) || S.riders.find(x=>x.id===id) || (S.current && S.current.id===id ? S.current : null);
    S.reportSheet = {id, name:p ? p.first_name : "", reason:null}; S.draft.reportDetails = ""; S.draft.reportBlock = true; render();
  },
  reportReason(k){ if(S.reportSheet && REPORT_REASONS.includes(k)){ S.reportSheet.reason = k; render(); } },
  reportCancel(){ S.reportSheet = null; render(); },
  reportSend(){
    const r = S.reportSheet; if(!r) return; if(!r.reason) return toast(t("reportPick"));
    const details = String(S.draft.reportDetails||"").trim().slice(0,500), alsoBlock = S.draft.reportBlock !== false;
    safe(async()=>{
      const n = await backend.fileReport(r.id, r.reason, details);
      S.reportSheet = null; S.reportDone = {n}; S.draft.reportDetails = "";
      if(alsoBlock){ S.buddies.delete(r.id); save(); await backend.buddy(r.id, false).catch(()=>{}); await backend.block(r.id);
        S.matches = S.matches.filter(m=>m.id!==r.id); S.riders = S.riders.filter(x=>x.id!==r.id);
        if(S.chatWith===r.id || (S.current && S.current.id===r.id)){ S.screen = "nearby"; S.current = null; S.chatWith = null; } }
      render(); loadNotices(true);
    });
  },
  reportDoneClose(){ S.reportDone = null; render(); },
  noticesOk(){ const ids = S.notices.filter(n=>!n.seen).map(n=>n.id); S.notices.forEach(n=>n.seen = true); render(); if(ids.length) safe(()=>backend.noticesSeen(ids)); },
  leaveChat(id){
    const m = S.matches.find(x=>x.id===id); const name = m ? m.first_name : "";
    S.matches = S.matches.filter(x=>x.id!==id); S.riders.forEach(r=>{ if(r.id===id) r.waved = false; });
    S.screen = "nearby"; S.current = null; S.chatWith = null; S.messages = []; render();
    safe(async()=>{ await backend.leave(id); toast(t("leftToast",{name})); });
  },
  block(id){ S.buddies.delete(id); save(); safe(async()=>{ await backend.buddy(id, false).catch(()=>{}); await backend.block(id); S.matches = S.matches.filter(m=>m.id!==id); S.riders = S.riders.filter(r=>r.id!==id); S.screen="nearby"; S.current=null; toast(t("blockedToast")); }); },
  endRide(){ startFeedback(); },
  fbComfy(arg){ const [id, v] = arg.split("|"); S.fb[id].comfy = v==="yes"; render(); },
  fbBadge(arg){ const [id, k] = arg.split("|"); const b = S.fb[id].badges; b.has(k) ? b.delete(k) : b.add(k); render(); },
  finish(){ finishRide(); }
};
function startFeedback(){
  stopPolling();
  S.fbList = S.matches.slice();
  S.fb = {}; S.fbList.forEach(m=>S.fb[m.id] = {comfy:null, badges:new Set(), buddy:S.buddies.has(m.id)});
  S.screen = "feedback"; render();
}
async function finishRide(){
  stopPolling();
  const jobs = [];
  for(const id in S.fb){
    const f = S.fb[id];
    if(f.comfy === false) jobs.push(backend.fileReport(id, "comfort", "did not feel comfortable").catch(()=>backend.report(id, "did not feel comfortable")));
    f.badges.forEach(k=>jobs.push(backend.compliment(id, k)));
    if(f.buddy){ S.buddies.add(id); jobs.push(backend.buddy(id, true)); } else if(S.buddies.has(id)){ S.buddies.delete(id); jobs.push(backend.buddy(id, false)); }
  }
  const before = S.moodBefore, after = S.moodAfter, rec = typeof S.recommend === "boolean" ? S.recommend : null;
  if(before || after || rec !== null) jobs.push(backend.recordMood(before, after, S.fbList.length > 0, rec));
  try{ await Promise.all(jobs); }catch(e){ console.error(e); }
  try{ if(backend && S.ride) await backend.checkOut(); }catch(e){ console.error(e); }
  S.ride = null; S.riders = []; S.matches = []; S.current = null; S.chatWith = null; S.messages = []; S.fb = {}; S.fbList = [];
  S.moodBefore = null; S.moodAfter = null; S.recommend = null; S.announcement = null; S.hostStats = null;
  save(); S.screen = "checkin"; toast(before && after && after > before ? t("moodUp") : t("endedToast"));
}

Object.assign(actions, wordActions, classicActions, libraryActions, partyActions, sponsorActions, solitaireActions, chessActions, damaActions, tableActions);

export { actions, inviteLink, joinTest, openProfile, safe, startFeedback };
