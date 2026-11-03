// The practice ride: simulated people inside the LIVE app (no ?demo). Supabase is never reached: every request to it is
// answered here with a fake session or an empty list, the Realtime socket is left unconnected, and the test checks that
// a practice ride writes nothing (no riders row, no messages, no waves, no reports). Phone size, DE/EN/AR.
const { test, expect } = require("@playwright/test");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "review", "screens");

const b64 = s => Buffer.from(s).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const USER = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "", is_anonymous: true,
  app_metadata: {}, user_metadata: {}, created_at: "2026-11-01T00:00:00Z" };
const exp = Math.floor(Date.now() / 1000) + 3600;
const JWT = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + b64(JSON.stringify({ sub: USER.id, role: "authenticated", exp, is_anonymous: true })) + ".sig";
const SESSION = { access_token: JWT, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "fake-refresh", user: USER };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS" };

// Fake Supabase: records every call, answers auth with a fake anonymous session and everything else with an empty list.
// The server function practice-chat (Claude) answers with opts.ai: { status, body } (default: an AI reply), and its
// requests are kept in log.ai.
const AI_TEXT = { de: "Hallo! Schön, dass du schreibst. Ich sitze in Wagen 5.", en: "Hi! Nice of you to write. I'm in coach 5.", ar: "مرحباً! جميل أنك كتبت. أنا في العربة 5." };
async function fakeSupabase(page, opts = {}){
  const log = []; log.ai = [];
  await page.routeWebSocket(/supabase\.co/, () => {});                       // Realtime: never connects
  await page.route(/supabase\.co/, route => {
    const req = route.request(), u = new URL(req.url());
    if(req.method() !== "OPTIONS") log.push(req.method() + " " + u.pathname);
    const json = body => route.fulfill({ status: 200, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if(req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if(u.pathname.endsWith("/auth/v1/signup") || u.pathname.includes("/auth/v1/token")) return json(SESSION);
    if(u.pathname.endsWith("/auth/v1/user")) return json(USER);
    if(u.pathname.endsWith("/rpc/am_host")) return json(false);
    if(u.pathname.endsWith("/functions/v1/practice-chat")){
      const body = JSON.parse(req.postData() || "{}"); log.ai.push(body);
      const a = opts.ai || { status: 200, body: { reply: [AI_TEXT[body.lang] || AI_TEXT.en] } };
      return route.fulfill({ status: a.status, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify(a.body) });
    }
    return json([]);
  });
  return log;
}
async function signUp(page, lang){
  await page.goto("/");
  await page.selectOption("#lang", lang);
  await page.fill("#name", "Husam");
  await page.click('[data-act="gender"][data-arg="man"]');
  await page.click('[data-act="topic"] >> nth=0');
  await page.check("#agree");
  await page.click('[data-act="saveProfile"]');
}
const WRITES = /\/rest\/v1\/(riders|messages|waves|reports|blocks|compliments|buddies|group_messages|ride_moods|media_items|call_signals|trains|train_members)|\/rpc\/(file_report|send_media|open_media|report_media|host_announce|group_remove|become_host|train_cancel)/;
const REPLY = { de: "Wagen 5", en: "coach 5", ar: "العربة 5" };
const TYPING = { de: "schreibt", en: "typing", ar: "يكتب" };
const MORNING = { de: "Guten Morgen", en: "Good morning", ar: "صباح الخير" };

for(const lang of ["de", "en", "ar"]){
  test(`practice ride with simulated people in the live app (${lang})`, async ({ page }) => {
    const errors = []; page.on("pageerror", e => errors.push(String(e)));
    const log = await fakeSupabase(page);
    const shot = name => page.screenshot({ path: path.join(SHOTS, `practice-${name}-${lang}.png`), fullPage: true });
    await signUp(page, lang);
    // the live app, not demo mode: host link shown, no demo banner, and a real (faked) anonymous sign-in happened
    await expect(page.locator('[data-act="hostOpen"]')).toBeVisible();
    await expect(page.locator(".banner.info", { hasText: /Demo|تجريبي/ })).toHaveCount(0);
    expect(log.some(x => x.endsWith("/auth/v1/signup"))).toBe(true);
    await expect(page.locator(".practicecard")).toBeVisible();
    await shot("1-checkin");

    // check in to the practice ride: mood screen, then the people list with the practice banner
    await page.click('[data-act="practiceStart"]');
    await expect(page.locator('[data-act="goOpen"]')).toBeVisible();
    await page.click('[data-act="goOpen"]');
    await expect(page.locator(".banner.practice")).toBeVisible();
    await expect(page.locator(".ridebar")).toBeVisible();
    const lena = page.locator(".person", { hasText: "Lena" });
    await expect(lena).toBeVisible({ timeout: 10000 });
    await shot("2-people");

    // wave at Lena: she waves back, the match screen opens (still marked as practice)
    await lena.locator('[data-act="wave"]').click();
    await expect(page.locator("h1", { hasText: "Lena" })).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".banner.practice")).toBeVisible();
    await shot("3-match");

    // chat: Lena answers with the AI (the server function), shows "typing…" first
    await page.click('[data-act="chat"]');
    await expect(page.locator("#chatInput")).toBeVisible();
    await expect(page.locator(".banner.practice")).toBeVisible();
    await page.fill("#chatInput", "Hallo Lena!");
    await page.keyboard.press("Enter");
    await expect(page.locator("#chatLog .msg.mine")).toContainText("Hallo Lena!");
    await expect(page.locator("#chatHead")).toContainText(TYPING[lang], { timeout: 8000 });
    await expect(page.locator("#chatLog .msg:not(.mine)", { hasText: AI_TEXT[lang] })).toBeVisible({ timeout: 15000 });
    // the server function got Lena, your language and the chat so far, nothing else
    expect(log.ai.length).toBe(1);
    expect(log.ai[0]).toMatchObject({ persona: "d-lena", lang, name: "Husam" });
    expect(log.ai[0].history).toEqual([{ me: true, text: "Hallo Lena!" }]);
    await shot("4-chat");

    // the group chat of the practice ride
    await page.click('[data-act="go"][data-arg="nearby"]');
    await page.click('[data-act="openGroup"]');
    await expect(page.locator(".banner.practice")).toBeVisible();
    await expect(page.locator(".gmsg", { hasText: MORNING[lang] }).first()).toBeVisible({ timeout: 15000 });
    await page.fill("#groupInput", "Hallo zusammen");
    await page.keyboard.press("Enter");
    await expect(page.locator("#groupLog .msg.mine").last()).toContainText("Hallo zusammen");
    await shot("5-group");

    // leaving the practice ride returns to the normal check-in screen
    await page.click('[data-act="go"][data-arg="nearby"]');
    await page.click('[data-act="practiceEnd"]');
    await expect(page.locator(".practicecard")).toBeVisible();
    await expect(page.locator(".banner.practice")).toHaveCount(0);
    await expect(page.locator('[data-act="go"][data-arg="nearby"]')).toHaveCount(0);   // no "still checked in" banner

    // nothing from the practice ride went to the database
    expect(log.filter(x => WRITES.test(x))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("an empty real ride offers the practice ride, and the practice ride survives a reload", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  const log = await fakeSupabase(page);
  await signUp(page, "en");
  // a real train with nobody on it (the fake database answers with an empty list)
  await page.fill("#line", "RE 1"); await page.fill("#num", "10115");
  await page.click('[data-act="checkin"][data-arg="train"]');
  await page.click('[data-act="goOpen"]');
  await expect(page.locator(".empty [data-act='practiceStart']")).toBeVisible();
  expect(log.some(x => x === "POST /rest/v1/riders")).toBe(true);           // the real check-in did reach the database
  await page.click(".empty [data-act='practiceStart']");
  await page.click('[data-act="goOpen"]');
  await expect(page.locator(".person", { hasText: "Lena" })).toBeVisible({ timeout: 10000 });
  const before = log.length;
  // reload: still on the practice ride, people come back, still nothing written
  await page.reload();
  await expect(page.locator(".banner.practice")).toBeVisible();
  await expect(page.locator(".person", { hasText: "Karim" })).toBeVisible({ timeout: 15000 });
  expect(log.slice(before).filter(x => WRITES.test(x))).toEqual([]);
  expect(errors).toEqual([]);
});

test("without the AI key the practice people answer with scripts, and stop asking the server", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  const log = await fakeSupabase(page, { ai: { status: 503, body: { error: "no_key" } } });
  await signUp(page, "en");
  await page.click('[data-act="practiceStart"]');
  await page.click('[data-act="goOpen"]');
  const lena = page.locator(".person", { hasText: "Lena" });
  await expect(lena).toBeVisible({ timeout: 10000 });
  await lena.locator('[data-act="wave"]').click();
  await expect(page.locator("h1", { hasText: "Lena" })).toBeVisible({ timeout: 15000 });
  await page.click('[data-act="chat"]');
  await page.fill("#chatInput", "Hi Lena!"); await page.keyboard.press("Enter");
  await expect(page.locator("#chatLog .msg:not(.mine)", { hasText: REPLY.en })).toBeVisible({ timeout: 15000 });
  // a real question gets a fitting answer, not a random line
  await page.fill("#chatInput", "What do you do for work?"); await page.keyboard.press("Enter");
  await expect(page.locator("#chatLog .msg:not(.mine)", { hasText: "speech therapist" })).toBeVisible({ timeout: 15000 });
  expect(log.ai.length).toBe(1);                                              // asked once, then scripts for the rest of the ride
  expect(errors).toEqual([]);
});
