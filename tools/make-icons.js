// Makes every app icon from icons/icon.svg (logo 2, "talking windows"): icon-192/512 (rounded), apple-touch-icon
// (square, iOS rounds it), maskable-512 (full background, logo shrunk into Android's safe circle) and the
// monochrome notification badge (two white speech bubbles on transparent). Run: node tools/make-icons.js
const { chromium } = require("@playwright/test");
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "icons");
const svg = fs.readFileSync(path.join(dir, "icon.svg"), "utf8");
const body = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const bg = body.match(/^<rect width="512" height="512" rx="\d+" fill="([^"]+)"\/>/);
if (!bg) throw new Error("icon.svg must start with the background rect");
const inner = body.slice(bg[0].length);
const wrap = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">${s}</svg>`;
const square = wrap(`<rect width="512" height="512" fill="${bg[1]}"/>${inner}`);
const maskable = wrap(`<rect width="512" height="512" fill="${bg[1]}"/><g transform="translate(256 256) scale(.78) translate(-256 -256)">${inner}</g>`);
const badge = wrap(`<g transform="translate(256 236) scale(1.55) translate(-256 -236)"><rect x="104" y="166" width="140" height="104" rx="28" fill="#fff"/><path d="M128 266l-6 40 42-40z" fill="#fff"/>
  <rect x="268" y="166" width="140" height="104" rx="28" fill="#fff"/><path d="M384 266l6 40-42-40z" fill="#fff"/></g>`);
const jobs = [["icon-512.png", 512, wrap(body), true], ["icon-192.png", 192, wrap(body), true], ["apple-touch-icon.png", 180, square, false],
  ["maskable-512.png", 512, maskable, false], ["badge-96.png", 96, badge, true]];
(async () => {
  const b = await chromium.launch();
  for (const [file, size, s, clear] of jobs) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<html><body style="margin:0;background:transparent;width:${size}px;height:${size}px">${s}</body></html>`);
    await p.screenshot({ path: path.join(dir, file), omitBackground: clear });
    await p.close(); console.log("icons/" + file);
  }
  await b.close();
})();
