// Before/after review images: each screen side by side (before | after light | after dark), one image per language.
// Usage: node tools/compare.js <beforeDir>   (after: test-results/screens and test-results/screens-dark)
const { chromium } = require("@playwright/test");
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..", "review");
const before = path.resolve(process.argv[2] || path.join(R, "before"));
const img = p => fs.existsSync(p) ? `<img src="data:image/png;base64,${fs.readFileSync(p).toString("base64")}">` : "<div class=none>–</div>";
const NAMES = { de: "Deutsch", en: "English", ar: "العربية" };
(async () => {
  const browser = await chromium.launch();
  for (const lang of ["de", "en", "ar"]) {
    const files = fs.readdirSync(path.join(R, "screens")).filter(f => f.startsWith(lang + "-")).sort();
    const rows = files.map(f => `<div class="row"><div class="name">${f.slice(3, -4)}</div>
      <figure>${img(path.join(before, f))}<figcaption>vorher / before</figcaption></figure>
      <figure>${img(path.join(R, "screens", f))}<figcaption>nachher hell / after light</figcaption></figure>
      <figure>${img(path.join(R, "screens-dark", f))}<figcaption>nachher dunkel / after dark</figcaption></figure></div>`).join("");
    const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    await page.setContent(`<style>body{margin:0;padding:16px;background:#bbb;font:15px system-ui}h1{margin:0 0 12px}
      .row{display:grid;grid-template-columns:90px repeat(3,1fr);gap:12px;align-items:start;margin-bottom:18px}
      .name{font-weight:700;padding-top:8px}figure{margin:0}img{width:100%;border-radius:10px;display:block;box-shadow:0 1px 4px #0004}
      figcaption{text-align:center;font-size:12px;margin-top:4px}</style><h1>${NAMES[lang]} · 390×844</h1>${rows}`);
    await page.screenshot({ path: path.join(R, `compare-${lang}.png`), fullPage: true });
  }
  await browser.close();
})();
