// Outbox: on a train the signal comes and goes. Everything you send (messages, game moves, waves) is first saved
// on the phone, shown at once with a small clock, and sent as soon as there is a connection. Nothing gets lost.
// Each message carries a client id made here, so a retry after a lost answer never creates a duplicate
// (the database ignores a second row with the same from_id + client_id).
import { S, backend } from "./state.js";

const KEY = "zugpal.outbox";
const MAX_AGE = 6 * 3600e3;                 // a message older than 6 hours is no longer sent
let q = read(), busy = false, timer = null, delay = 2000, onSent = () => {}, onFail = () => {}, gSent = () => {}, gFail = () => {};
function read(){ try{ const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
function write(){ try{ localStorage.setItem(KEY, JSON.stringify(q)); }catch(e){} }
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
// network trouble (try again later) or a real "no" from the database (e.g. the match ended: drop it)?
function transient(e){
  const code = e && (e.code || e.status), msg = String(e && (e.message || e) || "");
  if(/fetch|network|abort|timeout|timed out|load failed|offline|Unexpected token|JSON/i.test(msg)) return true;
  return !code;
}
function setHooks(sent, fail){ onSent = sent || onSent; onFail = fail || onFail; }
function setGroupHooks(sent, fail){ gSent = sent || gSent; gFail = fail || gFail; }
function queue(item){ item.cid = newId(); item.at = Date.now(); q.push(item); write(); flush(); return item; }
const pending = () => q.length;
const pendingFor = (ride, to) => q.filter(x => x.kind === "msg" && x.ride === ride && x.to === to);
const pendingGroup = ride => q.filter(x => x.kind === "gmsg" && x.ride === ride);
async function sendOne(it){
  if(it.kind === "msg") return backend.send(it.to, it.body, it.ride, it.cid);
  if(it.kind === "wave") return it.on ? backend.wave(it.to, it.ride) : backend.unwave(it.to, it.ride);
  if(it.kind === "gmsg") return backend.groupSend(it.body, it.ride, it.cid);
}
async function flush(){
  if(busy || !q.length || !backend) return;
  busy = true; clearTimeout(timer);
  const done = [];
  try{
    while(q.length){
      const it = q[0];
      if(Date.now() - it.at > MAX_AGE || !S.ride || it.ride !== S.ride.key){ q.shift(); write(); continue; }
      try{ await sendOne(it); done.push(it); }
      catch(e){
        if(transient(e)) throw e;
        console.error(e); (it.kind === "gmsg" ? gFail : onFail)(it);   // the database said no: drop it, tell the person
      }
      q.shift(); write();
    }
    delay = 2000;
  }catch(e){
    timer = setTimeout(flush, delay); delay = Math.min(delay * 2.5, 60000);
  }finally{ busy = false; }
  const g = done.filter(x => x.kind === "gmsg"), o = done.filter(x => x.kind !== "gmsg");
  if(o.length) onSent(o);
  if(g.length) gSent(g);
}
// whenever the phone says it is back online, try at once
window.addEventListener("online", () => { delay = 2000; flush(); });

export { flush, pending, pendingFor, pendingGroup, queue, setGroupHooks, setHooks };
