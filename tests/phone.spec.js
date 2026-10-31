// Phone problems Husam reported: letters lost while typing, the back button leaving the app,
// the check-in screen with "Your train", and notices without names. Phone size, demo mode.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

async function signUp(page, lang = "de"){
  await page.goto("/?demo");
  await page.selectOption("#lang", lang);
  await page.fill("#name", "Husam");
  await page.click('[data-act="gender"][data-arg="man"]');
  await page.click('[data-act="topic"] >> nth=0');
  await page.check("#agree");
  await page.click('[data-act="saveProfile"]');
}
async function toChat(page){
  await page.click('[data-act="checkin"][data-arg="talk"]');
  await page.click('[data-act="goOpen"]');
  const chatBtn = page.locator('[data-act="chat"]').first();
  for(let i = 0; i < 25 && !(await chatBtn.isVisible()); i++){
    const wave = page.locator('.person [data-act="wave"][aria-pressed="false"]').first();
    if(await wave.isVisible()) await wave.click();
    await page.waitForTimeout(700);
  }
  await chatBtn.click();
  await expect(page.locator("#chatInput")).toBeVisible();
}

test("typing in the chat keeps every letter while messages arrive", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await signUp(page);
  await toChat(page);
  // Lena answers while we type; the demo refreshes every 1.5 s and we force extra refreshes in the middle
  await page.fill("#chatInput", "Hallo Lena");
  await page.click("#chatSend");
  await expect(page.locator(".msg.mine").last()).toContainText("Hallo Lena");
  await expect(page.locator("#chatInput")).toBeFocused();                       // the keyboard stays open after Send
  const text = "Ich fahre jeden Tag nach Köln und lerne dabei Deutsch, das ist schön.";
  await page.click("#chatInput");
  const typed = page.keyboard.type(text, { delay: 35 });
  for(let i = 0; i < 4; i++){ await page.waitForTimeout(500); await page.evaluate(async () => { await (await import("/src/polling.js")).refresh(); }); }
  await typed;
  await expect(page.locator("#chatInput")).toHaveValue(text);
  await expect(page.locator(".msg:not(.mine)").first()).toBeVisible({ timeout: 8000 }); // her answer arrived meanwhile
  await page.keyboard.press("Enter");                                           // Enter sends
  await expect(page.locator(".msg.mine").last()).toContainText("lerne dabei Deutsch");
  await expect(page.locator("#chatInput")).toHaveValue("");
  await page.screenshot({ path: path.join(SHOTS, "phone-1-chat.png") });
  expect(errors).toEqual([]);
});

test("the back button goes to the previous screen, not out of the app", async ({ page }) => {
  await signUp(page);
  await expect(page.locator(".mytrain #line")).toBeVisible();                    // "Your train" is right under the Talk Train
  await page.screenshot({ path: path.join(SHOTS, "phone-2-checkin.png"), fullPage: true });
  await page.click('[data-act="openGames"] >> nth=0');
  await page.click('[data-act="chessCpu"]');
  await expect(page.locator(".cboard, .chessboard, #chessBoard").first()).toBeVisible();
  await page.goBack();
  await expect(page.locator(".gamecard2").first()).toBeVisible();               // back on the games list
  await page.goBack();
  await expect(page.locator(".mytrain")).toBeVisible();                          // back on the check-in screen
  // a sheet closes first
  await page.click('[data-act="hostOpen"], [data-act="openSupport"]');
  await page.goBack();
  await expect(page.locator(".mytrain")).toBeVisible();
});

test("checked in: the ride bar offers to change train", async ({ page }) => {
  await signUp(page, "en");
  await page.fill("#line", "RE 1"); await page.fill("#num", "10115");
  await page.click('.mytrain [data-act="checkin"][data-arg="train"]');
  await page.click('[data-act="goOpen"]');
  await expect(page.locator(".ridebar")).toContainText("RE 1");
  await expect(page.locator('.ridebar [data-act="endRide"]')).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "phone-3-ridebar.png") });
});

test("phone notice shows a number, never a name", async ({ page }) => {
  await page.addInitScript(() => {
    window.__notes = [];
    class N { constructor(title, o){ window.__notes.push({ title, body: o && o.body }); } static get permission(){ return "granted"; } static requestPermission(){ return Promise.resolve("granted"); } }
    window.Notification = N;
    Object.defineProperty(navigator, "serviceWorker", { value: undefined });
    Object.defineProperty(document, "hidden", { get: () => window.__hidden === true });
  });
  await signUp(page);
  await toChat(page);
  await page.click('[data-act="go"][data-arg="nearby"]');
  await page.evaluate(() => { window.__hidden = true; });
  await page.evaluate(async () => { window.__mid = (await import("/src/state.js")).S.matches[0].id; });
  // two messages from the match arrive (as from Realtime) while the app is in the background
  const notes = await page.evaluate(async () => {
    const { messageAlertForTest } = await import("/src/polling.js");
    messageAlertForTest({ from_id: window.__mid, body: "Hallo" });
    messageAlertForTest({ from_id: window.__mid, body: "Bist du noch da?" });
    return window.__notes;
  });
  expect(notes.length).toBe(2);
  expect(notes[1].title).toBe("Zugpal");
  expect(notes[1].body).toBe("2 neue Nachrichten");
  expect(JSON.stringify(notes)).not.toMatch(/Lena|Karim|Aylin/);
});
