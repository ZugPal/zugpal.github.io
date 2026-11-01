// The phone's back button: it goes to the previous screen (or closes an open sheet) instead of leaving the app.
// We keep our own list of screens and hold one extra browser history entry (a "trap") while there is somewhere to go back to.
// On a main screen (check-in, people list) the trap is gone, so one more back leaves the app as Android users expect.
import { S } from "./state.js";

const ROOTS = new Set(["checkin", "nearby", "welcome", "feedback", "loading"]);
// screens you pass through: going back never returns to them
const PASS = new Set(["match", "mood", "loading"]);
// sheets and dialogs that back closes first: [is it open, close it]
const SHEETS = [
  [() => S.viewer, () => { S.viewer = null; }],
  [() => S.installSheet, () => { S.installSheet = null; }],
  [() => S.qrSheet, () => { S.qrSheet = null; }],
  [() => S.groupSheet, () => { S.groupSheet = null; }],
  [() => S.reportSheet, () => { S.reportSheet = null; }],
  [() => S.reportDone, () => { S.reportDone = null; }],
  [() => S.wordSheet, () => { S.wordSheet = null; }],
  [() => S.cgSheet, () => { S.cgSheet = false; }],
  [() => S.hostSheet, () => { S.hostSheet = false; }],
  [() => S.plusSheet, () => { S.plusSheet = false; }],
  [() => S.photoSheet, () => { S.photoSheet = false; }],
  [() => S.solSheet, () => { S.solSheet = false; }],
  [() => S.solDialog, () => { S.solDialog = null; }],
  [() => S.tkNew, () => { S.tkNew = false; }],
  [() => S.trainSheet, () => { S.trainSheet = null; }],
  [() => S.wordFlip !== null && S.wordFlip !== undefined, () => { S.wordFlip = null; }],
  [() => S.chatDrawer, () => { S.chatDrawer = false; }]
];
let stack = [], last = null, trapped = false, ignore = 0, popping = false, rerender = () => {};
const sheetOpen = () => SHEETS.some(([open]) => open());

function navInit(renderFn){
  rerender = renderFn;
  // links like #talk or #ride-CODE are read once at start; remove them so a reload doesn't repeat them
  if(location.hash) try{ history.replaceState(null, "", location.pathname + location.search); }catch(e){}
  window.addEventListener("popstate", () => {
    if(ignore){ ignore--; return; }
    trapped = false;
    const sh = SHEETS.find(([open]) => open());
    if(sh){ sh[1](); rerender(); return; }
    if(stack.length){ popping = true; S.screen = stack.pop(); if(S.screen === "nearby") S.current = null; rerender(); }
  });
}
// called after every full render
function navSync(){
  const now = S.screen;
  if(now !== last){
    if(popping) popping = false;
    else if(ROOTS.has(now)) stack = [];
    else {
      const i = stack.lastIndexOf(now);
      if(i >= 0) stack = stack.slice(0, i);                 // went back by an in-app button
      else if(last && !PASS.has(last)) stack.push(last);    // went forward
    }
    if(ROOTS.has(now)) stack = [];
    last = now;
  }
  const want = stack.length > 0 || sheetOpen();
  try{
    if(want && !trapped){ history.pushState({ zugpal: 1 }, ""); trapped = true; }
    else if(!want && trapped){ trapped = false; ignore++; history.back(); }
  }catch(e){}
}

export { navInit, navSync };
