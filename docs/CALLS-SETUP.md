# Anrufe einschalten (Sprach- und Videoanrufe)

Die Anrufe sind fertig gebaut, aber im echten Betrieb noch **ausgeschaltet**. In der Demo (`?demo`) kannst du sie schon ausprobieren (simulierter Anruf).

## Warum noch aus?

Ein Anruf geht direkt von Handy zu Handy (WebRTC). Ohne einen sogenannten **TURN-Server** (ein Vermittler):

- klappen viele Anrufe im Mobilfunknetz nicht, weil die Netze der Anbieter direkte Verbindungen oft blockieren;
- sieht die andere Person die IP-Adresse deines Handys. Das ist ein personenbezogenes Datum, und unser Grundsatz ist: außer Supabase kein Dritter.

Mit einem TURN-Server laufen alle Anrufe über den Vermittler. Die IP-Adressen bleiben privat (`relayOnly: true`), und Anrufe klappen auch im Zug-WLAN und im Mobilfunk.

## Was du tun musst (einmal, ca. 15 Minuten)

Claude darf für dich keine Konten anlegen und keine Schlüssel in Dashboards eintragen. Das machst du selbst:

1. Konto bei einem TURN-Anbieter mit Servern in der EU anlegen, z. B. **Metered.ca** (Open Relay, kostenloser Start: 50 GB im Monat) oder **Cloudflare Calls** (TURN).
2. Dort einen TURN-Zugang erstellen. Du bekommst eine Liste wie `turns:…:443`, einen Benutzernamen und ein Passwort.
3. Diese drei Angaben im Chat an Claude geben. Claude trägt sie in `src/config.js` ein:

```js
calls: { iceServers: [{ urls: ["turns:DEIN-SERVER:443?transport=tcp", "turn:DEIN-SERVER:80"], username: "…", credential: "…" }], relayOnly: true },
```

4. Der Anbieter muss in die **Datenschutzerklärung** (Auftragsverarbeitung, Serverstandort) und du schließt mit ihm einen AV-Vertrag (DPA).
5. Danach mit zwei echten Handys testen: Android ↔ iPhone, im WLAN und im Mobilfunk.

## Hinweis

Zugangsdaten, die im App-Code stehen, kann jeder sehen. Für den Anfang ist das bei TURN üblich (Missbrauch kostet nur Datenvolumen). Später ersetzen wir sie durch kurzlebige Zugangsdaten aus einer Supabase Edge Function.

Ehrlich gesagt: In einem fahrenden Zug brechen Anrufe oft ab, wenn das Netz schwankt. Sprachnachrichten und Videonachrichten kommen zuverlässiger an.
