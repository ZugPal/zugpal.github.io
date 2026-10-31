// Mau-Mau UI test with real pointer drags/taps at phone size. Deal seed 4: my hand HK S7 C7 CJ C8, pile CQ.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function open(page, keys){
  await page.goto("/?demo");
  page.on("dialog", d => d.accept());
  await page.evaluate(async k => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true;
    localStorage.setItem("zugpal.tk.sound", "false");
    localStorage.setItem("zugpal.tk.mau.cpu", JSON.stringify({ keys: k, myColor: "w", level: "easy", seed: 4 }));
    (await import("/src/actions.js")).actions.cgCpu("mau");
  }, keys || []);
  await page.waitForSelector(".mmtable");
}
const card = (page, c) => page.locator(`.mmhand .mmc[data-c="${c}"]`);
const keys = page => page.evaluate(() => JSON.parse(localStorage.getItem("zugpal.tk.mau.cpu")).keys);
async function dragToPile(page, c){
  const a = await card(page, c).boundingBox(), p = await page.locator(".mmpile").boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + 20); await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 5, a.y + 10, { steps: 2 }); await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2, { steps: 10 }); await page.mouse.up();
}

test("cards that fit lift, a wrong card is refused, drag onto the pile, computer answers", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await open(page, []);
  await expect(page.locator(".mmhand .mmc")).toHaveCount(5);
  await expect(page.locator(".mmhand .mmc.can")).toHaveCount(3);              // C7, C8, CJ fit on the CQ
  await card(page, "HK").click();
  await expect(page.locator(".toast")).toContainText(/fit|Passt|تناسب/i);
  await page.screenshot({ path: path.join(SHOTS, "mau-1-hand.png") });
  await dragToPile(page, "C8");                                                // an 8: I play again
  await expect.poll(() => keys(page)).toEqual(["pC8"]);
  await expect(page.locator(".mmb")).toContainText(/Skip|Aussetzen|تخط/);
  await card(page, "C7").click();
  await expect.poll(async () => (await keys(page)).length, { timeout: 10000 }).toBeGreaterThanOrEqual(3);   // the computer took 2 or played a 7
  expect((await keys(page))[1]).toBe("pC7");
  expect(errors).toEqual([]);
});

test("a jack opens the suit picker", async ({ page }) => {
  await open(page, []);
  await card(page, "CJ").click();
  await expect(page.locator(".mmsuit")).toHaveCount(4);
  await page.screenshot({ path: path.join(SHOTS, "mau-2-wish.png") });
  await page.click('[data-mm="suit:H"]');
  await expect.poll(() => keys(page)).toEqual(["pCJ>H"]);
  await expect(page.locator(".mmbadge")).toContainText("♥");
});

test("draw from the deck", async ({ page }) => {
  await open(page, []);
  await page.click(".mmstock");
  await expect.poll(async () => (await keys(page))[0]).toBe("d");
  await expect(page.locator(".mmhand .mmc")).toHaveCount(6);
});

test("last card: Mau-Mau, end screen with the cards left", async ({ page }) => {
  await open(page, ["pC8", "pC7", "d", "pS7", "d", "pCJ>H", "pHT"]);
  await expect(page.locator(".mmhand .mmc")).toHaveCount(1);
  await card(page, "HK").click();
  await expect(page.locator("canvas.confetti")).toBeAttached();
  await expect(page.locator(".sheet.center h2")).toContainText(/win|gewinnst|فزت/i);
  await expect(page.locator(".sheet.center")).toContainText(/Mau-Mau|ماو ماو/);
  await expect(page.locator(".sheet.center .mmleft .mmc").first()).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "mau-3-win.png") });
});
