// Zugwort, our own 5-letter word game, modelled on the popular daily word-guessing apps: a word of the day (the same
// for everyone, per language), unlimited practice, a race against the computer, and online with a match (together or
// as a race). Letters pop in as you type, a wrong row shakes, the tiles flip one by one to show their colours and the
// keyboard colours follow; a win makes the row dance and shows a praise word. Statistics with streaks and a guess
// chart, a share grid without letters, hard mode (hints must be used), a colour-blind palette, and a real keyboard
// works too. Rules and the computer player: engines/words-engine.js (ZWord), words: engines/wordlists.js.
// Online chat cards (unchanged): zw:<gid>:<coop|race>-<lang> (sender starts), zg:<gid>:<word>.
import { sendBody } from "./chat.js";
import { onlineInfo, peerOf } from "./games.js";
import { render } from "./screens.js";
import { S } from "./state.js";
import { CARD, ICON, esc, parseMsg, t, toast } from "./util.js";

const WLANGS = ["de", "en", "ar"], MODES = ["daily", "free", "cpu"];
const GID = /^[A-Za-z0-9]{4,12}$/;
const FLIP = 300, REVEAL = FLIP * 4 + 500;            // ms between tiles, and until the whole row is shown
const store = { get(k, d){ try{ const v = localStorage.getItem("zugpal.zw." + k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("zugpal.zw." + k, JSON.stringify(v)); }catch(e){} } };
const newGid = () => Math.random().toString(36).slice(2, 10);
const wordLang = () => WLANGS.includes(S.wordLang) ? S.wordLang : (WLANGS.includes(S.lang) ? S.lang : "de");
const fiveList = lang => ZWords[lang].five.map(w => ZWord.norm(lang, w));
const dirOf = lang => lang === "ar" ? "rtl" : "ltr";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function today(){ const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
const dayNumber = date => Math.round((Date.parse(date + "T12:00:00") - Date.parse("2026-10-31T12:00:00")) / 864e5) + 1;
const dailyAnswer = (lang, date) => ZWord.norm(lang, ZWord.pick(ZWords[lang].five, "daily:" + date + ":" + lang));
function run(answer, guesses){ return guesses.reduce((st, g) => ZWord.play(st, Array.from(g)), ZWord.newGame(answer)); }

/* ---------------- State ---------------- */
function onlineZw(gid){
  let inv = null; const mine = [], theirs = [], shared = [];
  for(const x of S.messages){
    const p = parseMsg(x.body);
    if(p.type === "zw" && p.val === gid && !inv){ const [mode, lang] = String(p.extra || "").split("-"); if(WLANGS.includes(lang)) inv = { starter: x.mine, coop: mode === "coop", lang }; }
    if(p.type === "zg" && p.val === gid && inv){
      const g = ZWord.word5(inv.lang, p.extra); if(!g) continue;
      if(inv.coop){ const starterTurn = shared.length % 2 === 0; if(starterTurn === (x.mine === inv.starter)) shared.push(g); }
      else (x.mine ? mine : theirs).push(g);
    }
  }
  if(!inv) return null;
  const answer = ZWord.norm(inv.lang, ZWord.pick(ZWords[inv.lang].five, gid));
  const play = list => list.reduce((st, g) => ZWord.play(st, g), ZWord.newGame(answer));
  if(inv.coop){ const st = play(shared); return { ...inv, st, myTurn: !st.over && ((st.rows.length % 2 === 0) === inv.starter) }; }
  const me = play(mine), them = play(theirs);
  return { ...inv, st: me, them, myTurn: !me.over };
}
function zwState(){
  const z = S.zw; if(!z) return null;
  if(z.mode === "online") return onlineZw(z.gid);
  const answer = Array.from(z.answer), st = run(answer, z.guesses);
  if(z.mode === "cpu"){ const them = run(answer, z.cpu.guesses); return { lang: z.lang, st, them, myTurn: !st.over && !z.cpu.busy }; }
  return { lang: z.lang, st, myTurn: !st.over };
}
function saveZ(){ const z = S.zw; if(z && z.mode !== "online") store.set(z.mode + "." + z.lang, { answer: z.answer, guesses: z.guesses, date: z.date, cpu: z.cpu && { guesses: z.cpu.guesses, level: z.cpu.level }, done: z.done }); }
function loadZ(mode, lang){
  const c = store.get(mode + "." + lang, null);
  if(mode === "daily"){
    const date = today();
    return { mode, lang, date, answer: dailyAnswer(lang, date).join(""), guesses: c && c.date === date ? c.guesses : [], done: !!(c && c.date === date && c.done), cur: [] };
  }
  if(c && c.answer && Array.from(c.answer).length === 5 && !c.done) return { mode, lang, answer: c.answer, guesses: c.guesses || [], cpu: mode === "cpu" ? { guesses: (c.cpu && c.cpu.guesses) || [], level: (c.cpu && c.cpu.level) || "normal", busy: false } : undefined, cur: [] };
  return freshZ(mode, lang, c && c.cpu && c.cpu.level);
}
function freshZ(mode, lang, level){
  const list = fiveList(lang), answer = list[Math.floor(Math.random() * list.length)].join("");
  return { mode, lang, answer, guesses: [], cpu: mode === "cpu" ? { guesses: [], level: level === "easy" ? "easy" : "normal", busy: false } : undefined, cur: [] };
}

/* ---------------- Statistics ---------------- */
const statsOf = kind => store.get("stats." + kind, { played: 0, won: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0] });
function record(kind, won, tries){
  const s = statsOf(kind); s.played++;
  if(won){ s.won++; s.streak++; s.best = Math.max(s.best, s.streak); s.dist[tries - 1]++; } else s.streak = 0;
  store.set("stats." + kind, s);
}

/* ---------------- Pieces of UI ---------------- */
function keyboard(lang, marks){
  const rows = ZWord.KEYS[lang].map((r, i) => {
    const keys = Array.from(r).map(c => `<button class="key${marks[c] ? " " + marks[c] : ""}" data-act="zwKey" data-arg="${esc(c)}">${esc(c)}</button>`).join("");
    const last = i === ZWord.KEYS[lang].length - 1;
    return `<div class="krow">${last ? `<button class="key wide" data-act="zwEnter" aria-label="${t("enterKey")}">${t("enterKey")}</button>` : ""}${keys}${last ? `<button class="key wide" data-act="zwDel" aria-label="${t("delKey")}">⌫</button>` : ""}</div>`;
  }).join("");
  return `<div class="keyboard" dir="${dirOf(lang)}">${rows}</div>`;
}
// Animations survive re-renders: each one is drawn from the time it started (negative delays continue it).
function tiles(st, cur, lang, z){
  const now = Date.now(), rev = z.anim && now - z.anim.at < REVEAL ? z.anim : null;
  const dance = st.won && z.anim && z.anim.row === st.rows.length - 1 && now - z.anim.at >= REVEAL && now - z.anim.at < REVEAL + 1200 ? now - z.anim.at - REVEAL : null;
  const shake = z.shakeAt && now - z.shakeAt < 600, pop = z.typedAt && now - z.typedAt < 150;
  const rows = [];
  for(let r = 0; r < st.max; r++){
    const row = st.rows[r], typing = !row && r === st.rows.length && !st.over;
    const cells = [0, 1, 2, 3, 4].map(i => {
      if(row){
        if(rev && rev.row === r) return `<div class="tile ${row.marks[i]} flip" style="animation-delay:${i * FLIP - (now - rev.at)}ms">${esc(row.guess[i])}</div>`;
        if(dance !== null && r === st.rows.length - 1) return `<div class="tile ${row.marks[i]} dance" style="animation-delay:${i * 100 - dance}ms">${esc(row.guess[i])}</div>`;
        return `<div class="tile ${row.marks[i]}">${esc(row.guess[i])}</div>`;
      }
      const c = typing && cur[i]; return `<div class="tile${c ? " typed" : ""}${c && pop && i === cur.length - 1 ? " pop" : ""}">${c ? esc(c) : ""}</div>`;
    }).join("");
    rows.push(`<div class="trow${typing && shake ? " shake" : ""}" dir="${dirOf(lang)}">${cells}</div>`);
  }
  return `<div class="tiles" aria-label="${t("zwName")}">${rows.join("")}</div>`;
}
const miniRows = (st, lang) => `<div class="mini">${st.rows.map(r => `<div class="mrow" dir="${dirOf(lang)}">${r.marks.map(m => `<span class="${m}"></span>`).join("")}</div>`).join("")}</div>`;
function langChips(){
  return `<div class="seg" role="group" aria-label="${t("wordLang")}"><span class="small" style="align-self:center">${t("wordLang")}</span>${WLANGS.map(l =>
    `<button class="chip" data-act="zwLang" data-arg="${l}" aria-pressed="${S.zw && S.zw.lang === l}">${{ de: "Deutsch", en: "English", ar: "العربية" }[l]}</button>`).join("")}</div>`;
}
function statusLine(z, zs){
  const { st } = zs, answer = esc(st.answer.join("")), name = esc(z.mode === "online" ? (peerOf(z.peerId) || { first_name: z.peerName || "" }).first_name : "");
  if(z.anim && Date.now() - z.anim.at < REVEAL) return "&nbsp;";
  if(z.mode === "cpu"){
    const me = st, cpu = zs.them;
    if(!me.over) return z.cpu.busy ? t("thinking") : cpu.won ? t("zwCpuFound", { n: cpu.rows.length }) : t("yourMove");
    if(me.won && (!cpu.won || me.rows.length < cpu.rows.length)) return t("zwWon", { n: me.rows.length });
    if(me.won && cpu.won && me.rows.length === cpu.rows.length) return t("zwDraw");
    return (cpu.won ? t("zwCpuWon") + " " : "") + t("zwWas", { w: answer });
  }
  if(z.mode === "online"){
    if(zs.coop) return st.won ? t("zwWonTogether", { n: st.rows.length }) : st.over ? t("zwWas", { w: answer }) : zs.myTurn ? t("yourMove") : t("peerMove", { name });
    const me = st, them = zs.them;
    if(me.over && them.over) return me.won && (!them.won || me.rows.length < them.rows.length) ? t("zwWon", { n: me.rows.length })
      : me.won && them.won && me.rows.length === them.rows.length ? t("zwDraw") : them.won ? t("zwTheyWon", { name }) + " " + t("zwWas", { w: answer }) : t("zwWas", { w: answer });
    if(me.over) return (me.won ? t("zwWon", { n: me.rows.length }) : t("zwWas", { w: answer })) + " · " + t("zwWaiting", { name });
    return t("yourMove");
  }
  if(st.won) return t("zwWon", { n: st.rows.length });
  if(st.over) return t("zwWas", { w: answer });
  return z.mode === "daily" ? t("zwDailyLine", { n: dayNumber(z.date) }) : t("zwTries", { n: st.max - st.rows.length });
}

/* ---------------- Screens ---------------- */
function zugwortScreen(){
  const z = S.zw, zs = zwState(); if(!z || !zs) return null;
  const { st, lang } = zs, online = z.mode === "online";
  const name = online ? esc((peerOf(z.peerId) || { first_name: z.peerName || "" }).first_name) : "";
  // during the flip the keyboard still shows the colours from before this row
  const shown = z.anim && Date.now() - z.anim.at < REVEAL ? { ...st, rows: st.rows.filter((_, i) => i !== z.anim.row) } : st;
  const side = z.mode === "cpu" ? `<div class="vs"><span class="small">${t("computer")}</span>${miniRows(zs.them, lang)}</div>`
    : online && !zs.coop ? `<div class="vs"><span class="small">${name}</span>${miniRows(zs.them, lang)}</div>` : "";
  const sub = z.mode === "daily" ? t("zwDailyN", { n: dayNumber(z.date) }) : z.mode === "free" ? t("zwFree") : z.mode === "cpu" ? t("zwRaceCpu") : (zs.coop ? t("zwTogether") : t("zwRace")) + " · " + name;
  return `<div class="screen zwscreen${store.get("contrast", false) ? " hc" : ""}">
    <div class="row"><button class="iconbtn flip" data-act="chessBack" data-arg="${online ? "chat" : "games"}" aria-label="${t("back")}">${ICON.back}</button>
      <div class="grow"><div class="pname">${t("zwName")}</div><div class="small">${sub}</div></div>
      <button class="iconbtn" data-act="zwHelpOpen" aria-label="${t("tkRules")}">?</button>
      ${online ? "" : `<button class="iconbtn" data-act="zwStats" aria-label="${t("zwStatsT")}">📊︎</button>`}
      <button class="iconbtn" data-act="zwSettings" aria-label="${t("zwSettingsT")}">⚙︎</button></div>
    ${online ? onlineInfo("zw", z) : `<div class="seg zwmodes">${MODES.map(m => `<button class="chip" data-act="zwMode" data-arg="${m}" aria-pressed="${z.mode === m}">${t("zwMode_" + m)}</button>`).join("")}</div>`}
    <div class="cstatus zwline" role="status" aria-live="polite">${statusLine(z, zs)}</div>
    <div class="zwboard">${tiles(st, zs.myTurn ? z.cur : [], lang, z)}${side}</div>
    ${keyboard(lang, ZWord.keys(shown))}
    ${z.mode === "cpu" ? `<div class="row" style="flex-wrap:wrap"><div class="seg"><button class="chip" data-act="zwLevel" data-arg="easy" aria-pressed="${z.cpu.level === "easy"}">${t("easy")}</button><button class="chip" data-act="zwLevel" data-arg="normal" aria-pressed="${z.cpu.level !== "easy"}">${t("normal")}</button></div></div>` : ""}
    ${z.mode === "free" || z.mode === "cpu" ? `<button class="btn ghost small" data-act="zwNew" style="align-self:flex-start">${t("zwNewWord")}</button>` : ""}
    ${online ? `<div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-act="wordSheet" data-arg="zw">${t("newGame")}</button><button class="btn ghost small" data-act="chessBack" data-arg="chat">${t("backChat")}</button></div>` : langChips()}
  </div>`;
}
function bars(s, mark){
  const max = Math.max(1, ...s.dist);
  return `<div class="zwdist">${s.dist.map((n, i) => `<div class="zwbar"><span>${i + 1}</span><b style="width:${Math.max(8, n / max * 100)}%" class="${mark === i + 1 ? "cur" : ""}">${n}</b></div>`).join("")}</div>`;
}
function statsBlock(kind, mark){
  const s = statsOf(kind);
  return `<div class="zwstats"><div><b>${s.played}</b><span>${t("zwPlayed")}</span></div><div><b>${s.played ? Math.round(s.won / s.played * 100) : 0}</b><span>${t("zwWinPct")}</span></div><div><b>${s.streak}</b><span>${t("zwStreak")}</span></div><div><b>${s.best}</b><span>${t("zwBest")}</span></div></div>
    <div class="flabel">${t("zwDist")}</div>${bars(s, mark)}`;
}
function untilMidnight(){ const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); const s = Math.max(0, Math.floor((m - n) / 1000)); return Math.floor(s / 3600) + ":" + String(Math.floor(s / 60) % 60).padStart(2, "0"); }
function zwOverlay(){
  const z = S.zw; if(!z) return "";
  if(S.zwSet) return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel"><h2>${t("zwSettingsT")}</h2>
    <label class="toggle"><input type="checkbox" data-act="zwToggle" data-arg="hard"${store.get("hard", false) ? " checked" : ""}><span><b>${t("zwHard")}</b><br><span class="small">${t("zwHardD")}</span></span></label>
    <label class="toggle"><input type="checkbox" data-act="zwToggle" data-arg="contrast"${store.get("contrast", false) ? " checked" : ""}><span><b>${t("zwContrast")}</b><br><span class="small">${t("zwContrastD")}</span></span></label>
    <div class="row" style="justify-content:flex-end"><button class="link" data-act="zwClose">${t("close")}</button></div></div></div>`;
  if(S.zwHelp){
    const ex = (w, i, m) => `<div class="trow ex" dir="ltr">${Array.from(w).map((c, k) => `<div class="tile${k === i ? " " + m : ""}">${c}</div>`).join("")}</div>`;
    return `<div class="sheet" role="dialog" aria-modal="true"><div class="panel zwscreen${store.get("contrast", false) ? " hc" : ""}"><h2>${t("tkRules")}</h2><p>${t("zwHelp")}</p>
      ${ex("ZEBRA", 0, "g")}<p class="small">${t("zwExG", { c: "Z" })}</p>${ex("PILOT", 1, "y")}<p class="small">${t("zwExY", { c: "I" })}</p>${ex("VOGEL", 3, "x")}<p class="small">${t("zwExX", { c: "E" })}</p>
      <p class="small">${t("zwHelpModes")}</p><div class="row" style="justify-content:flex-end"><button class="link" data-act="zwClose">${t("close")}</button></div></div></div>`;
  }
  if(S.zwEnd || S.zwStatsOpen){
    const zs = zwState(), st = zs.st, kind = z.mode === "online" ? null : z.mode;
    const end = S.zwEnd && st.over;
    const title = !end ? t("zwStatsT") : z.mode === "cpu" ? statusLine({ ...z, anim: null }, zs) : st.won ? t("zwPraise" + st.rows.length) : t("zwLostT");
    return `<div class="sheet center" role="dialog" aria-modal="true"><div class="panel zwend"><h2>${title}</h2>
      ${end ? `<div class="trow answer" dir="${dirOf(zs.lang)}">${st.answer.map(c => `<div class="tile g">${esc(c)}</div>`).join("")}</div>` : ""}
      ${kind ? statsBlock(kind, end && st.won ? st.rows.length : 0) : ""}
      ${end && z.mode === "daily" ? `<p class="small">${t("zwNextIn", { t: untilMidnight() })}</p>` : ""}
      ${end ? `<button class="btn" data-act="zwShare">${t("zwShare")}</button>` : ""}
      ${end && z.mode !== "daily" && z.mode !== "online" ? `<button class="btn ghost" data-act="zwNew">${t("zwNewWord")}</button>` : ""}
      ${end && z.mode === "daily" ? `<button class="btn ghost" data-act="zwMode" data-arg="free">${t("zwMode_free")}</button>` : ""}
      <button class="link" data-act="zwClose">${t("close")}</button></div></div>`;
  }
  return "";
}

/* ---------------- Playing ---------------- */
function hardProblem(st, guess){
  for(const r of st.rows){
    for(let i = 0; i < 5; i++) if(r.marks[i] === "g" && guess[i] !== r.guess[i]) return t("zwHardG", { n: i + 1, c: r.guess[i] });
    const need = {}; r.guess.forEach((c, i) => { if(r.marks[i] !== "x") need[c] = (need[c] || 0) + 1; });
    for(const c in need) if(guess.filter(x => x === c).length < need[c]) return t("zwHardY", { c });
  }
  return null;
}
function afterReveal(z){
  const zs = zwState(); if(!zs || S.zw !== z) return;
  const st = zs.st;
  if(z.mode === "cpu" && !zs.them.over && zs.them.rows.length < st.rows.length){ cpuStep(z); return; }   // the computer takes its turn for this round
  if(!st.over || z.mode === "online") return;
  if(z.mode !== "online" && !z.done){
    z.done = true; saveZ();
    const won = z.mode === "cpu" ? st.won && (!zs.them.won || st.rows.length <= zs.them.rows.length) : st.won;
    record(z.mode, won, st.rows.length);
  }
  toast(st.won ? t("zwPraise" + st.rows.length) : st.answer.join(""));
  setTimeout(() => { if(S.zw === z && S.screen === "zugwort"){ S.zwEnd = true; render(); } }, st.won ? 1500 : 1000);
}
function cpuStep(z){
  if(!z || z.mode !== "cpu") return;
  const them = run(Array.from(z.answer), z.cpu.guesses); if(them.over) return;
  z.cpu.busy = true; render();
  setTimeout(() => {
    if(S.zw !== z) return;
    z.cpu.guesses.push(ZWord.solve(fiveList(z.lang), them.rows, z.cpu.level).join(""));
    z.cpu.busy = false; saveZ(); render();
    afterReveal(z);
  }, 650);
}
function open(z){ S.zw = z; S.zwEnd = false; S.zwStatsOpen = false; S.screen = "zugwort"; store.set("lastMode", z.mode); render(); if(z.mode === "daily" && z.done){ setTimeout(() => { if(S.zw === z){ S.zwEnd = true; render(); } }, 300); } }
const zugwortActions = {
  zwCpu(){ const mode = store.get("lastMode", "daily"); open(loadZ(MODES.includes(mode) ? mode : "daily", wordLang())); },
  zwMode(m){ if(!MODES.includes(m)) return; S.zwEnd = false; open(loadZ(m, S.zw && S.zw.lang || wordLang())); },
  zwNew(){ const z = S.zw; if(!z || z.mode === "daily" || z.mode === "online") return; S.zwEnd = false; open(freshZ(z.mode, z.lang, z.cpu && z.cpu.level)); saveZ(); },
  zwLevel(v){ if(S.zw && S.zw.mode === "cpu"){ S.zw.cpu.level = v === "easy" ? "easy" : "normal"; saveZ(); } render(); },
  zwLang(l){ if(!WLANGS.includes(l)) return; S.wordLang = l; const m = S.zw && S.zw.mode !== "online" ? S.zw.mode : "daily"; open(loadZ(m, l)); },
  zwKey(c){
    const z = S.zw, zs = zwState(); if(!z || !zs || !zs.myTurn || (z.anim && Date.now() - z.anim.at < REVEAL)) return;
    if(z.cur.length < 5 && ZWord.alphabet(zs.lang).includes(c)){ z.cur.push(c); z.typedAt = Date.now(); render(); }
  },
  zwDel(){ if(S.zw){ S.zw.cur.pop(); render(); } },
  zwEnter(){
    const z = S.zw, zs = zwState(); if(!z || !zs || !zs.myTurn || (z.anim && Date.now() - z.anim.at < REVEAL)) return;
    const bad = msg => { z.shakeAt = Date.now(); toast(msg); render(); setTimeout(render, 620); };
    if(z.cur.length !== 5) return bad(t("zwFive"));
    if(store.get("hard", false) && !(z.mode === "online" && zs.coop)){ const p = hardProblem(zs.st, z.cur); if(p) return bad(p); }
    const guess = z.cur.slice(); z.cur = [];
    const row = zs.st.rows.length;
    z.anim = reduced() ? null : { row, at: Date.now() };
    if(z.mode === "online") sendBody(CARD + "zg:" + z.gid + ":" + guess.join(""));
    else { z.guesses.push(guess.join("")); saveZ(); }
    render();
    setTimeout(() => { render(); afterReveal(z); }, reduced() ? 0 : REVEAL);
    if(zwState().st.won && !reduced()) setTimeout(render, REVEAL + 1250);
  },
  zwStats(){ S.zwStatsOpen = true; render(); },
  zwSettings(){ S.zwSet = true; render(); },
  zwHelpOpen(){ S.zwHelp = true; render(); },
  zwClose(){ S.zwSet = false; S.zwHelp = false; S.zwEnd = false; S.zwStatsOpen = false; render(); },
  zwToggle(k){ if(k === "hard" || k === "contrast"){ store.set(k, !store.get(k, false)); render(); } },
  async zwShare(){
    const z = S.zw, zs = zwState(); if(!z || !zs) return;
    const hc = store.get("contrast", false), st = zs.st;
    const grid = st.rows.map(r => r.marks.map(m => m === "g" ? (hc ? "🟧" : "🟩") : m === "y" ? (hc ? "🟦" : "🟨") : "⬜").join("")).join("\n");
    const head = "Zugwort " + (z.mode === "daily" ? "#" + dayNumber(z.date) + " " : "") + (st.won ? st.rows.length : "X") + "/6" + (store.get("hard", false) ? "*" : "") + " (" + zs.lang.toUpperCase() + ")";
    const text = head + "\n\n" + grid + "\n\nzugpal.github.io";
    try{ if(navigator.share){ await navigator.share({ text }); return; } }catch(e){ if(e && e.name === "AbortError") return; }
    try{ await navigator.clipboard.writeText(text); toast(t("zwCopied")); }catch(e){ toast(text); }
  },
  zwOpen(gid){ if(!GID.test(gid)) return; const m = peerOf(S.chatWith); S.zw = { mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name, cur: [] }; S.zwEnd = false; S.screen = "zugwort"; render(); },
  zwInvite(mode){
    const gid = newGid(), lang = wordLang(), m = peerOf(S.chatWith);
    S.wordSheet = null;
    sendBody(CARD + "zw:" + gid + ":" + (mode === "race" ? "race" : "coop") + "-" + lang);
    S.zw = { mode: "online", gid, peerId: S.chatWith, peerName: m && m.first_name, cur: [] }; S.zwEnd = false; S.screen = "zugwort"; render();
  }
};
// a real keyboard works too (letters, Enter, Backspace)
if(typeof document !== "undefined") document.addEventListener("keydown", e => {
  if(S.screen !== "zugwort" || !S.zw || e.ctrlKey || e.metaKey || e.altKey || S.zwSet || S.zwHelp || S.zwEnd || S.zwStatsOpen) return;
  if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const zs = zwState(); if(!zs) return;
  if(e.key === "Enter"){ e.preventDefault(); zugwortActions.zwEnter(); }
  else if(e.key === "Backspace"){ e.preventDefault(); zugwortActions.zwDel(); }
  else if(e.key && e.key.length === 1){ const c = ZWord.norm(zs.lang, e.key)[0]; if(c && ZWord.alphabet(zs.lang).includes(c)){ e.preventDefault(); zugwortActions.zwKey(c); } }
});

export { zugwortActions, zugwortScreen, zwOverlay };
