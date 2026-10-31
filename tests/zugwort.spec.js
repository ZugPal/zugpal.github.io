// Zugwort UI test at phone size: word of the day, flip animation, win with statistics and share, hard mode, real keyboard.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function open(page){
  await page.goto("/?demo");
  await page.evaluate(async () => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true; S.wordLang = "de";
    (await import("/src/actions.js")).actions.zwCpu();
  });
  await page.waitForSelector(".zwscreen");
}
const answer = page => page.evaluate(async () => (await import("/src/state.js")).S.zw.answer);
async function type(page, word){ for(const c of Array.from(word)) await page.click(`.keyboard [data-act="zwKey"][data-arg="${c}"]`); }
const enter = page => page.click('[data-act="zwEnter"]');

test("word of the day: shake, flip, win, statistics, share", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await open(page);
  await expect(page.locator(".zwline")).toContainText(/Wort des Tages|Word of the day|كلمة اليوم/);
  await type(page, "ABC"); await enter(page);
  await expect(page.locator(".trow.shake")).toHaveCount(1);
  await expect(page.locator(".toast")).toContainText(/fünf|Five|خمسة|5/i);
  for(let i = 0; i < 3; i++) await page.click('[data-act="zwDel"]');
  const ans = await answer(page), wrong = ans === "STERN" ? "STEIN" : "STERN";
  await type(page, wrong); await enter(page);
  await expect(page.locator(".tile.flip")).toHaveCount(5);
  await page.screenshot({ path: path.join(SHOTS, "zugwort-1-flip.png") });
  await expect(page.locator(".tile.flip")).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('.keyboard .key.g, .keyboard .key.y, .keyboard .key.x')).not.toHaveCount(0);
  await type(page, ans); await enter(page);
  await expect(page.locator(".tile.dance")).toHaveCount(5, { timeout: 4000 });
  await expect(page.locator(".sheet.center .zwstats")).toBeVisible({ timeout: 6000 });
  await expect(page.locator(".zwstats b").first()).toHaveText("1");
  await expect(page.locator(".zwbar b.cur")).toHaveText("1");
  await page.screenshot({ path: path.join(SHOTS, "zugwort-2-win.png") });
  await page.evaluate(() => { navigator.share = async d => { window.__shared = d.text; }; });
  await page.click('[data-act="zwShare"]');
  const shared = await page.evaluate(() => window.__shared);
  expect(shared).toMatch(/^Zugwort #\d+ 2\/6/);
  expect(shared).toContain("🟩🟩🟩🟩🟩");
  expect(shared).not.toContain(ans);
  // the finished word of the day stays finished after a reload
  await open(page);
  await expect(page.locator(".sheet.center .zwstats")).toBeVisible();
  await expect(page.locator(".tiles .trow").nth(1).locator(".tile.g")).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("hard mode, real keyboard, practice and race against the computer", async ({ page }) => {
  await open(page);
  await page.click('[data-act="zwMode"][data-arg="free"]');
  await page.click('[data-act="zwSettings"]');
  await page.click('[data-act="zwToggle"][data-arg="hard"]');
  await page.click('[data-act="zwClose"]');
  const ans = await answer(page);
  // first guess shares the first letter with the answer, so that letter must stay
  const first = Array.from(ans)[0] + "XXXX".slice(0, 4);
  await page.keyboard.type(first.toLowerCase()); await page.keyboard.press("Enter");
  await expect(page.locator(".tile.flip")).toHaveCount(0, { timeout: 4000 });
  await page.keyboard.type("qqqqq"); await page.keyboard.press("Enter");
  await expect(page.locator(".toast")).toContainText(/Buchstabe 1|Letter 1|الحرف 1/);
  await page.screenshot({ path: path.join(SHOTS, "zugwort-3-hard.png") });
  await page.click('[data-act="zwMode"][data-arg="cpu"]');
  await type(page, "ABEND"); await enter(page);
  await expect(page.locator(".vs .mrow")).toHaveCount(1, { timeout: 6000 });
});
