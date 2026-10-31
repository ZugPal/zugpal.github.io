// Chess UI test with real pointer drags at phone size.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function open(page, plies, level){
  await page.goto("/?demo");
  await page.evaluate(async ([pl, lv]) => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true;
    localStorage.setItem("zugpal.chess.sound", "false");
    localStorage.setItem("zugpal.chess.cpu", JSON.stringify({ plies: pl, myColor: "w", level: lv || "easy" }));
    (await import("/src/actions.js")).actions.chessCpu();
  }, [plies || [], level]);
  await page.waitForSelector(".cpiece");
}
async function center(page, sq){
  const r = await page.locator(".cboard").boundingBox(), s = r.width / 8;
  const f = "abcdefgh".indexOf(sq[0]), rank = Number(sq[1]) - 1;
  return { x: r.x + (f + .5) * s, y: r.y + (7 - rank + .5) * s };
}
async function dragMove(page, from, to){
  const a = await center(page, from), b = await center(page, to);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(a.x + 8, a.y - 8, { steps: 2 }); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(250);
}
const plies = page => page.evaluate(() => JSON.parse(localStorage.getItem("zugpal.chess.cpu")).plies);

test("drag, computer reply, tap-tap, illegal snaps back, takeback, review", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await open(page, []);
  await dragMove(page, "e2", "e4");
  await expect(page.locator(".cmoves .mv").first()).toHaveText("e4");
  await expect.poll(async () => (await plies(page)).length, { timeout: 8000 }).toBe(2);    // computer answered
  // tap-tap: knight g1, dots appear, then f3
  const g1 = await center(page, "g1"); await page.mouse.click(g1.x, g1.y);
  await expect(page.locator(".csq.dot")).toHaveCount(3);
  const f3 = await center(page, "f3"); await page.mouse.click(f3.x, f3.y);
  await expect.poll(async () => (await plies(page))[2]).toBe("g1f3");
  await expect.poll(async () => (await plies(page)).length, { timeout: 8000 }).toBe(4);
  // illegal: rook a1 to a5 through its own pawn -> snaps back, nothing changes
  await dragMove(page, "a1", "a5");
  expect((await plies(page)).length).toBe(4);
  await expect(page.locator('.cpiece[data-sq="0"]')).toHaveCount(1);
  await page.screenshot({ path: path.join(SHOTS, "chess-1-play.png") });
  // review an earlier position, then back
  await page.click('[data-act="chStep"][data-arg="-1"]');
  await expect(page.locator("#cstatus")).toContainText(/earlier|frühere|سابقاً/i);
  await page.click('#cstatus [data-act="chView"]');
  // takeback removes my move and the reply
  await page.click("#ctake");
  await expect.poll(async () => (await plies(page)).length).toBe(2);
  expect(errors).toEqual([]);
});

test("promotion picker", async ({ page }) => {
  await open(page, ["e2e4", "d7d5", "e4d5", "c7c6", "d5c6", "g8f6", "c6b7", "c8d7"]);
  await dragMove(page, "b7", "a8");
  await expect(page.locator(".promo .pbtn")).toHaveCount(4);
  await page.screenshot({ path: path.join(SHOTS, "chess-2-promotion.png") });
  await page.click('[data-act="chPromote"][data-arg="N"]');
  await expect.poll(async () => (await plies(page))[8]).toBe("b7a8n");
  await expect(page.locator(".cmoves .mv").nth(8)).toHaveText(/^bxa8=N/);
});

test("checkmate: end screen with the reason", async ({ page }) => {
  await open(page, ["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6"]);
  await dragMove(page, "h5", "f7");
  await expect(page.locator("canvas.confetti")).toBeAttached();
  await expect(page.locator(".sheet.center h2")).toContainText(/win|gewinnst|فزت/i);
  await expect(page.locator(".sheet.center p")).toContainText(/mate|matt|مات/i);
  await expect(page.locator(".cmoves .mv").last()).toHaveText("Qxf7#");
  await page.screenshot({ path: path.join(SHOTS, "chess-3-mate.png") });
  await page.click('[data-act="chEndClose"]');
  await expect(page.locator(".cpiece.fallen")).toHaveCount(1);
});

test("new game sheet: black against the expert", async ({ page }) => {
  await open(page, []);
  await page.click('[data-act="chNewSheet"]');
  await page.click('[data-act="chPickColor"][data-arg="b"]');
  await page.click('[data-act="chPickLevel"][data-arg="expert"]');
  await page.click('[data-act="chStart"]');
  await expect.poll(async () => (await plies(page)).length, { timeout: 10000 }).toBe(1);    // the computer opens as white
  const top = await page.locator('.cpiece[data-sq="60"]').boundingBox(), board = await page.locator(".cboard").boundingBox();
  expect(top.y).toBeGreaterThan(board.y + board.height / 2);                                 // playing black: your king (e8) is at the bottom
});
