// The weekly Talk Train: when is the next one (in Berlin time), and a calendar entry so people don't miss it.
// Schedule: CONFIG.talkTrain (weekday 1 = Monday … 7 = Sunday, "HH:MM", minutes, route text per language).
import { CONFIG } from "./config.js";
import { S } from "./state.js";
import { t } from "./util.js";

const DAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const route = () => CONFIG.talkTrain.route[S.lang] || CONFIG.talkTrain.route.en;
function berlinNow(now){
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(now).map(x => [x.type, x.value]));
  return { wd: DAYS[p.weekday], min: Number(p.hour) * 60 + Number(p.minute) };
}
// state: "now" (boarding: 20 min before until the ride ends), "today", "tomorrow" or "later"
function talkInfo(now){
  now = now || new Date();
  const T = CONFIG.talkTrain, [h, m] = T.time.split(":").map(Number), start = h * 60 + m, b = berlinNow(now);
  let days = (T.weekday - b.wd + 7) % 7;
  if(days === 0 && b.min > start + T.minutes) days = 7;
  const date = new Date(now.getTime() + days * 864e5);
  const state = days === 0 ? (b.min >= start - 20 ? "now" : "today") : days === 1 ? "tomorrow" : "later";
  const loc = S.lang === "ar" ? "ar-u-nu-latn" : S.lang === "de" ? "de-DE" : "en-GB";
  const day = new Intl.DateTimeFormat(loc, { timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long" }).format(date);
  const when = state === "now" ? t("talkNow", { time: T.time }) : state === "today" ? t("talkToday", { time: T.time })
    : state === "tomorrow" ? t("talkTomorrow", { time: T.time }) : t("talkOn", { day, time: T.time });
  return { state, when, route: route(), date, onTrainDay: state === "now" || state === "today" };
}
// the date of the next Talk Train as YYYYMMDD in Berlin time
function ymd(date){ return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(date).replace(/-/g, ""); }
// A weekly calendar entry (.ics) with a reminder 30 minutes before; made on the phone, nothing is sent anywhere
function calendarFile(){
  const T = CONFIG.talkTrain, i = talkInfo(), start = ymd(i.date) + "T" + T.time.replace(":", "") + "00";
  const link = location.href.split("#")[0].split("?")[0] + "#talk";
  const esc = s => String(s).replace(/[\\,;]/g, m => "\\" + m);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Zugpal//Talk Train//EN", "BEGIN:VEVENT",
    "UID:talk-train@zugpal.github.io", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
    "DTSTART;TZID=Europe/Berlin:" + start, "DURATION:PT" + T.minutes + "M", "RRULE:FREQ=WEEKLY",
    "SUMMARY:" + esc(t("calTitle")), "LOCATION:" + esc(route()), "DESCRIPTION:" + esc(t("talkTrainBody") + " " + link),
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:" + esc(t("calTitle")), "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
  return lines.join("\r\n");
}
function googleLink(){
  const T = CONFIG.talkTrain, i = talkInfo(), d = ymd(i.date), [h, m] = T.time.split(":").map(Number), end = h * 60 + m + T.minutes;
  const hm = x => String(Math.floor(x / 60) % 24).padStart(2, "0") + String(x % 60).padStart(2, "0") + "00";
  const q = new URLSearchParams({ action: "TEMPLATE", text: t("calTitle"), dates: d + "T" + hm(h * 60 + m) + "/" + d + "T" + hm(end), ctz: "Europe/Berlin",
    location: route(), details: t("talkTrainBody") + " " + location.href.split("#")[0].split("?")[0] + "#talk", recur: "RRULE:FREQ=WEEKLY" });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}

export { calendarFile, googleLink, talkInfo };
