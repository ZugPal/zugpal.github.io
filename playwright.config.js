// Playwright: phone-sized Chromium against the local static server (node tools/serve.js).
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  testMatch: /.*\.spec\.js/,
  timeout: 90000,
  use: { baseURL: "http://localhost:8081", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  webServer: { command: "node tools/serve.js 8081", url: "http://localhost:8081", reuseExistingServer: true }
});
