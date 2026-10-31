// UI smoke test: profile -> check-in -> match -> chat -> game, in German, English and Arabic, at phone size.
// Runs in demo mode (?demo), so it never touches the live database.
// Run: npx playwright test        Screenshots: review/screens/ (playwright wipes test-results/ on every run)
const { test, expect } = require("@playwright/test");
const path = require("path");

const SCHEME = process.env.SCHEME === "dark" ? "dark" : "light";   // SCHEME=dark npx playwright test  -> dark-mode screenshots
const SHOTS = path.join(__dirname, "..", "review", SCHEME === "dark" ? "screens-dark" : "screens");
test.use({ colorScheme: SCHEME });
const TEXT = {
  de: { checkin: "Talk Train", match: "gewunken", send: "Senden" },
  en: { checkin: "Talk Train", match: "both waved", send: "Send" },
  ar: { checkin: "Talk Train", match: "", send: "إرسال" }
};

for (const lang of ["de", "en", "ar"]) {
  test(`main flow (${lang})`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", e => errors.push(String(e)));
    const shot = name => page.screenshot({ path: path.join(SHOTS, `${lang}-${name}.png`) });

    await page.goto("/?demo");
    await page.selectOption("#lang", lang);
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    await expect(page.locator(".trust li")).toHaveCount(4);
    await shot("1-profile");

    // Profile
    await page.fill("#name", "Husam");
    await page.click('[data-act="gender"][data-arg="man"]');
    await page.click('[data-act="lang2"] >> nth=0');
    await page.click('[data-act="topic"] >> nth=0');
    await page.click('[data-act="practiceLevel"]');
    await page.click('[data-act="practiceLevel"][data-arg="B1"]');
    await page.check("#agree");
    await page.click('[data-act="saveProfile"]');

    // Check-in to the Talk Train, pick a mood, open up
    await expect(page.locator('[data-act="checkin"][data-arg="talk"]')).toBeVisible();
    await shot("2-checkin");
    await page.click('[data-act="checkin"][data-arg="talk"]');
    await page.click('[data-act="mood"] >> nth=0');
    await shot("3-mood");
    await page.click('[data-act="goOpen"]');
    await expect(page.locator(".person .tag.lang").first()).toBeVisible({ timeout: 15000 });

    // Wave until a simulated rider waves back
    const chatBtn = page.locator('[data-act="chat"]').first();
    for (let i = 0; i < 20 && !(await chatBtn.isVisible()); i++) {
      const wave = page.locator('.person [data-act="wave"][aria-pressed="false"]').first();
      if (await wave.isVisible()) await wave.click();
      await page.waitForTimeout(800);
    }
    await expect(chatBtn).toBeVisible();
    await expect(page.locator('[data-act="reportOpen"]').first()).toBeVisible();
    await shot("4-match");

    // Chat: safety bar, send a message, report sheet opens and closes
    await chatBtn.click();
    await expect(page.locator(".safety [data-act=\"leaveChat\"]")).toBeVisible();
    await page.fill("#chatInput", "Hallo! 👋");
    await page.click(".chatbar button[type=submit]");
    await expect(page.locator(".msg.mine").last()).toContainText("Hallo!");
    await page.click('[data-act="sendWord"]');
    await expect(page.locator(".gamecard .big[lang=de]").last()).toBeVisible();
    await shot("5-chat");
    await page.click('.safety [data-act="reportOpen"]');
    await expect(page.locator('.chip.opt[data-arg="under18"]')).toBeVisible();
    await shot("6-report");
    await page.click('[data-act="reportCancel"]');

    // Word games with the match: Zugwort together, Letter Train with a picked word
    await page.click('.games [data-act="wordSheet"][data-arg="zw"]');
    await page.click('[data-act="zwInvite"][data-arg="coop"]');
    await expect(page.locator(".tiles .tile")).toHaveCount(30);
    await page.click('[data-act="chessBack"][data-arg="chat"] >> nth=0');
    await expect(page.locator('.gamecard [data-act="zwOpen"]')).toBeVisible();
    await page.click('.games [data-act="wordSheet"][data-arg="lt"]');
    await page.fill("#ltWord", lang === "ar" ? "قطار" : "ZUG");
    await page.click('[data-act="ltInvite"]');
    await expect(page.locator(".slots .slot")).toHaveCount(lang === "ar" ? 4 : 3);
    await page.click('[data-act="chessBack"][data-arg="chat"] >> nth=0');

    // Classic games with the match: Mau-Mau invite deals the same cards from the game id
    await page.click('.games [data-act="cgSheet"]');
    await page.click('[data-act="cgInvite"][data-arg="mau"]');
    await expect(page.locator(".mhand .mcard")).toHaveCount(5);
    await page.click('[data-act="chessBack"][data-arg="chat"] >> nth=0');
    await expect(page.locator('.gamecard [data-act="cgOpen"]')).toBeVisible();

    // Quiz and Stadt-Land-Fluss with the match
    await page.click('.games [data-act="cgSheet"]');
    await page.click('[data-act="qzInvite"]');
    await expect(page.locator('.quizq [data-act="qzAnswer"]')).toHaveCount(4);
    await page.click('[data-act="chessBack"][data-arg="chat"] >> nth=0');
    await page.click('.games [data-act="cgSheet"]');
    await page.click('[data-act="slInvite"]');
    await expect(page.locator(".slletter")).toBeVisible();
    for (let k = 0; k < 6; k++) await page.fill("#sl" + k, "Test");
    await page.click('[data-act="slSubmit"]');
    await expect(page.locator('[data-act="slSubmit"]')).toHaveCount(0);
    await page.click('[data-act="chessBack"][data-arg="chat"] >> nth=0');

    // Online chess with the match: invite card + board
    await page.click('[data-act="chessInvite"]');
    await expect(page.locator(".cboard .csq")).toHaveCount(64);
    await expect(page.locator(".cpiece")).toHaveCount(32);
    { // online: drag e2-e4, the (simulated) match answers
      const r = await page.locator(".cboard").boundingBox(), sq = r.width / 8;
      await page.mouse.move(r.x + 4.5 * sq, r.y + 6.5 * sq); await page.mouse.down();
      await page.mouse.move(r.x + 4.5 * sq, r.y + 5 * sq, { steps: 4 }); await page.mouse.move(r.x + 4.5 * sq, r.y + 4.5 * sq, { steps: 4 }); await page.mouse.up();
      await expect(page.locator(".cmoves .mv")).toHaveCount(2, { timeout: 10000 });
    }
    await shot("7-chess-online");

    // Games screen: chess vs computer makes a move, solitaire deals
    await page.goto("/?demo");
    await page.click('[data-act="openGames"] >> nth=0');
    await shot("8-games");
    await page.click('[data-act="chessCpu"]');
    await expect(page.locator(".cboard .cpiece")).toHaveCount(32);
    await page.goto("/?demo");
    await page.click('[data-act="openGames"] >> nth=0');
    await page.click('[data-act="solNew"]');
    await expect(page.locator(".solboard .pcard").first()).toBeVisible();
    await shot("9-solitaire");

    // Zugwort vs computer: type a word, the computer answers with a row
    await page.goto("/?demo");
    await page.click('[data-act="openGames"] >> nth=0');
    await page.click('[data-act="zwCpu"]');
    const keys = page.locator('.keyboard [data-act="zwKey"]');
    for (let i = 0; i < 5; i++) await keys.nth(i).click();
    await page.click('[data-act="zwEnter"]');
    await expect(page.locator(".tiles .trow").first().locator(".tile.g, .tile.y, .tile.x")).toHaveCount(5);
    await expect(page.locator(".vs .mrow")).toHaveCount(1);
    await shot("10-zugwort");

    // Letter Train vs computer: a tapped letter is used up
    await page.click('[data-act="chessBack"][data-arg="games"]');
    await page.click('[data-act="ltCpu"]');
    await expect(page.locator(".train .coach")).toHaveCount(7);
    await page.locator('.keyboard [data-act="ltKey"]').first().click();
    await expect(page.locator('.keyboard [data-act="ltKey"]:disabled')).toHaveCount(1);
    await shot("11-letter-train");

    // Vier in einer Reihe: my disc lands, the computer answers
    await page.click('[data-act="chessBack"][data-arg="games"]');
    await page.click('[data-act="cgCpu"][data-arg="four"]');
    await page.click('.fcol[data-arg="3"]');
    await expect(page.locator(".disc.me")).toHaveCount(1);
    await expect(page.locator(".disc.op")).toHaveCount(1);
    await shot("12-four");

    // Mühle: place a piece, the computer places one
    await page.click('[data-act="chessBack"][data-arg="games"]');
    await page.click('[data-act="cgCpu"][data-arg="muehle"]');
    await page.click('.mpt[data-arg="0"]');
    await expect(page.locator(".mpt.me")).toHaveCount(1);
    await expect(page.locator(".mpt.op")).toHaveCount(1);
    await shot("13-muehle");

    // Mau-Mau: play a fitting card or draw; either way the turn comes back
    await page.click('[data-act="chessBack"][data-arg="games"]');
    await page.click('[data-act="cgCpu"][data-arg="mau"]');
    await expect(page.locator(".mhand .mcard")).toHaveCount(5);
    const fitting = page.locator('.mhand .mcard[data-act="cgCard"]');
    if (await fitting.count()) { await fitting.first().click(); const suit = page.locator('.chip.suit'); if (await suit.count()) await suit.first().click(); }
    else await page.click('[data-act="cgMove"][data-arg="d"]');
    await shot("14-maumau");

    // Backgammon vs computer and the quiz played to the end
    await page.click('[data-act="chessBack"][data-arg="games"]');
    await page.click('[data-act="cgCpu"][data-arg="bg"]');
    await expect(page.locator(".bgboard .bpt")).toHaveCount(24);
    await page.locator(".bpt.hot").first().click();
    await expect(page.locator(".bpt.tgt, .chip.tgt").first()).toBeVisible();
    await shot("14b-backgammon");
    await page.click('[data-act="chessBack"][data-arg="games"]');
    await page.click('[data-act="qzCpu"]');
    for (let q = 0; q < 6; q++) { await page.locator('[data-act="qzAnswer"]').first().click(); await page.click('[data-act="qzNext"]'); }
    await expect(page.locator(".pill")).toContainText(":");
    await shot("14c-quiz");

    // Library: 15-minute shelf, download a book, read it (epub.js), turn a page, Arabic book opens right-to-left
    await page.goto("/?demo");
    await page.click('[data-act="openLibrary"] >> nth=0');
    await expect(page.locator(".bookrow").first()).toBeVisible();
    await shot("15-library");
    await page.click('.bookrow[data-arg="pg17161"]');
    await page.click('[data-act="libDownload"]');
    await expect(page.locator('[data-act="libRemove"]')).toBeVisible();
    await page.click('[data-act="libRead"]');
    await expect(page.locator(".reader iframe")).toBeVisible({ timeout: 15000 });
    await page.click('[data-act="readerTurn"][data-arg="next"]');
    await expect.poll(() => page.evaluate(() => localStorage.getItem("zugpal.read.pg17161"))).not.toBeNull();
    await shot("16-reader");
    await page.click('[data-act="readerClose"]');
    await page.click('[data-act="go"][data-arg="library"]');
    await page.click('[data-act="libShelf"][data-arg="all"]');
    await page.click('.bookrow[data-arg="ar-kalila"]');
    await page.click('[data-act="libRead"]');
    await expect(page.locator(".reader iframe")).toBeVisible({ timeout: 15000 });
    await page.click('[data-act="readerClose"]');
    await page.click('[data-act="go"][data-arg="library"]');
    await page.click('[data-act="go"][data-arg="credits"]');
    await expect(page.locator(".credit")).toHaveCount(40);

    expect(errors, errors.join("\n")).toEqual([]);
  });
}
