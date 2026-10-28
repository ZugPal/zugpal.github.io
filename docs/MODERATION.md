# Reviewing reports (Husam)

Promise to users: **every report is reviewed within 24 hours**. Reports marked "under 18" come first.

## The easy way

Ask Claude in this project: **"Check the open reports."** Claude reads them with the Supabase connector,
shows you each case in plain words and, after you decide, runs the decision for you.

## By hand (Supabase → SQL Editor)

See open reports (urgent "under 18" first, with the last 20 messages kept as evidence):

```sql
select * from private.open_reports;
```

Decide one report (replace `12` with the report number):

```sql
select private.decide_report(12, 'no_action', null);                                  -- no rule broken
select private.decide_report(12, 'remove',    'Regel 3: Keine Kontaktdaten.');        -- delete what they sent to the reporter
select private.decide_report(12, 'pause_24h', 'Regel 3: Keine Kontaktdaten.');        -- pause 24 hours
select private.decide_report(12, 'pause_7d',  'Regel 1: Keine Anmache.');             -- pause 7 days
select private.decide_report(12, 'ban',       'Regel 2: Zugpal ist erst ab 18.');     -- close the account
```

What happens automatically:

- The reporter sees "we took action" or "no rule break" in the app.
- For any action, the reported person sees what happened and the reason you wrote (name the rule from regeln.html), plus how to object (DSA Art. 17).
- For a pause or ban, their check-in is removed and they can't check in or write until it ends.

Limits to know:

- Accounts are anonymous, so someone who is banned can clear their browser and start again. Email login (roadmap) will make bans stronger.
- If you suspect a crime against someone's life or safety, inform the police (DSA Art. 18).
