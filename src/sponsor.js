// Sponsor slot ("Talk Train presented by …") and the planned "Zugpal Unterstützer" option.
// SPONSOR is the one place to set up a sponsor: name, local logo file, one offer per language, dates.
// No third-party scripts, no tracking links: the logo is a file on our own site, the link is plain.
// Open the app with ?sponsor to preview the slot with the example values while it is switched off.
import { render } from "./screens.js";
import { S } from "./state.js";
import { ICON, esc, t } from "./util.js";

const SPONSOR = {
  enabled: false,                                  // switch on when a sponsor has signed
  from: "2026-11-01", until: "2026-12-31",         // shown only between these dates (inclusive)
  name: "Café am Gleis",                           // example
  logo: "sponsor/logo.svg",                        // file in this repository (no external images)
  offer: {
    de: "Mit dem Talk Train: Kaffee für 1 € am Kiosk in Düren Hbf, Gleis 2.",
    en: "With the Talk Train: coffee for €1 at the kiosk in Düren Hbf, platform 2.",
    ar: "مع قطار الحديث: قهوة بيورو واحد في كشك محطة دورن الرئيسية، رصيف 2."
  },
  link: ""                                          // optional plain link, e.g. "https://example.de" (no tracking parameters)
};

function activeSponsor(){
  const preview = /[?&]sponsor(&|$)/.test(location.search);
  if(!SPONSOR.enabled && !preview) return null;
  const today = new Date().toISOString().slice(0, 10);
  if(!preview && (today < SPONSOR.from || today > SPONSOR.until)) return null;
  return SPONSOR;
}
function sponsorSlot(){
  const s = activeSponsor(); if(!s) return "";
  const offer = s.offer[S.lang] || s.offer.de;
  const name = s.link ? `<a href="${esc(s.link)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a>` : esc(s.name);
  return `<div class="sponsor"><img src="${esc(s.logo)}" alt="" width="44" height="44"><div class="grow"><div class="small">${t("spPresented", { name })}</div><div dir="auto">${esc(offer)}</div></div></div>`;
}

/* ---------------- Supporter (design only, no payments yet) ---------------- */
function supporterScreen(){
  const plan = (k, price, per, note) => `<div class="card plan${k === "year" ? " best" : ""}"><div class="pname">${t("supPlan_" + k)}</div>
    <div><b class="price">${price}</b> <span class="small">${per}</span></div>${note ? `<div class="small">${note}</div>` : ""}
    <button class="btn ghost" disabled>${t("supSoon")}</button></div>`;
  return `<div class="screen">
    <div class="row"><button class="iconbtn flip" data-act="go" data-arg="${S.supBack || "checkin"}" aria-label="${t("back")}">${ICON.back}</button><h1 class="grow" style="font-size:26px">${t("supTitle")}</h1></div>
    <div class="banner info">${t("supNotYet")}</div>
    <p class="muted" style="margin:0">${t("supIntro")}</p>
    <div class="card"><div class="pname">${t("supGetTitle")}</div>
      <ul class="rules"><li>${t("supGet1")}</li><li>${t("supGet2")}</li><li>${t("supGet3")}</li></ul></div>
    <div class="themes" aria-hidden="true"><span class="sw t1"></span><span class="sw t2"></span><span class="sw t3"></span><span class="sw t4"></span></div>
    <div class="plans">${plan("month", "2,99 €", t("supPerMonth"))}${plan("year", "19,99 €", t("supPerYear"), t("supSave"))}</div>
    <div class="card free"><div class="pname">${ICON.shield} ${t("supFreeTitle")}</div>
      <ul class="rules"><li>${t("supFree1")}</li><li>${t("supFree2")}</li><li>${t("supFree3")}</li><li>${t("supFree4")}</li></ul></div>
    <div class="small">${t("supFine")}</div>
  </div>`;
}
const sponsorActions = {
  openSupport(){ S.supBack = S.screen; S.screen = "support"; window.scrollTo(0, 0); render(); }
};

export { SPONSOR, sponsorActions, sponsorSlot, supporterScreen };
