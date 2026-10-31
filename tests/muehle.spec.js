// Mühle UI test with real pointer drags/taps at phone size.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");
const OFF = [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
const P = i => { const s = 3 - Math.floor(i / 8), o = OFF[i % 8]; return [50 + o[0] * s * 15, 50 + o[1] * s * 15]; };
const PLACED = ["p0","p10","p6","p9","p16","p17","p3","p2","p1","p21","p5","p15","p14","p7","p11","p19","p8","p4"];   // no mills, white to move
const WON = ["p9","p7","p8","p14","p1","p23","p15","p6","p0","p13","p17x14","p5","p14x5","p5","p2x13","p4x15","p15x23","p21","m9-10","m21-20","m1-9x20","m5-13","m9-1x4","m6-9","m2-3","m7-21"];   // white plays m3-2x9 and wins

async function open(page, mode, keys){
  await page.goto("/?demo");
  page.on("dialog", d => d.accept());
  await page.evaluate(async ([m, k]) => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true;
    localStorage.setItem("zugpal.tk.sound", "false");
    localStorage.setItem("zugpal.tk.muehle.lastMode", JSON.stringify(m));
    localStorage.setItem("zugpal.tk.muehle." + m, JSON.stringify({ keys: k, myColor: "w", level: "easy", seed: 1 }));
    (await import("/src/actions.js")).actions.cgCpu("muehle");
  }, [mode, keys || []]);
  await page.waitForSelector(".mlboard");
}
async function pt(page, i){ const r = await page.locator(".mlboard").boundingBox(), [x, y] = P(i); return { x: r.x + x / 100 * r.width, y: r.y + y / 100 * r.height }; }
async function tap(page, i){ const c = await pt(page, i); await page.mouse.click(c.x, c.y); await page.waitForTimeout(120); }
async function drag(page, a, b){
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 6, a.y - 6, { steps: 2 }); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(200);
}
const keys = (page, mode) => page.evaluate(m => JSON.parse(localStorage.getItem("zugpal.tk.muehle." + m)).keys, mode);

test("placing: tap, drag from the hand, taken point, computer reply, takeback", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await open(page, "cpu", []);
  await expect(page.locator(".mlh-bot .mlp")).toHaveCount(9);
  await tap(page, 0);
  await expect.poll(async () => (await keys(page, "cpu"))[0]).toBe("p0");
  await expect.poll(async () => (await keys(page, "cpu")).length, { timeout: 8000 }).toBe(2);
  const hand = await page.locator(".mlh-bot .mlp").first().boundingBox();
  await drag(page, { x: hand.x + hand.width / 2, y: hand.y + hand.height / 2 }, await pt(page, 12));
  await expect.poll(async () => (await keys(page, "cpu"))[2]).toBe("p12");
  await expect(page.locator(".mlh-bot .mlp")).toHaveCount(7);
  await expect.poll(async () => (await keys(page, "cpu")).length, { timeout: 8000 }).toBe(4);
  await tap(page, 0);                                                         // already taken
  await expect(page.locator(".toast")).toContainText(/taken|besetzt|مشغولة/i);
  await page.screenshot({ path: path.join(SHOTS, "muehle-1-place.png") });
  await page.click("#ttake");
  await expect.poll(async () => (await keys(page, "cpu")).length).toBe(2);
  expect(errors).toEqual([]);
});

test("a mill lights up, protected pieces, take a piece", async ({ page }) => {
  await open(page, "cpu", ["p0", "p8", "p1", "p9"]);
  await tap(page, 2);                                                         // closes the mill 0-1-2
  await expect(page.locator(".mills polyline")).toHaveCount(1);
  await expect(page.locator(".mlp.takeable")).toHaveCount(2);
  await expect(page.locator("#tstatus")).toContainText(/Mill|Mühle|طاحونة/);
  await page.screenshot({ path: path.join(SHOTS, "muehle-2-mill.png") });
  await tap(page, 8);
  await expect.poll(async () => (await keys(page, "cpu"))[4]).toBe("p2x8");
  await expect(page.locator(".mllayer .mlp.b:not(.taken)")).toHaveCount(1);
});

test("moving along the lines: drag, refused jump", async ({ page }) => {
  await open(page, "local", PLACED);
  await expect(page.locator(".mlhand .mlp")).toHaveCount(0);
  await drag(page, await pt(page, 14), await pt(page, 22));                  // not on a line
  await expect(page.locator(".toast")).toContainText(/line|Linie|خط/i);
  expect((await keys(page, "local")).length).toBe(18);
  await tap(page, 5);
  await expect(page.locator(".mlpt.can")).toHaveCount(1);
  await drag(page, await pt(page, 5), await pt(page, 13));
  await expect.poll(async () => (await keys(page, "local"))[18]).toBe("m5-13");
  await expect(page.locator("#tstatus")).toContainText(/Black|Schwarz|الأسود/i);
});

test("the last capture wins: end screen with the reason", async ({ page }) => {
  await open(page, "cpu", WON);
  await drag(page, await pt(page, 3), await pt(page, 2));
  await expect(page.locator(".mlp.takeable")).toHaveCount(3);
  await tap(page, 9);
  await expect(page.locator("canvas.confetti")).toBeAttached();
  await expect(page.locator(".sheet.center h2")).toContainText(/win|gewinnst|فزت/i);
  await expect(page.locator(".sheet.center p").first()).toContainText(/two pieces|zwei Steine|قطعتان/i);
  await page.screenshot({ path: path.join(SHOTS, "muehle-3-win.png") });
});
