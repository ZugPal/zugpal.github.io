# Host mode and partner dashboard (Husam)

Your codes are in `.secrets/codes.txt` on your laptop. They are never committed to GitHub and only their
bcrypt hash is stored in the database.

## Talk Train host
1. The host opens Zugpal, taps **"Talk-Train-Host? Host-Code eingeben"** on the check-in screen and enters the host code.
2. Host mode lasts 30 days on that phone.
3. On a Talk Train ride the host sees numbers only (checked in, open to talk, matches) and can send **one** announcement to everyone on that ride.

## Partner dashboard
- Page: https://zugpal.github.io/partner/dashboard.html, give the partner the partner code.
- Shows Talk Train rides only: participants, matches, mood before/after (1–5), % who would recommend Zugpal.
- Any group under 20 people is hidden. "Als PDF speichern" prints a report.

## New or extra codes
Ask Claude: "make a new host code" or "make a partner code for go.Rheinland". Claude generates the code on your
laptop, stores only the hash (`private.host_codes` / `private.partner_codes`) and adds it to `.secrets/codes.txt`.
To withdraw a code, delete its row in those tables.
