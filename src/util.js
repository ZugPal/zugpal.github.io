// Small helpers: texts, escaping, photos, icons, chat-card parsing, toasts.
import { MOODS, WORDS } from "./data.js";
import { T } from "./i18n.js";
import { render } from "./screens.js";
import { S } from "./state.js";

/* ---------------- Helpers ---------------- */
const t = (k, vars) => { let s = (T[S.lang] && T[S.lang][k]) || T.en[k] || k; if(vars) for(const v in vars) s = s.split("{"+v+"}").join(vars[v]); return s; };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const loc = (map, id) => (map[id] && (map[id][S.lang] || map[id].en)) || id;
const moodName = id => loc(MOODS, id);
const berlinDate = () => new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Berlin"});
const norm = s => String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const minsLeft = () => S.ride ? Math.max(0, Math.round((S.ride.expiresAt - Date.now())/60000)) : 0;
const TINTS = [["#D9E6FB","#1E3F8A"],["#F5DFD0","#7A3410"],["#E6DCF2","#4E2A75"],["#DCEFE6","#134634"],["#F7E7B4","#5E4507"]];
const tint = id => { let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0; return TINTS[h % TINTS.length]; };
const MAX_WAVES = 5;
const CONTACT_RE = /([^\s@]+@[^\s@]+\.[a-z]{2,})|(\+?\d[\d\s\-\/().]{7,}\d)|(https?:\/\/|www\.)|\b[a-z0-9-]+\.(com|de|net|org|me|io|app)\b|(instagram|insta\b|snapchat|snap\b|whatsapp|telegram|t\.me|wa\.me|tiktok|facebook|signal\b|واتس|انستا|تلغرام|سناب)|\bDE\d{2}\s?\d{4}/i;
const MONEY_RE = /(geld|überweis|paypal|western\s?union|bitcoin|krypto|crypto|gutschein|money|wire|loan|kredit|bank\s?details|iban|فلوس|مال|تحويل|حوالة|بنك)/i;
const hasContact = s => CONTACT_RE.test(String(s||""));
const SAFE_IMG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const imgOk = (id, src) => !!src && (String(id).startsWith("d-") ? String(src).startsWith("data:image/svg+xml") : SAFE_IMG.test(src));
function photo(id, name, src, size, blurred){
  const [bg,fg] = tint(id);
  const inner = imgOk(id, src) ? `<img src="${esc(src)}" alt="">` : `<span style="font-size:${Math.round(size*0.42)}px">${esc((String(name||"?").trim()[0]||"?").toUpperCase())}</span>`;
  const lock = blurred && imgOk(id, src) && size >= 44 ? `<span class="lock" aria-hidden="true">${ICON.lock}</span>` : "";
  return `<div class="ph${blurred?" blur":""}" style="width:${size}px;height:${size}px;background:${bg};color:${fg}" aria-hidden="true">${inner}${lock}</div>`;
}
let toastTimer = null;
function toast(msg){ S.toast = msg; render(); clearTimeout(toastTimer); toastTimer = setTimeout(()=>{ S.toast=""; render(); }, 3400); }
function todaysWord(){ const d = new Date(berlinDate()); const i = Math.floor(d.getTime()/86400000) % WORDS.length; return WORDS[i]; }
const ICON = {
  book:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
  back:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  shield:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/></svg>',
  refresh:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  pin:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9FE0C3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  bubble:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9FE0C3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  lock:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  dice:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="16" cy="16" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
  spin:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 12l5-3"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  cards:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="10" height="14" rx="2"/><path d="M9 4.5l9.5 2.5a2 2 0 0 1 1.4 2.4l-2.6 9.8"/></svg>',
  camera:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  mic:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  eye:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  star:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  calendar:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  bell:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  starFull:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>'
};
/* Simple illustrated portraits for the demo riders */
function portrait(bg, skin, hair, shirt, style){
  const back = style==="long" ? `<path d='M24 66 Q18 18 50 16 Q82 18 76 66 Z' fill='${hair}'/>` : style==="scarf" ? `<path d='M24 52 Q22 16 50 15 Q78 16 76 52 Q78 80 50 82 Q22 80 24 52 Z' fill='${hair}'/>` : "";
  const top = style==="scarf" ? "" : `<path d='M30 44 Q30 21 50 21 Q70 21 70 44 Q63 30 50 31 Q37 30 30 44 Z' fill='${hair}'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${bg}'/>${back}<path d='M12 100 Q15 72 50 70 Q85 72 88 100 Z' fill='${shirt}'/><rect x='43' y='55' width='14' height='17' fill='${skin}'/><circle cx='50' cy='44' r='${style==="scarf"?17:20}' fill='${skin}'/>${top}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
/* Special chat cards are stored as normal messages with a prefix */
const CARD = "\u0001";
function parseMsg(body){
  if(!String(body).startsWith(CARD)) return {type:"text", body};
  const [type, val, extra] = String(body).slice(1).split(":");
  return {type, val, extra};
}

export { CARD, ICON, MAX_WAVES, MONEY_RE, berlinDate, esc, hasContact, loc, minsLeft, moodName, norm, parseMsg, photo, portrait, t, toast, todaysWord };
