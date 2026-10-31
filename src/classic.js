// Classic games: Vier in einer Reihe (fourui.js), Mühle (muehleui.js), Mau-Mau (mauui.js), all on the shared frame
// in tablekit.js. This module starts them from the games screen and from the chat:
//   cg:<gid>:<four|muehle|mau>   invite (sender plays "w" and starts; Mau-Mau deals from <gid>, so both phones see the same game)
//   cgm:<gid>:<move>              a move in the engine's own format, cgx:<gid>:resign|draw|accept|decline (tablekit.js)
import { sendBody } from "./chat.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { isTable, tableActions } from "./tablekit.js";
import { CARD, parseMsg, t } from "./util.js";
import "./fourui.js";
import "./muehleui.js";
import "./mauui.js";

const GAMES = ["four", "muehle", "mau"];
const GID = /^[A-Za-z0-9]{4,12}$/;
const newGid = () => Math.random().toString(36).slice(2, 10);
const NAME = g => t(g + "Name");

function cgSheet(){
  if(!S.cgSheet) return "";
  return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel"><h2>${t("moreGames")}</h2>
    ${GAMES.map(g => `<button class="btn ghost" data-act="cgInvite" data-arg="${g}">${NAME(g)}</button>`).join("")}
    <button class="btn ghost" data-act="qzInvite">${t("qzName")}</button>
    <button class="btn ghost" data-act="slInvite">${t("slName")}</button>
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="cgSheetClose">${t("cancel")}</button></div></div></div>`;
}
function cgCard(p, x, name){
  const gid = String(p.val||""); if(!GID.test(gid) || !GAMES.includes(p.extra)) return "";
  return `<div class="gamecard"><span class="lbl">${NAME(p.extra)}</span><span>${x.mine ? t("cgStartMe",{game:NAME(p.extra)}) : t("cgStartThem",{name, game:NAME(p.extra)})}</span><button class="btn small" style="align-self:center" data-act="cgOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
}

const classicActions = {
  cgCpu(game){ if(isTable(game)) tableActions.tkCpu(game); },
  cgOpen(gid){
    if(!GID.test(gid)) return;
    const inv = S.messages.map(x => parseMsg(x.body)).find(p => p.type === "cg" && p.val === gid);
    if(inv && isTable(inv.extra)) tableActions.tkOpenOnline(inv.extra, gid);
  },
  cgInvite(game){
    if(!GAMES.includes(game)) return;
    const gid = newGid();
    S.cgSheet = false;
    sendBody(CARD + "cg:" + gid + ":" + game);
    tableActions.tkOpenOnline(game, gid);
  },
  cgSheet(){ S.cgSheet = true; render(); },
  cgSheetClose(){ S.cgSheet = false; render(); }
};

export { cgCard, cgSheet, classicActions };
