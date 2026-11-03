// The WhatsApp-like chat: "+" sheet, microphone that becomes Send, the German word with its meaning,
// a (simulated) call, and a real video message recorded with Chromium's fake camera. Phone size, demo mode.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");
test.use({ permissions: ["camera", "microphone"], launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });

async function toChat(page, lang = "de"){
  await page.goto("/?demo");
  await page.selectOption("#lang", lang);
  await page.fill("#name", "Husam");
  await page.click('[data-act="gender"][data-arg="man"]');
  await page.click('[data-act="topic"] >> nth=0');
  await page.check("#agree");
  await page.click('[data-act="saveProfile"]');
  await page.click('[data-act="checkin"][data-arg="talk"]');
  await page.click('[data-act="goOpen"]');
  const chatBtn = page.locator('[data-act="chat"][data-arg="d-lena"]');
  for(let i = 0; i < 25 && !(await chatBtn.isVisible()); i++){
    const wave = page.locator('.person [data-act="wave"][data-arg="d-lena"][aria-pressed="false"]');
    if(await wave.isVisible()) await wave.click({ timeout: 3000 }).catch(() => {});   // the list redraws often; just try again
    await page.waitForTimeout(700);
  }
  await chatBtn.click();
}
async function unlock(page){
  for(const m of ["Hallo Lena!", "Wohin fährst du?"]){ await page.fill("#chatInput", m); await page.keyboard.press("Enter"); }
  await expect(page.locator(".chatlog .msg:not(.mine)")).toHaveCount(2, { timeout: 10000 });
}

for(const lang of ["de", "en", "ar"]){
  test(`chat looks like a messenger (${lang})`, async ({ page }) => {
    const errors = []; page.on("pageerror", e => errors.push(String(e)));
    await toChat(page, lang);
    await expect(page.locator(".chatempty")).toBeVisible();
    await expect(page.locator(".safety.strip [data-act=leaveChat]")).toBeVisible();             // safety stays visible
    await expect(page.locator(".micbtn")).toBeVisible();
    await page.fill("#chatInput", "Hallo");
    await page.locator("#chatInput").dispatchEvent("input");
    await expect(page.locator("#chatSend")).toBeVisible();                                         // mic became Send
    await expect(page.locator(".micbtn")).toBeHidden();
    await page.keyboard.press("Enter");
    await expect(page.locator(".msg.mine .meta")).toBeVisible();
    await expect(page.locator(".daysep")).toHaveCount(1);
    await page.click('[data-act="plusOpen"]');
    await expect(page.locator(".plussheet .plusitem")).toHaveCount(14);
    await page.screenshot({ path: path.join(SHOTS, `chat-1-plus-${lang}.png`) });
    await page.click('.plussheet [data-act="sendWord"]');
    await expect(page.locator(".plussheet")).toHaveCount(0);
    await page.click(".gamecard .wordflip");
    await expect(page.locator(".wordsheet .wmrow")).toHaveCount(3);
    await expect(page.locator(".wordsheet .wmrow").first()).toHaveAttribute("class", /mine/);       // your language first
    await expect(page.locator(".wordsheet .wmrow").first().locator("[lang]")).toHaveAttribute("lang", lang);
    const meaningBox = await page.locator(".wordsheet .wmrow").first().locator("[lang]").boundingBox();
    expect(meaningBox.width).toBeGreaterThan(200);   // the meaning uses the full width, never one word per line
    await page.screenshot({ path: path.join(SHOTS, `chat-2-word-${lang}.png`) });
    await page.goBack();                                                                           // back closes the sheet
    await expect(page.locator(".wordsheet")).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, `chat-3-${lang}.png`) });
    expect(errors).toEqual([]);
  });
}

test("a call: locked until you both wrote, then ringing, talking, end", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await toChat(page);
  await page.click('[data-act="callStart"][data-arg="voice"]');
  await expect(page.locator(".toast")).toBeVisible();                                              // locked
  await expect(page.locator("#callUi")).toHaveCount(0);
  await unlock(page);
  await page.click('[data-act="callStart"][data-arg="video"]');
  await expect(page.locator("#callUi .callname")).toHaveText("Lena");
  await expect(page.locator("#callUi .callstatus")).toHaveText(/^\d:\d\d$/, { timeout: 6000 });  // talking: a timer
  await page.screenshot({ path: path.join(SHOTS, "chat-4-call.png") });
  await page.click("#cMute");
  await expect(page.locator("#cMute")).toHaveAttribute("aria-pressed", "true");
  await page.click("#cEnd");
  await expect(page.locator("#callUi")).toHaveCount(0, { timeout: 4000 });
  expect(errors).toEqual([]);
});

test("a video message: record with the camera, send once", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await toChat(page, "en");
  await unlock(page);
  await page.click('[data-act="plusOpen"]');
  await page.click('.plussheet [data-act="plusVideo"]');
  await expect(page.locator("#vrPreview")).toBeVisible();
  await page.click("#vrRec");
  await page.waitForTimeout(2200);
  await page.click("#vrRec");                                                                      // stop
  await expect(page.locator("#vrSend")).toBeEnabled();
  await page.screenshot({ path: path.join(SHOTS, "chat-5-video.png") });
  await page.click("#vrSend");
  await expect(page.locator(".mediacard.mine")).toContainText("Video sent", { timeout: 8000 });
  expect(errors).toEqual([]);
});
