// QR codes, drawn on the phone (no web service sees the link). Uses vendor/qrcode.js (MIT), loaded only when needed.
// In the app: <div class="qr" data-qr="https://…"></div> is filled after each render by paintQrs().
let loading = null;
function loadQr(){
  if(window.qrcode) return Promise.resolve();
  if(!loading) loading = new Promise((ok, fail) => {
    const s = document.createElement("script"); s.src = new URL("../vendor/qrcode.js", import.meta.url).href; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  return loading;
}
// An SVG with one path; dark modules in `ink`, a white quiet zone of 2 modules so phones scan it on any background
function qrSvg(text, ink = "#1F2433"){
  const q = window.qrcode(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 2, size = n + m * 2; let d = "";
  for(let r = 0; r < n; r++) for(let c = 0; c < n; c++) if(q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="${ink}"/></svg>`;
}
function paintQrs(){
  const els = [...document.querySelectorAll(".qr[data-qr]")].filter(el => el.dataset.done !== el.dataset.qr);
  if(!els.length) return;
  loadQr().then(() => els.forEach(el => { el.innerHTML = qrSvg(el.dataset.qr); el.dataset.done = el.dataset.qr; })).catch(e => console.error(e));
}

export { loadQr, paintQrs, qrSvg };
