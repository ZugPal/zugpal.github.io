// Chat cards for the party games: Quizfahrt (quiz.js) and Stadt-Land-Fluss (slf.js).
import { t } from "./util.js";

const GID = /^[A-Za-z0-9]{4,12}$/;
function partyCard(p, x, name){
  const gid = String(p.val || ""); if(!GID.test(gid)) return "";
  if(p.type === "qz") return `<div class="gamecard"><span class="lbl">${t("qzName")}</span><span>${x.mine ? t("cgStartMe", { game: t("qzName") }) : t("cgStartThem", { name, game: t("qzName") })}</span><button class="btn small" style="align-self:center" data-act="qzOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
  if(p.type === "sl") return `<div class="gamecard"><span class="lbl">${t("slName")}</span><span>${x.mine ? t("cgStartMe", { game: t("slName") }) : t("cgStartThem", { name, game: t("slName") })}</span><button class="btn small" style="align-self:center" data-act="slOpen" data-arg="${gid}">${t("openBoard")}</button></div>`;
  return "";
}

export { partyCard };
