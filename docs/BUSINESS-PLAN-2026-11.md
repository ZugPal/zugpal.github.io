# Zugpal: money and marketing plan (November 2026)

Written 2026-11-01 for Husam. Read it on your phone, one section at a time. Every number has a link to where it comes from. Where a source is old or unclear, it says so.

What this plan builds on (already live at https://zugpal.github.io): the weekly Talk Train with host mode, the partner dashboard with anonymous numbers (`partner/dashboard.html`), the sponsor slot "Talk Train presented by …" (`src/sponsor.js`, switched off), the Supporter screen (2,99 €/month, 19,99 €/year, design only, no payment yet), own trains with group chat, the QR poster (`qr.html`), 10 games, the library, and the German word of the ride.

The rules that never change (from `CLAUDE.md` section 2): not dating, waving/chat/safety/women-only are free forever, no ad tracking, no third-party scripts, data stays in Frankfurt, 18+.

---

## 0. One page: the 5 things to do first

Do them in this order. Each one makes the next one easier.

1. **Get the Talk Train permission and run it 8 weeks in a row** (RE 1, Tuesday 07:42, Düren → Köln, coach 5). Write to National Express (runs the RE 1) and to go.Rheinland (orders the trains). Until the answer comes, ride anyway as a normal passenger with friends. The partner dashboard collects the numbers you need for everything below.
2. **Sign the first 3 station partners in Düren** (a bakery or café at the station, the kiosk, the Stadtbücherei). First month free, then 49 € per month. This needs a small build (section 4). It is the fastest real money.
3. **Apply for the Gründungsstipendium.NRW**: 1.200 € per month for up to 12 months, for founders living in NRW who work on the idea full-time ([IHK Bonn](https://www.ihk-bonn.de/unternehmensfoerderung/existenzgruendung/gruenderstipendiumnrw), [IHK Bochum: conditions](https://www.ihk.de/bochum/hauptnavigation/branchenbetreuung/dienstleistung/kultur-und-kreativwirtschaft/gruenderstipendium-nrw-6632932)). You apply through a certified Gründungsnetzwerk, for Düren that is the IHK Aachen / digitalHUB Aachen. Pays your rent while you build the business.
4. **Pitch go.Rheinland and National Express a paid pilot** (section 6) with your 8-week numbers: riders per ride, waves, matches, mood before and after. Ask for the "Pilot" package (4.900 €).
5. **Switch on the money that is already built**: the sponsor slot (one sponsor per route, 250 € per month) and the Supporter payments (a payment link outside the app, so no third-party script inside).

### Expected money in year 1 (Nov 2026 to Oct 2027)

| | Conservative | Realistic | Optimistic |
|---|---|---|---|
| Station partners (49 €/month each) | 2 partners, 6 months: 590 € | 5 partners, avg 7 months: 1.700 € | 12 partners across Düren, Köln, Aachen: 5.900 € |
| Sponsor slot "presented by" | 0 € | 1 sponsor, 4 months: 1.000 € | 2 routes, 8 months: 4.000 € |
| Supporter subscriptions | 15 people: 300 € | 60 people (mix month/year): 1.200 € | 250 people: 5.000 € |
| B2B (go.Rheinland, NVR, employer, university) | 0 € | 1 pilot: 4.900 € | 1 line package + 2 employer pilots: 14.900 € + 5.800 € |
| Prizes and foundation grants | 0 € | Nachbarschaftspreis state prize: 2.000 € | Bosch "Vor Ort vereint" 10.000 € + prize 2.000 € |
| **Revenue total** | **≈ 900 €** | **≈ 10.800 €** | **≈ 47.600 €** |
| Founder stipend (not revenue, pays you) | 0 € | Gründungsstipendium 12 × 1.200 € = 14.400 € | same 14.400 € |

Costs stay tiny: Supabase free tier for now, a domain (about 10 €/year), printing posters, train tickets (Deutschlandticket 63 €/month, [ZDF](https://www.zdfheute.de/politik/deutschlandticket-dticket-verkehr-nahverkehr-preis-erhoehung-100.html)). The realistic case means Zugpal pays for itself and the stipend pays you. The optimistic case needs the B2B deal in spring 2027.

---

## 1. Where Zugpal stands

- The app works and was tested with friends. Everything in the November plan is live.
- Nobody pays yet. There is no payment, no partner, no permission from the operator yet.
- The proof that convinces partners is still missing: real rides with real numbers. Section 5 is about getting that proof in 8 weeks.
- Zugpal's story is strong: people enjoy talking on the train more than they expect ([Epley & Schroeder 2014, Chicago commuters](https://www.labmanager.com/mom-was-wrong-you-should-talk-to-strangers-13225)), loneliness is a public topic (one in six people in Germany feels lonely, [Einsamkeitsbarometer 2024](https://www.bmbfsfj.bund.de/einsamkeitsbarometer); 46 % of young adults feel moderately or strongly lonely, [Bertelsmann 2024](https://www.evangelisch.de/inhalte/237315/16-12-2024/bertelsmann-studie-einsamkeit-unter-jungen-menschen-verbreitet)), and the RE 1 is the fastest-growing line in the go.Rheinland area (+18 % passengers in 2024, [go.Rheinland Fahrgastzahlen 2024](https://wir.gorheinland.com/fileadmin/B2B/Downloads/Angebot/Verkehrsqualitaet/Fahrgastzahlen/EntwicklungFahrgastzahlen2024.pdf)).

---

## 2. Fresh ideas borrowed from other apps

Legend: ✅ fits Zugpal as it is · ⚠️ fits with changes · ❌ no (breaks a rule)

### 2.1 From dating apps (Bumble, Hinge, Tinder, Lovoo, Once, Feeld)

| # | What they do | How it maps to Zugpal | Fits? |
|---|---|---|---|
| 1 | **Bumble For Friends**: a separate, free app only for friendships, with a cheap premium (BFF Premium 9,99 €/month in the German App Store, [listing](https://apps.apple.com/DE/app/id6444040977); the app itself is free, [Bumble help](https://bumble.com/help/tengo-que-pagar-por-bumble-for-friends)) | Zugpal already is the "friends, not dates" product. Say it louder in marketing: "Zugpal is to the train what Bumble For Friends is to the city, without the swiping." | ✅ |
| 2 | **In-person events**: Tinder has an Events tab and events in 50+ cities ([ITV, Oct 2026](https://www.itv.com/news/2026-10-19/singletons-want-to-meet-in-real-life-were-embracing-that-says-tinder-boss)); Bumble runs "Bumble IRL" gatherings ([Event Marketer](https://www.eventmarketer.com/article/6-dating-app-events-to-win-back-gen-z-users/)); singles are leaving apps for live events ([Axios](https://www.axios.com/2026/05/13/singles-events-dating-app-fatigue)) | The Talk Train is an event. Show "Trains with Zugpal people" like an events list (date, line, how many are coming) and add a monthly bigger "Talk Train Day" with the host and a partner café. | ✅ |
| 3 | **Hinge "One More Hour"**: a 1 million dollar fund that pays social groups up to 25.000 $ to run cheap in-person meetups for young people ([Marketing Dive](https://www.marketingdive.com/news/hinge-dating-app-one-more-hour-social-initiative-gen-z-marketing/701848/)), now also in France ([GDI](https://www.globaldatinginsights.com/news/hinge-expands-one-more-hour-initiative-to-france/)) | Two things: apply to funds like this when they open in Germany, and copy the idea small: a "Zugpal Stammtisch" once a month after the ride in a partner café. | ✅ |
| 4 | **Hinge "We met" check**: after a date the app asks "Did you meet?" and shows success stories | Zugpal has the comfort check. Add an anonymous counter on the check-in screen: "This week on the Talk Train: 14 conversations started". Numbers only, never names. | ✅ |
| 5 | **Verified badge** (selfie check) | Good for safety, free for everyone, never a paid feature. Planned for the native app (roadmap 8). Until then: the host can hand out a "met in person" badge on the Talk Train. | ✅ |
| 6 | **Prompts** ("Two truths and a lie", "Ask me about") | Already in Zugpal. Rotate three new prompts every month so regulars see something new. | ✅ |
| 7 | **Once**: one match per day, slow and calm | Zugpal's 5 waves per ride is the same idea. Keep it, and say it in the rules: "slow on purpose". | ✅ |
| 8 | **Safety centre** (Bumble "Private Detector", Tinder safety tips before a date) | Add a short "Before you meet at the station" card on the match screen: meet in public, tell a friend, you can leave any time. Already have Report/Block/Leave. | ✅ |
| 9 | **Feeld incognito**: be invisible, browse only | A "just reading today" check-in: you are on the ride, you see the group chat, nobody sees you on the people list. Useful for shy first-timers and for women who want to look first. Needs a small change in `visible_riders()`. | ⚠️ |
| 10 | **Hinge+ 25 €/month, HingeX 45 €/month, Boost 8 €** ([giga.de, 2023 prices](https://www.giga.de/artikel/hinge-kosten-und-funktionen-der-neuen-dating-app/)); Bumble Spotlight 4,99 € ([giga.de](https://www.giga.de/artikel/bumble-kosten-im-ueberblick-das-geht-kostenlos/)) | Only as a benchmark: Zugpal's 2,99 € Supporter is cheap on purpose and pays for extras, not attention. | ✅ (benchmark only) |
| 11 | **Boost / Spotlight / Super Like**: pay to be seen first | No. Paying to be seen on a train is unfair to the others, feels like dating, and breaks "no paywall for core". | ❌ |
| 12 | **Lovoo "live radar"**: see people around you on a map | No. That is location tracking. Zugpal only knows the ride, never where you sit or walk. | ❌ |
| 13 | **"Who liked you" behind a paywall** | No. Zugpal shows who waved for free (decided 2026-10-31). | ❌ |

### 2.2 From gaming apps (Duolingo, Wordle / NYT Games, chess.com, Lichess, Clash Royale, Pokémon GO)

| # | What they do | How it maps to Zugpal | Fits? |
|---|---|---|---|
| 14 | **Duolingo streaks**: showing the streak at the top lifted daily users by 3 % and day-14 retention by 1 % in A/B tests ([Econsultancy](https://econsultancy.com/six-a-b-tests-used-by-duolingo-to-tap-into-habit-forming-behaviour/)); the jump from a 1-day to a 2-day streak matters most ([Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)) | A private **ride streak**: "3 Talk Trains in a row". Only you see it. A small badge after 4 weeks. Never a streak for waves or matches (that would push people). | ✅ |
| 15 | **Duolingo leagues** (weekly leaderboards) | Only for games: a weekly Quizfahrt or Zugwort league per train, first names only, opt-in. Never a league for conversations or matches. | ⚠️ |
| 16 | **Wordle**: one puzzle a day, same for everyone, a shareable grid without letters | Zugwort already does this. Post the day's grid in the ride's group chat automatically ("3 people solved today's Zugwort") and use it as daily social content. | ✅ |
| 17 | **NYT Games subscription** (about 6 to 7 $ a month, [NYT help](https://thenewyorktimeshelpcenter.helpjuice.com/360011158491-New-York-Times-Games/360052272251-New-York-Times-Games-Subscription), [Insider Gaming](https://insider-gaming.com/?p=179439)): people pay for a bundle of puzzles | The Supporter "extra game packs" are exactly this. Add 48 new quiz questions and a new word theme every quarter so the extra stays worth it. | ✅ |
| 18 | **Lichess Patron**: everything free, 5 $/month buys only a badge ("wings") ([lichess.org/features](https://lichess.org/features)); December 2025 was their record donation month ([Lichess blog](https://lichess.org/@/Lichess/blog/lichess-end-of-year-update-2025/YRiNKoaQ)) | This is the Zugpal Supporter model. Copy their honesty: a public page "What Zugpal costs per month and who pays". People give more when they see the numbers. | ✅ |
| 19 | **chess.com Diamond 119,99 $/year** ([pinclair.de](https://pinclair.de/en-us/blogs/news/chess-com-kosten)): lessons, unlimited puzzles, analysis behind a paywall | Keep chess analysis free. A puzzle pack as a Supporter extra is fine. | ⚠️ |
| 20 | **Clash Royale seasons / battle pass**: a new theme every month | Free "seasons" for the Talk Train: November "Lieblingsgericht", December "Winterwörter", January "Neujahrsvorsätze". Theme = host announcement + word list + 3 new icebreakers. No paid pass. | ✅ |
| 21 | **Cosmetic packs** (skins, board colours) | Already designed: colour themes for Supporters. Add chess/dama board skins. Cosmetic only, no advantage. | ✅ |
| 22 | **Clans** | "Regulars" per train: how many regulars ride this train (numbers only), the group chat as the clan chat. Already half built (own trains + group chat). | ✅ |
| 23 | **Pokémon GO sponsored PokéStops**: small businesses paid 30 $/month for a stop, 60 $ for a gym ([TechCrunch 2019](https://techcrunch.com/?p=1908951)); big sponsors paid under 0,50 $ per visit ([PYMNTS](https://pymnts.com/news/2017/niantic-charges-pokemon-go-sponsors-up-to-50-cents-per-visitor)) | The model for "Near the station" partners (section 4): a flat monthly price for a place in the app, marked "Partner · Anzeige", counted, never tracked. | ✅ |
| 24 | **Pokémon GO Community Day** (one special day a month, everyone comes) | Monthly "Talk Train Day": host, partner café coffee, press invited, a German-practice table. | ✅ |
| 25 | **Raids** (timed, local, group) | "Open a table" during a ride ("German practice, coach 5, window seats") that others on the ride can join. Was on the idea list in the November plan. | ✅ |
| 26 | **Loot boxes, gacha, paid random rewards** | No. Gambling-like, bad for trust, and the app is for talking. | ❌ |

### 2.3 From entertainment, ebook and audio apps (Spotify, Kindle, Blinkist, Audible, Readly, Libby, Podimo)

| # | What they do | How it maps to Zugpal | Fits? |
|---|---|---|---|
| 27 | **Spotify Wrapped**: a personal year review that people share; the 2023 edition made over 2 billion social media impressions ([Binghamton University](https://www.binghamton.edu/news/story/5948/why-spotify-wrapped-goes-viral-every-year-binghamton-university-experts-weigh-in)) | "Dein Zugpal-Jahr" (and a monthly mini version): rides, German words learned, games played, conversations started. Only your own numbers, no names, shareable as a picture made on the phone. | ✅ |
| 28 | **Spotify Blend**: a shared playlist for two people | The match screen already mixes shared moods into icebreakers. Add "your shared words": the German words both of you tapped. | ✅ |
| 29 | **Spotify Premium 12,99 €/month in Germany** ([heise](https://heise.de/-10530712)), ad-supported free tier | Benchmark only. No ads with tracking in Zugpal, ever. | ❌ (ads) |
| 30 | **Kindle "with Special Offers"**: lock-screen ads for a 20 $ discount ([PCWorld](https://www.pcworld.com/article/402606/amazon-kindle-or-kindle-fire-how-to-remove-ads-and-special-offers.html)) | No. "Ads in exchange for a discount" is still ads. | ❌ |
| 31 | **Blinkist and Libby through public libraries**: libraries pay, readers get it free with a library card ([mydealz on Blinkist in German libraries](https://www.mydealz.de/magazin/blinkist-pro-kostenlos-bibliothek-vpn-connect-62581)) | Partner with the Stadtbücherei Düren and Stadtbibliothek Köln: a library shelf "From your library (Onleihe)" linking to their catalogue, the library as a free "Near the station" partner, a Zugpal reading evening at the library. Libraries have budgets for exactly this. | ✅ |
| 32 | **Audible daily deal / "Story of the day"** (Audible costs 6,99 or 9,95 €/month in Germany, [t-online](https://www.t-online.de/ratgeber/deals/shopping-events/id_101297882/audible-deal-mit-prime-vorteil-hoerbuch-dienst-drei-monate-gratis-testen.html)) | "Story of the ride": one 15-minute public-domain story picked per ride, shown on the people list next to the word of the ride. Free, from the existing library. | ✅ |
| 33 | **Bundles with a phone or transport contract** (Readly, Podimo, Blinkist with telcos). Note: the Deutschlandticket cannot be bundled into other subscriptions ([DB FAQ](https://www.bahn.de/faq/ist-das-deutschland-ticket-bei-abos-inklusive)), but VRS gives Deutschlandticket holders 30 free bike minutes per trip ([VRS](https://www.vrs.de/en/tickets/ticket-assortment/germany-ticket/all-answers-about-the-deutschlandticket)), DB runs a "Vorteilswelt" for its subscribers ([bahn.de](https://www.bahn.de/faq/teilnehmen-db-benefits)) and BVG has a club with 150+ offers ([BVG](https://bvg.de/de/abos-und-tickets/bvg-club)) | Pitch "Zugpal Supporter free for a year" as a perk inside VRS / go.Rheinland Abo-Vorteile. The Verbund pays a small flat fee, their customers get the extras, Zugpal gets users. | ✅ |
| 34 | **Listen together** (shared audiobook chapter) | "Hörbuch-Abteil": two matched people start the same chapter and talk after. Nice, not urgent. | ⚠️ |
| 35 | **Podcast "presented by" sponsor read** | Already built: the sponsor slot. Keep it one sponsor per route, plain text, no tracking link. | ✅ |

### 2.4 From transport and local apps (DB Navigator, VRR/VRS, Too Good To Go, nebenan.de, Jodel, Meetup, Citymapper)

| # | What they do | How it maps to Zugpal | Fits? |
|---|---|---|---|
| 36 | **Too Good To Go**: the shop pays 39 € a year plus about 1,09 to 1,19 € per bag sold; nothing until the first sale ([Too Good To Go B2B](https://www.toogoodtogo.com/de/b2b/total-energies), [nachhaltigkeit-mit-kopf](https://nachhaltigkeit-mit-kopf.de/ernaehrung/too-good-to-go-erfahrungen/), [nomyblog](https://www.nomyblog.de/nomyblog/gastronomie/too-good-to-go-gastronomie/)) | Offer partners a second way to pay: 0,50 € per redeemed voucher instead of the flat 49 €. Shops like "pay only when it works". Counting only, no personal data. | ✅ |
| 37 | **nebenan.de**: business profiles are free ([nebenan help](https://nebenan.zendesk.com/hc/de/articles/360012193933-Die-neuen-Gewerbeprofile-kurz-f%C3%BCr-Nachbarn-erkl%C3%A4rt-NEU-)), money comes from highlighted posts and organisations | First tier free (name + opening hours on the station card), paid tier for the offer and the voucher. Free listings fill the card fast; paid ones follow. | ✅ |
| 38 | **Jodel**: only one advertiser per day, sold through one partner ([Trending Topics](https://www.trendingtopics.eu/marketing-jodel/)) | One sponsor per route per month. Scarcity makes the slot worth 250 € instead of 50 €. | ✅ |
| 39 | **Meetup**: the organiser pays a subscription, members join free (price depends on country, [Meetup help](https://help.meetup.com/hc/en-us/articles/39428296529421)) | People's own trains stay free. An organisation's train (employer, university, VHS) with its own code, poster and numbers is the paid "Partner train" (section 6). | ✅ |
| 40 | **UK "Chatty Café Scheme"**: cafés pay 60 £ a year for a "Chatter & Natter" table sign, 850+ venues ([register page](https://thechattycafescheme.co.uk/register/)) | The direct model for station cafés: a "Zugpal-Tisch" sticker on one table, 49 €/month or 399 €/year, listed in the app. Pitch: "the conversation from the train continues at your table". | ✅ |
| 41 | **Plauderbank**: cities put up "talk to me" benches against loneliness (Fürth, Rostock, Berlin, Nürnberg; Thuringia tours 16 stations in 2026, [Volksstimme](https://www.volksstimme.de/panorama/plauderbank-gegen-einsamkeit-thuringen-baut-angebot-aus-4302145), [inFranken](https://www.infranken.de/lk/fuerth/fuerth-gegen-die-einsamkeit-von-senioren-stadt-stellt-drei-plauderbaenke-auf-art-5767704)); NRW has a state page on loneliness ([land.nrw](https://www.land.nrw/einsamkeit)) | Ask Stadt Düren for a Plauderbank with a Zugpal QR on the platform or the Bahnhofsvorplatz. The city pays for the bench, Zugpal gets a permanent sign. Same for Köln. | ✅ |
| 42 | **DB Navigator**: shows shops at 80+ stations with opening hours ([bahnhof.de](https://www.bahnhof.de/entdecken/essen-einkaufen-bahnhof)) | Zugpal shows 1 to 3 partner places per station, not a directory. Less is more; partners pay for the small list. | ✅ |
| 43 | **Citymapper Pass** (own travel subscription) | No. Zugpal does not sell tickets. | ❌ |
| 44 | **Station advertising** (DB sells posters and screens via Ströer, no public prices, [bahnhof.de](https://www.bahnhof.de/entdecken/werbung); ÖBB lists 677 € per day for a digital screen, [ÖBB catalogue 2026](https://werbung.oebb.at/dam/jcr:7794769d-4526-4ae7-bcf8-538ea2d316a6/Produktkatalog_02_2026.pdf); large posters cost 4,90 to 80 € per day, [crossvertise](https://help.crossvertise.com/de/articles/7-was-kostet-plakatwerbung)) | Use this in the partner pitch: 49 € a month in Zugpal is less than one day of a station screen, and it reaches exactly the people who just got off the train. | ✅ (as argument) |

That is 44 ideas: 33 fit as they are, 4 fit with changes, 7 are a clear no.

---

## 3. Revenue streams, ranked

Ranked by realistic money in year 1 for one founder with a phone. "Built?" says what already exists in the app.

| Rank | Stream | Realistic year 1 | Effort | Built? | Who to call first |
|---|---|---|---|---|---|
| 1 | **B2B pilot with a transport body or operator** (go.Rheinland, National Express, later VRR, DB Regio) | 4.900 € (one pilot) | High: letters, meetings, a deck, proof from 8 weeks | Dashboard yes, deck no (section 6) | go.Rheinland (Köln, orders the trains), National Express Rail (Köln, runs RE 1) |
| 2 | **Founder stipend** Gründungsstipendium.NRW, 1.200 €/month up to 12 months ([IHK Bonn](https://www.ihk-bonn.de/unternehmensfoerderung/existenzgruendung/gruenderstipendiumnrw)) | 14.400 € (for you, not the company) | Medium: Ideenpapier + jury | – | IHK Aachen Gründungsnetzwerk, digitalHUB Aachen |
| 3 | **Station partners** (section 4) | 1.700 € | Medium: one afternoon of visits per week, a small build | Sponsor slot yes, partner card no | The bakery and kiosk at Düren Hbf, Stadtbücherei Düren |
| 4 | **Supporter subscription** 2,99 €/month, 19,99 €/year, extras only | 1.200 € | Low: a payment link, a code that unlocks extras | Screen yes, payment no | – |
| 5 | **Sponsor slot** "Talk Train presented by …", one per route | 1.000 € | Low: already built, flip `enabled` | Yes | A Düren business that likes the story (bakery chain, Sparkasse Düren, Stadtwerke) |
| 6 | **Employers and universities** ("Partner train" for a company or campus) | 0 to 5.800 € | Medium | Own trains yes | Forschungszentrum Jülich (commuters via Düren), RWTH Aachen (44.000+ students, [Studycheck](https://www.studycheck.de/hochschulen/rwth-aachen/studium)), TH Köln (21.000, [DAAD](https://static.daad.de/media/daad_de/pdfs_nicht_barrierefrei/infos-services-fuer-hochschulen/projektsteckbriefe/2025-05-08_inspiring_practice_th_k%C3%B6ln.pdf)), Uni Köln (47.238, [Stadt Münster statistics newsletter](https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/61_stadtentwicklung/pdf/newsletter/statistik-newsletter_2025-09-26.pdf)), FH Aachen (about 13.400, [StudySmarter](https://www.studysmarter.de/s/studiengaenge/fachhochschule-aachen/design-master/)) |
| 7 | **Prizes** (Deutscher Nachbarschaftspreis: 2.000 € per state winner, up to 10.000 € federal, [Sachsen-Anhalt press 2024](https://presse.sachsen-anhalt.de/wp-content/uploads/pdf/ministerium-fur-arbeit-soziales-gesundheit-und-gleichstellung_11_11_2024_Pressemitteilung_deutscher-nachbarschaftspreis-2024-fuer-gartenprojekt-in-nauendorf.pdf), [GdW announcement](https://www.gdw.de/uploads/pdf/Pressemeldungen/PM_17-19_Auslobung_DNP_und_PSS.pdf)) | 2.000 € | Low: one application | – | nebenan.de Stiftung (runs the prize) |
| 8 | **Foundation grants** (section 3.2) | 0 to 10.000 € | Medium to high, most need a gemeinnützig partner | – | Robert Bosch Stiftung "Vor Ort vereint" |
| 9 | **Integration, VHS, anti-loneliness programmes** | 0 to 3.000 € | Medium | German practice features yes | VHS Rur-Eifel (run by Stadt Düren, [statute](https://www.dueren.de/assets/userfiles/pdfbereich_verwaltunundpolitik/satzungen_ordnungen/s4/S4-13_VHS_Rur-Eifel.pdf)), Caritas / Diakonie / AWO Migrationsberatung Düren, Kommunales Integrationszentrum Kreis Düren |
| 10 | **Health insurers' prevention money** (§ 20 SGB V; insurers spent 8,49 € per insured person in 2023 against a legal target of 7,52 €, [HM München slides](https://mediapool.hm.edu/media/fk11/fk11_lokal/2023_/mentalhealth_1/2_dokumente_29/praesentationen_fachsymposium_2025/250314_Folien_MMH_Wagner-Krueger.pdf); almost 700 million € in total in 2024, [zm-online](https://www.zm-online.de/news/detail/krankenkassen-investieren-fast-700-millionen-euro-in-die-vorsorge); law text [§ 20 SGB V](https://www.gesetze-im-internet.de/sgb_5/__20.html)) | 0 € in year 1 | High: needs a certified prevention concept, usually through a Verein or a city | – | AOK Rheinland/Hamburg regional office, later |
| 11 | **City marketing** (Stadtmarketing Düren, KölnBusiness) | 0 to 2.000 € | Medium | QR poster yes | Stadt Düren Wirtschaftsförderung |
| 12 | **Public tenders** (loneliness strategy NRW, integration tenders) | 0 € in year 1 | High | – | Watch land.nrw/einsamkeit and the Kreis Düren |
| 13 | **White-label for other cities and countries** (a "Talk Train" for Rotterdam, Vienna, Belfast) | 0 € in year 1 | High, only after NRW works | Own trains and themes make it possible | NS (ran a Kletscoupé in 2024, [NS annual report 2024](https://open.overheid.nl/documenten/8425fd4d-7235-411f-977a-943bcb34d83c/file)), Translink (Chatty Carriages pilot, [Causeway Coast & Glens council](https://causewaycoastandglens.gov.uk/news/chatty-carriages-helping-to-build-connections-and-tackle-loneliness)) |

### 3.1 Why B2B first, even though it is slow

Transport bodies and operators have the two things Zugpal needs: permission to be on the train, and money for exactly this topic (loneliness, passenger experience, integration). go.Rheinland moved about 146 million passengers in 2024 and its weekday boardings grew to about 367.000 a day ([go.Rheinland 2024](https://wir.gorheinland.com/fileadmin/B2B/Downloads/Angebot/Verkehrsqualitaet/Fahrgastzahlen/EntwicklungFahrgastzahlen2024.pdf)). In 2020 the RE 1 alone carried about 6.900 people a day between Horrem and Köln in each direction ([Landtag NRW answer, 2020](https://kleineanfragen.de/nordrhein-westfalen/17/8955-vervollstaendigung-zur-antwort-auf-die-kleine-anfrage-3215.pdf)). A pilot costing 4.900 € is small money for them and a big step for Zugpal. But they move slowly (months). So the station partners and the stipend carry you meanwhile.

### 3.2 Grants and prizes: what fits, what does not

| Programme | Money | Fit for Zugpal | Catch |
|---|---|---|---|
| Gründungsstipendium.NRW | 1.200 €/month, up to 12 months ([IHK Bonn](https://www.ihk-bonn.de/unternehmensfoerderung/existenzgruendung/gruenderstipendiumnrw)) | Very good: you live in NRW, you are 18+, the company is younger than 12 months | You must work on Zugpal full-time; apply via a certified network with an Ideenpapier and a jury talk ([IHK Ostwestfalen](https://www.ihk.de/ostwestfalen/gruendung-und-nachfolge/unternehmensgruendung/gruendungsstipendium-nrw-6700604)) |
| Prototype Fund (Federal Ministry, open-source public-interest tech) | Up to 47.500 € for 6 months in earlier rounds ([Munich Startup](https://www.munich-startup.de/en/news/prototype-fund-foerderung-fuer-public-interest-tech)); a 2024 report mentions up to 158.000 € over 10 months for the new rounds ([netzpolitik.org](https://netzpolitik.org/2024/millionen-foerderung-fuer-open-source-prototype-fund-startet-in-die-naechste-runde/)) | Good: Zugpal's code is already public on GitHub, no tracking, privacy by design | The code needs an open-source licence file; apply as a person, show the social goal |
| Robert Bosch Stiftung "Vor Ort vereint" | 5.000 to 15.000 € for 6 to 12 months ([programme PDF](https://www.bosch-stiftung.de/sites/default/files/documents/2024-10/VOR%20ORT%20VEREINT.pdf)) | Good: "Miteinander in Gemeinden stärken" is exactly the Talk Train | Needs a gemeinnützig partner to hold the money (a Verein, the VHS, the city) |
| Deutscher Nachbarschaftspreis | 2.000 € per state winner, 10.000 / 7.000 / 5.000 € federal ([GdW](https://www.gdw.de/uploads/pdf/Pressemeldungen/PM_17-19_Auslobung_DNP_und_PSS.pdf)) | Good after 3 months of rides | Prize money must go to the project, not to you privately |
| Deutsche Bahn Stiftung "Ehrensache" | Project money for volunteering, applications once a year ([DB Stiftung](https://www.deutschebahnstiftung.de/dbs/arbeitsfelder/ehrenamt/ehrensache-13086298)) | Only via a DB employee who volunteers ([DB Stiftung funding](https://www.deutschebahnstiftung.de/dbs/foerderung)) | Find a DB employee who wants to be a Talk Train host. Then they apply. |
| EXIST Gründungsstipendium | 1.000 to 3.000 €/month depending on degree ([Förderdatenbank](https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Bund/BMWi/exist-gruendungsstipendium.html)) | Weak: needs a university as host | Only if a student or graduate from RWTH or TH Köln joins as co-founder |
| Demokratie leben! (federal) | Model projects, around 28,5 million € for 150 projects in an earlier period ([BMFSFJ](https://www.bmbfsfj.bund.de/bmbfsfj/aktuelles/alle-meldungen/bundesprogramm-startet-in-neue-foerderperiode-144400)) | Later: big, slow, needs a Verein and a consortium | Not in year 1 |
| Google.org Impact Challenge | Earlier German rounds paid 10.000 € to 100 local projects and up to 500.000 € to winners ([Google blog 2018](https://blog.google/intl/de-de/unternehmen/engagement/googleorg-impact-challenge-2018-startet/)); recent rounds are Europe-wide ([Google.org Tech for Social Good](https://blog.google/outreach-initiatives/google-org/announcing-the-googleorg-impact-challenge-tech-for-social-good/)) | Only for gemeinnützig organisations ([2016 rules](https://impactchallenge.withgoogle.com/site/static/deutschland2016/downloads/rules.pdf)) | Needs the Verein (section 7) |
| Stiftung Mercator, Deutschlandstiftung Integration | Project grants for integration and education of young migrants | Possible as a partner of the VHS or a Sprachcafé, not alone | Apply together with an established organisation |

---

## 4. Local businesses near stations: the full concept

### 4.1 The idea in one sentence

The conversation that started on the train continues at a place next to the station. The place pays Zugpal a small monthly fee to be that place. Zugpal shows it clearly as "Partner · Anzeige", counts how often it was shown and used, and never gives the partner any personal data.

### 4.2 Where it appears in the app

1. **"Near the station" card** on the check-in screen and on the people list, for the ride's start and end station (Düren, Köln Hbf, Horrem, Aachen later). 1 to 3 partner places: name, what it is (café, bakery, kiosk, bookshop, VHS, library, gym), opening hours, the offer in DE/EN/AR, a small logo from our own server. Label on the card: **"Partner · Anzeige"**.
2. **"Continue the talk"** on the match screen: "Continue at Café X by the exit. Show this screen for a free coffee." Both people see the same offer. It is a suggestion, never a push notification.
3. **Voucher** on the match screen and on the end-of-ride screen: "2 coffees for the price of 1 at Café X, today only". The user taps "I used it" (or the staff types a 4-digit shop PIN on the user's phone). This counts one redemption. It is not perfect, and it does not need to be. Partners understand a counter.
4. **"Talk Train presented by …"** stays the top slot (already built, one sponsor per route).
5. **Host's meeting point**: the host says "we meet at the Zugpal-Tisch at Café X after the ride" (host announcement).
6. **Poster footer** on `qr.html`: "Partner: Café X, Düren Hbf" in small print.
7. **Partner sticker** for the shop window and one table: "Zugpal-Tisch. Hier reden Leute." (like the UK Chatty Café table sign).

### 4.3 Does it respect the rules?

- Not dating: the offer goes to both matched people as a pair of equals and to everyone on the ride. No "treat your date".
- Nothing core is paid: the card is extra information, nothing in waving, chat or safety changes.
- No tracking: no third-party pixel, no tracking link, no location. The app counts "card shown" and "voucher used" per day per partner in our own database and shows totals.
- GDPR: partners see numbers only, groups under 20 are hidden, exactly like the partner dashboard today.
- 18+: alcohol offers are not allowed as the voucher (coffee, tea, bread, a book, a course, a day pass).

### 4.4 Which partners exist for real

Düren Hbf (address Hauptbahnhof 1): the station has a newsagent that doubles as a ticket counter and a small café with baked goods ([Eifel Tourismus](https://eifel.info/en/a-bahnhof-dueren)); a bakery is listed at Hauptbahnhof 1 ([Cylex directory](https://web2.cylex.de/suche/geb%C3%A4ck/Dueren)); the Bahnhofsvorplatz and Josef-Schregel-Straße have cafés, Turkish and Asian places and a McDonald's. Public partners: Stadtbücherei Düren, VHS Rur-Eifel, Kommunales Integrationszentrum Kreis Düren. Walk the Vorplatz once with the flyer and write every shop down.

Köln Hbf: DB lists Starbucks, backWERK, Brezelbäckerei Ditsch, Tchibo and Rossmann Express in the station ([bahnhof.de Köln Hbf](https://www.bahnhof.de/koeln-hbf/einkaufen-und-essen)); Kamps has had kiosks on the platforms since 2019 ([SSP press release](https://foodtravelexperts.com/international/wp-content/uploads/2019/10/Pressemitteilung-de_Kamps-KioskeCologne.pdf)). The chains decide in head offices, so start with independent cafés in the streets around the station (Breslauer Platz side, Eigelstein). **Bäckerei Merzenich** is a Köln company with about 70 branches in Köln, Leverkusen and Düren ([Creditreform](https://firmeneintrag.creditreform.de/50735/5190011810/MERZENICH_BAECKEREIEN_GMBH)): one deal could cover both ends of the Talk Train. Mayersche's big shop is at Neumarkt, not at the station ([koeln.de](https://www.koeln.de/koeln/einkaufen/zentrum)), so a bookshop partner in Köln is a longer walk; in Düren ask the local bookshops on the Wirtelstraße.

Horrem and Aachen: visit on foot once the Düren partners run.

### 4.5 Price list

| Package | Price | What is in it |
|---|---|---|
| **Listing** (free) | 0 € | Name, type, opening hours on the station card. 1 free place per station, first come. Fills the card and gives you a reference. |
| **Partner** | 49 €/month, cancel monthly | Listing + offer text in 3 languages + voucher + logo + sticker set + monthly numbers by email (shown, used). First month free. |
| **Partner quarter** | 129 € per quarter (about 43 €/month) | Same, paid in advance. |
| **Partner year** | 399 € per year (about 33 €/month) | Same, plus named in the poster footer. |
| **Route sponsor** "Talk Train presented by …" | 250 €/month, one per route | The top slot on the Talk Train screen, the host mentions you, a line in every press text. |
| **Pay per use** (alternative for sceptics) | 0 € fixed + 0,50 € per redeemed voucher, billed monthly, capped at 49 € | Like Too Good To Go: they pay only when it works. |

Why these numbers: a Pokémon GO stop cost a small business 30 $ a month ([TechCrunch](https://techcrunch.com/?p=1908951)), the UK Chatty Café table costs 60 £ a year ([Chatty Café Scheme](https://thechattycafescheme.co.uk/register/)), a station screen costs hundreds of euros per day ([ÖBB catalogue](https://werbung.oebb.at/dam/jcr:7794769d-4526-4ae7-bcf8-538ea2d316a6/Produktkatalog_02_2026.pdf)). 49 € is "one coffee a day". Raise the price when the Talk Train has over 20 riders per ride.

### 4.6 What partners get, and what they never get

They get: the place on the card, a monthly PDF with three numbers (card shown, voucher opened, voucher used), the sticker set, a mention by the host and in the poster footer, and the story ("we support people talking to each other").

They never get: names, ages, genders, photos, languages, phone numbers, email addresses, which person came, when exactly, or how often one person came. No export, no pixel, no link with a tracking code. If a partner asks for "the data", the answer is: "There is none. We only count."

### 4.7 How to pitch in person (60 seconds, German)

> „Guten Tag, ich bin Husam aus Düren. Ich mache Zugpal, eine kleine App für den Zug: Leute, die im RE 1 nach Köln fahren, können sich darüber kennenlernen und reden, ohne Dating, ohne Werbung-Tracking. Jeden Dienstag fährt unser Talk Train ab Düren. Die Leute steigen hier aus und sehen in der App: ‚Weiterreden bei …‘ mit einem kleinen Gutschein. Ich suche genau einen Partner hier am Bahnhof. Der erste Monat ist kostenlos, danach 49 € im Monat, monatlich kündbar. Sie bekommen jeden Monat die Zahlen: wie oft Sie angezeigt wurden und wie oft der Gutschein genutzt wurde. Keine Daten von Personen, nur Zahlen. Darf ich Ihnen den Flyer dalassen und nächste Woche kurz vorbeikommen?“

Three tips: go between 10 and 11 in the morning (after the rush), ask for the owner by name, leave the flyer (`docs/FLYER-PARTNER-DE.md`) and come back in person, not by email.

### 4.8 Data we must not collect

- No tracking pixels, no third-party scripts, no "click-through" links with partner codes.
- No location from the phone. The station comes from the ride (`from`/`to`), nothing else.
- Counters are per partner per day, never per person. Below 20 shown in a month, the partner report says "under 20".
- No photos of people in the shop for marketing without written consent.
- Partners sign that they will not ask riders for contact details to "register" the voucher.

### 4.9 Legal wording

Paid placement must be clearly marked as advertising. Since 14 May 2024 the duty to mark commercial communication is in § 6 DDG (before: § 6 TMG), and hidden advertising is unfair under § 5a UWG ([WBS.Legal](https://www.wbs.legal/taetigkeitsgebiete/werbung/schleichwerbung-wann-muss-werbung-wie-gekennzeichnet-werden/)). Courts accept "Anzeige" or "Werbung"; "Sponsored" alone can be a problem ([RA Plutte](https://www.ra-plutte.de/schleichwerbung-sponsored-hinweis-reicht-nicht-aus/)). So every partner card and the sponsor slot carry the word **"Anzeige"** (EN "Ad", AR "إعلان") next to "Partner". Add to `datenschutz.html`: "Partner places are paid placements. Partners receive counts only, never personal data." A one-page "Partnerbedingungen" (what they get, price, cancellation, the no-personal-data rule, no alcohol or tobacco offers, we may remove a partner after a complaint) is enough as the contract.

### 4.10 Technical note (for a later Claude Code session, no code now)

- Table `public.partners`: `id`, `station` (text key like `dueren`, `koeln-hbf`), `name`, `kind` (cafe, bakery, kiosk, bookshop, vhs, library, gym, other), `offer` (jsonb de/en/ar), `hours`, `logo` (file path in repo folder `partners/`, never an external URL), `tier` (listing, partner, sponsor), `active_from`, `active_until`, `pin_hash` (bcrypt, for staff redemption), `created_at`. Read by everyone (RLS select on active rows only), written by nobody through the API (Husam edits via migrations or a `private` function).
- Table `private.partner_counts`: `partner_id`, `day`, `shown`, `opened`, `redeemed`. Incremented by `public.partner_event(partner_id, kind)` (security definer, revoked from `PUBLIC` and `anon`, rate-limited: one `redeemed` per user per partner per day, checked in `private`).
- Function `public.near_station(station text)` returns active partners for the station: no personal data, so it may be `stable` and cached on the phone with the ride cache.
- Function `public.partner_report(code text)` for the partner (bcrypt code like the partner dashboard): monthly sums, groups under 20 hidden. Reuse `partner/dashboard.html` with a "Partner place" view.
- UI: a card `nearStation(station)` in `src/screens.js` on check-in, people list, match screen and the end-of-ride screen; label `t("partnerAd")` = "Partner · Anzeige" in three languages; voucher sheet with "I used it" and the PIN field; the station comes from `rideInfo()` (`from` at check-in, `to` at the end). `qr.html?partner=ID` prints the footer. Demo mode: the example "Café am Gleis" from `SPONSOR` in `src/sponsor.js` becomes the demo partner. Tests in `tests/partners.spec.js`. After the build run `node tools/update-sw.js`.
- Cleanup: `private.cleanup()` deletes `partner_counts` rows older than 400 days.

---

## 5. Marketing and user growth, month by month

Reality check first: Zugpal only works when enough people are on the same train at the same time. That is why everything below points at one train (RE 1, Tuesday 07:42 from Düren) and one coach. Thirty people who know each other's faces beat 3.000 downloads spread over NRW.

### 5.1 Who to ask for permission

- **National Express Rail GmbH** (Köln) runs the RE 1. Ask for: a host on board (they ride with a normal ticket), small QR stickers in one coach, one A4 poster per ride, a photo permission. Offer: their logo on the poster as "with the friendly support of", first numbers for their customer newsletter.
- **go.Rheinland** (Köln) orders and pays the regional trains in the Rhineland and publishes the passenger numbers. Ask for a meeting after 8 weeks of rides. They are the first B2B customer (section 6).
- **DB InfraGO / DB Station&Service** owns the stations. Posters on the platform need their advertising partner (Ströer). Posters in the partner shops and on the Plauderbank do not.
- **Stadt Düren** (Bürgermeister's office, Integrationsbeauftragte, Stadtmarketing): a Plauderbank with the Zugpal QR at the station, the Stadtbücherei as partner, the Stadtfest.

### 5.2 Month by month

**Month 1 (November 2026): permission and friends**
- Send the three letters (National Express, go.Rheinland, Stadt Düren). Attach the one-pager (section 6.2).
- Ride every Tuesday 07:42 with 4 to 6 friends as normal passengers. Check in, wave, play, use the dashboard. Fix what breaks.
- Finish the "Near the station" build (section 4.10) and visit 5 shops at Düren Hbf with the flyer. Goal: 1 free listing, 1 paying partner from December.
- Set up Instagram and TikTok (@zugpal), post 3 times a week (section 5.4). Register the domain and finish the email setup (`docs/EMAIL-SETUP.md`).
- Register as Kleinunternehmer at the Stadt Düren Gewerbeamt (section 7).

**Month 2 (December 2026): launch the Talk Train for real**
- First public Talk Train on the first Tuesday of December. Host on board (you). A4 poster in coach 5, QR stickers, the German word of the ride on a card.
- Press release to Dürener Zeitung, Dürener Nachrichten, Aachener Zeitung and WDR Lokalzeit Aachen: "Dürener Übersetzer startet Plauder-Zug nach Köln". Invite a journalist to ride along on week 2.
- Christmas season: "Winterwörter" theme, a Talk Train Day with Glühwein-free coffee at the partner café after the ride.
- Visit VHS Rur-Eifel, Caritas and Diakonie Migrationsberatung, the Sprachcafés in Düren: hand them 20 flyers each for their German learners. Pitch: free German practice with real people on the way to Köln.

**Month 3 (January 2027): students and the first numbers**
- Universities are back. Flyer at Aachen Hbf and Köln Hbf on Monday mornings (students from RWTH, FH Aachen, TH Köln and Uni Köln ride the RE 1 and RB 20). Ask the ASten and the international offices to share the "Invite a friend" link.
- First "Dein Zugpal-Monat" picture for every rider (idea 27) as social content.
- Apply for the Gründungsstipendium.NRW with 8 weeks of numbers.
- Second paying partner, first Köln partner.

**Month 4 (February 2027): Karneval and women-only**
- Karneval special rides on the RE 1 (the whole region rides to Köln). A "Jeck im Zug" word list. Expect new users, keep them with the Tuesday train.
- Test one women-only Talk Train in the evening with a female host. Decide with the riders if it stays.
- Apply to Robert Bosch "Vor Ort vereint" together with the VHS or a Düren Verein.
- Meeting with go.Rheinland: show 12 weeks of numbers, offer the Pilot package.

**Month 5 (March 2027): second train, first B2B**
- Add a second time (e.g. Thursday 17:12 back from Köln) or a second line (RB 20 Düren → Aachen for the Jülich and Aachen commuters).
- Employer pilot: Forschungszentrum Jülich and the Kreisverwaltung Düren have thousands of commuters. Offer the "Partner train" for a quarter.
- Press round 2 with real numbers: "So viele Gespräche in 12 Wochen".

**Month 6 (April 2027): decide**
- Look at the numbers (section 5.5). If "it works": sign the go.Rheinland pilot, add Horrem and Aachen partners, apply for the Nachbarschaftspreis, plan a second city. If "stop": keep the Tuesday train with friends, stop spending money, and write down what you learned.

### 5.3 Weekly founder routine (1 hour a day)

| Day | What you do |
|---|---|
| Monday | Read the dashboard numbers (riders, waves, matches, mood). Post the week's teaser ("Dienstag 07:42, Wagen 5, Wort der Fahrt: …"). |
| Tuesday | Ride the Talk Train as host. Take 2 photos (no faces without consent). Send the host announcement. Collect one sentence from one rider. |
| Wednesday | Visit one shop or office in person (partner, VHS, Caritas, city). 30 minutes. |
| Thursday | Make one short video: the German word of the ride in DE and AR, 20 seconds. |
| Friday | Write 2 emails to institutions (go.Rheinland, National Express, a university office, a foundation). Follow up on last week's two. |
| Saturday | A community event when there is one (Stadtfest, Sprachcafé, Plauderbank opening). Otherwise rest. |
| Sunday | Plan the week in 20 minutes. Cut one Reel from Tuesday. |

### 5.4 Social media that fits Zugpal (DE and AR)

- **"Ich habe im Zug mit einem Fremden geredet"**: 30-second talking-head clips after the ride, in German and in Arabic. Honest, no actors.
- **Before/after mood** from the dashboard: "Vor der Fahrt 2,8, nach der Fahrt 3,9" as a simple card. Numbers only.
- **Word of the ride** every day: the word, the meaning in three languages, the sound. 36 words exist in `WORDS`, that is 7 weeks of daily posts.
- **Games as content**: "Zugwort des Tages" grid, "Quizfahrt: Leben in Deutschland" one question a day, a 15-second dama trick.
- **The host diary**: one line per ride, "Dienstag 12: 11 Leute, 3 Matches, ein Schachspiel bis Horrem".
- **Arabic community**: Arabic-speaking commuters in Düren (the city had about 18 % foreign citizens, [Uni Bonn document, undated](https://epflicht.ulb.uni-bonn.de/download/pdf/565106); current figures in the [IT.NRW profile](https://statistik.nrw/sites/default/files/municipalprofiles/l05358008.pdf)) are your first loyal group. Post the same clip in both languages. Zugpal is "practise German with a real person" for them.
- Never: faces of riders without written consent, names, screenshots of chats.

### 5.5 What to measure, and what the numbers mean

The partner dashboard already counts checked-in riders, waves, matches, mood before and after and "would recommend". Add 4-week retention (came back within 4 weeks, numbers only).

| Number | "It works" after 12 weeks | "Stop or change" |
|---|---|---|
| Riders checked in per Talk Train | 8 or more on average | under 4 for 4 weeks in a row |
| Share of riders who wave at least once | 30 % or more | under 10 % |
| Matches per ride | 1 or more | 0 in most rides |
| Mood after minus mood before (1 to 5) | +0,5 or more | 0 or negative |
| 4-week retention | 25 % or more come back | under 10 % |
| Would recommend | 60 % or more | under 30 % |
| Safety | every report answered within 24 h | one report unanswered |

If the numbers are in the middle, change one thing at a time (time of day, coach, host style, theme) and measure again for 4 weeks.

### 5.6 Referral without the dating feel

- "Invite a friend" already exists (share link and QR). Add a reason to use it: "Bring someone to the Talk Train. You both get the 'Brachte jemanden mit' badge." Positive-only badges, like the existing ones.
- Every partner café gets the QR on the table. Every host carries 10 small cards.
- Ask every institution (VHS, Caritas, ASten) for one post with the link, not for money.

### 5.7 Press list

Dürener Zeitung and Dürener Nachrichten (local, want the "Dürener gründet" story), Aachener Zeitung / Aachener Nachrichten (Aachen students), Kölner Stadt-Anzeiger and Express (Köln angle: "Plauder-Zug kommt nach Köln"), WDR Lokalzeit Aachen (TV, loves a ride-along), Radio Rur, Radio Köln, WDR Cosmo (Arabic-speaking audience). Send a short German text with 3 numbers and 2 photos, and offer a ride-along.

---

## 6. Pitch materials

### 6.1 The 10-slide partner deck (go.Rheinland, VRR, NVR, National Express)

1. **Title**: "Talk Train: Menschen reden im Zug. Zugpal macht den Anfang." One photo of coach 5.
2. **The problem**: one in six people in Germany feels lonely ([Einsamkeitsbarometer 2024](https://www.bmbfsfj.bund.de/einsamkeitsbarometer)); 46 % of young adults moderately or strongly ([Bertelsmann 2024](https://www.evangelisch.de/inhalte/237315/16-12-2024/bertelsmann-studie-einsamkeit-unter-jungen-menschen-verbreitet)). Commuters sit next to each other in silence for 45 minutes.
3. **The science**: Chicago commuters who talked to a stranger enjoyed the ride more, but predicted the opposite ([Epley & Schroeder 2014](https://www.labmanager.com/mom-was-wrong-you-should-talk-to-strangers-13225)). The fear is the problem, not the wish.
4. **What worked before**: NS ran a "kletscoupé" with a hostess for young people in 2024 ([NS annual report 2024](https://open.overheid.nl/documenten/8425fd4d-7235-411f-977a-943bcb34d83c/file)); Translink's Chatty Carriages with a loneliness network ([Causeway Coast & Glens](https://causewaycoastandglens.gov.uk/news/chatty-carriages-helping-to-build-connections-and-tackle-loneliness)); Plauderbänke in dozens of German cities ([Volksstimme](https://www.volksstimme.de/panorama/plauderbank-gegen-einsamkeit-thuringen-baut-angebot-aus-4302145)). Hosted and scheduled works; always-on apps died.
5. **Zugpal**: the private mutual wave takes away the fear. Hosted weekly Talk Train. German practice built in. Not dating. Free for riders.
6. **Safety and privacy**: blurred photos, chat-only default, women-only, report in 24 h, data in Frankfurt, no tracking, numbers only for partners. Show the dashboard.
7. **Our numbers so far**: riders per ride, waves, matches, mood before/after, recommend %. (From the dashboard, after 8 to 12 weeks.)
8. **Why the RE 1**: fastest-growing line in the go.Rheinland area, +18 % in 2024 ([go.Rheinland](https://wir.gorheinland.com/fileadmin/B2B/Downloads/Angebot/Verkehrsqualitaet/Fahrgastzahlen/EntwicklungFahrgastzahlen2024.pdf)); students from four universities; Düren and Köln at both ends.
9. **What you get**: a Talk Train with your name on it, a monthly anonymous report, a story for your newsletter and press, a loneliness and integration measure you can show the Land. Three packages (6.3).
10. **Ask**: "Pilot package from January: 12 rides, one line, 4.900 €. Decision by December."

Make it in PowerPoint or Canva from these 10 lines; one picture per slide, big numbers, no paragraphs.

### 6.2 Employer one-pager (Forschungszentrum Jülich, Kreisverwaltung, Sparkasse, hospitals)

Headline: "Ihre Pendler kommen entspannter an." Three lines of science (Epley & Schroeder, mood numbers). What it is: a "Partner train" with your company's code (`#train-CODE`), poster for the Schwarzes Brett, group chat per ride, German practice for international staff, numbers only for HR. Price: Partner train 2.900 € per quarter (6.3). Small print: no personal data, employees join voluntarily, 18+.

### 6.3 Three B2B packages

| Package | Price | What is in it |
|---|---|---|
| **Pilot** | 4.900 € once (3 months) | One line, one weekly Talk Train (12 rides), trained host on board, A4 posters and stickers, partner dashboard access, final report with numbers, press text with your name. |
| **Line** | 14.900 € per year | One line, weekly all year (about 46 rides), two hosts, a monthly report, seasonal themes, a "presented by" slot for you or your sponsor, a Talk Train Day per quarter. |
| **Network** | 39.000 € per year | Up to 4 lines or 4 companies/campuses, own trains with your codes, your colours in the app (white-label light), group chats for your events, quarterly report and one presentation to your board, first right to new cities. |
| Add-on **Partner train** (employer, university) | 2.900 € per quarter | A train with your code, poster, group chat, numbers for HR. |

Why these prices: one host ride costs you about 3 hours and a ticket; 12 rides plus posters plus the report is roughly 60 hours of work. Compare: a single Plauderbank costs a city a few thousand euros and reaches one park; a station screen costs hundreds per day ([ÖBB catalogue](https://werbung.oebb.at/dam/jcr:7794769d-4526-4ae7-bcf8-538ea2d316a6/Produktkatalog_02_2026.pdf)). Negotiate down to 3.500 € for the first pilot if they sign in 2026.

---

## 7. Legal and money basics in Germany (short)

- **Start as Kleinunternehmer** (sole trader, Einzelunternehmen). Register at the Gewerbeamt of Stadt Düren (a few tens of euros). Since 2025 you stay Kleinunternehmer up to 25.000 € turnover in the previous year and 100.000 € in the current year, both net ([IHK Köln](https://www.ihk.de/koeln/hauptnavigation/recht-steuern/steuern/kleinunternehmer-im-umsatzsterrecht-5695056)). You write invoices without VAT and add the sentence "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet." Simple, cheap, enough for year 1.
- **UG (haftungsbeschränkt)** later, when B2B money comes or a co-founder joins: limited liability, 1 € capital, setup about 300 to 1.000 € for notary and register ([sevdesk](https://sevdesk.de/ratgeber/gruenden/rechtsformen/ug-gruenden/)). A quarter of the profit must be saved until 25.000 € (then it becomes a GmbH).
- **Gemeinnützig (e.V., gUG, gGmbH)**: most foundations and prizes (Bosch, Google.org, Nachbarschaftspreis money) pay only to gemeinnützig bodies. Two ways: found a small Verein "Zugpal Freunde e.V." (7 members, a Satzung, the Finanzamt's Freistellungsbescheid) that runs the Talk Train events and takes grants, while the Kleinunternehmer sells partner places and B2B. Or, faster: let an existing Verein (a Düren Sprachcafé, the Stadtsportbund, a Caritas project) be the "Träger" of the Talk Train grant and pay you as a service provider. Ask the Ehrenamtsbüro Düren which Verein would do that.
- **Impressum and AGB**: `impressum.html` exists. For paid partners add "Partnerbedingungen" (section 4.9). For Supporters add simple terms (price, cancellation any time, what the extras are, no refund for the current month) and a Widerruf note, because they are consumers.
- **Invoicing**: every invoice needs your name and address, the partner's name and address, date, a running invoice number, what was sold and the period, the amount, the Kleinunternehmer sentence, your tax number. A free tool or a Word template is fine. Keep every invoice 10 years.
- **VAT**: none while Kleinunternehmer. If you grow past the limits, 19 % goes on top of partner invoices (B2B partners get it back, so keep "net" prices in the list).
- **Income tax**: the stipend and the profit are taxed as your income; put 25 % aside.
- **Datenschutz when partners pay**: add one paragraph to `datenschutz.html`: partner places are paid, partners receive counts only, no personal data ever leaves Zugpal. Nothing else changes, because nothing new is collected about people.
- **Insurance**: for the hosted rides, ask the operator's permission letter to say that hosts ride as normal passengers. A small Betriebshaftpflicht (a few hundred euros a year) once events happen off the train.
- **Payments for Supporters without third-party scripts**: use a payment link page outside the app (for example a Stripe Payment Link or a Steady page), then enter a code in the app that unlocks the extras. The app itself keeps loading only our own files.

---

## 8. Ideas to say no to

| Idea | Why no |
|---|---|
| Paywall waves, chat, photos or safety | The whole product is "no fear of rejection". A paywall adds fear of cost and makes the free users second class. Also decided in `CLAUDE.md`. |
| Ads with tracking, ad networks, pixels | Breaks the privacy promise, needs cookie banners and a third-party script, kills the partner pitch to public bodies. The sponsor slot and partner card are enough and are honest. |
| Selling or sharing data, "insights" for partners | Nothing to sell: Zugpal deletes check-ins after the ride. Partners get counts, nothing else. |
| Dating pivot ("just add a date mode") | Kills the women-only trust, the VHS and Caritas channel, the B2B story, and brings Zugpal into a market with Tinder, Bumble and Hinge. |
| Boosts, Spotlight, paid "be seen first" | Unfair on a train with 15 people; feels like dating. |
| Loot boxes, gambling-style rewards, paid random packs | Trust and 18+ problems, and the games are there to start conversations, not to make money. |
| Alcohol or tobacco vouchers from partners | Public-body partners and the integration angle do not mix with it. Coffee, bread, books, courses. |
| Growth hacks: contact import, "find your friends", notifications with names | Contact import is a privacy problem, names in notifications were removed on purpose. |
| Building the native app now | Expensive, slow, and the web app is enough to prove the Talk Train. Native comes when a partner pays for Bluetooth "someone in your coach". |
| Always-on nationwide launch | The reason Bumped.in, Train Yarn and the others died: too few people per train. One line, one time, one coach. |

---

## 9. Checklist for the next 14 days

- [ ] Letters to National Express, go.Rheinland, Stadt Düren (use section 6.2 as the attachment)
- [ ] Gewerbeanmeldung as Kleinunternehmer
- [ ] Domain and email setup finished (`docs/EMAIL-SETUP.md`)
- [ ] Ask Claude Code to build the "Near the station" partner card (section 4.10)
- [ ] Print 20 flyers (`docs/FLYER-PARTNER-DE.md`) and 2 A4 posters (`qr.html`)
- [ ] Visit 5 shops at Düren Hbf on a weekday at 10:00
- [ ] First Tuesday 07:42 ride with friends, read the dashboard afterwards
- [ ] Instagram and TikTok accounts, first 3 posts (word of the ride)
- [ ] Call the IHK Aachen about the Gründungsstipendium.NRW

---

## 10. All sources

Research and loneliness: [Epley & Schroeder 2014 (Lab Manager)](https://www.labmanager.com/mom-was-wrong-you-should-talk-to-strangers-13225) · [Einsamkeitsbarometer 2024](https://www.bmbfsfj.bund.de/einsamkeitsbarometer) · [Bertelsmann 2024 on young adults](https://www.evangelisch.de/inhalte/237315/16-12-2024/bertelsmann-studie-einsamkeit-unter-jungen-menschen-verbreitet) · [NS Jaarverantwoording 2024](https://open.overheid.nl/documenten/8425fd4d-7235-411f-977a-943bcb34d83c/file) · [Translink Chatty Carriages](https://causewaycoastandglens.gov.uk/news/chatty-carriages-helping-to-build-connections-and-tackle-loneliness) · [Plauderbank Thüringen](https://www.volksstimme.de/panorama/plauderbank-gegen-einsamkeit-thuringen-baut-angebot-aus-4302145) · [Plauderbank Fürth](https://www.infranken.de/lk/fuerth/fuerth-gegen-die-einsamkeit-von-senioren-stadt-stellt-drei-plauderbaenke-auf-art-5767704) · [NRW Einsamkeit](https://www.land.nrw/einsamkeit) · [Chatty Café Scheme](https://thechattycafescheme.co.uk/register/)

Transport: [go.Rheinland Fahrgastzahlen 2024](https://wir.gorheinland.com/fileadmin/B2B/Downloads/Angebot/Verkehrsqualitaet/Fahrgastzahlen/EntwicklungFahrgastzahlen2024.pdf) · [Landtag NRW RE 1 figures 2020](https://kleineanfragen.de/nordrhein-westfalen/17/8955-vervollstaendigung-zur-antwort-auf-die-kleine-anfrage-3215.pdf) · [Deutschlandticket 63 € (ZDF)](https://www.zdfheute.de/politik/deutschlandticket-dticket-verkehr-nahverkehr-preis-erhoehung-100.html) · [DB: Deutschlandticket not bundled](https://www.bahn.de/faq/ist-das-deutschland-ticket-bei-abos-inklusive) · [VRS perks](https://www.vrs.de/en/tickets/ticket-assortment/germany-ticket/all-answers-about-the-deutschlandticket) · [DB Vorteilswelt](https://www.bahn.de/faq/teilnehmen-db-benefits) · [BVG Club](https://bvg.de/de/abos-und-tickets/bvg-club) · [bahnhof.de shops](https://www.bahnhof.de/entdecken/essen-einkaufen-bahnhof) · [bahnhof.de Köln Hbf](https://www.bahnhof.de/koeln-hbf/einkaufen-und-essen) · [bahnhof.de advertising](https://www.bahnhof.de/entdecken/werbung) · [ÖBB advertising catalogue 2026](https://werbung.oebb.at/dam/jcr:7794769d-4526-4ae7-bcf8-538ea2d316a6/Produktkatalog_02_2026.pdf) · [crossvertise poster prices](https://help.crossvertise.com/de/articles/7-was-kostet-plakatwerbung)

Apps: [Bumble For Friends (App Store DE)](https://apps.apple.com/DE/app/id6444040977) · [Bumble help](https://bumble.com/help/tengo-que-pagar-por-bumble-for-friends) · [Bumble prices (giga)](https://www.giga.de/artikel/bumble-kosten-im-ueberblick-das-geht-kostenlos/) · [Hinge prices (giga)](https://www.giga.de/artikel/hinge-kosten-und-funktionen-der-neuen-dating-app/) · [Hinge One More Hour](https://www.marketingdive.com/news/hinge-dating-app-one-more-hour-social-initiative-gen-z-marketing/701848/) · [One More Hour France](https://www.globaldatinginsights.com/news/hinge-expands-one-more-hour-initiative-to-france/) · [Tinder events (ITV)](https://www.itv.com/news/2026-10-19/singletons-want-to-meet-in-real-life-were-embracing-that-says-tinder-boss) · [Dating app events (Event Marketer)](https://www.eventmarketer.com/article/6-dating-app-events-to-win-back-gen-z-users/) · [Axios on app fatigue](https://www.axios.com/2026/05/13/singles-events-dating-app-fatigue) · [Duolingo A/B tests](https://econsultancy.com/six-a-b-tests-used-by-duolingo-to-tap-into-habit-forming-behaviour/) · [Duolingo streaks (Lenny)](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks) · [Super Duolingo DE price](https://apps.apple.com/DE/app/id570060128) · [chess.com prices](https://pinclair.de/en-us/blogs/news/chess-com-kosten) · [Lichess features](https://lichess.org/features) · [Lichess 2025 update](https://lichess.org/@/Lichess/blog/lichess-end-of-year-update-2025/YRiNKoaQ) · [NYT Games help](https://thenewyorktimeshelpcenter.helpjuice.com/360011158491-New-York-Times-Games/360052272251-New-York-Times-Games-Subscription) · [Pokémon GO sponsored stops](https://techcrunch.com/?p=1908951) · [Pokémon GO cost per visit](https://pymnts.com/news/2017/niantic-charges-pokemon-go-sponsors-up-to-50-cents-per-visitor) · [Spotify Wrapped impressions](https://www.binghamton.edu/news/story/5948/why-spotify-wrapped-goes-viral-every-year-binghamton-university-experts-weigh-in) · [Spotify price DE](https://heise.de/-10530712) · [Kindle ads](https://www.pcworld.com/article/402606/amazon-kindle-or-kindle-fire-how-to-remove-ads-and-special-offers.html) · [Blinkist via libraries](https://www.mydealz.de/magazin/blinkist-pro-kostenlos-bibliothek-vpn-connect-62581) · [Audible prices](https://www.t-online.de/ratgeber/deals/shopping-events/id_101297882/audible-deal-mit-prime-vorteil-hoerbuch-dienst-drei-monate-gratis-testen.html) · [Too Good To Go B2B](https://www.toogoodtogo.com/de/b2b/total-energies) · [Too Good To Go fees](https://nachhaltigkeit-mit-kopf.de/ernaehrung/too-good-to-go-erfahrungen/) · [nebenan.de business profiles](https://nebenan.zendesk.com/hc/de/articles/360012193933-Die-neuen-Gewerbeprofile-kurz-f%C3%BCr-Nachbarn-erkl%C3%A4rt-NEU-) · [Jodel ads](https://www.trendingtopics.eu/marketing-jodel/) · [Meetup pricing](https://help.meetup.com/hc/en-us/articles/39428296529421)

Money and law: [Gründungsstipendium.NRW (IHK Bonn)](https://www.ihk-bonn.de/unternehmensfoerderung/existenzgruendung/gruenderstipendiumnrw) · [conditions (IHK Bochum)](https://www.ihk.de/bochum/hauptnavigation/branchenbetreuung/dienstleistung/kultur-und-kreativwirtschaft/gruenderstipendium-nrw-6632932) · [application (IHK Ostwestfalen)](https://www.ihk.de/ostwestfalen/gruendung-und-nachfolge/unternehmensgruendung/gruendungsstipendium-nrw-6700604) · [EXIST](https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Bund/BMWi/exist-gruendungsstipendium.html) · [Prototype Fund (Munich Startup)](https://www.munich-startup.de/en/news/prototype-fund-foerderung-fuer-public-interest-tech) · [Prototype Fund (netzpolitik)](https://netzpolitik.org/2024/millionen-foerderung-fuer-open-source-prototype-fund-startet-in-die-naechste-runde/) · [Bosch Vor Ort vereint](https://www.bosch-stiftung.de/sites/default/files/documents/2024-10/VOR%20ORT%20VEREINT.pdf) · [Nachbarschaftspreis 2024](https://presse.sachsen-anhalt.de/wp-content/uploads/pdf/ministerium-fur-arbeit-soziales-gesundheit-und-gleichstellung_11_11_2024_Pressemitteilung_deutscher-nachbarschaftspreis-2024-fuer-gartenprojekt-in-nauendorf.pdf) · [Nachbarschaftspreis federal prizes](https://www.gdw.de/uploads/pdf/Pressemeldungen/PM_17-19_Auslobung_DNP_und_PSS.pdf) · [DB Stiftung](https://www.deutschebahnstiftung.de/dbs/foerderung) · [DB Stiftung Ehrensache](https://www.deutschebahnstiftung.de/dbs/arbeitsfelder/ehrenamt/ehrensache-13086298) · [Demokratie leben!](https://www.bmbfsfj.bund.de/bmbfsfj/aktuelles/alle-meldungen/bundesprogramm-startet-in-neue-foerderperiode-144400) · [Google.org 2018](https://blog.google/intl/de-de/unternehmen/engagement/googleorg-impact-challenge-2018-startet/) · [Google.org Tech for Social Good](https://blog.google/outreach-initiatives/google-org/announcing-the-googleorg-impact-challenge-tech-for-social-good/) · [Google.org 2016 rules](https://impactchallenge.withgoogle.com/site/static/deutschland2016/downloads/rules.pdf) · [§ 20 SGB V](https://www.gesetze-im-internet.de/sgb_5/__20.html) · [prevention spending 2023](https://mediapool.hm.edu/media/fk11/fk11_lokal/2023_/mentalhealth_1/2_dokumente_29/praesentationen_fachsymposium_2025/250314_Folien_MMH_Wagner-Krueger.pdf) · [prevention spending 2024](https://www.zm-online.de/news/detail/krankenkassen-investieren-fast-700-millionen-euro-in-die-vorsorge) · [Kleinunternehmer 2025 (IHK Köln)](https://www.ihk.de/koeln/hauptnavigation/recht-steuern/steuern/kleinunternehmer-im-umsatzsterrecht-5695056) · [UG costs](https://sevdesk.de/ratgeber/gruenden/rechtsformen/ug-gruenden/) · [Advertising labels § 6 DDG / § 5a UWG](https://www.wbs.legal/taetigkeitsgebiete/werbung/schleichwerbung-wann-muss-werbung-wie-gekennzeichnet-werden/) · ["Sponsored" is not enough](https://www.ra-plutte.de/schleichwerbung-sponsored-hinweis-reicht-nicht-aus/)

Places and people: [Düren station (Eifel Tourismus)](https://eifel.info/en/a-bahnhof-dueren) · [bakery at Düren Hbf (Cylex)](https://web2.cylex.de/suche/geb%C3%A4ck/Dueren) · [Kamps kiosks Köln Hbf](https://foodtravelexperts.com/international/wp-content/uploads/2019/10/Pressemitteilung-de_Kamps-KioskeCologne.pdf) · [Merzenich branches](https://firmeneintrag.creditreform.de/50735/5190011810/MERZENICH_BAECKEREIEN_GMBH) · [Mayersche Neumarkt](https://www.koeln.de/koeln/einkaufen/zentrum) · [VHS Rur-Eifel statute](https://www.dueren.de/assets/userfiles/pdfbereich_verwaltunundpolitik/satzungen_ordnungen/s4/S4-13_VHS_Rur-Eifel.pdf) · [RWTH students](https://www.studycheck.de/hochschulen/rwth-aachen/studium) · [TH Köln students (DAAD)](https://static.daad.de/media/daad_de/pdfs_nicht_barrierefrei/infos-services-fuer-hochschulen/projektsteckbriefe/2025-05-08_inspiring_practice_th_k%C3%B6ln.pdf) · [Uni Köln students](https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/61_stadtentwicklung/pdf/newsletter/statistik-newsletter_2025-09-26.pdf) · [FH Aachen students](https://www.studysmarter.de/s/studiengaenge/fachhochschule-aachen/design-master/) · [Düren population (Uni Bonn)](https://epflicht.ulb.uni-bonn.de/download/pdf/565106) · [Düren IT.NRW profile](https://statistik.nrw/sites/default/files/municipalprofiles/l05358008.pdf)
