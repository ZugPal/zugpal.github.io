// Vier in einer Reihe UI test with real pointer drags/taps at phone size.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function open(page, mode, keys, extra){
  await page.goto("/?demo");
  page.on("dialog", d => d.accept());
  await page.evaluate(async ([m, k, ex]) => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true;
    localStorage.setItem("zugpal.tk.sound", "false");
    localStorage.setItem("zugpal.tk.four.lastMode", JSON.stringify(m));
    localStorage.setItem("zugpal.tk.four." + m, JSON.stringify(Object.assign({ keys: k, myColor: "w", level: "easy", seed: 1 }, ex || {})));
    (await import("/src/actions.js")).actions.cgCpu("four");
  }, [mode, keys || [], extra]);
  await page.waitForSelector(".f4board");
}
async function col(page, c){ const r = await page.locator(".f4board").boundingBox(), s = r.width / 7; return { x: r.x + (c + .5) * s, y: r.y + s / 2 }; }
async function dragTo(page, from, to){
  const a = await col(page, from), b = await col(page, to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y + 20, { steps: 8 }); await page.mouse.up();
}
async function tapCol(page, c){ const r = await page.locator(".f4board").boundingBox(), s = r.width / 7; await page.mouse.click(r.x + (c + .5) * s, r.y + r.height * .6); }
const keys = (page, mode) => page.evaluate(m => JSON.parse(localStorage.getItem("zugpal.tk.four." + m)).keys, mode);

test("vs computer: drag, reply, tap, full column, takeback", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await open(page, "cpu", []);
  await dragTo(page, 3, 5);
  await expect.poll(async () => (await keys(page, "cpu"))[0]).toBe("5");
  await expect.poll(async () => (await keys(page, "cpu")).length, { timeout: 8000 }).toBe(2);   // computer answered
  await expect(page.locator(".f4layer .f4d:not(.ghost)")).toHaveCount(2);
  await tapCol(page, 0);
  await expect.poll(async () => (await keys(page, "cpu"))[2]).toBe("0");
  await expect.poll(async () => (await keys(page, "cpu")).length, { timeout: 8000 }).toBe(4);
  await page.screenshot({ path: path.join(SHOTS, "four-1-play.png") });
  await page.click("#ttake");
  await expect.poll(async () => (await keys(page, "cpu")).length).toBe(2);
  // a full column is refused with a message
  await open(page, "cpu", ["3", "3", "3", "3", "3", "3"]);
  await tapCol(page, 3);
  await expect(page.locator(".toast")).toContainText(/full|voll|ممتلئ/i);
  expect((await keys(page, "cpu")).length).toBe(6);
  expect(errors).toEqual([]);
});

test("win: the four pulse, line, confetti and end screen", async ({ page }) => {
  await open(page, "cpu", ["0", "6", "1", "6", "2", "5"]);
  await dragTo(page, 0, 3);
  await expect(page.locator(".f4d.win")).toHaveCount(4);
  await expect(page.locator(".f4line line")).toHaveCount(1);
  await expect(page.locator("canvas.confetti")).toBeAttached();
  await expect(page.locator(".sheet.center h2")).toContainText(/win|gewinnst|فزت/i);
  await expect(page.locator(".sheet.center p").first()).toContainText(/Four in a row|Vier in einer Reihe|أربعة في صف/i);
  await expect(page.locator(".tkfinal b")).toHaveText("1 : 0");
  await page.screenshot({ path: path.join(SHOTS, "four-2-win.png") });
  await page.click('[data-act="tkRematch"]');
  await expect.poll(async () => (await keys(page, "cpu")).length, { timeout: 8000 }).toBe(1);   // the computer starts the rematch
});

test("two players on one phone", async ({ page }) => {
  await open(page, "cpu", []);
  await page.click('[data-act="tkNewSheet"]');
  await page.click('[data-act="tkPickMode"][data-arg="local"]');
  await page.click('[data-act="tkStart"]');
  await tapCol(page, 3);
  await expect(page.locator("#tstatus")).toContainText(/Yellow|Gelb|الأصفر/i);
  await dragTo(page, 3, 4);
  await expect(page.locator("#tstatus")).toContainText(/Red|Rot|الأحمر/i);
  expect(await keys(page, "local")).toEqual(["3", "4"]);
});

test("new game sheet: the expert computer starts", async ({ page }) => {
  await open(page, "cpu", []);
  await page.click('[data-act="tkNewSheet"]');
  await page.click('[data-act="tkPickStart"][data-arg="b"]');
  await page.click('[data-act="tkPickLevel"][data-arg="expert"]');
  await page.screenshot({ path: path.join(SHOTS, "four-3-sheet.png") });
  await page.click('[data-act="tkStart"]');
  await expect.poll(async () => (await keys(page, "cpu")).length, { timeout: 10000 }).toBe(1);
  await expect(page.locator("#tbot")).toHaveClass(/turn/);
});
