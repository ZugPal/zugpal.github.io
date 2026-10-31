// Background thinking for Vier in einer Reihe, Mühle and Mau-Mau, so the boards keep animating while the computer searches.
const FILES = { four: ["four-engine.js", () => ZFour], muehle: ["muehle-engine.js", () => ZMuehle], mau: ["maumau-engine.js", () => ZMau] };
const loaded = {};
onmessage = e => {
  const { id, game, st, level } = e.data, f = FILES[game];
  if(!f) return postMessage({ id, move: null });
  if(!loaded[game]){ importScripts(f[0]); loaded[game] = true; }
  postMessage({ id, move: f[1]().think(st, level) });
};
