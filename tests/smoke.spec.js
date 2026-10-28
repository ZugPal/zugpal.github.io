// UI smoke test: profile -> check-in -> match -> chat -> game, in German, English and Arabic, at phone size.
// Runs in demo mode (?demo), so it never touches the live database.
// Run: npx playwright test        Screenshots: review/screens/ (playwright wipes test-results/ on every run)
const { test, expect } = require("@playwright/test");
const path = require("path");

const SCHEME = process.env.SCHEME === "dark" ? "dark" : "light";   // SCHEME=dark npx playwright test  -> dark-mode screenshots
const SHOTS = path.join(__dirname, "..", "review", SCHEME === "dark" ? "screens-dark" : "screens");
test.use({ colorScheme: SCHEME });
const TEXT = {
  de: { checkin: "Talk Train", match: "gewunken", send: "Senden" },
  en: { checkin: "Talk Train", match: "both waved", send: "Send" },
  ar: { checkin: "Talk Train", match: "", send: "إرسال" }
};

for (const lang of ["de", "en", "ar"]) {
  test(`main flow (${lang})`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", e => errors.push(String(e)));
    const shot = name => page.screenshot({ path: path.join(SHOTS, `${lang}-${name}.png`) });

    await page.goto("/?demo");
    await page.selectOption("#lang", lang);
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    await expect(page.locator(".trust li")).toHaveCount(4);
    await shot("1-profile");

    // Profile
    await page.fill("#name", "Husam");
    await page.click('[data-act="gender"][data-arg="man"]');
    await page.click('[data-act="lang2"] >> nth=0');
    await page.click('[data-act="topic"] >> nth=0');
    await page.check("#agree");
    await page.click('[data-act="saveProfile"]');

    // Check-in to the Talk Train, pick a mood, open up
    await expect(page.locator('[data-act="checkin"][data-arg="talk"]')).toBeVisible();
    await shot("2-checkin");
    await page.click('[data-act="checkin"][data-arg="talk"]');
    await page.click('[data-act="mood"] >> nth=0');
    await shot("3-mood");
    await page.click('[data-act="goOpen"]');

    // Wave until a simulated rider waves back
    const chatBtn = page.locator('[data-act="chat"]').first();
    for (let i = 0; i < 20 && !(await chatBtn.isVisible()); i++) {
      const wave = page.locator('.person [data-act="wave"][aria-pressed="false"]').first();
      if (await wave.isVisible()) await wave.click();
      await page.waitForTimeout(800);
    }
    await expect(chatBtn).toBeVisible();
    await expect(page.locator('[data-act="reportOpen"]').first()).toBeVisible();
    await shot("4-match");

    // Chat: safety bar, send a message, report sheet opens and closes
    await chatBtn.click();
    await expect(page.locator(".safety [data-act=\"leaveChat\"]")).toBeVisible();
    await page.fill("#chatInput", "Hallo! 👋");
    await page.click(".chatbar button[type=submit]");
    await expect(page.locator(".msg.mine").last()).toContainText("Hallo!");
    await shot("5-chat");
    await page.click('.safety [data-act="reportOpen"]');
    await expect(page.locator('.chip.opt[data-arg="under18"]')).toBeVisible();
    await shot("6-report");
    await page.click('[data-act="reportCancel"]');

    // Online chess with the match: invite card + board
    await page.click('[data-act="chessInvite"]');
    await expect(page.locator(".board .sq")).toHaveCount(64);
    await shot("7-chess-online");

    // Games screen: chess vs computer makes a move, solitaire deals
    await page.goto("/?demo");
    await page.click('[data-act="openGames"] >> nth=0');
    await shot("8-games");
    await page.click('[data-act="chessCpu"]');
    await page.click('.sq[aria-label="e2 wP"]');
    await page.click('.sq[aria-label="e4"]');
    await expect(page.locator('.sq[aria-label="e4 wP"]')).toBeVisible();
    await page.goto("/?demo");
    await page.click('[data-act="openGames"] >> nth=0');
    await page.click('[data-act="solNew"]');
    await expect(page.locator(".soltable")).toBeVisible();
    await shot("9-solitaire");

    expect(errors, errors.join("\n")).toEqual([]);
  });
}
