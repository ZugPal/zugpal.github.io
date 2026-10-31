// Quizfahrt UI test at phone size: category wheel, timer, jokers, reveal, time out, round board, end with confetti.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function open(page, level){
  await page.goto("/?demo");
  await page.evaluate(async lv => {
    const S = (await import("/src/state.js")).S;
    S.profile = S.profile || { name: "T", gender: "man", langs: [], topics: [] }; S.agreed = true;
    localStorage.setItem("zugpal.qz.sound", "false"); localStorage.setItem("zugpal.qz.level", JSON.stringify(lv));
    (await import("/src/actions.js")).actions.qzCpu();
  }, level || "medium");
  await page.waitForSelector(".qzscreen");
}
const rightPos = page => page.evaluate(async () => { const q = (await import("/src/state.js")).S.qz; return q.st.qs[q.st.answers.w.length].order.indexOf(0); });
const go = page => page.click('[data-act="qzGo"]:not([disabled])', { timeout: 6000 });

test("wheel, timer, jokers, right answer lights up", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await open(page);
  await expect(page.locator(".qwheel")).toBeVisible();
  await expect(page.locator('[data-act="qzGo"]')).toBeDisabled();
  await page.screenshot({ path: path.join(SHOTS, "quiz-1-wheel.png") });
  await go(page);
  await expect(page.locator(".qtimer i")).toBeVisible();
  await page.click('[data-act="qzJoker"][data-arg="fifty"]');
  await expect(page.locator(".qopt.gone")).toHaveCount(2);
  await expect(page.locator('[data-act="qzJoker"][data-arg="fifty"]')).toBeDisabled();
  await page.click('[data-act="qzJoker"][data-arg="time"]');
  await expect(page.locator('[data-act="qzJoker"][data-arg="time"]')).toBeDisabled();
  const pos = await rightPos(page);
  await page.click(`[data-act="qzAnswer"][data-arg="${pos}"]`);
  await expect(page.locator(".qopt.right.picked")).toHaveCount(1);
  await expect(page.locator(".qverdict.ok")).toBeVisible();
  await expect(page.locator(".qboard .qd.r").first()).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "quiz-2-reveal.png") });
  expect(errors).toEqual([]);
});

test("time runs out", async ({ page }) => {
  await open(page);
  await go(page);
  await page.evaluate(async () => { const S = (await import("/src/state.js")).S; S.qz.started[0] = Date.now() - 25000; (await import("/src/screens.js")).render(); });
  await expect(page.locator(".qverdict.no")).toContainText(/Time|Zeit|الوقت/);
});

test("a whole duel: round board and the end screen", async ({ page }) => {
  await open(page, "easy");
  for(let q = 0; q < 9; q++){
    if(q % 3 === 0) await go(page);
    await page.click(`[data-act="qzAnswer"][data-arg="${await rightPos(page)}"]`);
    await page.click('[data-act="qzNext"]');
  }
  await expect(page.locator(".qfinal b").first()).toHaveText("9");
  await expect(page.locator(".qboard .qbr:not(.head)")).toHaveCount(3);
  await expect(page.locator("canvas.confetti")).toBeAttached();
  await page.screenshot({ path: path.join(SHOTS, "quiz-3-end.png") });
});
