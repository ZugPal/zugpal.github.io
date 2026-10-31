// The 1:1 chat, built to feel like WhatsApp: a header with the person's status and call buttons, bubbles with time and
// ticks, day separators, one "+" for photos, video, games and icebreakers, and a microphone that turns into Send while
// you type. The safety links (Report, Block, Leave chat) stay visible under the header.
// The same chat opens as a drawer over a running online game (chat while you play).
import { DICE, WORDS } from "./data.js";
import { COUNTED, GLYPH, currentActivity } from "./games.js";
import { S } from "./state.js";
import { ICON, MONEY_RE, esc, hasContact, parseMsg, photo, t } from "./util.js";
import { wordCard } from "./words.js";
import { cgCard } from "./classic.js";
import { bookCard } from "./library.js";
import { partyCard } from "./party.js";
import { callsAvailable } from "./call.js";

const HIDDEN = ["cm", "cx", "dm", "dx", "zg", "lg", "cgm", "cgx", "qa", "slsub", "slstop", "slrej"];
const GAME_NAMES = { chess: "chess", dama: "damaT", qz: "qzName", sl: "slName", zw: "zwName", lt: "ltName" };
const CG_NAMES = { four: "fourName", muehle: "muehleName", mau: "mauName" };
const locale = () => S.lang === "ar" ? "ar-u-nu-latn" : S.lang;
const hm = at => new Date(at).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
function dayLabel(at){
  const d = new Date(at), today = new Date(), y = new Date(Date.now() - 864e5);
  if(d.toDateString() === today.toDateString()) return t("today");
  if(d.toDateString() === y.toDateString()) return t("yesterday");
  return d.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
}
// "Online", "Playing Chess", "Last seen 3 min ago"
function peerStatus(m){
  if(!m || !m.seen_at) return "";
  const age = Date.now() - Date.parse(m.seen_at);
  if(age < 25000){
    const g = String(m.active_game || "");
    if(g.startsWith("g:")){
      const gid = g.slice(2); let name = "";
      for(const x of S.messages){ const p = parseMsg(x.body); if(p.val === gid){ name = p.type === "cg" ? t(CG_NAMES[p.extra] || "moreGames") : GAME_NAMES[p.type] ? t(GAME_NAMES[p.type]) : ""; } }
      return name ? t("playingX", { g: name }) : t("inAGame");
    }
    return t("onlineNow");
  }
  const min = Math.round(age / 60000);
  return min < 60 ? t("lastSeenMin", { n: Math.max(1, min) }) : "";
}
const meta = x => `<span class="meta">${hm(x.at)}${x.mine ? `<span class="tick" aria-label="${x.pending ? t("waitingOne") : t("sentOne")}">${x.pending ? ICON.clock : "✓"}</span>` : ""}</span>`;
function bubble(x, name){
  const p = parseMsg(x.body);
  if(p.type === "text"){
    if(!x.mine && hasContact(x.body)) return `<div class="banner">${t("noContact")}</div>`;
    return `<div class="msg${x.mine ? " mine" : ""}${x.pending ? " pending" : ""}"><span class="txt" dir="auto">${esc(x.body)}</span>${meta(x)}</div>`
      + (!x.mine && MONEY_RE.test(x.body) ? `<div class="banner">${t("moneyWarn")}</div>` : "");
  }
  if(HIDDEN.includes(p.type)) return "";
  if(p.type === "word"){ const wd = WORDS[Math.abs(parseInt(p.val, 10) || 0) % WORDS.length];
    return `<div class="gamecard"><span class="lbl">${t("wordTitle")}</span><button class="big wordflip" lang="de" data-act="wordMeaning" data-arg="${Math.abs(parseInt(p.val, 10) || 0) % WORDS.length}">${esc(wd[0])}</button><span class="wmean">${esc(S.lang === "de" ? wd[1] : S.lang === "ar" ? wd[3] : wd[2])}</span><span class="small" style="color:inherit">${t("wordTask")}</span></div>`; }
  if(p.type === "dice"){ const i = Math.abs(parseInt(p.val, 10) || 0) % DICE.en.length; return `<div class="gamecard"><span class="lbl">${t("dice")}</span><span class="big">${esc(DICE[S.lang][i])}</span></div>`; }
  if(p.type === "spin"){ const meAsks = (x.mine && p.val === "me") || (!x.mine && p.val === "you"); return `<div class="gamecard"><span class="lbl">${t("spin")}</span><span class="big">${meAsks ? t("spinYou") : t("spinThem", { name })}</span></div>`; }
  if(p.type === "ttl") return `<div class="gamecard"><span class="lbl">${t("ttl")}</span><span>${x.mine ? t("ttlYou", { name }) : t("ttlThem", { name })}</span></div>`;
  if(p.type === "bye") return `<div class="msg${x.mine ? " mine" : ""}"><span class="txt">${t("bye")}</span>${meta(x)}</div>`;
  if(p.type === "qz" || p.type === "sl") return partyCard(p, x, name);
  if(p.type === "cg") return cgCard(p, x, name);
  if(p.type === "book") return bookCard(p, x, name);
  if(p.type === "zw" || p.type === "lt") return wordCard(p, x, name);
  if(p.type === "call"){
    const missed = p.extra === "missed";
    return `<div class="callnote">${p.val === "video" ? ICON.video : ICON.phone}<span>${missed ? (x.mine ? t("callNoAnswer") : t("callMissed")) : t("callDone", { d: esc(p.extra || "") })}</span><span class="small">${hm(x.at)}</span></div>`;
  }
  if(p.type === "dama" || p.type === "chess"){
    const gid = String(p.val || ""); if(!/^[A-Za-z0-9]{4,12}$/.test(gid)) return "";
    const isC = p.type === "chess";
    return `<div class="gamecard"><span class="lbl">${isC ? t("chess") : t("damaT")}</span><span>${x.mine ? t(isC ? "chessStartMe" : "damaStartMe") : t(isC ? "chessStartThem" : "damaStartThem", { name })}</span><button class="btn small" style="align-self:center" data-act="${isC ? "chessOpen" : "damaOpen"}" data-arg="${gid}">${t("openBoard")}</button></div>`;
  }
  if(p.type === "media"){
    const id = String(p.val || ""), kind = p.extra === "voice" ? "voice" : p.extra === "video" ? "video" : "photo";
    if(!/^[A-Za-z0-9-]{3,40}$/.test(id)) return "";
    const ic = kind === "photo" ? ICON.camera : kind === "video" ? ICON.video : ICON.mic;
    const out = { photo: "photoOut", voice: "voiceOut", video: "videoOut" }[kind], seen = { photo: "photoSeen", voice: "voiceHeard", video: "videoSeen" }[kind], inn = { photo: "photoIn", voice: "voiceIn", video: "videoIn" }[kind];
    if(x.mine){ const st = S.mediaStatus[id]; return `<div class="mediacard mine">${ic}<span>${t(out)}${st === true ? `<span class="small">· ${t("openedTag")}</span>` : st === false ? `<span class="small">· ${t("notOpened")}</span>` : ""}</span>${meta(x)}</div>`; }
    if(S.playing === id) return `<div class="mediacard">${ic}<span>${t("playing")}</span></div>`;
    if(S.mediaDone.has(id)) return `<div class="mediacard">${ic}<span>${t(seen)}</span>${Date.now() - x.at < 86400000 ? `<button class="link" data-act="reportMedia" data-arg="${id}">${t("report")}</button>` : ""}</div>`;
    return `<button class="mediacard" data-act="openMedia" data-arg="${id}|${kind}">${kind === "photo" ? ICON.eye : ic}<span>${S.mediaCache[id] ? t("tryAgain") : t(inn)}</span>${meta(x)}</button>`;
  }
  return "";
}
function chatLogHtml(m){
  const name = esc(m.first_name); let day = "", out = "";
  for(const x of S.messages){
    const b = bubble(x, name); if(!b) continue;
    const d = new Date(x.at).toDateString();
    if(d !== day){ day = d; out += `<div class="daysep"><span>${esc(dayLabel(x.at))}</span></div>`; }
    out += b;
  }
  S.readCount[m.id] = S.messages.filter(x => !x.mine && COUNTED(x)).length; S.lastUnread = 0;
  return out || `<div class="chatempty">${ICON.shield}<span>${t("chatEmpty", { name })}</span></div>`;
}
function composer(){
  if(S.recording) return `<form class="chatbar wa" id="chatForm"><div class="recbar"><span class="dot"></span><span id="recTime">0:00</span><span class="small">${t("recording")}</span></div>
    <button type="button" class="link" data-act="recCancel">${t("cancel")}</button><button type="button" class="sendbtn" data-act="recSend" aria-label="${t("send")}">${ICON.send}</button></form>`;
  const has = String(S.draft.chat || "").trim() ? " has-text" : "";
  return `<form class="chatbar wa${has}" id="chatForm">
    <button type="button" class="iconbtn plusbtn" data-act="plusOpen" aria-label="${t("plusLabel")}">${ICON.plus}</button>
    <textarea id="chatInput" data-bind="chat" rows="1" maxlength="500" enterkeyhint="send" dir="auto" autocomplete="off" placeholder="${t("chatPh")}" aria-label="${t("chatPh")}">${esc(S.draft.chat || "")}</textarea>
    <button type="button" class="sendbtn micbtn" data-act="recStart" aria-label="${t("voiceBtn")}">${ICON.mic}</button>
    <button class="sendbtn" type="submit" id="chatSend" aria-label="${t("send")}">${ICON.send}</button></form>`;
}
function safetyStrip(id){
  return `<div class="safety strip"><span class="shield">${ICON.shield}</span>
    <button class="link" data-act="reportOpen" data-arg="${esc(id)}">${t("reportShort")}</button>
    <button class="link" data-act="block" data-arg="${esc(id)}">${t("block")}</button>
    <button class="link danger" data-act="leaveChat" data-arg="${esc(id)}">${t("leaveChat")}</button>
    <span class="small">${t("safetyNote")}</span></div>`;
}
function chatScreen(endingBanner, notifyCard){
  const m = S.matches.find(x => x.id === S.chatWith) || S.current;
  if(!m) return "";
  const isB = S.buddies.has(m.id), calls = callsAvailable();
  return `<div class="screen chatscreen">
    <div class="chathead"><button class="iconbtn flip" data-act="go" data-arg="nearby" aria-label="${t("back")}">${ICON.back}</button>
      ${photo(m.id, m.first_name, m.photo, 40, false)}
      <div class="grow" id="chatHead" data-soft><div class="pname">${esc(m.first_name)}</div><div class="small status">${esc(peerStatus(m))}</div></div>
      ${calls ? `<button class="iconbtn" data-act="callStart" data-arg="voice" aria-label="${t("callVoice")}">${ICON.phone}</button>
      <button class="iconbtn" data-act="callStart" data-arg="video" aria-label="${t("callVideo")}">${ICON.video}</button>` : ""}
      <button class="iconbtn" data-act="buddyToggle" data-arg="${esc(m.id)}" aria-pressed="${isB}" aria-label="${t("buddySave")}">${isB ? ICON.starFull : ICON.star}</button></div>
    ${safetyStrip(m.id)}
    <div id="chatEnding" data-soft>${endingBanner()}</div>
    ${notifyCard()}
    <div id="chatLog" class="chatlog wa" data-soft>${chatLogHtml(m)}</div>
    ${composer()}
  </div>`;
}
// the "+" sheet: everything you can send besides text
function plusSheet(){
  const it = (act, arg, icon, label, cls = "") => `<button class="plusitem${cls}" data-act="${act}"${arg ? ` data-arg="${arg}"` : ""}><span class="pi">${icon}</span><span>${label}</span></button>`;
  return `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="plT"><div class="panel plussheet">
    <h2 id="plT" class="sr">${t("plusLabel")}</h2>
    <div class="plusgrid">
      ${it("plusCam", "", ICON.camera, t("takePhoto"))}${it("plusGal", "", ICON.image, t("fromGallery"))}${it("plusVideo", "", ICON.video, t("videoMsg"))}
      ${it("sendWord", "", ICON.bubble, t("wordShort"))}${it("libPick", "", ICON.book, t("libStory"))}
    </div>
    <div class="flabel">${t("gamesTogether")}</div>
    <div class="plusgrid">
      ${it("qzInvite", "", `<b>?</b>`, t("qzName"), " suggest")}${it("chessInvite", "", `<span class="pc b">${GLYPH.N}︎</span>`, t("chess"))}
      ${it("wordSheet", "zw", `<span class="tile g">Z</span>`, t("zwName"))}${it("wordSheet", "lt", ICON.cards, t("ltName"))}
      ${it("damaInvite", "", `<span class="dm b"></span>`, t("damaT"))}${it("cgSheet", "", ICON.dice, t("moreGames"))}
    </div>
    <div class="flabel">${t("icebreakers")}</div>
    <div class="plusgrid">${it("game", "dice", ICON.dice, t("dice"))}${it("game", "spin", ICON.spin, t("spin"))}${it("game", "ttl", ICON.cards, t("ttl"))}</div>
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="plusClose">${t("close")}</button></div>
  </div></div>`;
}
// chat while you play: a button over online games, and the chat as a drawer
const ONLINE = () => (S.screen === "chess" && S.chess && S.chess.mode === "online") || (S.screen === "dama" && S.dama && S.dama.mode === "online")
  || (S.screen === "zugwort" && S.zw && S.zw.mode === "online") || (S.screen === "letters" && S.lt && S.lt.mode === "online")
  || (S.screen === "table" && S.tk && S.tk.mode === "online") || (S.screen === "quiz" && S.qz && S.qz.mode === "online") || (S.screen === "slf" && !!S.sl);
