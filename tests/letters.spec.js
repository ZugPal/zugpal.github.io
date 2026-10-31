// Buchstabenzug / Letter Train UI test at phone size: themes, rolling coaches, hint, win, lose, two players, real keyboard.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");
const ALPHA = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ");

async function open(page){
  await page.goto("/?demo");
  await page.evaluate(async () => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true; S.wordLang = "de";
    (await import("/src/actions.js")).actions.ltCpu();
  });
  await page.waitForSelector(".ltscreen");
}
const word = page => page.evaluate(async () => (await import("/src/state.js")).S.lt.st.word);
const key = (page, c) => page.click(`.keyboard [data-act="ltKey"][data-arg="${c}"]`);

test("theme, wrong letter rolls a coach away, hint, win: the train leaves", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await open(page);
  await page.click('[data-act="ltCat"][data-arg="animals"]');
  await expect(page.locator(".ltcat")).toContainText(/Tiere|Animals|حيوانات/);
  await expect(page.locator(".ltrain .lcoach")).toHaveCount(7);
  const w = await word(page), wrong = ALPHA.filter(c => !w.includes(c));
  await key(page, wrong[0]);
  await expect(page.locator(".lcoach.roll")).toHaveCount(1);
  await expect(page.locator(".ltrain .lcoach:not(.roll)")).toHaveCount(6);
  await expect(page.locator(`.keyboard .key.x[data-arg="${wrong[0]}"]`)).toBeDisabled();
  await key(page, w[0]);
  await expect(page.locator(".slot.hit").first()).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "letters-1-play.png") });
  await page.click('[data-act="ltHint"]');
  await expect(page.locator(".ltrain .lcoach:not(.roll)")).toHaveCount(5);
  for(const c of [...new Set(w)]){ const k = page.locator(`.keyboard [data-act="ltKey"][data-arg="${c}"]:not([disabled])`); if(await k.count()) await k.click(); }
  await expect(page.locator(".ltrain.depart")).toHaveCount(1);
  await expect(page.locator(".sheet.center h2")).toContainText(/einsteigen|aboard|القطار/i, { timeout: 5000 });
  await expect(page.locator(".zwstats b").first()).toHaveText("1");
  await page.screenshot({ path: path.join(SHOTS, "letters-2-win.png") });
  expect(errors).toEqual([]);
});

test("lose: the word is shown in red", async ({ page }) => {
  await open(page);
  await page.click('[data-act="ltLevel"][data-arg="hard"]');
  await expect(page.locator(".ltrain .lcoach")).toHaveCount(5);
  const w = await word(page), wrong = ALPHA.filter(c => !w.includes(c));
  for(let i = 0; i < 5; i++){ await page.keyboard.press(wrong[i].toLowerCase()); await page.waitForTimeout(80); }   // a real keyboard works too
  await expect(page.locator(".ltrain.stuck")).toHaveCount(1);
  await expect(page.locator(".slot.miss").first()).toBeVisible();
  await expect(page.locator(".sheet.center h2")).toContainText(/weg|gone|فات/i, { timeout: 5000 });
  await page.screenshot({ path: path.join(SHOTS, "letters-3-lost.png") });
});

test("two players on one phone", async ({ page }) => {
  await open(page);
  await page.click('[data-act="ltMode"][data-arg="local"]');
  await page.fill("#ltSecret", "zug");
  await page.click('[data-act="ltLocalStart"]');
  await expect(page.locator(".slot")).toHaveCount(3);
  await key(page, "Z"); await key(page, "U"); await key(page, "G");
  await expect(page.locator(".sheet.center")).toContainText(/Spieler 2|Player 2|اللاعب 2/, { timeout: 5000 });
  await page.click('.sheet [data-act="ltSwap"]');
  await expect(page.locator("#ltSecret")).toBeVisible();
});
