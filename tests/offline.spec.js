// Offline test: after one visit, Zugpal opens and the games against the computer work with no internet.
const { test, expect } = require("@playwright/test");

test("works offline after the first visit", async ({ page, context }) => {
  await page.goto("/?demo&sw");
  // download a book while online
  await page.fill("#name", "Offline"); await page.click('[data-act="gender"][data-arg="other"]'); await page.click('[data-act="topic"] >> nth=0'); await page.check("#agree"); await page.click('[data-act="saveProfile"]');
  await page.click('[data-act="openLibrary"] >> nth=0');
  await page.click('.bookrow[data-arg="pg17161"]');
  await page.click('[data-act="libDownload"]');
  await expect(page.locator('[data-act="libRemove"]')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();                       // now controlled by the service worker
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".logo")).toHaveText("Zugpal");
  await expect(page.locator(".banner.info").last()).toBeVisible();   // offline notice
  // the downloaded book opens without internet
  await page.click('[data-act="openLibrary"] >> nth=0');
  await page.click('.bookrow[data-arg="pg17161"]');
  await page.click('[data-act="libRead"]');
  await expect(page.locator(".reader iframe")).toBeVisible({ timeout: 15000 });
  await page.click('[data-act="readerClose"]');
  // games -> Vier in einer Reihe vs computer
  await page.goto("/?demo&sw");
  await page.click('[data-act="openGames"] >> nth=0');
  await page.click('[data-act="cgCpu"][data-arg="four"]');
  { const r = await page.locator(".f4board").boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height * .6); }
  await expect(page.locator(".f4layer .f4d:not(.ghost)")).toHaveCount(2, { timeout: 8000 });   // the computer (Web Worker) answered offline
  await context.setOffline(false);
});
