// Offline test: after one visit, Zugpal opens and the games against the computer work with no internet.
const { test, expect } = require("@playwright/test");

test("works offline after the first visit", async ({ page, context }) => {
  await page.goto("/?demo&sw");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();                       // now controlled by the service worker
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".logo")).toHaveText("Zugpal");
  await expect(page.locator(".banner.info").last()).toBeVisible();   // offline notice
  // profile -> games -> Vier in einer Reihe vs computer
  await page.fill("#name", "Offline");
  await page.click('[data-act="gender"][data-arg="other"]');
  await page.check("#agree");
  await page.click('[data-act="saveProfile"]');
  await page.click('[data-act="openGames"] >> nth=0');
  await page.click('[data-act="cgCpu"][data-arg="four"]');
  await page.click('.fcol[data-arg="3"]');
  await expect(page.locator(".disc.op")).toHaveCount(1);
  await context.setOffline(false);
});
