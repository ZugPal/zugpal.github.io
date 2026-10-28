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
- Games (screen "Games"): **Chess** vs computer (Easy = depth 1, Normal = depth 3) and online with a match; **Arabic/Turkish Dama** vs computer (Easy = 1, Normal = 5) and online; **Solitaire** (Klondike, draw 1, undo, auto-finish). **Zugwort** (our own 5-letter word game, never call it Wordle: race the computer Easy/Normal, or with a match together/coop or as a race) and **Buchstabenzug / Letter Train** (hangman without gallows: 7 coaches uncouple; vs computer, or one match picks a word for the other). Word lists DE/EN/AR in `engines/wordlists.js`, rules in `engines/words-engine.js` (`ZWord`, `ZLetters`), UI in `src/words.js`. Online games show whether the partner is in the game, a "New game" button, and alerts for new chat messages while playing.
- End of ride: feedback screen (comfort check, badges, ride buddy) and mood after.
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
- Polling every 6 s (`refresh()`), no Realtime yet. Polling re-renders the screen, so anything that must survive a re-render (file inputs) lives outside `#app`.
- Special chat messages start with `\u0001` (`CARD`) and are parsed by `parseMsg()` as `type:val:extra`:
  `dice:<n>`, `spin:me|you`, `ttl`, `bye`, `media:<uuid>:photo|voice`, `chess:<gid>` (invite, sender = white), `cm:<gid>:<uci>`, `dama:<gid>`, `dm:<gid>:<path e.g. 10-26-42>`. Word games: `zw:<gid>:<coop|race>-<lang>`, `zg:<gid>:<word>`, `lt:<gid>:<scrambled lang|word>`, `lg:<gid>:<letter>`. Moves are replayed in order and validated; out-of-turn moves are ignored.
- Game engines live only in `engines/` (one copy, used by the app and the tests):
  - `ZChess`: own legal move generator (castling, en passant, promotion, check, mate, stalemate, 50-move, insufficient material) + alpha-beta. Verified with perft (start 4 plies = 197281, Kiwipete, positions 3–5).
  - `ZDama`: Turkish/Arabic rules: men move 1 forward or sideways, capture forward/sideways, captured pieces removed immediately, **mandatory maximum capture**, flying kings, no 180° turn during a capture, promotion at end of move.
  - `ZSol`: Klondike rules.
- Run tests: `npm test` = engine tests (`npm run test:engines`) + Playwright UI smoke test (`npm run test:ui`: profile → check-in → match → chat → report sheet → online chess → chess vs computer → solitaire, in DE/EN/AR at 390×844, demo mode; screenshots in `review/screens/`).

## 5. Backend: Supabase

- Project **ZugPal**, ref `vkyfnewnpsyuhbmvryws`, region eu-central-1. Anonymous sign-ins enabled. The Supabase connector may be available in your session; use it for migrations instead of asking Husam to paste SQL.
- Current schema: `supabase/schema.sql` (tables `riders`, `waves`, `blocks`, `reports`, `messages`, `compliments`, `buddies`, `ride_moods`, `media_items`; RLS on every table; nobody reads `riders` directly).
- Functions the app calls: `visible_riders()`, `my_matches()`, `send_media()`, `open_media()` (returns data once), `my_media_status()`, `report_media()`. Only the `authenticated` role may execute them (the app always signs in anonymously); they are revoked from `PUBLIC` and `anon`.
- Helpers `private.can_see()`, `private.is_match()`, `private.had_match()` live in the **`private` schema**, which the API does not expose. They are security definer, so in `public` anyone could have asked "did X and Y match / block each other?". Keep new security definer helpers in `private`, and revoke every new function from `PUBLIC`.
- Reports: `file_report()` (keeps the last 20 messages as evidence), `my_notices()`, `notices_seen()`; tables `notices`, `suspensions`. Moderators decide with `private.decide_report(id, action, reason)`; open cases in `private.open_reports`. See `docs/MODERATION.md`. Paused users can't check in or write (`private.is_suspended`).
- Migrations live in `supabase/migrations/` (applied: `presence_and_wav_voice`, `private_helper_functions` on 2026-10-26; `reports_notices_suspensions` on 2026-10-28). `auto_cleanup` (2026-10-28): hourly pg_cron job `zugpal-cleanup` runs `private.cleanup()`; data from before 2026-10-28 is kept until Husam says to delete old test data. `schema.sql` is the full current state for a fresh project. Test a migration first with a dry run (`execute_sql` ending in `raise exception`, so everything rolls back), then apply it with `apply_migration`.
- Never put the `service_role` key or the database password into code, commits or chat.

## 6. Known issues and gaps

- Voice: messages recorded before the WAV change (webm/mp4) may not play across iPhone/Android.
- Polling only (6 s); Supabase Realtime would make chat and games instant.
- Gender is self-declared; no verification yet.
- No push notifications, no Bluetooth, no offline caching (no service worker yet).
- No email login yet: identity = anonymous session in one browser. Badges and buddies are lost when the browser data is cleared.
- Media is stored as base64 text in Postgres (fine for a test, not for scale; move to Supabase Storage later).

## 7. Roadmap

Do these roughly in this order and confirm with Husam before big changes.

1. **Apply the pending migration** and verify voice between Android and iPhone.
2. **Restructure the code** into modules (e.g. `src/` with ES modules or Vite + GitHub Actions deploying to Pages), keeping the same behavior, all three languages, RTL and demo mode. Add a small automated UI smoke test (Playwright) for: profile → check-in → match → chat → game.
3. **Email login without password** (magic link) that upgrades the anonymous user (Supabase `linkIdentity`/`updateUser`), so testers keep their profile.
4. **Supabase Realtime** for messages, waves and game moves (keep polling as fallback).
5. **PWA**: manifest + service worker so the app installs on the home screen and Solitaire / chess vs computer work offline.
6. **"My usual train"** with one-tap check-in, plus a "Hard" level for chess.
7. Partner reporting: a small dashboard of anonymous mood-before/after and number of conversations per Talk Train.
8. **Native app** (React Native / Expo) once the Talk Train pilot shows real usage: Bluetooth "someone in your coach", push "N Zugpal users are on your train" (only users who opted in), selfie verification, app stores.

## 8. How to work on this project

- Before pushing: run `npm test` (engines + UI smoke test in DE/EN/AR at 390×844) and look at the screenshots.
- Keep the live keys in `CONFIG` (they are public by design); demo mode must keep working when `supabaseUrl` is empty.
- Deploy = commit + push to `main`. Use clear commit messages. Tell Husam in one or two plain sentences what changed and what he should try on his phone.
- Database changes go through migrations (connector or SQL files in `supabase/`), tested before applying, safe to re-run.
- Ask before anything irreversible (deleting data, changing auth settings, renaming the repo).
