// Trains people create (like a group) and the group chat of a ride. Phone size, demo mode.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function signUp(page, lang = "de", url = "/?demo"){
  await page.goto(url);
  await page.selectOption("#lang", lang);
  await page.fill("#name", "Husam");
  await page.click('[data-act="gender"][data-arg="man"]');
  await page.click('[data-act="topic"] >> nth=0');
  await page.check("#agree");
  await page.click('[data-act="saveProfile"]');
}

for(const lang of ["de", "en", "ar"]){
  test(`create a train, say "I'll be there", share it (${lang})`, async ({ page }) => {
    const errors = []; page.on("pageerror", e => errors.push(String(e)));
    await signUp(page, lang);
    await expect(page.locator('.traincard[data-code="DEMO42"]')).toBeVisible();
    await page.click('[data-act="trainNew"]');
    await page.fill("#tnLine", "RE 9");
    await page.fill("#tnFrom", "Aachen");
    await page.fill("#tnTo", "Köln");
    await page.fill("#tnTime", "08:10");
    await page.click('[data-act="tnTheme"][data-arg="games"]');
    await page.screenshot({ path: path.join(SHOTS, `trains-1-new-${lang}.png`), fullPage: true });
    await page.click('[data-act="trainCreate"]');
    await expect(page.locator(".qr.big svg")).toBeVisible();                      // share it right away
    await expect(page.locator(".qrurl")).toContainText("#train-");
    await page.click('[data-act="qrClose"]');
    const mine = page.locator(".traincard", { hasText: "RE 9" });
    await expect(mine).toContainText("Aachen → Köln");   // in the name
    await expect(mine.locator('[data-act="trainCancel"]')).toBeVisible();
    await page.click('.traincard[data-code="DEMO42"] [data-act="trainJoin"]');
    await expect(page.locator('.traincard[data-code="DEMO42"] [data-act="trainJoin"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.traincard[data-code="DEMO42"]')).toContainText("5");
    await page.screenshot({ path: path.join(SHOTS, `trains-2-list-${lang}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("the group chat of a ride: everyone on board, report and mute", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await signUp(page);
  await page.click('.traincard[data-code="DEMO42"] [data-act="trainCheckin"]');
  await page.click('[data-act="goOpen"]');
  await expect(page.locator(".ridebar")).toContainText("RE 1 · 07:42");
  await page.click('[data-act="openGroup"]');
  await expect(page.locator(".gmsg").first()).toContainText("Guten Morgen", { timeout: 10000 });
  await page.fill("#groupInput", "Hallo zusammen, ich sitze in Wagen 5");
  await page.keyboard.press("Enter");
  await expect(page.locator("#groupLog .msg.mine").last()).toContainText("Wagen 5");
  await expect(page.locator(".gmsg", { hasText: "Schön, dass du dabei bist" })).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: path.join(SHOTS, "trains-3-group.png") });
  // contact details are refused in the group
  await page.fill("#groupInput", "ruf mich an 0176 1234567");
  await page.keyboard.press("Enter");
  await expect(page.locator(".toast")).toBeVisible();
  await expect(page.locator("#groupLog .msg.mine", { hasText: "0176" })).toHaveCount(0);
  // ⋯ on Lena's message: report sheet with her name
  await page.locator(".gmsg", { hasText: "Guten Morgen" }).locator('[data-act="groupMore"]').click();
  await page.click('[data-act="groupReport"]');
  await expect(page.locator("#rsT")).toContainText("Lena");
  await page.click('[data-act="reportCancel"]');
  // mute Karim
  await page.locator(".gmsg", { hasText: "pünktlich" }).locator('[data-act="groupMore"]').click();
  await page.click('[data-act="groupMute"]');
  await expect(page.locator(".gmsg", { hasText: "pünktlich" })).toHaveCount(0);
  await page.goBack();
  await expect(page.locator(".tabs")).toBeVisible();
  expect(errors).toEqual([]);
});

test("an invitation link #train-CODE shows that train on top", async ({ page }) => {
  await signUp(page, "en", "/?demo#train-DEMO42");
  await expect(page.locator(".traincard.invited")).toContainText("Düren");
  await page.screenshot({ path: path.join(SHOTS, "trains-4-invited.png") });
});
