// When does a train ride next (in Berlin time), and calendar entries so people don't miss it.
// Works for the weekly Talk Train (CONFIG.talkTrain) and for trains people create (weekdays or one date).
// A schedule: { weekdays: [1..7] (1 = Monday) or null, date: "YYYY-MM-DD" or null, time: "HH:MM", minutes, route }
import { CONFIG } from "./config.js";
import { S } from "./state.js";
import { t } from "./util.js";

const DAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const RRDAY = ["", "MO", "TU", "WE", "TH", "FR", "SA", "SU"];
function berlinNow(now){
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(now).map(x => [x.type, x.value]));
  return { wd: DAYS[p.weekday], min: Number(p.hour) * 60 + Number(p.minute) };
}
// the date as YYYY-MM-DD in Berlin time
const berlinYmd = date => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const ymd = date => berlinYmd(date).replace(/-/g, "");
const loc = () => S.lang === "ar" ? "ar-u-nu-latn" : S.lang === "de" ? "de-DE" : "en-GB";
const hhmm = s => String(s || "").slice(0, 5);
// state: "now" (boarding: 20 min before until the ride ends), "today", "tomorrow", "later", or "past" (a one-off that is over)
function rideInfo(s, now){
  now = now || new Date();
  const time = hhmm(s.time), [h, m] = time.split(":").map(Number), start = h * 60 + m, b = berlinNow(now), minutes = s.minutes || 45;
  let days;
  if(s.date){
    days = Math.round((Date.parse(s.date + "T12:00:00Z") - Date.parse(berlinYmd(now) + "T12:00:00Z")) / 864e5);
    if(days < 0 || (days === 0 && b.min > start + minutes)) return { state: "past", when: "", route: s.route || "", date: now, onTrainDay: false };
  } else {
    days = Math.min(...(s.weekdays || [1]).map(d => { let x = (d - b.wd + 7) % 7; if(x === 0 && b.min > start + minutes) x = 7; return x; }));
  }
  const date = new Date(now.getTime() + days * 864e5);
  const state = days === 0 ? (b.min >= start - 20 ? "now" : "today") : days === 1 ? "tomorrow" : "later";
  const day = new Intl.DateTimeFormat(loc(), { timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long" }).format(date);
  const when = state === "now" ? t("talkNow", { time }) : state === "today" ? t("talkToday", { time })
    : state === "tomorrow" ? t("talkTomorrow", { time }) : t("talkOn", { day, time });
  return { state, when, route: s.route || "", date, onTrainDay: state === "now" || state === "today" };
}
// "Mon, Wed, Fri" in the app language, or "Every day" / "Mon–Fri"
function weekdaysText(w){
  if(!w || !w.length) return "";
  const k = [...w].sort().join("");
  if(k === "1234567") return t("everyDay");
  if(k === "12345") return t("workdays");
  const f = new Intl.DateTimeFormat(loc(), { weekday: "short", timeZone: "UTC" });
  return [...w].sort().map(d => f.format(new Date(Date.UTC(2024, 0, d)))).join(", ");   // 2024-01-01 was a Monday
}
const talkSchedule = () => { const T = CONFIG.talkTrain; return { weekdays: [T.weekday], time: T.time, minutes: T.minutes, route: T.route[S.lang] || T.route.en }; };
const talkInfo = now => rideInfo(talkSchedule(), now);
const baseUrl = () => location.href.split("#")[0].split("?")[0];
// A calendar entry (.ics) with a reminder 30 minutes before; made on the phone, nothing is sent anywhere
function calendarFileFor(s, title, link){
  const i = rideInfo(s), start = ymd(i.date) + "T" + hhmm(s.time).replace(":", "") + "00";
  const esc = x => String(x).replace(/[\\,;]/g, m => "\\" + m);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Zugpal//Talk Train//EN", "BEGIN:VEVENT",
    "UID:" + (s.code ? "train-" + s.code : "talk-train") + "@zugpal.github.io", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
    "DTSTART;TZID=Europe/Berlin:" + start, "DURATION:PT" + (s.minutes || 45) + "M"];
  if(!s.date) lines.push("RRULE:FREQ=WEEKLY;BYDAY=" + (s.weekdays || [1]).map(d => RRDAY[d]).join(","));
  lines.push("SUMMARY:" + esc(title), "LOCATION:" + esc(s.route || ""), "DESCRIPTION:" + esc(t("talkTrainBody") + " " + link),
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:" + esc(title), "END:VALARM", "END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
function googleLinkFor(s, title, link){
  const d = ymd(rideInfo(s).date), [h, m] = hhmm(s.time).split(":").map(Number), end = h * 60 + m + (s.minutes || 45);
  const hm = x => String(Math.floor(x / 60) % 24).padStart(2, "0") + String(x % 60).padStart(2, "0") + "00";
  const q = { action: "TEMPLATE", text: title, dates: d + "T" + hm(h * 60 + m) + "/" + d + "T" + hm(end), ctz: "Europe/Berlin",
    location: s.route || "", details: t("talkTrainBody") + " " + link };
  if(!s.date) q.recur = "RRULE:FREQ=WEEKLY;BYDAY=" + (s.weekdays || [1]).map(x => RRDAY[x]).join(",");
  return "https://calendar.google.com/calendar/render?" + new URLSearchParams(q).toString();
}
const calendarFile = () => calendarFileFor(talkSchedule(), t("calTitle"), baseUrl() + "#talk");
const googleLink = () => googleLinkFor(talkSchedule(), t("calTitle"), baseUrl() + "#talk");

export { baseUrl, berlinYmd, calendarFile, calendarFileFor, googleLink, googleLinkFor, rideInfo, talkInfo, weekdaysText };
