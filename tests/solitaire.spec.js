// Solitaire UI test with real pointer drags at phone size: invalid move shakes with a reason, valid drag moves,
// tap sends an ace up, stock, undo, hint, Spider and FreeCell boards, the win cascade + dialog, and the stuck dialog.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function open(page, current, variant){
  await page.goto("/?demo");
  await page.evaluate(async ([cur, v]) => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true;
    localStorage.setItem("zugpal.sol.variant", JSON.stringify(v || "klondike1"));
    if(cur) localStorage.setItem("zugpal.sol.current", JSON.stringify({ st: cur, elapsed: 0, done: false })); else localStorage.removeItem("zugpal.sol.current");
    (await import("/src/actions.js")).actions.solNew();
  }, [current || null, variant]);
  await page.waitForTimeout(1300);   // deal animation
}
const box = async (page, id) => { const r = await page.locator(`.pcard[data-id="${id}"]`).boundingBox(); return { x: r.x + r.width / 2, y: r.y + 10 }; };
async function dragCard(page, fromId, to){
  const s = await box(page, fromId);
  await page.mouse.move(s.x, s.y); await page.mouse.down();
  await page.mouse.move(s.x + 12, s.y + 12, { steps: 3 }); await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(350);
}
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem("zugpal.sol.current")).st);
const C = (s, r, up = true) => ({ id: s.charCodeAt(0) * 20 + r, s, r, up });

test("klondike: drag, refuse, tap, stock, undo, hint", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  // a small hand-made table: 8♠ | 7♥ | 7♣ | A♦ | K♥ (and the rest in the stock)
  const st = await page.evaluate(() => null);
  await open(page, { variant: "klondike1", type: "klondike", draw: 1, seed: 1, moves: 0, score: 0, recycles: 0, cells: [],
    tab: [[C("S", 8)], [C("H", 7)], [C("C", 7)], [C("D", 1)], [C("H", 13)], [], []], stock: [C("C", 2, false), C("H", 1, false)], waste: [], found: [[], [], [], []] });
  // black 7 onto black 8: refused, slides back, shakes, tells why
  const t8 = await box(page, C("S", 8).id);
  await dragCard(page, C("C", 7).id, { x: t8.x, y: t8.y + 30 });
  await expect(page.locator("#solmsg")).toContainText(/red|Rot|أحمر/i);
  expect((await state(page)).moves).toBe(0);
  // red 7 onto black 8: works
  await dragCard(page, C("H", 7).id, { x: t8.x, y: t8.y + 30 });
  let s = await state(page); expect(s.tab[0].length).toBe(2); expect(s.moves).toBe(1);
  // tap the ace: it flies to the foundation
  const a = await box(page, C("D", 1).id); await page.mouse.click(a.x, a.y); await page.waitForTimeout(350);
  s = await state(page); expect(s.found.flat().length).toBe(1);
  // only a king goes on an empty column (drag 7♣ to the empty 6th column)
  const empty = await page.locator('.pslot.tab[data-i="5"]').boundingBox();
  await dragCard(page, C("C", 7).id, { x: empty.x + empty.width / 2, y: empty.y + 20 });
  await expect(page.locator("#solmsg")).toContainText(/king|König|الملك/i);
  // stock, undo, hint
  const stock = await page.locator(".pslot.stock").boundingBox(); await page.mouse.click(stock.x + 8, stock.y + 8); await page.waitForTimeout(300);
  s = await state(page); expect(s.waste.length).toBe(1);
  await page.click("#solundo"); await page.waitForTimeout(300); s = await state(page); expect(s.waste.length).toBe(0);
  await page.click('[data-act="solHint"]'); await expect(page.locator(".hint").first()).toBeAttached();
  await page.screenshot({ path: path.join(SHOTS, "sol-1-klondike.png") });
  expect(errors).toEqual([]);
});

test("variants: Spider and FreeCell boards, choose from the sheet", async ({ page }) => {
  await open(page, null, "klondike3");
  await page.click('[data-act="solSheet"]');
  await expect(page.locator(".solvar")).toHaveCount(6);
  await page.click('[data-act="solVariant"][data-arg="spider2"]'); await page.waitForTimeout(1300);
  await expect(page.locator(".pcard")).toHaveCount(104);
  await expect(page.locator('.pslot.tab')).toHaveCount(10);
  await page.screenshot({ path: path.join(SHOTS, "sol-2-spider.png") });
  await page.click('[data-act="solSheet"]'); await page.click('[data-act="solVariant"][data-arg="freecell"]'); await page.waitForTimeout(1300);
  await expect(page.locator(".pcard:not(.down)")).toHaveCount(52);
  await expect(page.locator(".pslot.cell")).toHaveCount(4);
  await page.screenshot({ path: path.join(SHOTS, "sol-3-freecell.png") });
});

test("win: auto-finish, cascade, dialog with stats", async ({ page }) => {
  const found = ["S", "H", "D", "C"].map(s => Array.from({ length: 12 }, (_, i) => C(s, i + 1)));
  await open(page, { variant: "klondike1", type: "klondike", draw: 1, seed: 1, moves: 40, score: 300, recycles: 0, cells: [],
    tab: [[C("S", 13)], [C("H", 13)], [C("D", 13)], [C("C", 13)], [], [], []], stock: [], waste: [], found });
  await expect(page.locator("#solauto")).toBeVisible();
  await page.click("#solauto");
  await expect(page.locator("canvas.cascade")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOTS, "sol-4-cascade.png") });
  await page.mouse.click(200, 400);                     // tap skips the cascade
  await expect(page.locator(".sheet.center h2")).toContainText(/won|Gewonnen|فزت/i);
  await page.screenshot({ path: path.join(SHOTS, "sol-5-won.png") });
});

test("stuck: no moves left dialog after the last possible move", async ({ page }) => {
  await open(page, { variant: "klondike1", type: "klondike", draw: 1, seed: 1, moves: 3, score: 0, recycles: 0, cells: [],
    tab: [[C("H", 5)], [C("S", 6)], [C("C", 9)], [], [], [], []], stock: [], waste: [], found: [[], [], [], []] });
  const t6 = await box(page, C("S", 6).id);
  await dragCard(page, C("H", 5).id, { x: t6.x, y: t6.y + 30 });
  await expect(page.locator(".sheet.center h2")).toContainText(/No more moves|Keine Züge|لا حركات/i, { timeout: 3000 });
  await page.screenshot({ path: path.join(SHOTS, "sol-6-stuck.png") });
  await page.click('.sheet [data-act="solUndo"]');
  await expect(page.locator(".sheet.center")).toHaveCount(0);
  expect((await state(page)).moves).toBe(3);
});
