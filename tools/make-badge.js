// Makes icons/badge-96.png: the white Z on transparent, used as the small monochrome icon in Android notifications.
const { chromium } = require("@playwright/test");
const path = require("path");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 96, height: 96 } });
  await p.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="96" height="96">
    <path d="M150 128h212v52L222 330h140v54H150v-52l140-150H150z" fill="#fff"/></svg></body></html>`);
  await p.screenshot({ path: path.join(__dirname, "..", "icons", "badge-96.png"), omitBackground: true });
  await b.close(); console.log("icons/badge-96.png");
})();
