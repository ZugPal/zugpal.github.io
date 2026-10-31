# Zugpal: project brief for Claude Code

Read this file fully before changing anything. It explains what Zugpal is, what is built, how it is deployed, the decisions already made, and where the project is going.

## 1. What Zugpal is

Zugpal ("Zug" = train, "pal" = friend) is a **non-dating** app that helps shy train commuters start a conversation during the ride. Many commuters would like to talk but fear rejection. Zugpal removes that fear with a **private mutual "wave"**: you only find out someone waved at you if you waved back.

- Founder: Husam, Düren (NRW, Germany). Arabic–German translator. Not a developer: explain changes in simple words, show results, avoid jargon.
- He mostly works **from his Android phone**, sometimes a Windows laptop. Every change must work and be testable on a phone.
- App languages: **German, English, Arabic** (Arabic is RTL). Every new text needs all three.
- Research basis: Epley & Schroeder (2014) showed commuters enjoy rides more after talking to a stranger but predict the opposite. Earlier "chat on your train" apps (Bumped.in, Train Yarn, Junction, tChat, Tube Chat badges) all died from too few users per train and no institutional partner. Hosted, scheduled formats worked (NS "Kletscoupé", Translink "Chatty Carriages", Plauderbänke).

**Launch strategy (decided):** launch as a scheduled, hosted event on one line (the weekly "Talk Train", e.g. RE 1 Düren → Köln, a host on board), not as an always-on app. QR stickers in one coach (with operator permission), German-practice and integration angle, partner pitch to go.Rheinland / VRR. Money comes from B2B (transport associations, employers, universities, integration and anti-loneliness programs), **never** from user paywalls.

## 2. Product principles (do not break these)

- Not dating: no swiping, no hearts, no "singles" language, no star ratings of people.
- Mutual opt-in only: waves are private; matches only when both wave. Max **5 waves per ride**.
- Photos are **blurred until a match** (others only receive a 24 px thumbnail; the full photo is only returned to matches by the database).
- **Chat-only is the default** for first contacts; the coach number is only shown after a match and only if neither person chose chat-only.
- **Women-only** option (women see only women, only women see them).
- Visible safety on every chat: "Leave chat now", Report (reasons incl. "seems under 18"), Block, "Reports are reviewed within 24 hours". Reporter gets a confirmation and the decision; the reported person gets the action and the reason.
- Contact details (phone, email, links, social handles, IBAN) are blocked in chat and in "Ask me about…". Messages about money show a scam warning.
- Positive-only **badges** (Great listener, Funny, Helped me with German, Kind, Great stories) instead of ratings. A private comfort check after the ride ("Did you feel comfortable?" → a "no" files a hidden report).
- **View-once photos** (unlock only after both sent 2+ text messages, arrive blurred) and **play-once voice** (max 60 s). Report possible for 24 h; unreported media is deleted after 24 h.
- 18+ only. Rules shown at sign-up: here to talk not to date; accept a no; never share others' details; 18+.
- Privacy/GDPR: data in Frankfurt (eu-central-1), no ad tracking ever, check-ins are deleted when a ride ends, no check-in history exposed (ride buddies must stay mutual and silent when blocked).

## 3. What is built (status: working web app, tested with real friends)

Legal pages: `impressum.html`, `datenschutz.html`, `regeln.html` (DE binding + EN/AR). Fonts and supabase-js are hosted in `vendor/` (no Google Fonts / CDN): the only third party is our Supabase project. `?demo` forces demo mode.

Live at **https://zugpal.github.io** (GitHub Pages from `main` of `ZugPal/zugpal.github.io`; a push to `main` is live in 1–2 minutes).

