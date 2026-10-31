// Background thinking for the chess computer, so the board keeps animating while it searches.
importScripts("chess-engine.js");
onmessage = e => { const m = ZChess.think(e.data.st, e.data.level); postMessage({ id: e.data.id, uci: m ? ZChess.uci(m) : null }); };
