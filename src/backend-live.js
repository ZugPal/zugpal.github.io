// Live backend: Supabase (anonymous sign-in).
import { CONFIG } from "./config.js";
import { S } from "./state.js";

/* ---------------- Live backend (Supabase) ---------------- */
const here = () => location.origin + location.pathname;
function loadScript(src){ return new Promise((ok,fail)=>{ const s=document.createElement("script"); s.src=src; s.onload=ok; s.onerror=fail; document.head.appendChild(s); }); }
async function LiveBackend(){
  await loadScript("vendor/supabase.js"); // supabase-js 2.45.4, hosted here so no CDN sees visitor IPs
  const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  let { data:{ session } } = await sb.auth.getSession();
  if(!session){ const { data, error } = await sb.auth.signInAnonymously(); if(error) throw error; session = data.session; }
  const uid = session.user.id;
  const ok = ({data, error}) => { if(error) throw error; return data; };
  // Realtime: new messages to me arrive instantly (RLS applies). Waves stay private, so after a wave we send an
  // empty "poke" on the ride's broadcast channel and everyone re-reads what they are allowed to see.
  let onChange = () => {}, msgCh = null, rideCh = null, rideKey = null;
  const poke = () => { if(rideCh) rideCh.send({ type:"broadcast", event:"poke", payload:{} }).catch(()=>{}); };
  function joinRide(){
    const k = S.ride ? S.ride.key : null; if(k === rideKey) return;
    if(rideCh){ sb.removeChannel(rideCh); rideCh = null; }
    rideKey = k;
    if(k) rideCh = sb.channel("ride-" + k, { config:{ broadcast:{ self:false } } }).on("broadcast", { event:"poke" }, () => onChange("ride")).subscribe();
  }
  const api = {
    mode:"live", realtime:false,
    listen(fn){
      onChange = fn;
      if(!msgCh) msgCh = sb.channel("me-" + uid)
        .on("postgres_changes", { event:"INSERT", schema:"public", table:"messages", filter:"to_id=eq." + uid }, () => onChange("msg"))
        .subscribe(st => { api.realtime = st === "SUBSCRIBED"; });
      joinRide();
    },
    // Optional email account (magic link). updateUser keeps the same user id, so badges and buddies stay.
    async account(){ const { data } = await sb.auth.getUser(); const u = data && data.user; return u ? { email: u.email || null, anon: !!u.is_anonymous, pending: u.new_email || null } : null; },
    async linkEmail(email){ ok(await sb.auth.updateUser({ email }, { emailRedirectTo: here() })); },
    async emailLogin(email){ ok(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: here() } })); },
    async signOut(){ await sb.auth.signOut(); },
    async saveProfile(p){ ok(await sb.from("profiles").upsert({ id: uid, data: p, updated_at: new Date().toISOString() })); },
    async loadProfile(){ const r = ok(await sb.from("profiles").select("data").eq("id", uid).maybeSingle()); return r ? r.data : null; },
    unlisten(){ onChange = () => {}; if(rideCh){ sb.removeChannel(rideCh); rideCh = null; rideKey = null; } },
    async checkIn(){ await this.update(); joinRide(); poke(); },
    async update(){ const p = S.profile; ok(await sb.from("riders").upsert({
      id:uid, ride_key:S.ride.key, first_name:p.name, gender:p.gender, age_range:p.age || null, ask_me:p.askMe || null, languages:p.langs, topics:p.topics,
      photo_small:p.photoSmall || null, photo:p.photo || null, moods:[...S.moods],
      women_only:S.womenOnly && p.gender==="woman", chat_only:S.chatOnly, accept_photos:p.acceptPhotos !== false, practice:p.practice || null, coach:S.coach || null, is_open:S.open, lang:S.lang,
      expires_at:new Date(S.ride.expiresAt).toISOString(), updated_at:new Date().toISOString() })); },
    async visible(){ return ok(await sb.rpc("visible_riders")) || []; },
    async wave(id){ ok(await sb.from("waves").upsert({from_id:uid, to_id:id, ride_key:S.ride.key})); poke(); },
    async unwave(id){ ok(await sb.from("waves").delete().match({from_id:uid, to_id:id, ride_key:S.ride.key})); poke(); },
    async matches(){ return ok(await sb.rpc("my_matches")) || []; },
    async messages(id){ const rows = ok(await sb.from("messages").select("from_id,body,created_at").eq("ride_key",S.ride.key)
        .or(`and(from_id.eq.${uid},to_id.eq.${id}),and(from_id.eq.${id},to_id.eq.${uid})`).order("created_at"));
      return (rows||[]).map(m=>({mine:m.from_id===uid, body:m.body, at:Date.parse(m.created_at)})); },
    async send(id, body){ ok(await sb.from("messages").insert({ride_key:S.ride.key, to_id:id, body})); },
    async block(id){ ok(await sb.from("blocks").upsert({blocker:uid, blocked:id})); },
    async report(id, reason){ ok(await sb.from("reports").insert({reported:id, ride_key:S.ride && S.ride.key, reason:reason || "reported in app"})); },
    async fileReport(id, reason, details){ return ok(await sb.rpc("file_report", {p_reported:id, p_ride:(S.ride && S.ride.key) || "", p_reason:reason, p_details:details || ""})); },
    async notices(){ return ok(await sb.rpc("my_notices")) || []; },
    async noticesSeen(ids){ ok(await sb.rpc("notices_seen", {p_ids:ids})); },
    async leave(id){ if(S.ride) ok(await sb.from("waves").delete().match({from_id:uid, to_id:id, ride_key:S.ride.key})); poke(); },
    async compliment(id, badge){ ok(await sb.from("compliments").upsert({from_id:uid, to_id:id, badge})); },
    async sendMedia(id, kind, data){ return ok(await sb.rpc("send_media", {p_to:id, p_ride:S.ride.key, p_kind:kind, p_data:data})); },
    async openMedia(mid){ const rows = ok(await sb.rpc("open_media", {p_id:mid})) || []; return rows[0] || null; },
    async mediaStatus(){ const rows = ok(await sb.rpc("my_media_status", {p_ride:S.ride.key})) || []; const o = {}; rows.forEach(r=>o[r.id] = r.opened); return o; },
    async reportMedia(mid){ ok(await sb.rpc("report_media", {p_id:mid})); },
    async presence(act){ ok(await sb.from("riders").update({seen_at:new Date().toISOString(), active_game:act || null}).eq("id", uid)); },
    async recordMood(before, after, matched, recommend){ ok(await sb.from("ride_moods").insert({ride_key:S.ride ? S.ride.key.replace(/-\d{4}-\d{2}-\d{2}$/,"") : null, mood_before:before, mood_after:after, matched, recommend})); },
    // Host mode (Talk Train): numbers only, one announcement per ride
    async amHost(){ return !!ok(await sb.rpc("am_host")); },
    async becomeHost(code){ return ok(await sb.rpc("become_host", { p_code: code })); },
    async hostStats(){ const rows = ok(await sb.rpc("host_ride_stats", { p_ride: S.ride.key })) || []; return rows[0] || null; },
    async hostAnnounce(body){ ok(await sb.rpc("host_announce", { p_ride: S.ride.key, p_body: body })); poke(); },
    async announcement(){ return ok(await sb.rpc("ride_announcement")) || null; },
    async buddy(id, on){ on ? ok(await sb.from("buddies").upsert({from_id:uid, to_id:id})) : ok(await sb.from("buddies").delete().match({from_id:uid, to_id:id})); },
    async checkOut(){ await sb.from("messages").delete().eq("from_id",uid); await sb.from("riders").delete().eq("id",uid); poke(); }
  };
  return api;
}

export { LiveBackend };
