// The first minutes: quick sign-up, the next Talk Train, German practice at check-in, how waving works,
// the profile reminder, the short games list, and the "Reconnecting…" notice. Phone size, demo mode.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

test("quick sign-up to the people list", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await page.goto("/?demo#talk");
  await page.selectOption("#lang", "de");
  await expect(page.locator(".talkbanner")).toBeVisible();                 // came from the QR code
  await expect(page.locator("details.more")).not.toHaveAttribute("open", "");
  await page.fill("#name", "Husam");
  await page.click('[data-act="gender"][data-arg="man"]');
  await page.check("#agree");
  await page.click('[data-act="saveProfile"]');
  await expect(page.locator(".toast")).toContainText(/Thema/);              // one topic is needed
  await page.click('[data-act="topic"] >> nth=0');
  await page.screenshot({ path: path.join(SHOTS, "onb-1-signup.png"), fullPage: true });
  await page.click('[data-act="saveProfile"]');
  // #talk goes straight on to the Talk Train: mood screen with German practice
  await page.click('[data-act="mpracticeLevel"][data-arg="A2"]');
  await page.click('[data-act="mpracticeLevel"][data-arg="B1"]');
  await expect(page.locator('[data-act="mpracticeLevel"][data-arg="B1"]').last()).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: path.join(SHOTS, "onb-2-mood.png"), fullPage: true });
  await page.click('[data-act="goOpen"]');
  // how waving works, the profile reminder
  await expect(page.locator(".howwave .steps li")).toHaveCount(3);
  await expect(page.locator(".nudge")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "onb-3-nearby.png") });
  await page.click('[data-act="nudgeOff"]');
  await expect(page.locator(".nudge")).toHaveCount(0);
  await page.locator('.person [data-act="wave"]').first().click({ timeout: 15000 });
  await expect(page.locator(".howwave")).toHaveCount(0);                    // after the first wave: one line
  // in a tunnel
  await page.evaluate(async () => { const S = (await import("/src/state.js")).S; S.netDown = true; (await import("/src/screens.js")).render(); });
  await expect(page.locator(".reconnect")).toBeVisible();
  expect(errors).toEqual([]);
});

test("check-in screen: the next Talk Train, and the games list", async ({ page }) => {
  await page.goto("/?demo");
  await page.evaluate(async () => {
    const S = (await import("/src/state.js")).S;
    S.profile = { name: "T", gender: "man", langs: [], topics: ["travel"] }; S.agreed = true; S.screen = "checkin";
    (await import("/src/screens.js")).render();
  });
  await expect(page.locator(".talkhero .talkwhen")).toContainText("07:42");
  await expect(page.locator('.talkhero [data-act="calAdd"], .talkhero [data-act="checkin"][data-arg="talk"]').first()).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "onb-4-talktrain.png") });
  await page.click('[data-act="openGames"]');
  await expect(page.locator(".gamecard2")).toHaveCount(3);
  await expect(page.locator(".gamerow")).toHaveCount(7);
  await page.screenshot({ path: path.join(SHOTS, "onb-5-games.png"), fullPage: true });
});
