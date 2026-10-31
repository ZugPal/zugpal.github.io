// Dama UI test with real pointer drags/taps at phone size.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function open(page, mode, keys, extra){
  await page.goto("/?demo");
  page.on("dialog", d => d.accept());
  await page.evaluate(async ([m, k, ex]) => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true;
    localStorage.setItem("zugpal.dama.sound", "false");
    localStorage.setItem("zugpal.dama.lastMode", JSON.stringify(m));
    localStorage.setItem("zugpal.dama." + m, JSON.stringify(Object.assign({ keys: k, myColor: "w", level: "easy" }, ex || {})));
    (await import("/src/actions.js")).actions.damaCpuNew();
  }, [mode, keys || [], extra]);
  await page.waitForSelector(".dpiece");
}
async function center(page, name){
  const r = await page.locator(".dboard").boundingBox(), s = r.width / 8, f = "abcdefgh".indexOf(name[0]), rank = Number(name.slice(1)) - 1;
  return { x: r.x + (f + .5) * s, y: r.y + (7 - rank + .5) * s };
}
async function dragMove(page, from, to){
  const a = await center(page, from), b = await center(page, to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 6, a.y - 6, { steps: 2 }); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(300);
}
async function tap(page, name){ const c = await center(page, name); await page.mouse.click(c.x, c.y); await page.waitForTimeout(150); }
const keys = (page, mode) => page.evaluate(m => JSON.parse(localStorage.getItem("zugpal.dama." + m)).keys, mode);

test("vs computer: drag, reply, compulsory capture, takeback", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await open(page, "cpu", []);
  await dragMove(page, "a3", "a4");
  await expect.poll(async () => (await keys(page, "cpu")).length, { timeout: 8000 }).toBe(2);
  await expect(page.locator("#dmoves .mv").first()).toHaveText("a3-a4");
  // white must capture: a4xa6, and the rules force the second jump a6xa8 (which also crowns a king)
  await open(page, "cpu", ["16-24", "40-32"]);
  await expect(page.locator(".dsq.must")).toHaveCount(1);
  await tap(page, "h3");                                       // not allowed: someone must capture
  await expect(page.locator(".toast")).toContainText(/capture|Schlagzwang|إجباري/i);
  await dragMove(page, "a4", "a8");                              // straight to the end square
  await expect.poll(async () => (await keys(page, "cpu"))[2]).toBe("24-40-56");
  await expect(page.locator(".dpiece.b:not(.gone)")).toHaveCount(14);
  await expect(page.locator(".dpiece.w.king")).toHaveCount(1);
  await page.screenshot({ path: path.join(SHOTS, "dama-1-capture.png") });
  await expect.poll(async () => (await keys(page, "cpu")).length, { timeout: 8000 }).toBe(4);
  await page.click("#dtake");
  await expect.poll(async () => (await keys(page, "cpu")).length).toBe(2);
  expect(errors).toEqual([]);
});

test("two players: triple capture square by square, crowned king", async ({ page }) => {
  await open(page, "local", ["16-24", "43-35", "17-16", "41-33", "21-29", "44-36", "16-17", "33-25", "17-33", "47-39", "13-21", "42-41", "22-30", "41-25", "24-26", "46-38"]);
  await expect(page.locator("#dstatus")).toContainText(/White|Weiß|الأبيض/i);
  await tap(page, "g4"); await tap(page, "g6"); await tap(page, "e6");
  await page.screenshot({ path: path.join(SHOTS, "dama-2-multi.png") });
  await tap(page, "e8");
  await expect.poll(async () => (await keys(page, "local")).slice(-1)[0]).toBe("30-46-44-60");
  await expect(page.locator("#dmoves .mv").last()).toHaveText("g4xg6xe6xe8");
  await expect(page.locator(".dpiece.w.king")).toHaveCount(1);
  await expect(page.locator("#dstatus")).toContainText(/Black|Schwarz|الأسود/i);
});

test("resign: end screen with the reason", async ({ page }) => {
  await open(page, "cpu", ["16-24"]);
  await page.click('[data-act="daResign"]');
  await expect(page.locator(".sheet.center h2")).toContainText(/lost|verloren|خسرت/i);
  await expect(page.locator(".sheet.center p")).toContainText(/Resigned|Aufgegeben|استسلام/i);
  await page.screenshot({ path: path.join(SHOTS, "dama-3-end.png") });
});

test("new game sheet: two players", async ({ page }) => {
  await open(page, "cpu", []);
  await page.click('[data-act="daNewSheet"]');
  await page.click('[data-act="daPickMode"][data-arg="local"]');
  await page.click('[data-act="daStart"]');
  await dragMove(page, "b3", "b4");
  await expect(page.locator("#dstatus")).toContainText(/Black|Schwarz|الأسود/i);
  await dragMove(page, "b6", "b5");
  await expect(page.locator("#dstatus")).toContainText(/White|Weiß|الأبيض/i);
});
