// Writes the offline file list and a content version into sw.js. Run after changing any app file:
//   node tools/update-sw.js          (writes sw.js)
//   node tools/update-sw.js --check  (fails if sw.js is out of date; part of npm test)
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const DIRS = ["src", "engines", "vendor", "vendor/fonts", "vendor/pieces", "icons", "sponsor"];
const TOP = ["./", "index.html", "manifest.webmanifest", "legal.css", "impressum.html", "datenschutz.html", "regeln.html", "library/catalog.json"];
const skip = f => /LICENSE|\.txt$/.test(f);
const files = TOP.concat(DIRS.flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => fs.statSync(path.join(ROOT, d, f)).isFile() && !skip(f)).sort().map(f => d + "/" + f)));
const hash = crypto.createHash("sha256");
// text files are hashed with LF line endings, so a Windows checkout (CRLF) gives the same version as GitHub
const TEXT = /\.(html|js|css|json|webmanifest|svg|txt)$/;
for(const f of files){ const p = path.join(ROOT, f === "./" ? "index.html" : f); const buf = fs.readFileSync(p);
  hash.update(f); hash.update(TEXT.test(p) ? buf.toString("utf8").replace(/\r\n/g, "\n") : buf); }
const version = hash.digest("hex").slice(0, 12);
const swPath = path.join(ROOT, "sw.js");
const sw = fs.readFileSync(swPath, "utf8");
const next = sw.replace(/const VERSION = "[^"]*";/, `const VERSION = "${version}";`)
  .replace(/const FILES = \[[\s\S]*?\];/, `const FILES = [\n${files.map(f => `  "${f}"`).join(",\n")}\n];`);
if(process.argv.includes("--check")){
  if(next.replace(/\r\n/g, "\n") !== sw.replace(/\r\n/g, "\n")){ console.log("FAIL sw.js is out of date: run node tools/update-sw.js"); process.exit(1); }
  console.log("ALL SW CHECKS OK (" + files.length + " files, version " + version + ")");
} else { fs.writeFileSync(swPath, next); console.log("sw.js updated: " + files.length + " files, version " + version); }
