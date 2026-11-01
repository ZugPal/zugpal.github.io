// "Install Zugpal" for every phone. Only Chrome/Edge/Samsung on Android (and desktop) can show the system install
// dialog (beforeinstallprompt). Everywhere else we show the steps for that browser: iPhone Safari (Share → Add to
// Home Screen), Chrome/Firefox on iPhone, Samsung Internet, Firefox. Links opened inside WhatsApp, Instagram,
// Facebook, TikTok, Telegram … run in an in-app browser that cannot install anything: we say so and help open the
// link in the real browser.
import { S } from "./state.js";
import { t, toast } from "./util.js";
import { render } from "./screens.js";

const OFF_KEY = "zugpal.installOff";
const ua = () => navigator.userAgent || "";

export function installed(){
  return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
}
// which steps to show on this phone
export function installKind(){
  const u = ua();
  const ios = /iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(u);
  if(/FBAN|FBAV|FB_IAB|Instagram|Line\/|LinkedInApp|Snapchat|musical_ly|BytedanceWebview|TikTok|Telegram|WhatsApp|Twitter|GSA\//.test(u)
    || (android && /; wv\)/.test(u)) || (ios && !/Safari\//.test(u))) return ios ? "inappIos" : android ? "inappAndroid" : "other";
  if(ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(u) ? "iosOther" : "iosSafari";
  if(android) return /SamsungBrowser/.test(u) ? "samsung" : /Firefox/.test(u) ? "firefox" : "androidChrome";
  return "desktop";
}
const offNow = () => { try{ return localStorage.getItem(OFF_KEY) === "1"; }catch(e){ return false; } };

// the bar on the sign-up and check-in screens; gone once installed or closed with ×
export function installBar(){
  if(installed() || offNow()) return "";
  return `<div class="installbar"><img src="icons/icon-192.png" alt="" width="40" height="40">
    <div class="grow"><b>${t("instBarTitle")}</b><div class="small">${t("instBarBody")}</div></div>
    <button class="btn small" data-act="installOpen">${t("instBarBtn")}</button>
    <button class="iconbtn" data-act="installOff" aria-label="${t("close")}">×</button></div>`;
}
// a quiet link that stays on the check-in screen after the bar was closed
export const installLink = () => installed() ? "" : `<button class="link quiet" data-act="installOpen">${t("instBarBtn")}</button>`;

const SHARE = '<svg class="ii" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"/></svg>';
const DOTS = '<svg class="ii" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>';
const MENU = '<svg class="ii" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
const PLUS = '<svg class="ii" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
// steps per browser; {s} = share icon, {d} = ⋮, {m} = ≡, {p} = add icon
const STEPS = {
  iosSafari: ["instIos1", "instIos2", "instIos3"],
  iosOther: ["instIosO1", "instIos2", "instIos3"],
  androidChrome: ["instAnd1", "instAnd2", "instAnd3"],
  samsung: ["instSam1", "instSam2", "instAnd3"],
  firefox: ["instAnd1", "instFox2", "instAnd3"],
  desktop: ["instDesk1", "instDesk2"]
};
const icons = s => s.replace("{s}", SHARE).replace("{d}", DOTS).replace("{m}", MENU).replace("{p}", PLUS);
const steps = kind => `<ol class="isteps">${STEPS[kind].map(k => `<li>${icons(t(k))}</li>`).join("")}</ol>`;

export function installSheet(){
  const kind = S.installSheet === true ? installKind() : S.installSheet;
  const inapp = kind === "inappIos" || kind === "inappAndroid";
  let body;
  if(installed()) body = `<p>${t("instDone")}</p>`;
  else if(S.installPrompt && !inapp) body = `<p>${t("instPromptBody")}</p><button class="btn" data-act="install">${t("installBtn")}</button>`;
  else if(inapp) body = `<div class="banner">${t("instInapp")}</div>
      ${kind === "inappAndroid" ? `<button class="btn" data-act="installChrome">${t("instOpenChrome")}</button>` : `<p class="small">${icons(t("instInappIos"))}</p>`}
      <button class="btn ghost" data-act="installCopy">${t("copyLink")}</button><p class="small">${t("instPaste")}</p>`;
  else body = steps(kind in STEPS ? kind : "androidChrome");
  const others = ["iosSafari", "androidChrome", "samsung", "firefox"].filter(k => k !== kind);
  return `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="instT"><div class="panel installsheet">
    <div class="row"><img src="icons/icon-192.png" alt="" width="48" height="48"><h2 id="instT" class="grow">${t("instTitle")}</h2></div>
    ${body}
    <details class="iother"><summary>${t("instOther")}</summary>${others.map(k => `<div class="ihead">${t("instName_" + k)}</div>${steps(k)}`).join("")}</details>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="installClose">${t("close")}</button></div></div></div>`;
}

export const installActions = {
  installOpen(){
    // the system dialog when the browser offers one, else the steps
    if(S.installPrompt && !installed()){ const p = S.installPrompt; S.installPrompt = null; p.prompt(); p.userChoice.finally(() => render()); return; }
    S.installSheet = true; render();
  },
  installClose(){ S.installSheet = null; render(); },
  installOff(){ try{ localStorage.setItem(OFF_KEY, "1"); }catch(e){} render(); },
  // Android in-app browsers: ask Android to open the address in the phone's normal browser
  installChrome(){
    const host = location.host + location.pathname;
    location.href = "intent://" + host + "#Intent;scheme=https;S.browser_fallback_url=" + encodeURIComponent(location.origin + location.pathname) + ";end";
  },
  async installCopy(){
    const url = location.origin + location.pathname;
    try{ await navigator.clipboard.writeText(url); toast(t("copied")); }catch(e){ prompt(t("copyLink"), url); }
  }
};
