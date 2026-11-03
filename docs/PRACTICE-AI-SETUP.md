# Übungsfahrt mit KI einrichten (Anthropic + Supabase)

In der Übungsfahrt antworten Lena, Karim und Aylin mit einer KI (Claude Haiku 5.5 von Anthropic). Dann verstehen sie alles, was man schreibt, in jeder Sprache, und antworten wie echte Menschen. Ohne diesen Schritt antworten sie mit eingebauten Texten (die funktionieren auch, sind aber begrenzt).

Alles andere ist schon fertig: die Server-Funktion `practice-chat` läuft in Supabase, das Tageslimit ist in der Datenbank, die App fragt die KI automatisch, sobald der Schlüssel da ist.

Claude darf für dich kein Konto anlegen, nichts bezahlen und keine Schlüssel in Dashboards eintragen. Diese Schritte machst du. Dauer: etwa 15 Minuten.

## 1. Anthropic-Konto und Guthaben

1. Auf **console.anthropic.com** ein Konto anlegen (als Firma/Projekt „Zugpal“).
2. **Billing** → Guthaben aufladen, z. B. **5 €**. Das reicht für viele hundert Übungs-Chats.
3. **Settings → Limits**: ein monatliches Ausgabelimit setzen, z. B. **10 €**. Dann kann nie mehr abgebucht werden.

## 2. API-Schlüssel erstellen

1. **API Keys → Create Key** → Name „Zugpal Übungsfahrt“.
2. Den Schlüssel (beginnt mit `sk-ant-`) **einmal** kopieren. **Nicht in den Chat schreiben**, nicht in eine Datei im Projekt.

## 3. Schlüssel in Supabase eintragen

Supabase Dashboard → Projekt **ZugPal** → **Edge Functions** → **Secrets** (oder: Project Settings → Edge Functions → Secrets):

- **Add new secret**
  - Name: `ANTHROPIC_API_KEY`
  - Value: der Schlüssel aus Schritt 2
- Speichern. Die Funktion nimmt ihn sofort, ohne neues Hochladen.

## 4. Testen

1. Zugpal auf dem Handy öffnen → Check-in-Seite → **Übungsfahrt** → Winken bei Lena.
2. Chat öffnen und etwas Ungewöhnliches schreiben, z. B. „Was liest du gerade, und ist es gut?“
3. Oben steht kurz „schreibt…“, dann kommt eine Antwort, die genau zu deiner Frage passt (Lena liest gerade einen skandinavischen Krimi).
4. Wenn sie nur feste Sätze schreibt oder nicht auf deine Frage eingeht: Claude Bescheid sagen. Claude kann in den Supabase-Logs nachsehen.

## Kosten und Grenzen

- Eine Antwort kostet etwa **0,02 Cent**, ein ganzer Übungs-Chat (20 Antworten) etwa **0,5 Cent**.
- Eingebaute Grenzen: **80 Antworten pro Person und Tag**, **3.000 Antworten pro Tag für alle zusammen** (höchstens etwa 0,70 € am Tag). Danach antworten die Fahrgäste bis zum nächsten Tag mit den eingebauten Texten.
- Ändern kannst du das mit weiteren Secrets: `PRACTICE_USER_MAX`, `PRACTICE_TOTAL_MAX`.
- Ein stärkeres Modell (noch natürlicher, aber teurer): Secret `PRACTICE_MODEL` = `claude-sonnet-5-5` (etwa 20-mal so teuer) oder `claude-opus-5-5` (etwa 40-mal so teuer).

## Was die KI darf und was nicht

Lena, Karim und Aylin haben feste Lebensgeschichten (in `supabase/functions/practice-chat/index.ts`). Sie

- schreiben kurz wie am Handy, in der Sprache, in der du schreibst (Karim auf Arabisch im libanesischen Dialekt),
- schreiben mit Deutschlernenden einfaches Deutsch,
- flirten nicht und lenken freundlich um (kein Dating),
- geben und fragen nie nach Telefonnummer, Instagram, Adresse,
- sagen ehrlich, dass sie eine KI sind, wenn man fragt,
- setzen bei Beleidigungen eine klare Grenze,
- nennen bei einer Krise die Telefonseelsorge (0800 111 0 111).

## Datenschutz

- Die Datenschutzerklärung (`datenschutz.html`) hat schon einen Abschnitt dazu in allen drei Sprachen.
- Lies die **Commercial Terms** und den **Data Processing Addendum (DPA)** von Anthropic (im Console unter Settings → Legal bzw. auf anthropic.com/legal) und speichere eine Kopie.
- Danach sag Claude Bescheid: Claude entfernt den gelben Hinweis „[bitte bestätigen …]“ in `datenschutz.html`.
- Echte Fahrten und Chats mit echten Menschen gehen **nie** an die KI. Nur die Übungsfahrt.
