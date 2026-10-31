// Word games in the chat: the sheet to start Zugwort (zugwort.js) or Letter Train (letters.js) with a match, and the
// chat cards for their invites. Online chat cards (same system as chess):
//   zw:<gid>:<coop|race>-<lang>   Zugwort invite (sender starts; both phones derive the same word from <gid>)
//   zg:<gid>:<word>               a guess
//   lt:<gid>:<code>               Letter Train invite; <code> is "<lang>|<word>" lightly scrambled (sender picked the word)
//   lg:<gid>:<letter>             a guessed letter (only the receiver guesses)
import { peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { esc, t } from "./util.js";

const WLANGS = ["de", "en", "ar"];
const GID = /^[A-Za-z0-9]{4,12}$/;
const wordLang = () => WLANGS.includes(S.wordLang) ? S.wordLang : (WLANGS.includes(S.lang) ? S.lang : "de");

function langChips(act){
  return `<div class="seg" role="group" aria-label="${t("wordLang")}"><span class="small" style="align-self:center">${t("wordLang")}</span>${WLANGS.map(l =>
    `<button class="chip" data-act="${act}" data-arg="${l}" aria-pressed="${wordLang()===l}">${{de:"Deutsch",en:"English",ar:"العربية"}[l]}</button>`).join("")}</div>`;
}
// Small sheet in the chat: choose Zugwort mode, or pick a word for Letter Train
function wordSheet(){
  const w = S.wordSheet; if(!w) return "";
  const m = peerOf(S.chatWith), name = esc(m ? m.first_name : "");
  const body = w.game === "zw"
    ? `<h2>${t("zwName")}</h2>${langChips("wordLangPick")}
       <button class="btn" data-act="zwInvite" data-arg="coop">${t("zwTogether")}</button><div class="small">${t("coopNote")}</div>
       <button class="btn ghost" data-act="zwInvite" data-arg="race">${t("zwRace")}</button><div class="small">${t("raceNote")}</div>`
    : `<h2>${t("ltName")}</h2>${langChips("wordLangPick")}
       <div class="field"><label for="ltWord">${t("ltPick",{name})}</label><input type="text" id="ltWord" data-bind="ltWord" maxlength="12" autocomplete="off" autocapitalize="characters" dir="auto" value="${esc(S.draft.ltWord||"")}">
       <div class="small">${t("ltPickHint")}</div></div>
       <button class="btn" data-act="ltInvite">${t("ltSend")}</button>`;
  return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel">${body}
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="wordSheetClose">${t("cancel")}</button></div></div></div>`;
}

const wordActions = {
  wordSheet(game){ S.wordSheet = {game: game === "lt" ? "lt" : "zw"}; if(S.screen !== "chat"){ S.screen = "chat"; } render(); },
  wordSheetClose(){ S.wordSheet = null; render(); },
  wordLangPick(l){ if(WLANGS.includes(l)){ S.wordLang = l; render(); } }
};
// Chat cards for invites (moves zg/lg stay hidden in the chat)
function wordCard(p, x, name){
  const gid = String(p.val||""); if(!GID.test(gid)) return "";
  if(p.type==="zw") return `<div class="gamecard"><span class="lbl">${t("zwName")}</span><span>${x.mine ? t("zwStartMe") : t("zwStartThem",{name})}</span><button class="btn small" style="align-self:center" data-act="zwOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
  if(p.type==="lt") return `<div class="gamecard"><span class="lbl">${t("ltName")}</span><span>${x.mine ? t("ltStartMe") : t("ltStartThem",{name})}</span><button class="btn small" style="align-self:center" data-act="ltOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
  return "";
}

export { wordActions, wordCard, wordSheet };
