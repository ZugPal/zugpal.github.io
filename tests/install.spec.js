// "Install Zugpal" on every phone: Android Chrome, iPhone Safari, Chrome on iPhone, Samsung Internet,
// and links opened inside WhatsApp / Instagram (in-app browsers that cannot install). Phone size, demo mode.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

const UA = {
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  whatsapp: "Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.21",
  instagramIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 355.0.0.0 (iPhone15,2; iOS 18_1; de_DE)"
};
const CASES = [
  ["android", "de", "instAnd", '[data-act="installChrome"]', false],
  ["iphone", "de", "Zum Home-Bildschirm", null, false],
  ["iphoneChrome", "en", "next to the address bar", null, false],
  ["samsung", "de", "Seite hinzufügen zu", null, false],
  ["whatsapp", "ar", "افتح في المتصفح", '[data-act="installChrome"]', true],
  ["instagramIos", "en", "Open in Safari", '[data-act="installCopy"]', true]
];

for(const [name, lang, text, button, inapp] of CASES){
  test(`install help on ${name} (${lang})`, async ({ browser }) => {
    const ctx = await browser.newContext({ userAgent: UA[name], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", e => errors.push(String(e)));
    await page.goto("/?demo");
    await page.selectOption("#lang", lang);
    // the bar is on the sign-up screen, before anything else
    const bar = page.locator(".installbar");
    await expect(bar).toBeVisible();
    await bar.locator('[data-act="installOpen"]').click();
    const sheet = page.locator(".installsheet");
    await expect(sheet).toBeVisible();
    if(name === "android") await expect(sheet.locator(".isteps").first()).toContainText(lang === "de" ? "Menü" : "menu");
    else await expect(sheet).toContainText(text);
    if(inapp) await expect(sheet.locator(button)).toBeVisible();
    else await expect(sheet.locator('[data-act="installChrome"]')).toHaveCount(0);
    // the other phones are one tap away
    await sheet.locator(".iother summary").click();
    expect(await sheet.locator(".iother .ihead").count()).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: path.join(SHOTS, `install-${name}-${lang}.png`) });
    // back closes the sheet, not the app
    await page.goBack();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator("#name")).toBeVisible();
    // × hides the bar for good
    await page.click('.installbar [data-act="installOff"]');
    await expect(bar).toHaveCount(0);
    await page.reload();
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator(".installbar")).toHaveCount(0);
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test("#install link opens the steps, and the check-in screen keeps an Install link", async ({ browser }) => {
  const ctx = await browser.newContext({ userAgent: UA.iphone, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/?demo#install");
  await expect(page.locator(".installsheet")).toBeVisible();
  await page.click('[data-act="installClose"]');
  await page.fill("#name", "Husam");
  await page.click('[data-act="gender"][data-arg="man"]');
  await page.click('[data-act="topic"] >> nth=0');
  await page.check("#agree");
  await page.click('[data-act="saveProfile"]');
  await expect(page.locator(".installbar")).toBeVisible();
  await page.click('.installbar [data-act="installOff"]');
  await expect(page.locator('.screen > [data-act="installOpen"]')).toBeVisible();
  await ctx.close();
});