function gameChat(){
  if(!S.chatWith || !ONLINE() || !currentActivity()) return "";
  const m = S.matches.find(x => x.id === S.chatWith) || S.current; if(!m) return "";
  const unread = S.messages.filter(x => !x.mine && COUNTED(x)).length - (S.readCount[m.id] || 0);
  if(!S.chatDrawer) return `<button class="chatfab" data-act="chatDrawer" aria-label="${t("openChat")}">${ICON.bubble}${unread > 0 ? `<span class="badge">${unread}</span>` : ""}</button>`;
  return `<div class="drawer" role="dialog" aria-modal="true" aria-label="${esc(m.first_name)}"><div class="drawerpanel">
    <div class="chathead">${photo(m.id, m.first_name, m.photo, 32, false)}<div class="grow" id="chatHead" data-soft><div class="pname">${esc(m.first_name)}</div><div class="small status">${esc(peerStatus(m))}</div></div>
      <button class="link" data-act="reportOpen" data-arg="${esc(m.id)}">${t("reportShort")}</button><button class="iconbtn" data-act="chatDrawerClose" aria-label="${t("close")}">✕</button></div>
    <div id="chatLog" class="chatlog wa" data-soft>${chatLogHtml(m)}</div>
    ${composer()}</div></div>`;
}

export { chatLogHtml, chatScreen, gameChat, peerStatus, plusSheet };
