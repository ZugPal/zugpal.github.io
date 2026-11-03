// Demo backend: simulated riders, used when there is no Supabase URL or with ?demo.
import { DEMO_PHOTO, REACT } from "./data.js";
import { currentActivity } from "./games.js";
import { aiHistory, scriptReply } from "./practice-talk.js";
import { S } from "./state.js";
import { CARD, parseMsg, portrait } from "./util.js";

/* ---------------- Demo backend (simulated riders) ---------------- */
// opts.ai (practice ride in the live app): asks the server function for a real-sounding reply; without it, or when it
// fails, the scripts in practice-talk.js answer
function DemoBackend(opts = {}){
  const people = [
    {id:"d-lena", practice:"helper", askMe:{de:"meinem Jahr in Valencia",en:"my year in Valencia",ar:"السنة التي قضيتها في فالنسيا"}, name:"Lena", gender:"woman", age:"25–29", langs:["Deutsch","English","Español"], topics:["books","travel","films"], moods:["german","books"], coach:"5", womenOnly:false, chatOnly:false, wavesBack:true, buddyBack:true,
     badges:{listener:4, german:7}, photo:portrait("#D9E6FB","#F1C9A5","#C8963E","#2D5BD0","long")},
    {id:"d-karim", practice:"learner-B1", askMe:{de:"dem besten Falafel in Köln",en:"the best falafel in Cologne",ar:"أفضل فلافل في كولونيا"}, name:"Karim", gender:"man", age:"30–39", langs:["العربية","Deutsch","Français"], topics:["football","tech","family"], moods:["small","football"], coach:"3", womenOnly:false, chatOnly:false, wavesBack:true, buddyBack:true,
     badges:{funny:5, kind:2}, photo:portrait("#F5DFD0","#C68B5E","#2B2018","#1F6B50","short")},
    {id:"d-aylin", name:"Aylin", gender:"woman", age:"25–29", langs:["Türkçe","Deutsch","English"], topics:["psychology","music"], moods:["small","music"], coach:"", womenOnly:false, chatOnly:true, wavesBack:true, buddyBack:false,
     badges:{stories:3}, photo:portrait("#E6DCF2","#E2B48C","#3A2418","#B4531E","long")},
    {id:"d-mira", name:"Mira", gender:"woman", age:"40–49", langs:["Deutsch","Türkçe"], topics:["nature","books"], moods:["quiet","travel"], coach:"5", womenOnly:true, chatOnly:true, wavesBack:false,
     badges:{kind:3}, photo:portrait("#DCEFE6","#D9A77E","#7A3FA0","#2E3B36","scarf")},
    {id:"d-jonas", name:"Jonas", gender:"man", age:"18–24", langs:["Deutsch","English"], topics:["music","games","tech"], moods:["work","music"], coach:"7", womenOnly:false, chatOnly:true, wavesBack:false,
     badges:{}, photo:portrait("#F7E7B4","#F3D2B5","#9A5A2B","#15211D","short")}
  ];
  let present=[], mine=new Set(), theirs=new Set(), blocked=new Set(), msgs={}, timers=[], reacted={}, media={};
  let demoReports = 0; const demoNotices = [];
  // a demo train people created, and the group chat of the ride
  const trains = [{ code: "DEMO42", label: "RE 1 · 07:42 · Düren → Köln Hbf", line: "RE 1", from_station: "Düren", to_station: "Köln Hbf", weekdays: [1,2,3,4,5], one_date: null,
    dep_time: "07:42", minutes: 45, coach: "5", theme: "german", women_only: false, featured: true, members: 4, mine: false, by_me: false }];
  let group = [], gid = 1;
  const GROUP = [[4000, "d-lena", {de:"Guten Morgen zusammen! ☕", en:"Good morning everyone! ☕", ar:"صباح الخير للجميع! ☕"}],
    [9000, "d-karim", {de:"Morgen! Weiß jemand, ob wir pünktlich in Köln sind?", en:"Morning! Does anyone know if we'll be on time in Cologne?", ar:"صباح الخير! هل يعرف أحد إن كنا سنصل كولونيا في الموعد؟"}],
    [14000, "d-aylin", {de:"Laut App 3 Minuten später. Wie immer 😄", en:"The app says 3 minutes late. As always 😄", ar:"التطبيق يقول 3 دقائق تأخير. كالعادة 😄"}]];
  let savedBuddies = new Set(); try{ savedBuddies = new Set(JSON.parse(localStorage.getItem("zugpal.demoBuddies")||"[]")); }catch(e){}
  const visibleTo = p => !blocked.has(p.id) && (!S.womenOnly || p.gender==="woman") && (!p.womenOnly || S.profile.gender==="woman");
  const isBuddy = p => savedBuddies.has(p.id) && S.buddies.has(p.id);
  const after = (ms, fn) => timers.push(setTimeout(fn, ms));
  // talking like a person: read your message, show "typing…", answer after a time that fits the length
  const ai = opts.ai || null; let aiOff = false;
  const typing = new Set(), busy = {}, memory = {};
  const typeTime = s => Math.min(4500, 400 + String(s || "").length * 35);
  const TALK = new Set(["text", "dice", "ttl", "bye", "word", "spin", "book"]);
  async function replyFor(p, list){
    if(ai && !aiOff){
      try{
        const r = await ai({ persona: p.id, lang: S.lang, name: S.profile && S.profile.name, practice: S.profile && S.profile.practice, history: aiHistory(list) });
        if(r && Array.isArray(r.reply) && r.reply.length) return r.reply;
      }catch(e){ if(["no_key", "limit", "auth"].includes(e && e.code)) aiOff = true; }   // no key yet / limit reached: scripts for the rest of the ride
    }
    const last = list.filter(m => m.mine).pop();
    return scriptReply(p.id, last ? last.body : "", memory[p.id] = memory[p.id] || {});
  }
  function talk(p, list){
    if(busy[p.id]){ busy[p.id].again = true; return; }              // still answering: answer the newest message next
    const job = busy[p.id] = { again: false }, t0 = Date.now(), read = 700 + Math.random() * 900;
    after(read, () => typing.add(p.id));
    const done = () => { typing.delete(p.id); delete busy[p.id]; if(job.again) talk(p, list); };
    replyFor(p, list).then(parts => {
      if(!parts.length) return after(read + 300, done);
      let wait = Math.max(250, t0 + read + typeTime(parts[0]) - Date.now());
      parts.forEach((text, i) => {
        after(wait, () => { list.push({ mine: false, body: text, at: Date.now() }); if(i === parts.length - 1) done(); });
        wait += 600 + typeTime(parts[i + 1]);
      });
    });
  }
  return {
    mode:"demo", uid:"me",
    async trains(){ return trains.map(x => ({ ...x })); },
    async trainGet(code){ const x = trains.find(r => r.code === code); return x ? { ...x } : null; },
    async createTrain(row){ if(trains.filter(r => r.by_me).length >= 3) throw Object.assign(new Error("new row violates row-level security policy"), { code: "42501" });
      trains.push({ ...row, featured: false, members: 0, mine: false, by_me: true }); },
    async cancelTrain(code){ const i = trains.findIndex(r => r.code === code && r.by_me); if(i >= 0) trains.splice(i, 1); },
    async trainJoin(code, on){ const r = trains.find(x => x.code === code); if(r && r.mine !== on){ r.mine = on; r.members += on ? 1 : -1; } },
    async groupMessages(){ if(window.__demoOffline) throw new TypeError("Failed to fetch"); return group.filter(m => !blocked.has(m.from)).map(m => ({ ...m })); },
    async groupSend(body, ride, cid){ if(window.__demoOffline) throw new TypeError("Failed to fetch"); if(cid && group.some(m => m.cid === cid)) return;
      group.push({ id: gid++, from: "me", name: S.profile.name, body, at: Date.now(), cid, mine: true });
      if(group.filter(m => m.mine).length === 1) after(2500, () => group.push({ id: gid++, from: "d-lena", name: "Lena", body: {de:"Hallo! Schön, dass du dabei bist 🙂", en:"Hi! Nice to have you here 🙂", ar:"أهلاً! سعيدة بوجودك 🙂"}[S.lang] || "Hi!", at: Date.now(), mine: false })); },
    async groupRemove(id){ const m = group.find(x => x.id === Number(id)); if(m) m.removed = true; },
    async checkIn(){ timers.forEach(clearTimeout); timers=[]; present=[]; mine.clear(); theirs.clear(); msgs={}; reacted={};
      people.forEach((p,i)=>after(700 + i*1500, ()=>present.push(p)));
      group = [];
      GROUP.forEach(([ms, id, text]) => after(ms, () => { const p = people.find(x => x.id === id); group.push({ id: gid++, from: id, name: p.name, body: text[S.lang] || text.en, at: Date.now(), mine: false }); }));
      // Karim waves first, so you can try "Waved at you"
      after(6000, ()=>{ if(present.some(p=>p.id==="d-karim")) theirs.add("d-karim"); }); },
    async update(){},
    async visible(){ if(window.__demoOffline) throw new TypeError("Failed to fetch"); if(!S.open) return []; return present.filter(visibleTo).map(p=>({id:p.id, first_name:p.name, ask_me:p.askMe ? (p.askMe[S.lang]||p.askMe.en) : null, age_range:p.age, languages:p.langs, topics:p.topics, moods:p.moods,
      chat_only:p.chatOnly, same_coach:!!S.coach && S.coach===p.coach, waved:mine.has(p.id), waved_me:theirs.has(p.id), photo_small:p.photo, badges:p.badges, buddy:isBuddy(p), practice:p.practice || null})); },
    async wave(id){ mine.add(id); const p=people.find(x=>x.id===id); if(p && p.wavesBack) after(2500, ()=>theirs.add(id)); },
    async unwave(id){ mine.delete(id); },
    async matches(){ if(!S.open) return []; return present.filter(p=>visibleTo(p) && mine.has(p.id) && theirs.has(p.id)).map(p=>({id:p.id, first_name:p.name, age_range:p.age, languages:p.langs, moods:p.moods,
      chat_only:p.chatOnly || S.chatOnly, coach:(p.chatOnly || S.chatOnly) ? null : p.coach, photo:p.photo, accept_photos:true, seen_at:new Date().toISOString(), active_game:currentActivity() || "chat", typing:typing.has(p.id)})); },
    async presence(){},
    async messages(id){ if(window.__demoOffline) throw new TypeError("Failed to fetch"); return (msgs[id]||[]).slice(); },
    async send(id, body, ride, cid){
      if(window.__demoOffline) throw new TypeError("Failed to fetch");      // tests: a tunnel
      const list = msgs[id] = msgs[id] || []; if(cid && list.some(m=>m.cid===cid)) return; list.push({mine:true, body, at:Date.now(), cid});
      const p = people.find(x=>x.id===id); if(!p) return;
      const kind = parseMsg(body).type;
      if(kind==="chess" || kind==="dama") return;
      if(kind==="dm"){
        const gid = parseMsg(body).val; let st = ZDama.newGame();
        for(const x of list){ const q = parseMsg(x.body); if(q.type==="dm" && q.val===gid){ const mv = ZDama.fromKey(st, q.extra); if(mv) st = ZDama.apply(st, mv); } }
        if(st.turn==="b"){ const bm = ZDama.bestMove(st, 3); if(bm) after(1200, ()=>list.push({mine:false, body:CARD+"dm:"+gid+":"+ZDama.key(bm), at:Date.now()})); }
        return;
      }
      if(kind==="cm"){
        const gid = parseMsg(body).val; let st = ZChess.newGame();
        for(const x of list){ const q = parseMsg(x.body); if(q.type==="cm" && q.val===gid){ const mv = ZChess.fromUci(st, q.extra); if(mv) st = ZChess.apply(st, mv); } }
        if(st.turn==="b"){ const bm = ZChess.bestMove(st, 2); if(bm) after(1200, ()=>list.push({mine:false, body:CARD+"cm:"+gid+":"+ZChess.uci(bm), at:Date.now()})); }
        return;
      }
      if(!p.wavesBack) return;                                            // Mira and Jonas never get this far
      if(kind==="text" || (TALK.has(kind) && ai && !aiOff)){ talk(p, list); return; }
      const key = id + ":" + kind; if(reacted[key]) return; reacted[key] = true;
      const text = REACT[kind] && (REACT[kind][S.lang]||REACT[kind].en);
      if(text) after(1800, ()=>list.push({mine:false, body:text, at:Date.now()}));
    },
    async sendMedia(id, kind, data){
      const list = msgs[id] = msgs[id] || []; const mid = "d-m-" + Math.random().toString(36).slice(2,10);
      media[mid] = {kind, data, mine:true, opened:false}; list.push({mine:true, body:CARD+"media:"+mid+":"+kind, at:Date.now()});
      after(3000, ()=>{ media[mid].opened = true; });
      if(!reacted[id+":media"]){ reacted[id+":media"] = true;
        after(4000, ()=>{ const rid = "d-m-" + Math.random().toString(36).slice(2,10); media[rid] = {kind:"photo", data:DEMO_PHOTO, mine:false};
          list.push({mine:false, body:CARD+"media:"+rid+":photo", at:Date.now()}); }); }
    },
    async openMedia(mid){ const m = media[mid]; if(!m || m.mine || m.used) return null; m.used = true; return {media_kind:m.kind, media_data:m.data}; },
    async mediaStatus(){ const o = {}; for(const k in media) if(media[k].mine) o[k] = media[k].opened; return o; },
    async reportMedia(){},
    async block(id){ blocked.add(id); }, async report(){}, async compliment(){}, async recordMood(){},
    async fileReport(id, reason){ const n = ++demoReports; if(reason !== "comfort") demoNotices.unshift({id:n, kind:"received", report_id:n, created_at:new Date().toISOString(), seen:false}); return n; },
    async notices(){ return demoNotices.slice(); }, async noticesSeen(ids){ demoNotices.forEach(n=>{ if(ids.includes(n.id)) n.seen = true; }); },
    async leave(id){ mine.delete(id); theirs.delete(id); },
    async buddy(id, on){ const p = people.find(x=>x.id===id); if(on && p && p.buddyBack){ savedBuddies.add(id); } else savedBuddies.delete(id);
      try{ localStorage.setItem("zugpal.demoBuddies", JSON.stringify([...savedBuddies])); }catch(e){} },
    async checkOut(){ timers.forEach(clearTimeout); timers=[]; present=[]; mine.clear(); theirs.clear(); msgs={}; }
  };
}

export { DemoBackend };
