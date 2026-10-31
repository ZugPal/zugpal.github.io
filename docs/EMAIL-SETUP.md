# E-Mail-Versand einrichten (Resend + Supabase)

Ohne diesen Schritt kommen die Login-Mails („E-Mail sichern“, „Auf neuem Handy anmelden“) nur sehr eingeschränkt an: Supabase verschickt ohne eigenes SMTP nur wenige Test-Mails pro Stunde. Bevor Fremde den QR-Code scannen, bitte einrichten.

Claude darf für dich keine Konten anlegen, keine Domains kaufen und keine Schlüssel in Dashboards eintragen. Diese Schritte machst du. Dauer: etwa eine Stunde, das meiste davon ist Warten auf die Domain-Prüfung.

## 1. Eine eigene Domain (ca. 10 € im Jahr)

Resend schickt nur von einer eigenen Domain, nicht von `github.io`.

- Kaufe z. B. `zugpal.de` bei INWX, IONOS oder Strato.
- Die App kann weiter auf `zugpal.github.io` laufen; die Domain ist erst mal nur für E-Mails.

## 2. Resend-Konto und Domain prüfen

1. Auf resend.com ein Konto anlegen. Der kostenlose Tarif reicht: 3.000 Mails im Monat und 100 am Tag.
2. **Domains → Add Domain** → `zugpal.de` → Region **Ireland (eu-west-1)** wählen (EU).
3. Resend zeigt 3–4 DNS-Einträge: MX, TXT (SPF) und TXT (DKIM). Trag sie beim Domain-Anbieter unter „DNS“ genau so ein.
4. Warten, bis Resend **Verified** zeigt (meist 10–60 Minuten).
5. **API Keys → Create** → Name „Supabase“ → Berechtigung „Sending access“ → Schlüssel **einmal** kopieren. Nicht in den Chat schreiben.

## 3. Supabase einstellen

Supabase Dashboard → Projekt **ZugPal** → **Authentication**:

1. **Emails → SMTP Settings → Enable Custom SMTP**
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: der API-Schlüssel aus Schritt 2.5
   - Sender email: `hallo@zugpal.de`
   - Sender name: `Zugpal`
2. **Rate Limits**: „Emails sent per hour“ auf z. B. 30 stellen.
3. **URL Configuration**
   - Site URL: `https://zugpal.github.io/`
   - Redirect URLs: `https://zugpal.github.io/**`
4. **Emails → Templates → Magic Link** und **Change Email Address**: Betreff und Text unten einfügen.

## 4. Texte für die Login-Mail

Supabase kennt nur eine Vorlage pro Mail-Art, darum steht alles dreisprachig in einer Mail.

**Betreff:** `Dein Zugpal-Login · Your Zugpal login · تسجيل دخولك إلى Zugpal`

**Text (HTML):**

```html
<p>Hallo!</p>
<p>Tippe auf den Link, um dich bei Zugpal anzumelden. Der Link gilt eine Stunde.</p>
<p><a href="{{ .ConfirmationURL }}">Bei Zugpal anmelden</a></p>
<hr>
<p>Hi! Tap the link to sign in to Zugpal. It works for one hour.</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to Zugpal</a></p>
<hr>
<p dir="rtl">مرحباً! اضغط على الرابط لتسجيل الدخول إلى Zugpal. الرابط صالح لمدة ساعة.</p>
<p dir="rtl"><a href="{{ .ConfirmationURL }}">تسجيل الدخول إلى Zugpal</a></p>
<hr>
<p style="color:#666;font-size:12px">Wenn du das nicht warst, ignoriere diese Mail. · If this wasn't you, ignore this email. · إن لم تكن أنت، تجاهل هذه الرسالة.</p>
```

## 5. Testen

1. In der App: Profil → „E-Mail sichern“ → deine eigene Adresse. Die Mail muss innerhalb einer Minute kommen (auch im Spam-Ordner nachsehen).
2. Auf einem zweiten Handy: Profil → „Auf neuem Handy anmelden“ → dieselbe Adresse → Link antippen → dein Profil ist wieder da.

## 6. Rechtliches

- Resend in die **Datenschutzerklärung** aufnehmen (E-Mail-Versand, Server in der EU, Auftragsverarbeitung).
- Mit Resend den **AV-Vertrag (DPA)** abschließen: in Resend unter Settings → Legal.
- Wenn das erledigt ist, sag Claude Bescheid; Claude ergänzt `datenschutz.html` in allen drei Sprachen.
