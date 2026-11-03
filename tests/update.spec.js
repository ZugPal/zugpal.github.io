// A new version must reach the phone in full. GitHub Pages lets the browser keep each file for 10 minutes;
// before the fix, an update within those minutes stored the old styles.css inside the new version (Husam's
// word sheet stayed broken after the fix was live). This server behaves like GitHub Pages, then publishes a new version.
const { test, expect } = require("@playwright/test");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), PORT = 8098;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
let release = "A";
let server;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if(p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if(!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){ res.writeHead(404); return res.end(); }
    let body = fs.readFileSync(file);
    if(p === "/src/styles.css") body = Buffer.concat([body, Buffer.from(`\n/*release:${release}*/\n`)]);
    if(p === "/sw.js") body = Buffer.from(body.toString("utf8").replace(/const VERSION = "[^"]*";/, `const VERSION = "test-${release}";`));
    // like GitHub Pages: the browser may keep every file 10 minutes (the worker script itself is always checked)
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "max-age=600" });
    res.end(body);
  });
  await new Promise(r => server.listen(PORT, r));
});
test.afterAll(() => new Promise(r => server.close(r)));

test("an update stores the new files, not the browser's 10-minute copies", async ({ page }) => {
  release = "A";
  await page.goto(`http://localhost:${PORT}/?demo&sw`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cached = name => page.evaluate(async n => { const c = await caches.open(n); const r = await c.match("src/styles.css"); return r ? (await r.text()).match(/release:(\w)/)[1] : null; }, name);
  expect(await cached("zugpal-test-A")).toBe("A");
  // a new version goes live a few minutes later: the browser still holds styles.css A in its own short-term cache
  release = "B";
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 15000 }).toEqual(["zugpal-test-B"]);
  expect(await cached("zugpal-test-B")).toBe("B");
});
