// Demo backend: simulated riders, used when there is no Supabase URL or with ?demo.
import { DEMO_PHOTO, FOLLOW, REACT } from "./data.js";
import { currentActivity } from "./games.js";
import { S } from "./state.js";
import { CARD, parseMsg, portrait } from "./util.js";

/* ---------------- Demo backend (simulated riders) ---------------- */
function DemoBackend(){
  const people = [
    {id:"d-lena", practice:"helper", askMe:{de:"meinem Jahr in Valencia",en:"my year in Valencia",ar:"السنة التي قضيتها في فالنسيا"}, name:"Lena", gender:"woman", age:"25–29", langs:["Deutsch","English","Español"], topics:["books","travel","films"], moods:["german","books"], coach:"5", womenOnly:false, chatOnly:false, wavesBack:true, buddyBack:true,
     badges:{listener:4, german:7}, photo:portrait("#D9E6FB","#F1C9A5","#C8963E","#2D5BD0","long"),
     reply:{de:"Hallo! Ich sitze in Wagen 5, beim mittleren Eingang.",en:"Hi! I'm in coach 5, by the middle doors.",ar:"مرحباً! أنا في العربة 5 بجانب الباب الأوسط."}},
    {id:"d-karim", practice:"learner-B1", askMe:{de:"dem besten Falafel in Köln",en:"the best falafel in Cologne",ar:"أفضل فلافل في كولونيا"}, name:"Karim", gender:"man", age:"30–39", langs:["العربية","Deutsch","Français"], topics:["football","tech","family"], moods:["small","football"], coach:"3", womenOnly:false, chatOnly:false, wavesBack:true, buddyBack:true,
     badges:{funny:5, kind:2}, photo:portrait("#F5DFD0","#C68B5E","#2B2018","#1F6B50","short"),
     reply:{de:"Hey! Gerne, ich steige in Horrem aus.",en:"Hey! Sure, I get off at Horrem.",ar:"أهلاً! بكل سرور، سأنزل في محطة هورم."}},
    {id:"d-aylin", name:"Aylin", gender:"woman", age:"25–29", langs:["Türkçe","Deutsch","English"], topics:["psychology","music"], moods:["small","music"], coach:"", womenOnly:false, chatOnly:true, wavesBack:true, buddyBack:false,
     badges:{stories:3}, photo:portrait("#E6DCF2","#E2B48C","#3A2418","#B4531E","long"),
     reply:{de:"Hi! Ich schreibe lieber, bin noch etwas müde.",en:"Hi! I prefer to chat, still a bit sleepy.",ar:"مرحباً! أفضّل الكتابة، ما زلت نعسانة قليلاً."}},
    {id:"d-mira", name:"Mira", gender:"woman", age:"40–49", langs:["Deutsch","Türkçe"], topics:["nature","books"], moods:["quiet","travel"], coach:"5", womenOnly:true, chatOnly:true, wavesBack:false,
     badges:{kind:3}, photo:portrait("#DCEFE6","#D9A77E","#7A3FA0","#2E3B36","scarf"), reply:{}},
    {id:"d-jonas", name:"Jonas", gender:"man", age:"18–24", langs:["Deutsch","English"], topics:["music","games","tech"], moods:["work","music"], coach:"7", womenOnly:false, chatOnly:true, wavesBack:false,
     badges:{}, photo:portrait("#F7E7B4","#F3D2B5","#9A5A2B","#15211D","short"), reply:{}}
  ];
  let present=[], mine=new Set(), theirs=new Set(), blocked=new Set(), msgs={}, timers=[], reacted={}, media={};
  let demoReports = 0; const demoNotices = [];
  let savedBuddies = new Set(); try{ savedBuddies = new Set(JSON.parse(localStorage.getItem("zugpal.demoBuddies")||"[]")); }catch(e){}
  const visibleTo = p => !blocked.has(p.id) && (!S.womenOnly || p.gender==="woman") && (!p.womenOnly || S.profile.gender==="woman");
  const isBuddy = p => savedBuddies.has(p.id) && S.buddies.has(p.id);
  const after = (ms, fn) => timers.push(setTimeout(fn, ms));
  return {
    mode:"demo",
    async checkIn(){ timers.forEach(clearTimeout); timers=[]; present=[]; mine.clear(); theirs.clear(); msgs={}; reacted={};
      people.forEach((p,i)=>after(700 + i*1500, ()=>present.push(p))); },
    async update(){},
    async visible(){ if(!S.open) return []; return present.filter(visibleTo).map(p=>({id:p.id, first_name:p.name, ask_me:p.askMe ? (p.askMe[S.lang]||p.askMe.en) : null, age_range:p.age, languages:p.langs, topics:p.topics, moods:p.moods,
      chat_only:p.chatOnly, same_coach:!!S.coach && S.coach===p.coach, waved:mine.has(p.id), photo_small:p.photo, badges:p.badges, buddy:isBuddy(p), practice:p.practice || null})); },
    async wave(id){ mine.add(id); const p=people.find(x=>x.id===id); if(p && p.wavesBack) after(2500, ()=>theirs.add(id)); },
    async unwave(id){ mine.delete(id); },
    async matches(){ if(!S.open) return []; return present.filter(p=>visibleTo(p) && mine.has(p.id) && theirs.has(p.id)).map(p=>({id:p.id, first_name:p.name, age_range:p.age, languages:p.langs, moods:p.moods,
      chat_only:p.chatOnly || S.chatOnly, coach:(p.chatOnly || S.chatOnly) ? null : p.coach, photo:p.photo, accept_photos:true, seen_at:new Date().toISOString(), active_game:currentActivity() || "chat"})); },
    async presence(){},
    async messages(id){ return (msgs[id]||[]).slice(); },
    async send(id, body){
      const list = msgs[id] = msgs[id] || []; list.push({mine:true, body, at:Date.now()});
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
      if(kind==="text"){
        const n = list.filter(m=>!m.mine && parseMsg(m.body).type==="text").length;
        if(n >= 5 || !p.reply.en) return;
        const text = n===0 ? (p.reply[S.lang]||p.reply.en) : FOLLOW[S.lang][(n-1) % FOLLOW[S.lang].length];
        after(1500, ()=>list.push({mine:false, body:text, at:Date.now()})); return;
      }
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
