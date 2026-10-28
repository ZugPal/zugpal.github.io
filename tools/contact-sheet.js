// Puts the smoke-test screenshots side by side, one image per language, for review on a phone.
// Usage: node tools/contact-sheet.js [prefix]   (after npx playwright test)  ->  test-results/review-<lang>.png
const { chromium } = require("@playwright/test");
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "review", "screens"), prefix = process.argv[2] || "";
const NAMES = { de: "Deutsch", en: "English", ar: "العربية" };
(async () => {
  const browser = await chromium.launch();
  for (const lang of ["de", "en", "ar"]) {
    const files = fs.readdirSync(dir).filter(f => f.startsWith(lang + "-") && f.endsWith(".png")).sort();
    const cells = files.map(f => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString("base64")}"><figcaption>${f.slice(3, -4)}</figcaption></figure>`).join("");
    const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    await page.setContent(`<style>body{margin:0;padding:16px;background:#ccc;font:16px system-ui}h1{margin:0 0 12px}
      .g{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}figure{margin:0}img{width:100%;border-radius:10px;display:block;box-shadow:0 1px 4px #0004}
      figcaption{text-align:center;font-size:13px;margin-top:4px}</style><h1>${prefix}${NAMES[lang]} · 390×844</h1><div class="g">${cells}</div>`);
    await page.screenshot({ path: path.join(__dirname, "..", "review", `review-${prefix}${lang}.png`), fullPage: true });
  }
  await browser.close();
})();