Features:
- Profile: photo (blurred until match), first name, gender, age range, languages, up to 5 talk topics, "Ask me about…", receive photos on/off, rules agreement.
- Check-in: the **Talk Train** (ride key `TALK-YYYY-MM-DD`), any train by line + train number (`LINE-NUMBER-DATE`), or a private **test ride** with invite link `#ride-CODE` (key `TEST-CODE`). QR deep link `#talk` goes straight to the Talk Train.
- Mood selection, chat-only / in-person mode, coach, women-only, optional mood check (1–5) before and after the ride (anonymous, for partner reporting).
- Nearby list with blurred photos, languages, topics, badges, "same coach", "ride buddy"; private waves; match screen with icebreakers based on shared moods and a meeting point.
- Chat: text, topic dice, "who asks next" spinner, "two truths and a lie", goodbye prompt 5 min before the ride ends, view-once photos (camera or gallery), play-once voice (recorded as **WAV 8 kHz 16-bit** so it plays on every phone), report, block, ride-buddy star, "Active now".
- Games (screen "Games"): **Chess** (`src/chessui.js`, modelled on chess.com/Lichess): drag & drop or tap-tap with legal-move dots, animated pieces (cburnett SVGs in `vendor/pieces`, GPLv2+), last-move/check highlights, promotion picker, SAN move list with step-through review, captured pieces + material, hint arrow, takeback, flip, WebAudio sounds, end screen with reason (confetti / fallen king), resign and draw offers online (`cx:<gid>:resign|draw|accept|decline`); computer levels easy/medium/hard/expert via `ZChess.think` in a Web Worker (`engines/chess-worker.js`), tests `tests/chessplus.js` + `tests/chess.spec.js`; **Arabic/Turkish Dama** (`src/damaui.js`, modelled on the popular Turkish/Arabic dama apps): wooden board, drag & drop or tap, multi-captures square by square (or straight to the end square), hop animation with captured pieces fading one by one, glowing pieces under compulsory capture, crown animation, move list (a3-a4, c3xc5xe5), capture counters, hint path, takeback, flip, sounds, end screen with reason; modes vs computer (easy/medium/hard/expert via `ZDama.think` in `engines/dama-worker.js`), **two players on one phone**, and online (`dx:<gid>:resign|draw|accept|decline`); tests `tests/damaplus.js` + `tests/dama.spec.js`; **Solitaire collection** (`ZPatience` in `engines/patience-engine.js`, UI `src/solitaire.js`): Klondike draw 1/3, Spider 1/2/4 suits, FreeCell with Windows deal numbers; drag & drop (pointer events) or tap-to-move, deal animation, invalid moves slide back + shake + reason, undo, hint glow, auto-finish, timer/moves/score, stats per variant and the running game in localStorage `zugpal.sol.*`, bouncing-cards win cascade (canvas), "no moves left" dialog. The board is a persistent DOM element re-mounted by `render()` (`mountSolitaire()`). **Zugwort** (our own 5-letter word game, never call it Wordle; `src/zugwort.js`: word of the day (same for everyone per language, `ZWord.pick` on `daily:<date>:<lang>`), practice, race the computer Easy/Normal, or with a match together/coop or as a race; flip/pop/shake/dance animations, statistics with streaks and guess chart per mode, share grid without letters, hard mode, colour-blind colours, real keyboard; storage `zugpal.zw.*`) and **Buchstabenzug / Letter Train** (hangman without gallows, `src/letters.js`: themes travel/food/nature/animals/home/free in `ZWords.<lang>.cats` (`long` = all), 9/7/5 coaches, a wrong letter uncouples the last coach which rolls away, the train departs on a win, hint costs a coach (`ZLetters.hint`), statistics, two players on one phone (secret word), online: one match picks a word for the other; real keyboard). Word lists DE/EN/AR in `engines/wordlists.js`, rules in `engines/words-engine.js` (`ZWord`, `ZLetters`), UI in `src/words.js`. **Vier in einer Reihe** (`ZFour`, UI `src/fourui.js`: blue frame, disc follows your finger above the columns and drops with a bounce, winning four pulse with a line, discs fall out for a new game; `think()` levels easy/medium/hard/expert in `engines/ai-worker.js`), **Mühle** (`ZMuehle`: placing, moving, flying, protected mills, 100 quiet plies = draw, threefold repetition = draw; UI `src/muehleui.js`: wooden board, pieces in hand beside the board (drag or tap a point), drag/tap-tap along lines with dots, a closed mill glows and takeable pieces wobble; `think()` easy/medium/hard/expert) and **Mau-Mau** (`ZMau`, 32 cards, 5 each, 7 draw 2 and stack, 8 skip, jack wishes; deal from a seed so online games match; UI `src/mauui.js`: green felt, fanned hand, cards that fit lift, drag onto the pile or tap, cards fly and flip, deal animation, suit picker, bubbles +2/Skip/Wish/Mau!, a drawn card that does not fit is kept automatically, end screen shows the loser's cards and points; `think()` easy/medium/hard, never looks at your cards). Never call them Connect 4 or Uno. `src/classic.js` only starts them (games screen, chat invites, chat cards). Upgraded games share the frame `src/tablekit.js` (screen `table`: computer with 4 levels, two players on one phone, online; who starts, takeback, hint, resign/draw offer, running score, stats per level, end screen with reason and confetti; storage `zugpal.tk.<game>.*`); each game registers a board with `register({ id, E, newGame, end, board: { create, paint } })`. Online extra card: `cgx:<gid>:resign|draw|accept|decline`. **Quizfahrt** (our quiz duel, `ZQuiz` + `engines/quiz-questions.js`: 48 own questions in DE/EN/AR, 6 categories incl. Leben in Deutschland, never the official test text) and **Stadt-Land-Fluss** for two (`ZSlf`, 3 rounds, 20/10/5 points, contact details blocked in answers) are in `src/party.js`. Online games show whether the partner is in the game, a "New game" button, and alerts for new chat messages while playing.
- End of ride: feedback screen (comfort check, badges, ride buddy) and mood after.
- Optional **Sprachpraxis** on the profile (`riders.practice`: `helper` = happy to speak slow German, `learner-A1..C1`): tag on rider cards, "Good for German practice" tag and sorting for helper/learner pairs. German word of the ride also as a chat card (`word:<index>`).
- **Library** (`src/library.js`, catalogue `library/catalog.json`): 40 public-domain works (37 from gutenberg.org, 3 built from Arabic Wikisource by `tools/wikisource-epub.js`), 10 LibriVox audiobooks streamed from archive.org. Shelves: 15-minute stories, Easy German, audiobooks, all, mine; language filter; EPUB reader (epub.js in `vendor/`, outside `#app`); downloads in IndexedDB `zugpal-library` + `navigator.storage.persist()`; progress in localStorage `zugpal.read.<id>`; chat card `book:<id>` ("Story" in the chat toolbar); credits screen. **Rule: never use projekt-gutenberg.org; every author/translator/illustrator must have died before 1956** (checked from gutenberg.org pg_catalog.csv, record in `library/picks.json`). Rebuild: `node tools/build-catalog.js <dir with picks.json, librivox-picks.json, dl/>`.
- **Host mode** (Talk Train only): host code -> `become_host()` (30 days), `host_ride_stats()` numbers only, `host_announce()` one per ride, riders get `ride_announcement()`. **Partner dashboard** `partner/dashboard.html` -> `partner_stats(code)`: Talk Train counts from `private.ride_counts` (triggers on check-in and returned waves, numbers only), moods + "would recommend" from `ride_moods`; groups under 20 hidden; print to PDF. Codes only as bcrypt hashes; plain codes in `.secrets/` (gitignored). See `docs/HOSTS-AND-PARTNERS.md`.
- **Sponsor slot** ("Talk Train presented by …"): configured only in `SPONSOR` in `src/sponsor.js` (local logo in `sponsor/`, offer in DE/EN/AR, dates, plain link; no third-party scripts); off by default, `?sponsor` previews it. **Supporter** screen (2,99 €/month, 19,99 €/year): design only, no payments; extras only (themes, game packs, badge); waving, chat, safety and women-only stay free forever.
- German word of the ride, demo mode with simulated riders when no Supabase URL is configured.

## 4. Architecture

Plain **ES modules, no build step, no framework**: a push to `main` is live as-is on GitHub Pages. `index.html` is a small shell that loads `src/styles.css`, the three engines from `engines/` (classic scripts, globals `ZChess`, `ZDama`, `ZSol`) and `src/main.js` (type=module).

| File | What is in it |
|---|---|
| `src/config.js` | `CONFIG` (Supabase URL + public anon key, Talk Train label, contact email) |
| `src/i18n.js` | texts `T` (de/en/ar) |
| `src/data.js` | moods, topics, languages, badges, icebreakers, words |
| `src/state.js` | state `S`, `load()`/`save()`, `backend` + `setBackend()` |
| `src/util.js` | `t()`, `esc()`, photos, icons, `parseMsg()`, `toast()` |
| `src/backend-demo.js`, `src/backend-live.js` | the two backends |
| `src/screens.js` | `screens.<name>()`, overlays (report sheet, notices), `render()` |
| `src/actions.js` | `actions.<name>()` for `data-act` buttons, feedback/end of ride |
| `src/games.js` | chess/dama/solitaire boards and online-game helpers |
| `src/chat.js` | sending text/photos/voice, WAV encoder, loading messages |
| `src/polling.js` | `refresh()`, start/stop polling |
| `src/main.js` | event wiring and start-up |

Modules only reassign their own top-level variables (ES imports are read-only), e.g. `setBackend()` instead of `backend = …`. Run the app locally with `npm start` (http://localhost:8080, `?demo` for simulated riders).

- `CONFIG` at the top of the script: `supabaseUrl`, `supabaseAnonKey` (the anon key is public by design), Talk Train label per language. Empty URL → demo mode.
- Texts: object `T` with `en`, `de`, `ar`. Helper `t(key, vars)`.
- State: single object `S`. Rendering: `render()` rebuilds `#app` with template strings from `screens.<name>()`. Event delegation via `data-act` / `data-arg` attributes → `actions.<name>()`. Inputs use `data-bind`.
- Backends with the same interface: `DemoBackend()` (simulated riders Lena, Karim, Aylin, Mira, Jonas) and `LiveBackend()` (Supabase JS v2.45.4 from `vendor/`, anonymous auth).
- **Realtime** (`backend.listen()`): `postgres_changes` INSERT on `messages` filtered to me (RLS applies, tested: others receive nothing) and an empty broadcast "poke" on channel `ride-<key>` after waves/check-in/leave, so everyone re-reads what RLS allows. Polling stays as fallback: 6 s, or 20 s while Realtime is connected. Polling re-renders the screen, so anything that must survive a re-render (file inputs) lives outside `#app`.
- Special chat messages start with `\u0001` (`CARD`) and are parsed by `parseMsg()` as `type:val:extra`:
  `dice:<n>`, `spin:me|you`, `ttl`, `bye`, `media:<uuid>:photo|voice`, `chess:<gid>` (invite, sender = white), `cm:<gid>:<uci>`, `dama:<gid>`, `dm:<gid>:<path e.g. 10-26-42>`. Classic games: `cg:<gid>:<four|muehle|mau>`; quiz `qz:<gid>`, `qa:<gid>:<i>-<choice>`; Stadt-Land-Fluss `sl:<gid>:<lang>`, `slsub:<gid>:<round>-<base64 json>`, `slstop`, `slrej:<gid>:<round>-<cat>`, `cgm:<gid>:<move>`. Word games: `zw:<gid>:<coop|race>-<lang>`, `zg:<gid>:<word>`, `lt:<gid>:<scrambled lang|word>`, `lg:<gid>:<letter>`. Moves are replayed in order and validated; out-of-turn moves are ignored.
- Game engines live only in `engines/` (one copy, used by the app and the tests):
  - `ZChess`: own legal move generator (castling, en passant, promotion, check, mate, stalemate, 50-move, insufficient material) + alpha-beta. Verified with perft (start 4 plies = 197281, Kiwipete, positions 3–5).
  - `ZDama`: Turkish/Arabic rules: men move 1 forward or sideways, capture forward/sideways, captured pieces removed immediately, **mandatory maximum capture**, flying kings, no 180° turn during a capture, promotion at end of move.
  - `ZSol`: Klondike rules.
- Solitaire UI test with real drags: `tests/solitaire.spec.js` (part of `npm test`).
- Run tests: `npm test` = engine tests (`npm run test:engines`) + Playwright UI smoke test (`npm run test:ui`: profile → check-in → match → chat → report sheet → online chess → chess vs computer → solitaire, in DE/EN/AR at 390×844, demo mode; screenshots in `review/screens/`).

## 5. Backend: Supabase

- Project **ZugPal**, ref `vkyfnewnpsyuhbmvryws`, region eu-central-1. Anonymous sign-ins enabled. The Supabase connector may be available in your session; use it for migrations instead of asking Husam to paste SQL.
- Current schema: `supabase/schema.sql` (tables `riders`, `waves`, `blocks`, `reports`, `messages`, `compliments`, `buddies`, `ride_moods`, `media_items`; RLS on every table; nobody reads `riders` directly).
- Functions the app calls: `visible_riders()`, `my_matches()`, `send_media()`, `open_media()` (returns data once), `my_media_status()`, `report_media()`. Only the `authenticated` role may execute them (the app always signs in anonymously); they are revoked from `PUBLIC` and `anon`.
- Helpers `private.can_see()`, `private.is_match()`, `private.had_match()` live in the **`private` schema**, which the API does not expose. They are security definer, so in `public` anyone could have asked "did X and Y match / block each other?". Keep new security definer helpers in `private`, and revoke every new function from `PUBLIC`.
- Reports: `file_report()` (keeps the last 20 messages as evidence), `my_notices()`, `notices_seen()`; tables `notices`, `suspensions`. Moderators decide with `private.decide_report(id, action, reason)`; open cases in `private.open_reports`. See `docs/MODERATION.md`. Paused users can't check in or write (`private.is_suspended`).
- Migrations live in `supabase/migrations/` (applied: `presence_and_wav_voice`, `private_helper_functions` on 2026-10-26; `reports_notices_suspensions`, `auto_cleanup`, `language_practice`, `realtime_messages`, `profiles`, `host_and_partner` on 2026-10-28). `auto_cleanup` (2026-10-28): hourly pg_cron job `zugpal-cleanup` runs `private.cleanup()`; data from before 2026-10-28 is kept until Husam says to delete old test data. `schema.sql` is the full current state for a fresh project. Test a migration first with a dry run (`execute_sql` ending in `raise exception`, so everything rolls back), then apply it with `apply_migration`.
- Never put the `service_role` key or the database password into code, commits or chat.

## 6. Known issues and gaps

- Voice: messages recorded before the WAV change (webm/mp4) may not play across iPhone/Android.
- Polling only (6 s); Supabase Realtime would make chat and games instant.
- Gender is self-declared; no verification yet.
- No push notifications, no Bluetooth, no offline caching (no service worker yet).
- Email login is optional; without it identity = anonymous session in one browser. Bans are weak for anonymous users.
- Media is stored as base64 text in Postgres (fine for a test, not for scale; move to Supabase Storage later).

## 7. Roadmap

Do these roughly in this order and confirm with Husam before big changes.

1. **Apply the pending migration** and verify voice between Android and iPhone.
2. **Restructure the code** into modules (e.g. `src/` with ES modules or Vite + GitHub Actions deploying to Pages), keeping the same behavior, all three languages, RTL and demo mode. Add a small automated UI smoke test (Playwright) for: profile → check-in → match → chat → game.
3. ~~Email login~~ (built 2026-10-28: `updateUser({email})` keeps the same uid; `signInWithOtp` on a new phone; profile copy in `profiles`, only for non-anonymous users). **Needs custom SMTP (e.g. Resend) in Supabase Auth settings** before testers get the emails, and the Site URL / redirect URL `https://zugpal.github.io/`.
4. ~~Supabase Realtime~~ (done 2026-10-28).
5. **PWA**: manifest + service worker so the app installs on the home screen and Solitaire / chess vs computer work offline.
6. **"My usual train"** with one-tap check-in (chess levels are done).
7. ~~Partner reporting~~ (done 2026-10-28: `partner/dashboard.html`).
8. **Native app** (React Native / Expo) once the Talk Train pilot shows real usage: Bluetooth "someone in your coach", push "N Zugpal users are on your train" (only users who opted in), selfie verification, app stores.

## 8. How to work on this project

- **PWA:** `manifest.webmanifest`, icons in `icons/`, `sw.js` caches the whole app as one versioned set (offline: games vs computer, legal pages). After changing ANY app file run `node tools/update-sw.js` (npm test fails otherwise), or phones keep the old version. Supabase is never cached.
- Before pushing: run `npm test` (engines + UI smoke test in DE/EN/AR at 390×844) and look at the screenshots.
- Keep the live keys in `CONFIG` (they are public by design); demo mode must keep working when `supabaseUrl` is empty.
- Deploy = commit + push to `main`. Use clear commit messages. Tell Husam in one or two plain sentences what changed and what he should try on his phone.
- Database changes go through migrations (connector or SQL files in `supabase/`), tested before applying, safe to re-run.
- Ask before anything irreversible (deleting data, changing auth settings, renaming the repo).
