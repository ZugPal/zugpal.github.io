// Tiny static file server for local testing (the app has no build step). Usage: node tools/serve.js [port]
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, ".."), port = Number(process.argv[2]) || 8080;
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".json":"application/json", ".webmanifest":"application/manifest+json", ".svg":"image/svg+xml", ".png":"image/png",
  ".woff2":"font/woff2", ".txt":"text/plain; charset=utf-8", ".epub":"application/epub+zip", ".mp3":"audio/mpeg"};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if(p.endsWith("/")) p += "index.html";
  const file = path.join(root, p);
  if(!file.startsWith(root) || /[\/](node_modules|\.git)[\/]/.test(file)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if(err){ res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, {"Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store"}); res.end(data);
  });
}).listen(port, () => console.log("Zugpal on http://localhost:" + port));
