// Background thinking for the Dama computer, so the board keeps animating while it searches.
importScripts("dama-engine.js");
onmessage = e => { const m = ZDama.think(e.data.st, e.data.level); postMessage({ id: e.data.id, key: m ? ZDama.key(m) : null }); };
