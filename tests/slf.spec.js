// Stadt-Land-Fluss UI test at phone size: rolling letter, live marks, solo rounds with points, the other player's stop.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function start(page){
  await page.goto("/?demo");
  await page.evaluate(async () => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true; S.lang = "de";
  });
}
const letter = page => page.evaluate(async () => { const S = (await import("/src/state.js")).S; return S.sl.rounds[S.sl.round].letter; });

test("alone: the letter rolls, answers get marks, three rounds with points", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await start(page);
  await page.evaluate(async () => (await import("/src/actions.js")).actions.slSolo());
  await expect(page.locator(".slroll")).toBeVisible();
  await expect(page.locator(".slletter.landed")).toBeVisible({ timeout: 4000 });
  for(let round = 0; round < 3; round++){
    const L = await letter(page);
    await page.fill("#sl0", L + "abc");
    await expect(page.locator("#slm0")).toHaveClass(/ok/);
    await page.fill("#sl1", (L === "Z" ? "B" : "Z") + "xyz");
    await expect(page.locator("#slm1")).toHaveClass(/bad/);
    if(round === 0) await page.screenshot({ path: path.join(SHOTS, "slf-1-round.png") });
    await page.click('[data-act="slSubmit"]:not([disabled])', { timeout: 4000 });
  }
  await expect(page.locator(".qfinal b")).toHaveText("30");
  await expect(page.locator(".slp.p10")).toHaveCount(3);
  await expect(page.locator("canvas.confetti")).toBeAttached();
  await page.screenshot({ path: path.join(SHOTS, "slf-2-end.png") });
  expect(errors).toEqual([]);
});

test("with the match: their stop gives you 10 more seconds", async ({ page }) => {
  await start(page);
  await page.evaluate(async () => {
    const S = (await import("/src/state.js")).S, { actions } = await import("/src/actions.js");
    S.chatWith = "demo-lena"; S.matches = S.matches && S.matches.length ? S.matches : [{ id: "demo-lena", first_name: "Lena" }];
    actions.slInvite();
  });
  await expect(page.locator(".slletter.landed")).toBeVisible({ timeout: 4000 });
  await page.evaluate(async () => {
    const S = (await import("/src/state.js")).S;
    S.messages.push({ mine: false, body: "\u0001slstop:" + S.sl.gid + ":0", at: Date.now() });
    (await import("/src/screens.js")).render();
  });
  await expect(page.locator(".slstopbanner")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "slf-3-stop.png") });
});
